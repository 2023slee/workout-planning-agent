import { exercises, plans } from './data.mjs';

export const painReply = 'Stop that exercise. Your coach has been notified and will reach out. If the pain is severe, contact a doctor.';
const route = (reason, message) => ({ type: 'escalation', reason, message, notifyCoach: true });

function handleQuestion(question) {
  const query = question.trim().toLowerCase();
  const approved = {
    'how do i do a romanian deadlift?': 'hinge',
    'how do i do a dumbbell romanian deadlift?': 'hinge',
    'how do i do a goblet squat?': 'squat',
    'how do i do a dumbbell row?': 'row'
  };
  const exercise = Object.hasOwn(approved, query) ? exercises[approved[query]] : null;
  if (exercise) return { type: 'answer', message: exercise.instructions, notifyCoach: false };
  return route('coach_question', 'Your question was added to the coach queue for follow-up.');
}

export function planForProfile(profile) {
  const eligible = plans.filter(plan => plan.goal === profile.goal && plan.level === profile.level &&
    plan.sessions.length === profile.days && plan.minutes <= profile.minutes &&
    plan.sessions.flat().every(({ id }) => !profile.restrictions.includes(id) &&
      (exercises[id].gear === 'Bodyweight' || profile.equipment.includes(exercises[id].gear))));
  eligible.sort((first, second) => second.minutes - first.minutes || first.id.localeCompare(second.id));
  return eligible[0];
}

export function recommend({ profile, checkIn, question }) {
  if (checkIn?.pain === true) return route('new_pain', painReply);
  if (Number.isInteger(checkIn?.difficulty) && checkIn.difficulty >= 1 && checkIn.difficulty <= 3) {
    return route('low_difficulty', 'Difficulty was 1–3 (too easy). Planning is paused for coach review.');
  }
  if (question?.trim()) return handleQuestion(question);

  const validCheckIn = checkIn && Number.isInteger(checkIn.difficulty) &&
    checkIn.difficulty >= 1 && checkIn.difficulty <= 10 &&
    typeof checkIn.pain === 'boolean' && typeof checkIn.complete === 'boolean';
  if (!validCheckIn) return route('missing_checkin', 'Weekly check-in is missing or incomplete. Coach review requested.');
  if (checkIn.difficulty >= 9) return route('high_difficulty', 'Difficulty was 9 or 10. Planning is paused for coach review.');

  const selected = planForProfile(profile);
  if (!selected) return route('no_plan', 'No approved plan fits this week’s constraints. Coach review requested.');

  const plan = structuredClone(selected);
  const reportedLoads = checkIn.loads ?? { [checkIn.trackedExercise]: checkIn.weight };
  const adjustments = new Map();
  for (const entry of plan.sessions.flat()) {
    if (!Object.hasOwn(reportedLoads, entry.id)) continue;
    const exercise = exercises[entry.id];
    if (exercise.gear === 'Bodyweight') continue;
    const weight = reportedLoads[entry.id];
    if (!Number.isFinite(weight) || weight < 0) {
      return route('invalid_load', `${exercise.name}: enter a valid nonnegative load. Coach review requested.`);
    }
    const index = exercise.loads.indexOf(weight);
    if (index < 0) {
      entry.weight = weight;
      adjustments.set(entry.id, `${exercise.name} stays at the reported ${weight} lb for coach review, with no automatic increase`);
      continue;
    }
    const nextWeight = exercise.loads[index + 1];
    const canProgress = checkIn.complete && checkIn.difficulty <= 7 && nextWeight !== undefined;
    entry.weight = canProgress ? nextWeight : weight;
    if (canProgress) adjustments.set(entry.id, `${exercise.name} moves from ${weight} to the next listed load, ${nextWeight} lb`);
  }

  const rationale = `Matches the ${plan.goal.toLowerCase()} goal and ${plan.level.toLowerCase()} level, with ${plan.sessions.length} sessions of ${plan.minutes} minutes using available equipment.`;
  const changes = [...adjustments.values()];
  const message = changes.length ? `${rationale} ${new Intl.ListFormat('en').format(changes)}.` : rationale;
  return { type: 'draft', plan, message, notifyCoach: false };
}

export function startCase(input) {
  return { input, result: null, draft: null, released: null, version: 0, events: [] };
}

function record(state, event, details) {
  return [...state.events, { event, ...details }];
}

export function generate(state) {
  const result = recommend(state.input);
  const version = state.version + Number(result.type === 'draft');
  const draft = result.type === 'draft' ? { version, plan: result.plan } : null;
  let events = record(state, result.type, { message: result.message, reason: result.reason, version: draft?.version });
  if (result.notifyCoach) events = [...events, { event: 'coach_queued', reason: result.reason }];
  const releaseWithdrawn = result.reason === 'new_pain' && state.released;
  if (releaseWithdrawn) events = [...events, { event: 'release_withdrawn', version: state.released.version }];
  const released = releaseWithdrawn ? null : state.released;
  return { ...state, result, draft, released, version, events };
}

export function edit(state, note) {
  const clean = note.trim();
  if (!state.draft || !clean || clean === state.draft.plan.note) return state;
  const version = state.version + 1;
  const draft = { version, plan: { ...state.draft.plan, note: clean } };
  return { ...state, draft, version, events: record(state, 'edited', { version }) };
}

export function approve(state, version) {
  if (!state.draft || version !== state.draft.version || state.released?.version === version) return state;
  const released = structuredClone(state.draft);
  return { ...state, released, events: record(state, 'approved', { version }) };
}

export function clientView(state) {
  return state.released ? structuredClone(state.released) : null;
}
