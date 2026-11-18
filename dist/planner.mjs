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

export function recommend({ profile, checkIn, question }) {
  if (checkIn?.pain === true) return route('new_pain', painReply);
  if (question?.trim()) return handleQuestion(question);

  const validCheckIn = checkIn && Number.isInteger(checkIn.difficulty) &&
    checkIn.difficulty >= 1 && checkIn.difficulty <= 10 &&
    typeof checkIn.pain === 'boolean' && typeof checkIn.complete === 'boolean';
  if (!validCheckIn) return route('missing_checkin', 'Weekly check-in is missing or incomplete. Coach review requested.');
  if (checkIn.difficulty >= 9) return route('high_difficulty', 'Difficulty was 9 or 10. Planning is paused for coach review.');

  const eligible = plans.filter(plan => plan.goal === profile.goal && plan.level === profile.level &&
    plan.sessions.length === profile.days && plan.minutes <= profile.minutes &&
    plan.sessions.flat().every(({ id }) => !profile.restrictions.includes(id) &&
      (exercises[id].gear === 'Bodyweight' || profile.equipment.includes(exercises[id].gear))));
  if (!eligible.length) return route('no_plan', 'No approved plan fits this week’s constraints. Coach review requested.');

  eligible.sort((first, second) => second.minutes - first.minutes || first.id.localeCompare(second.id));
  const plan = structuredClone(eligible[0]);
  const tracked = exercises[checkIn.trackedExercise];
  const listedIndex = tracked?.loads.indexOf(checkIn.weight) ?? -1;
  const tracksSelectedExercise = plan.sessions.flat().some(entry => entry.id === checkIn.trackedExercise);
  if (tracksSelectedExercise && listedIndex < 0) {
    return route('unlisted_load', 'The reported load is outside the approved list. Coach review requested.');
  }
  const nextWeight = listedIndex >= 0 ? tracked.loads[listedIndex + 1] : undefined;
  const progress = checkIn.complete && checkIn.difficulty <= 7 && nextWeight !== undefined;
  let changed = false;
  for (const session of plan.sessions) {
    for (const entry of session) {
      if (entry.id !== checkIn.trackedExercise || listedIndex < 0) continue;
      entry.weight = progress ? nextWeight : checkIn.weight;
      changed ||= progress;
    }
  }

  const rationale = `Matches the ${plan.goal.toLowerCase()} goal and ${plan.level.toLowerCase()} level, with ${plan.sessions.length} sessions of ${plan.minutes} minutes using available equipment.`;
  const progression = changed ? ` ${tracked.name} moves from ${checkIn.weight} to the next listed load, ${nextWeight} lb.` : '';
  return { type: 'draft', plan, message: rationale + progression, notifyCoach: false };
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
