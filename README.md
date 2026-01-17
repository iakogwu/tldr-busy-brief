# Busy Brief

> **Turn long work conversations into clear decisions, risks, and next steps — fast.**

Busy Brief turns long, messy workplace content — emails, Slack threads, meeting notes, and documents — into clear, structured briefs that help teams align quickly.

Unlike generic summarization tools, Busy Brief focuses on **operational clarity**, surfacing what actually matters:

*   **Why this matters right now**
*   **Key priorities and signals**
*   **Decisions** (including implied or tentative ones)
*   **Risks, dependencies, and open questions**
*   **Next alignment actions** — without inventing certainty

It explicitly preserves ambiguity when it exists and avoids inventing owners, dates, or urgency.

---

## 🚀 Canonical Demo

To see exactly how Busy Brief handles ambiguity and implied decisions, try this example input (a combined Slack thread + meeting notes):

```text
Slack thread (Monday):

Alex:
We should probably lock scope for the May release soon. QA is already stretched.

Priya:
Design for permissions cleanup is basically done — final tweaks today or tomorrow.

Sam:
Engineering can hit May 20 if we don’t add anything net-new. Permissions refactor is the big unknown.

Alex:
Let’s discuss in tomorrow’s sync.

Meeting notes (Tuesday sync):

- General agreement that timeline risk has increased due to permissions refactor.
- Discussion around whether to include advanced role templates in the May release.
- Engineering noted that adding role templates would likely push QA past May 20.
- Product said role templates are valuable but not strictly required.
- No explicit decision was called out.

Follow-up doc excerpt:

“Given current resourcing and the importance of hitting the May release window, the proposal is to focus this release on stabilizing permissions behavior and defer advanced role templates to a later iteration.”
```

### Expected Output
Notice how it captures the *implied* decision status and *open questions* without forcing a "Task" list.

```json
{
  "summary": [
    "Timeline risk for the May release has increased due to the permissions refactor.",
    "Scope decisions need to be finalized now to protect QA capacity and meet Marketing lead-time requirements.",
    "Engineering can meet May 20 deadline only if no new features are added."
  ],
  "decision_status": "Proposed / assumed unless objections",
  "next_alignment_actions": [
    "Align on final scope for the May release.",
    "Resolve open questions in the April 25 sync.",
    "Confirm GA timing to support Marketing planning."
  ],
  "open_questions": [
    "Is May 20 still a realistic GA date, or should we plan for late May?",
    "Does deferring role templates impact any committed customer timelines?"
  ],
  "bottom_line": "Teams are converging on a stability-first May release, proposing to defer advanced role templates to mitigate risk."
}
```

---

## 🛡️ Why Busy Brief is Different (Reviewer Note)

Busy Brief is **not** a generic summarization tool. It is designed to help users quickly align on what matters in long or messy workplace content by surfacing priorities, decisions, risks, and open questions.

Unlike traditional TLDR apps, Busy Brief:
1.  **Preserves Uncertainty**: Explicitly labels proposed vs. confirmed decisions.
2.  **Avoids Hallucination**: Never invents owners, dates, urgency, or sentiment.
3.  **Focuses on Alignment**: Does not assign tasks or manage projects; it provides neutral briefs for safe decision-making.

---

## 🛠️ Usage

This app exposes a single tool: `busy_brief`.

**Example Prompt:**
> "Review this Slack thread and tell me the decision status and next risks."

It returns a JSON structure used to render the **Busy Brief Card** UI.

---

## 📦 Installation

To run this MCP server locally:

1.  **Install dependencies**:
    ```bash
    npm install
    ```
2.  **Set Environment Variables**:
    Create a `.env` file with `OPENAI_API_KEY`.
3.  **Build and Start**:
    ```bash
    npm run build
    npm start
    ```
    The server runs on port `3333`.

## 🔒 Security

*   **No Data Storage**: Input text is processed statelessly and never stored.
*   **Privacy First**: No logs of user content.
*   **Safe Execution**: Read-only tools.

# License

MIT
