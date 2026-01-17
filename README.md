# TL;DR Busy Brief (v0.1.0)

tldr-busy-brief is a lightweight summarization tool that converts long or dense text into concise, structured briefs designed for fast reading and decision-making.

The tool is built for time-constrained users who need to quickly understand essential information without reading full-length content. It focuses on clarity, structure, and relevance rather than exhaustive detail.

Typical use cases include summarizing articles, reports, emails, meeting notes, and other long-form text into short, readable briefs that surface key points at a glance.

## Subtitle

Structured summaries with key points and action items

## What it does

- Extracts key facts into a short summary
- Separates action items from background context
- Optionally annotates actions with people and dates when explicitly stated
- Returns machine-readable JSON for reliable downstream handling

## Signature Output Promise

"TLDR Busy Brief turns long, messy workplace communication—emails, Slack threads, meeting notes, or documents—into a clear, trustworthy snapshot of what matters now: priorities, decisions, risks, and what teams should do next—without inventing certainty."

## Core Principles & Safety

- **Operational Clarity**: Focuses on decisions and actions, not just content density.
- **Ambiguity Preservation**: Clearly labels what is decided vs. what is assumed.
- **Hallucination Safety**: *TLDR Busy Brief does not invent decisions, owners, or dates — uncertainty is labeled explicitly.*

## How ChatGPT uses it

When enabled in ChatGPT, the model calls the `busy_brief` tool with the user’s text. The tool returns structured JSON that ChatGPT can present as a brief summary with clear actions.

## App Directory Description

TL;DR Busy Brief helps users quickly distill long or complex text into concise, structured summaries. It is designed for fast comprehension, enabling busy users to extract key information and make decisions without reading full documents.

## Versioning

- v0.1.0 — initial submission
- v0.1.1 — fixes
- v0.2.0 — new tools

## Installation

### Prerequisites

- Node.js 18+
- OpenAI API key

### Setup

```bash
npm install
cp .env.example .env
```

Set `OPENAI_API_KEY` in `.env`:
```env
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini
PORT=3333
MAX_RETRIES=3
TIMEOUT_MS=30000
```

Build and run:
```bash
npm run build
npm start
```

## Example tool calls

### Tool: `busy_brief`

**Input**
```json
{
  "input": "Team meeting tomorrow at 3pm about Q4 project deadline. Alex will send the agenda by tomorrow 3pm. Need to prepare slides and review budget numbers before the call."
}
```

**Output**
```json
{
  "summary": [
    "Team meeting scheduled for tomorrow at 3pm",
    "Focus on Q4 project deadline discussion"
  ],
  "actions": [
    "Prepare presentation slides",
    "Send meeting agenda to team",
    "Review budget numbers"
  ],
  "background": [
    "Meeting time confirmation",
    "General project context"
  ],
  "tone": "urgent",
  "action_details": [
    {
      "action": "Send meeting agenda to team",
      "people": ["Alex"],
      "dates": ["tomorrow 3pm"]
    }
  ]
}
```

Optional fields like `tone` and `action_details` are omitted when they do not apply.

## App Directory Description

TL;DR Busy Brief helps users distill long or complex text into concise, structured summaries. It highlights key points, extracts action items, and separates background information for faster reading and understanding.

## Privacy & Data Handling

TL;DR Busy Brief processes text only to generate summaries and extracted actions.

- **Data accessed**: Only the text provided to the tool by the user.
- **Data stored**: None by this app.
- **External data sent**: The input text is sent to the OpenAI API for processing.
- **Data retention**: Not stored by this app. OpenAI’s retention policies apply to API calls.
- **Logging**: Minimal operational logs (errors and status). No user content is persisted.
- **Revoking access**: Remove or rotate your `OPENAI_API_KEY`, or disable the app in ChatGPT.

Privacy Policy: `PRIVACY.md`

## Testing

### Integration Tests
```bash
# Run all tests
npm test

# Run only integration tests
npm run test:integration
```

The test suite includes:
- **Server integration tests** - API endpoints, validation, error handling
- **Performance monitoring** - Metrics collection and health checks
- **Error scenarios** - Invalid inputs, API failures, timeouts

### Test Environment
Tests use a separate environment configuration (`.env.test.example`) with:
- Test API key (invalid for real requests)
- Minimal retries for faster execution
- Short timeouts
- Random port assignment

## Performance Monitoring

The application includes built-in performance metrics:

### Health Endpoint Metrics
```json
{
  "status": "healthy",
  "metrics": {
    "requestCount": 150,
    "successRate": 98.7,
    "averageResponseTime": 1250,
    "lastRequestTime": "2026-01-15T23:30:00.000Z",
    "errorsByCode": {
      "INVALID_API_KEY": 2
    }
  }
}
```

### Response Headers
- `X-Response-Time`: Request processing time in milliseconds
- `X-Request-ID`: Unique request identifier for tracing

### Metrics Tracked
- **Request count**: Total requests processed
- **Success rate**: Percentage of successful requests
- **Response time**: Average processing duration
- **Error categorization**: Errors grouped by error code
- **Last request timestamp**: Most recent activity

## Version History

See [CHANGELOG.md](CHANGELOG.md) for detailed version history, migration guides, and release notes.

## Project structure

```
├── mcp.json              # MCP configuration
├── package.json          # Dependencies and scripts
├── README.md             # This file
├── CHANGELOG.md          # Version history and changes
├── LICENSE               # MIT license
├── jest.config.js        # Test configuration
├── src/                  # App logic
│   ├── explain.ts        # AI processing logic
│   └── metrics.ts        # Performance monitoring
├── server/               # Runtime server entrypoint
│   ├── index.ts          # Express server
│   └── explain.ts        # Re-export to src
├── tests/                # Test suite
│   ├── setup.ts          # Test configuration
│   └── integration/      # Integration tests
│       └── server.test.ts
├── .env.example          # Environment template
├── .env.test.example     # Test environment template
└── dist/                 # Compiled TypeScript output
```

## License

MIT License - see `LICENSE`.

## Support

GitHub: `https://github.com/iakogwu/tldr-busy-brief`
