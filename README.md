# Workout Planning Agent

A 70-445 midpoint sandbox for drafting and reviewing a weekly workout plan. All profiles and plans are synthetic. Codex helped implement the prototype. At runtime, the planner filters and ranks approved plans using rules. It has no live language model, external notifications, production authentication, or persistent client data.

## Open the demo

Double-click `workout-planning-agent-demo.html` to open the self-contained demo. It works offline in a current browser. For development, serve `dist/` with any local static server, for example `python3 -m http.server 8000 --directory dist`, and open http://localhost:8000.

## Review in three minutes

1. Select case 01 and click **Run agent**. Open **Client preview** and check for the approval gate.
2. In **Coach review**, approve the draft. Add and save a note. The client still sees the previously approved version until you approve the new version.
3. Select case 08 and click **Run agent**. Verify that the simulated coach queue receives a notification and that the plan is paused.
4. Use **Download JSON** before switching cases. Switching cases or hitting **Reset case** starts a fresh session.

## Test Exhibit A

Review `evidence/scoring-plan.md` before testing. For each case, select the corresponding preset, click **Run agent**, verify the case's expected result, and download the JSON before selecting the next case. For case 12, also perform the approval, edit, and reapproval walkthrough. A pass requires every expected outcome. Record date, tester, version, expected result, actual result, and pass or fail. Keep failed outputs verbatim. Have a teammate who did not implement the workflow conduct the browser test.

`node tests/run-midpoint.mjs` runs all 12 cases against the planner and approval code. `node tests/run-exploratory.mjs` checks two additional outcomes. Either command accepts an optional path for a new JSON evidence file.

## Evidence and limitations

The automated midpoint suite passed 12 of 12 cases on the initial and revised versions. Exploratory runs found two problems: new pain did not withdraw the existing client preview and an unlisted load silently reverted to the library's load. The original outputs are preserved under `evidence/`, and the two targeted checks passed after corrections. Browser QA separately exercised approval, editing, reapproval, and the pain queue. The hit rate covers the fixed synthetic cases. Free-form exercise wording has limited coverage, free-text pain notes do not substitute for the pain checkbox, and coach roles and notifications are browser simulations. Time savings have yet to be measured.

If you extend the system with a model, keep the deterministic rules and approval gate outside the model. Review the implementation and complete the team AI-use log before submission.
