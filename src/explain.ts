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
  actions: string[];
  background: string[];
  tone?: string;
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
              content:
                "You are a text compression engine for busy professionals. No opinions. No advice. No explanations. Output valid JSON only, with the exact keys requested.",
            },
            {
              role: "user",
              content: `Extract only what matters from the text.

Return EXACTLY this JSON shape (no additional text). Only include optional fields when they are present:

{
  "summary": ["key point 1", "key point 2"],
  "actions": ["action 1", "action 2"],
  "background": ["background 1", "background 2"],
  "tone": "urgent | normal | low" (optional),
  "action_details": [
    {
      "action": "Send revised budget to finance",
      "people": ["David"],
      "dates": ["Friday afternoon", "Feb 12"]
    }
  ] (optional)
}

Rules:
- summary: 1-3 most important facts or conclusions (strings only)
- actions: explicit tasks or deadlines only; if none, return []
- background: non-essential context or metadata
- tone: overall urgency (urgent | normal | low) only if clear
- action_details: only for actions where people or dates are explicitly stated in the text
- action_details.action must match an item in actions
- never infer names or dates that are not in the text
- omit people/dates keys when not present

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

      if (!validateParsedResponse(parsed)) {
        throw new AppError(
          "Model returned an unexpected format",
          502,
          "INVALID_MODEL_RESPONSE"
        );
      }

      const summary = cleanArray(parsed.summary, 3);
      const actions = cleanArray(parsed.actions, 10);
      const background = cleanArray(parsed.background, 10);
      const tone = typeof parsed.tone === "string" ? parsed.tone.trim().toLowerCase() : "";

      const actionDetailsRaw = Array.isArray(parsed.action_details) ? parsed.action_details : [];
      const actionDetails: { action: string; people?: string[]; dates?: string[] }[] = [];
      const inputLower = input.toLowerCase();

      for (const detail of actionDetailsRaw) {
        if (!detail || typeof detail !== "object") continue;
        const action = typeof (detail as any).action === "string" ? (detail as any).action.trim() : "";
        if (!action) continue;

        const actionLower = action.toLowerCase();
        const actionIndex = inputLower.indexOf(actionLower);

        if (actionIndex === -1) {
          continue;
        }

        const isNearAction = (term: string) => {
          const termLower = term.toLowerCase();
          let idx = inputLower.indexOf(termLower);
          while (idx !== -1) {
            if (Math.abs(idx - actionIndex) <= 200) return true;
            idx = inputLower.indexOf(termLower, idx + 1);
          }
          return false;
        };

        const people = Array.isArray((detail as any).people)
          ? cleanArray((detail as any).people, 10).filter((name) => isNearAction(name))
          : [];
        const dates = Array.isArray((detail as any).dates)
          ? cleanArray((detail as any).dates, 10).filter((date) => isNearAction(date))
          : [];

        const entry: { action: string; people?: string[]; dates?: string[] } = { action };

        if (people.length > 0) entry.people = people;
        if (dates.length > 0) entry.dates = dates;

        if (entry.people || entry.dates) {
          actionDetails.push(entry);
        }

        if (!actions.includes(action) && actions.length < 10) {
          actions.push(action);
        }
      }

      const result: {
        summary: string[];
        actions: string[];
        background: string[];
        tone?: string;
        action_details?: { action: string; people?: string[]; dates?: string[] }[];
      } = {
        summary: summary.length > 0 ? summary : ["No key points identified"],
        actions,
        background,
      };

      if (tone === "urgent" || tone === "normal" || tone === "low") {
        result.tone = tone;
      }

      if (actionDetails.length > 0) {
        result.action_details = actionDetails;
      }

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
