import OpenAI from "openai";

export class AppError extends Error {
  public readonly status: number;
  public readonly code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function safeParseJSON(text: string): any | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function extractLikelyJson(text: string): string {
  let cleaned = text.trim();

  // Strip common markdown fences
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "");
  cleaned = cleaned.replace(/\s*```$/i, "");

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return cleaned.slice(firstBrace, lastBrace + 1).trim();
  }

  return cleaned;
}

function validateParsedResponse(parsed: any): parsed is {
  summary: unknown[];
  actions: unknown[];
  background: unknown[];
  tone?: unknown;
  action_details?: unknown[];
} {
  if (!parsed || typeof parsed !== "object") return false;
  if (!Array.isArray((parsed as any).summary)) return false;
  if (!Array.isArray((parsed as any).actions)) return false;
  if (!Array.isArray((parsed as any).background)) return false;
  const tone = (parsed as any).tone;
  if (tone !== undefined && typeof tone !== "string") return false;
  const actionDetails = (parsed as any).action_details;
  if (actionDetails !== undefined && !Array.isArray(actionDetails)) return false;
  return true;
}

function cleanArray(arr: unknown[], maxItems: number): string[] {
  return arr
    .filter((item): item is string => isNonEmptyString(item))
    .map((item) => item.trim())
    .slice(0, maxItems);
}

let client: OpenAI | null = null;

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new AppError(
      "Missing OPENAI_API_KEY. Set it in your environment or .env file.",
      401,
      "MISSING_API_KEY"
    );
  }

  if (!client) {
    client = new OpenAI({ apiKey });
  }

  return client;
}

const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const MAX_RETRIES = Number.parseInt(process.env.MAX_RETRIES || "3", 10);
const TIMEOUT_MS = Number.parseInt(process.env.TIMEOUT_MS || "30000", 10);

export async function explain(input: string): Promise<{
  summary: string[];
  next_alignment_actions: string[];
  decision_status: string;
  open_questions: string[];
  bottom_line: string;
  action_details?: { action: string; people?: string[]; dates?: string[] }[];
}> {
  const retries = Number.isFinite(MAX_RETRIES) && MAX_RETRIES > 0 ? MAX_RETRIES : 3;
  const timeoutMs = Number.isFinite(TIMEOUT_MS) && TIMEOUT_MS > 0 ? TIMEOUT_MS : 30000;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await getClient().responses.create(
        {
          model: DEFAULT_MODEL,
          input: [
            {
              role: "system",
              content: `You are TLDR Busy Brief, an AI assistant that converts workplace communication into operationally useful briefs.

Your role is to extract what matters for alignment and execution.

Core Principles:
1. Never invent facts, decisions, owners, or timelines.
2. If information is unclear, implied, or tentative, label it explicitly.
3. Clearly distinguish between:
   - Decisions (explicit or implied)
   - Assumptions / working agreements
   - Open questions
4. Preserve ambiguity when it exists. Clarity > False Confidence.
5. Prioritize operational signal: "Why this matters", "Current State", "Signals", "Proposed Direction".

Output Format:
You must output a VALID JSON object (no markdown fencing) with the following structure:
{
  "summary": ["String 1", "String 2"...], // Key signals, current state, why this matters.
  "decision_status": "String", // "Proposed / assumed" | "Converted" | "None" | "Mixed"
  "next_alignment_actions": ["String 1"...], // Softer planning inputs, not rigid commands.
  "open_questions": ["String 1"...], // Unresolved questions or risks.
  "bottom_line": "String", // A single sentence synthesizing the net result.
  "action_details": [] // As defined below
}`,
            },
            {
              role: "user",
              content: `Analyze the text below.
              
Return EXACTLY this JSON shape (no additional text):
{
  "summary": ["key point 1", "key point 2"],
  "decision_status": "Proposed / assumed unless objections",
  "next_alignment_actions": ["action 1", "action 2"],
  "open_questions": ["question 1"],
  "bottom_line": "Net result sentence.",
  "action_details": [{"action": "...", "people": ["..."], "dates": ["..."]}]
}

Rules:
- summary: Include "Why this matters", "Key Signals", and "Current Status".
- decision_status: Explicitly label the state of decisions (e.g. "Proposed", "None").
- next_alignment_actions: Extract implied next steps for alignment. If none, return [].
- open_questions: Extract risks and questions.
- bottom_line: One clean synthesis sentence.
- action_details: extract people/dates for actions if present.

Text to analyze:
${input}`,
            },
          ],
          text: { format: { type: "text" } },
        },
        { timeout: timeoutMs }
      );

      const raw = response.output_text?.trim() ?? "";
      if (!raw) {
        throw new AppError("Empty response from AI service", 502, "EMPTY_MODEL_RESPONSE");
      }

      const jsonCandidate = extractLikelyJson(raw);
      const parsed = safeParseJSON(jsonCandidate);

      if (!parsed || typeof parsed !== "object") {
        throw new AppError("Model returned invalid JSON", 502, "INVALID_MODEL_RESPONSE");
      }

      const summary = cleanArray((parsed as any).summary, 5);
      const next_alignment_actions = cleanArray((parsed as any).next_alignment_actions, 10);
      const open_questions = cleanArray((parsed as any).open_questions, 10);
      const decision_status = isNonEmptyString((parsed as any).decision_status) ? (parsed as any).decision_status.trim() : "None";
      const bottom_line = isNonEmptyString((parsed as any).bottom_line) ? (parsed as any).bottom_line.trim() : "";

      const actionDetailsRaw = Array.isArray((parsed as any).action_details) ? (parsed as any).action_details : [];
      const actionDetails: { action: string; people?: string[]; dates?: string[] }[] = [];
      const inputLower = input.toLowerCase();

      // Simplified mapping for action details
      for (const detail of actionDetailsRaw) {
        if (!detail || typeof detail !== "object") continue;
        const action = typeof (detail as any).action === "string" ? (detail as any).action.trim() : "";
        if (!action) continue;

        // Only keep details if the action is in next_alignment_actions
        if (!next_alignment_actions.includes(action)) continue;

        const people = Array.isArray((detail as any).people) ? cleanArray((detail as any).people, 5) : [];
        const dates = Array.isArray((detail as any).dates) ? cleanArray((detail as any).dates, 5) : [];

        if (people.length > 0 || dates.length > 0) {
          actionDetails.push({ action, people, dates });
        }
      }

      const result = {
        summary,
        next_alignment_actions,
        decision_status,
        open_questions,
        bottom_line,
        action_details: actionDetails.length > 0 ? actionDetails : undefined
      };

      return result;
    } catch (error) {
      lastError = error as Error;

      // Pass through known app errors immediately (client-side / configuration)
      if (error instanceof AppError && error.status < 500) {
        throw error;
      }

      // OpenAI SDK errors
      if (error instanceof OpenAI.APIError) {
        if (error.status === 401) {
          throw new AppError("Invalid API key", 401, "INVALID_API_KEY");
        }

        if (error.status === 403) {
          throw new AppError("API access forbidden", 403, "FORBIDDEN");
        }

        if (error.status === 400) {
          throw new AppError(
            "Request rejected by model/API (input may be too large)",
            400,
            "OPENAI_BAD_REQUEST"
          );
        }

        if (error.status === 429) {
          // Rate limit - backoff and retry
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
          continue;
        }

        if (error.status >= 500) {
          // Server error - backoff and retry
          await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
          continue;
        }
      }

      // Retry other transient-looking failures
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 750 * attempt));
        continue;
      }
    }
  }

  throw new AppError(
    `Failed after ${retries} attempt(s): ${lastError?.message || "Unknown error"}`,
    502,
    "UPSTREAM_FAILURE"
  );
}
