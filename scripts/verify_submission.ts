
import dotenv from "dotenv";
import { explain } from "../src/explain";

dotenv.config();

const input = `Context: Slack thread + meeting notes

Slack (Monday, April 22):

Alex (9:14 AM):
We should probably lock scope for the May release this week. QA is already stretched.

Priya (9:18 AM):
Design for permissions cleanup is basically done — final tweaks today or tomorrow.

Jordan (9:21 AM):
Reminder that Marketing needs ~2 weeks lead time if this is shipping mid-May.

Sam (9:24 AM):
Engineering can hit May 20 *if* we don’t add anything net-new. Permissions refactor is the big unknown.

Alex (9:30 AM):
Understood. Let’s discuss in tomorrow’s sync.


---

Meeting Notes — Product / Eng Sync (Tuesday, April 23):

- General agreement that timeline risk has increased due to permissions refactor.
- Discussion around whether to include advanced role templates in the May release.
- Engineering flagged that adding role templates would likely push QA past May 20.
- Product noted that role templates are valuable but not strictly required for launch.
- No explicit decision was called out in the meeting.

---

Follow-up Doc Excerpt (shared Wednesday, April 24):

“Given current resourcing and the importance of hitting the May release window, the proposal is to focus this release on stabilizing permissions behavior and defer advanced role templates to a subsequent iteration. This should reduce risk while still delivering meaningful customer value.”

Open Questions Noted in Doc:
- Is May 20 still a realistic GA target, or should we plan for late May?
- Does deferring role templates impact any committed customer timelines?

Next Sync:
- Thursday, April 25`;

async function run() {
    try {
        console.log("Running submission verification...");
        const result = await explain(input);
        console.log(JSON.stringify(result, null, 2));
    } catch (error) {
        console.error("Error:", error);
    }
}

run();
