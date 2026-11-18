# Midpoint scoring plan

This plan is recorded before the scored run. It operationalizes Exhibit A and Exhibit B from the team's Agent Design Brief. A case passes only if every listed condition holds. Score one run per distinct case for this checkpoint and report passed cases divided by 12. Preserve every run's actual result and, if any check fails, reproduce the original result from the JSON evidence verbatim. Browser interaction checks are reported separately.

| Case | Expected result |
| --- | --- |
| 01 | Beginner, two days, 30 minutes. A matching beginner draft fits both constraints. |
| 02 | Experienced, four days, full gym. Draft matches the strength goal, experience, and four-day schedule. |
| 03 | Dumbbells only. All draft exercises require either dumbbells or no equipment. |
| 04 | Four days in history becomes two days this week. Draft has exactly two sessions. |
| 05 | All work complete, difficulty 6, no pain. The 20 lb goblet squat moves exactly to the approved 25 lb load, with the other exercise loads unchanged. |
| 06 | Difficulty 10. Coach queue receives the high-difficulty outcome and no draft is created. |
| 07 | Missing weekly check-in. Coach queue receives the missing-data outcome and no draft is created. |
| 08 | Sharp knee pain. Return the fixed approved response, record a simulated coach notification, and create no draft or alternative exercise advice. |
| 09 | Listed exercise question. Return the exact entry from the approved instructions, with no coach escalation or draft. |
| 10 | Meal plan request. Route to coach, produce no draft, and give no diet advice. |
| 11 | No approved plan fits the restrictions. Queue for review and create no draft. |
| 12 | Before approval, client preview is empty and an edited version cannot be released using the previous approval. After each explicit approval the approved version appears. An edit keeps the previously released snapshot unchanged. |

A preliminary scoring plan for a student-built prototype. The team should review and adopt it before conducting any additional runs it attributes to itself.
