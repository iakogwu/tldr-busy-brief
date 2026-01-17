import express, { Request, Response } from "express";
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import { explain } from "./explain.js";
import { performanceMiddleware } from "../src/metrics.js";
import { authMiddleware } from "../src/auth.js";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = Number.parseInt(process.env.PORT || "3333", 10) || 3333;

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(performanceMiddleware);
app.use(authMiddleware);

// --- MCP Server Setup ---

const mcpServer = new McpServer({
  name: "Busy Brief",
  version: "1.0.0"
});

// Register Tool: busy_brief
const busyBriefSchema = {
  input: z.string().min(20).max(100000).describe("The text content (email, slack, docs) to analyze for decisions, risks, and next steps.")
};

mcpServer.tool(
  "busy_brief",
  busyBriefSchema as any,
  async (args: any) => {
    const { input } = args;
    const result = await explain(input);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result) }]
    };
  }
);

// Register Resource: Widget
// ChatGPT requests this via the "ui://widget/index.html" URI
mcpServer.resource(
  "busy-brief-widget",
  new ResourceTemplate("ui://widget/index.html", { list: undefined }),
  async (uri, variables) => {
    try {
      // Resolve path to public/index.html (adjusting for dist/server/ structure)
      // If running in dist/server, ../../public/index.html
      // If running in server/, ../public/index.html
      // Safer to rely on process.cwd() or specific resolution. 
      // Assuming process.cwd() is the project root.
      // Robust path resolution relative to this file (dist/server/index.js)
      // We want to reach <root>/public/index.html
      const widgetPath = join(__dirname, "../../public/index.html");
      const content = readFileSync(widgetPath, "utf-8");

      return {
        contents: [{
          uri: uri.href,
          mimeType: "text/html+skybridge",
          text: content,
          _meta: {
            "openai/widgetPrefersBorder": true,
            "openai/widgetCSP": {
              connect_domains: ["https://*"],
              resource_domains: ["https://fonts.googleapis.com", "https://fonts.gstatic.com"],
              frame_domains: []
            }
          }
        }]
      };
    } catch (err) {
      console.error("Failed to read widget file:", err);
      throw new Error("Widget content not found");
    }
  }
);

// --- Routes ---

const transports = new Map<string, SSEServerTransport>();

// 1. SSE Endpoint for MCP Connection
app.get("/sse", async (req, res) => {
  console.log("-> New SSE connection request");
  const transport = new SSEServerTransport("/messages", res);
  // @ts-ignore - Inspect internal identifier if needed, or rely on start
  const transportId = (transport as any)._sessionId || `t-${Math.random().toString(36).substr(2, 9)}`;

  // Hook start to capture the actual session ID if the SDK sets it publicly
  await mcpServer.connect(transport);

  // @ts-ignore - Attempt to get session ID from public property after connect
  let sessionId = (transport as any).sessionId;

  if (!sessionId) {
    console.warn("!! No sessionId found on transport, falling back to internal or generated.");
    sessionId = transportId;
  }

  console.log(`-> SSE Transport connected. SessionId: ${sessionId}`);
  if (sessionId) {
    transports.set(sessionId, transport);
  }

  req.on("close", () => {
    console.log(`<- SSE connection closed for session: ${sessionId}`);
    if (sessionId) transports.delete(sessionId);
  });
});

// 2. Messages Endpoint for Client to Send Data
// Disable global body parsing for this route if it conflicts, but here we handle it carefully.
app.post("/messages", async (req, res) => {
  const sessionId = req.query.sessionId as string;
  console.log(`-> POST /messages received. SessionId: ${sessionId}`);

  if (!sessionId) {
    console.error("!! POST /messages failed: Missing sessionId query param");
    res.status(400).send("Missing sessionId query parameter");
    return;
  }

  const transport = transports.get(sessionId);
  if (!transport) {
    console.error(`!! POST /messages failed: Session NOT found in valid transports map. Keys: ${Array.from(transports.keys())}`);
    res.status(404).json({
      error: "Session not found",
      message: `Session '${sessionId}' is not active. Active sessions: ${transports.size}`
    });
    return;
  }

  console.log(`-> Routing message to transport ${sessionId}`);
  try {
    const parsedBody = req.body;
    await transport.handlePostMessage(req, res, parsedBody);
    console.log(`-> Message routed successfully to ${sessionId}`);
  } catch (error: any) {
    console.error(`!! Error handling message for ${sessionId}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// 3. Static Assets (Public)
app.use(express.static("public"));

// 4. Specific Widget Route (Direct HTTP Access)
// Even though we have the mcpServer.resource, keeping this for debugging/direct loading
app.get("/widget/index.html", (req, res) => {
  res.setHeader("Content-Type", "text/html+skybridge");
  res.sendFile("index.html", { root: "public" });
});

// 5. Legacy REST Endpoint (Optional but kept for compatibility)
app.post("/explain", async (req, res) => {
  try {
    const input = req.body.input;
    if (!input || typeof input !== "string") {
      return res.status(400).json({ error: "Invalid input" });
    }
    const result = await explain(input);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  app.listen(PORT, () => {
    console.log(`TL;DR Busy Brief MCP Server running on port ${PORT}`);
    console.log(`SSE Endpoint: http://localhost:${PORT}/sse`);
  });
}