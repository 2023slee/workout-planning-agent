import { writeFile } from 'node:fs/promises';
import { cases, exercises } from '../dist/data.mjs';
import { startCase, generate, edit, approve, clientView } from '../dist/planner.mjs';

const rows = [];
const matches = (plan, goal, level, days, minutes) =>
  plan?.goal === goal && plan?.level === level && plan?.sessions.length === days && plan.minutes <= minutes;
const queued = (state, reason) => state.result.reason === reason && !state.draft &&
  state.events.some(event => event.event === 'coach_queued' && event.reason === reason);
const weights = plan => plan?.sessions.flat().map(entry => entry.weight).join(',');

const expected = {
  '01': 'Beginner general fitness, two sessions, at most 30 min.',
  '02': 'Experienced strength, four sessions, at most 50 min.',
  '03': 'Draft only includes dumbbell or bodyweight exercises.',
  '04': 'Four sessions in recent history, two sessions in draft.',
  '05': 'Squat increases exactly 20 to 25 lb and other loads stay the same.',
  '06': 'Difficulty 10 queues the coach and produces no draft.',
  '07': 'Missing check-in queues the coach and produces no draft.',
  '08': 'Fixed pain response, queued coach alert, no draft.',
  '09': 'Exact approved exercise text, no coach alert or draft.',
  '10': 'Coach follow-up only, no diet advice or draft.',
  '11': 'No compatible plan, coach queue, no draft.',
  '12': 'Initial release blocked; approvals gate each version; stale approval blocked.'
};

for (const input of cases) {
  let state = generate(startCase(input));
  const plan = state.draft?.plan;
  let actual = state;
  const checks = {
    '01': () => matches(plan, 'General fitness', 'Beginner', 2, 30),
    '02': () => matches(plan, 'Strength', 'Experienced', 4, 50),
    '03': () => Boolean(plan?.sessions.flat().every(entry => ['Dumbbells', 'Bodyweight'].includes(exercises[entry.id].gear))),
    '04': () => input.history.at(-1).sessions === 4 && plan?.sessions.length === 2,
    '05': () => weights(plan) === '25,15,0,20,0,15',
    '06': () => queued(state, 'high_difficulty'),
    '07': () => queued(state, 'missing_checkin'),
    '08': () => queued(state, 'new_pain') &&
      state.result.message === 'Stop that exercise. Your coach has been notified and will reach out. If the pain is severe, contact a doctor.',
    '09': () => state.result.type === 'answer' && !state.result.notifyCoach && !state.draft &&
      state.result.message === exercises.hinge.instructions,
    '10': () => queued(state, 'coach_question') &&
      state.result.message === 'Your question was added to the coach queue for follow-up.',
    '11': () => queued(state, 'no_plan'),
    '12': () => {
      if (!state.draft) return false;
      const before = clientView(state);
      const originalVersion = state.draft.version;
      state = approve(state, originalVersion);
      const firstApproval = clientView(state);
      state = edit(state, 'Coach-reviewed check-in.');
      const newVersion = state.draft.version;
      state = approve(state, originalVersion);
      const staleApproval = clientView(state);
      state = approve(state, newVersion);
      const secondApproval = clientView(state);
      actual = { before, firstApproval, staleApproval, secondApproval, state };
      return before === null && firstApproval?.version === originalVersion &&
        newVersion > originalVersion && JSON.stringify(staleApproval) === JSON.stringify(firstApproval) &&
        secondApproval?.version === newVersion && secondApproval.plan.note === 'Coach-reviewed check-in.' &&
        state.events.filter(event => event.event === 'approved').length === 2;
    }
  };
  rows.push({ id: input.id, title: input.title, expected: expected[input.id], passed: Boolean(checks[input.id]()), actual });
}
const passed = rows.filter(row => row.passed).length;
const results = { ranAtUtc: new Date().toISOString(), passed, total: rows.length, hitRate: passed / rows.length, rows };
if (process.argv[2]) await writeFile(process.argv[2], JSON.stringify(results, null, 2) + '\n', { flag: 'wx' });
for (const row of rows) {
  const result = row.actual.state?.result ?? row.actual.result;
  console.log(`${row.passed ? 'PASS' : 'FAIL'} ${row.id} · ${result.message}`);
}
console.log(`${passed}/${rows.length} (${(100 * results.hitRate).toFixed(1)}%)`);
if (passed < rows.length) process.exitCode = 1;
