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
const results = {
  ranAtUtc: new Date().toISOString(),
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
for (const name of ['newPain', 'unlistedLoad']) {
  console.log(`${results[name].passed ? 'PASS' : 'FAIL'} ${name}`);
  if (!results[name].passed) process.exitCode = 1;
}
