import { writeFile } from 'node:fs/promises';
import { cases } from '../dist/data.mjs';
import { startCase, generate, approve, clientView } from '../dist/planner.mjs';

const input = structuredClone(cases[0]);
const draft = generate(startCase(input));
const released = approve(draft, draft.draft.version);
const newPain = generate({
  ...released, input: { ...input, checkIn: { ...input.checkIn, pain: true } }
});
const invalidLoad = generate(startCase({
  ...input, checkIn: { ...input.checkIn, weight: 22 }
}));
const runCheckIn = (data, updates) => generate(startCase({
  ...data, checkIn: { ...data.checkIn, ...updates }
}));
const easy = [1, 2, 3].map(difficulty =>
  runCheckIn(input, { difficulty, complete: true, loads: { squat: 20, row: 15 } }));
const varied = runCheckIn(cases[1], { difficulty: 4, complete: true, loads: { press: 45, pull: 60, deadlift: 95 } });
const loads = varied.draft?.plan.sessions.flat();
const expectLoad = (id, weight) => Boolean(loads?.filter(entry => entry.id === id).length &&
  loads.filter(entry => entry.id === id).every(entry => entry.weight === weight));
const unsupportedRow = runCheckIn(input, { loads: { squat: 20, row: 22 } });
const results = {
  ranAtUtc: new Date().toISOString(),
  lowDifficulty: {
    passed: easy.every(state => state.result.reason === 'low_difficulty' && !state.draft &&
      state.events.some(event => event.event === 'coach_queued')),
    actual: easy
  },
  multipleLoads: {
    passed: expectLoad('press', 55) && expectLoad('pull', 70) && expectLoad('deadlift', 95) && expectLoad('squat', 25),
    actual: varied
  },
  unlistedOtherExerciseLoad: {
    passed: unsupportedRow.result.reason === 'unlisted_load' && !unsupportedRow.draft &&
      unsupportedRow.result.message.includes('Dumbbell row'),
    actual: unsupportedRow
  },
  newPain: {
    passed: clientView(newPain) === null && newPain.events.some(event => event.event === 'release_withdrawn'),
    actual: newPain
  },
  unlistedLoad: {
    passed: invalidLoad.result.reason === 'unlisted_load' && invalidLoad.draft === null,
    actual: invalidLoad
  }
};
if (process.argv[2]) await writeFile(process.argv[2], JSON.stringify(results, null, 2) + '\n', { flag: 'wx' });
for (const name of Object.keys(results).filter(name => name !== 'ranAtUtc')) {
  console.log(`${results[name].passed ? 'PASS' : 'FAIL'} ${name}`);
  if (!results[name].passed) process.exitCode = 1;
}
