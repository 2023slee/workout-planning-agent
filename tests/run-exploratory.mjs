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
  ...input, checkIn: { ...input.checkIn, weight: -1 }
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
const offListLoads = [
  runCheckIn(input, { complete: true, loads: { squat: 22, row: 17.5, hinge: 35 } }),
  runCheckIn(cases[1], { complete: true, loads: { press: 135, pull: 62.5, deadlift: 105 } })
];
const benchLoads = [0, 62.5, 135].map(press =>
  runCheckIn(cases[1], { complete: true, loads: { press } }));
const results = {
  ranAtUtc: new Date().toISOString(),
  reportedBenchLoads: {
    passed: benchLoads.every(state => {
      const weight = state.input.checkIn.loads.press;
      const entries = state.draft?.plan.sessions.flat().filter(entry => entry.id === 'press');
      return Boolean(entries?.length && entries.every(entry => entry.weight === weight) &&
        state.result.message.includes('no automatic increase') && clientView(state) === null);
    }),
    actual: benchLoads
  },
  lowDifficulty: {
    passed: easy.every(state => state.result.reason === 'low_difficulty' && !state.draft &&
      state.events.some(event => event.event === 'coach_queued')),
    actual: easy
  },
  multipleLoads: {
    passed: expectLoad('press', 55) && expectLoad('pull', 70) && expectLoad('deadlift', 95) && expectLoad('squat', 25),
    actual: varied
  },
  allWeightedExercisesAcceptReportedLoads: {
    passed: offListLoads.every(state => Object.entries(state.input.checkIn.loads).every(([id, weight]) => {
      const entries = state.draft?.plan.sessions.flat().filter(entry => entry.id === id);
      return Boolean(entries?.length && entries.every(entry => entry.weight === weight) && clientView(state) === null);
    }) && state.result.message.includes('no automatic increase')),
    actual: offListLoads
  },
  newPain: {
    passed: clientView(newPain) === null && newPain.events.some(event => event.event === 'release_withdrawn'),
    actual: newPain
  },
  invalidLoad: {
    passed: invalidLoad.result.reason === 'invalid_load' && invalidLoad.draft === null,
    actual: invalidLoad
  }
};
if (process.argv[2]) await writeFile(process.argv[2], JSON.stringify(results, null, 2) + '\n', { flag: 'wx' });
for (const name of Object.keys(results).filter(name => name !== 'ranAtUtc')) {
  console.log(`${results[name].passed ? 'PASS' : 'FAIL'} ${name}`);
  if (!results[name].passed) process.exitCode = 1;
}
