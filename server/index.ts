import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import { explain, AppError } from "./explain.js";

dotenv.config();

const app = express();
const PORT = Number.parseInt(process.env.PORT || "3333", 10) || 3333;

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

interface ExplainRequest {
  input: string;
}

function validateExplainRequest(req: Request, res: Response, next: NextFunction) {
  const { input } = req.body as Partial<ExplainRequest>;

  if (input === undefined) {
    return res.status(400).json({ error: "Missing required field: input", code: "MISSING_INPUT" });
  }

  if (typeof input !== "string") {
    return res.status(400).json({ error: "Input must be a string", code: "INVALID_INPUT_TYPE" });
  }

  const trimmed = input.trim();
  if (trimmed.length < 20) {
    return res.status(400).json({ error: "Input must be at least 20 characters long", code: "INPUT_TOO_SHORT" });
  }

  if (trimmed.length > 100000) {
    return res.status(400).json({ error: "Input must be less than 100,000 characters", code: "INPUT_TOO_LONG" });
  }

  // Normalize input so downstream doesn't see leading/trailing whitespace
  (req.body as ExplainRequest).input = trimmed;

  next();
}

app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "healthy",
    hasApiKey: Boolean(process.env.OPENAI_API_KEY),
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    timestamp: new Date().toISOString(),
  });
});

app.post("/explain", validateExplainRequest, async (req: Request, res: Response) => {
  try {
    const { input } = req.body as ExplainRequest;
    const result = await explain(input);
    res.json(result);
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.status).json({ error: error.message, code: error.code });
    }

    console.error("Unexpected error processing request:", error);
    return res.status(500).json({ error: "Failed to process the request", code: "PROCESSING_ERROR" });
  }
});

app.use((req: Request, res: Response) => {
  res.status(404).json({ error: "Endpoint not found", code: "NOT_FOUND" });
});

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Unhandled error:", error);
  res.status(500).json({ error: "Internal server error", code: "INTERNAL_ERROR" });
});

process.on("SIGTERM", () => process.exit(0));
process.on("SIGINT", () => process.exit(0));

app.listen(PORT, () => {
  console.log(`TL;DR Busy Brief server running on port ${PORT}`);
});