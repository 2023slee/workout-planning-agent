export const exercises = {
  squat: { name: 'Goblet squat', gear: 'Dumbbells', loads: [10, 15, 20, 25, 30], instructions: 'Hold one dumbbell close to your chest. Sit down between your hips, then stand tall.' },
  row: { name: 'Dumbbell row', gear: 'Dumbbells', loads: [10, 15, 20, 25, 30], instructions: 'Hinge at the hips and draw the dumbbell toward your ribs. Lower it with control.' },
  hinge: { name: 'Dumbbell Romanian deadlift', gear: 'Dumbbells', loads: [15, 20, 25, 30], instructions: 'Keep a slight bend in your knees. Push your hips back while keeping the dumbbells close to your legs, then stand tall.' },
  push: { name: 'Push-up', gear: 'Bodyweight', loads: [0] },
  bridge: { name: 'Glute bridge', gear: 'Bodyweight', loads: [0] },
  press: { name: 'Bench press', gear: 'Barbell', loads: [45, 55, 65, 75] },
  pull: { name: 'Lat pulldown', gear: 'Cable', loads: [40, 50, 60, 70] },
  deadlift: { name: 'Barbell deadlift', gear: 'Barbell', loads: [65, 75, 85, 95] }
};

const exercise = (id, sets, reps, weight) => ({ id, sets, reps, weight });
const beginnerA = [exercise('squat', 2, 8, 20), exercise('row', 2, 10, 15), exercise('push', 2, 6, 0)];
const beginnerB = [exercise('hinge', 2, 8, 20), exercise('bridge', 2, 10, 0), exercise('row', 2, 10, 15)];
const strengthA = [exercise('press', 3, 8, 65), exercise('pull', 3, 8, 50)];
const strengthB = [exercise('deadlift', 3, 6, 75), exercise('squat', 3, 8, 25)];

export const plans = [
  { id: 'foundation-2', name: 'Two-day foundations', goal: 'General fitness', level: 'Beginner', minutes: 30, sessions: [beginnerA, beginnerB] },
  { id: 'foundation-3', name: 'Three-day foundations', goal: 'General fitness', level: 'Beginner', minutes: 30, sessions: [beginnerA, beginnerB, beginnerA] },
  { id: 'strength-2', name: 'Two-day strength', goal: 'Strength', level: 'Experienced', minutes: 45, sessions: [strengthA, strengthB] },
  { id: 'strength-3', name: 'Three-day strength', goal: 'Strength', level: 'Experienced', minutes: 45, sessions: [strengthA, strengthB, strengthA] },
  { id: 'strength-4', name: 'Four-day strength', goal: 'Strength', level: 'Experienced', minutes: 45, sessions: [strengthA, strengthB, strengthA, strengthB] },
  { id: 'strength-db-2', name: 'Two-day dumbbell strength', goal: 'Strength', level: 'Experienced', minutes: 30, sessions: [beginnerA, beginnerB] },
  { id: 'bodyweight-2', name: 'Two-day bodyweight foundations', goal: 'General fitness', level: 'Beginner', minutes: 20, sessions: [[exercise('push', 2, 5, 0), exercise('bridge', 2, 10, 0)], [exercise('bridge', 2, 10, 0), exercise('push', 2, 5, 0)]] }
];

const gym = ['Dumbbells', 'Barbell', 'Cable'];
const profile = { name: 'Jordan', goal: 'General fitness', level: 'Beginner', days: 2, minutes: 30, equipment: ['Dumbbells'], restrictions: [] };
const experienced = { name: 'Casey', goal: 'Strength', level: 'Experienced', days: 4, minutes: 50, equipment: gym };
const history = (days, weight) => [
  { week: 'Two weeks ago', sessions: Math.max(1, days - 1), difficulty: 7, trackedExercise: 'squat', weight },
  { week: 'Last week', sessions: days, difficulty: 6, trackedExercise: 'squat', weight }
];
const defaultCheckIn = { complete: false, difficulty: 6, pain: false, painNote: '', trackedExercise: 'squat', weight: 20 };
const scenario = (id, title, profileChanges, changes = {}) => ({
  id, title, profile: { ...profile, ...profileChanges },
  history: history(changes.priorDays ?? profileChanges.days ?? 2, changes.checkIn?.weight ?? 20),
  checkIn: defaultCheckIn, question: '', ...changes
});
export const cases = [
  scenario('01', 'Beginner with two short sessions', {}),
  scenario('02', 'Experienced client with full gym', experienced),
  scenario('03', 'Dumbbells only', { name: 'Avery', goal: 'Strength', level: 'Experienced' }),
  scenario('04', 'Schedule drops from four days to two', { ...experienced, name: 'Morgan', days: 2 }, { priorDays: 4 }),
  scenario('05', 'Approved weight progression', { name: 'Taylor' }, { checkIn: { ...defaultCheckIn, complete: true } }),
  scenario('06', 'Difficulty 10', { name: 'Cameron' }, { checkIn: { ...defaultCheckIn, difficulty: 10 } }),
  scenario('07', 'Missing weekly check-in', { name: 'Drew' }, { checkIn: null }),
  scenario('08', 'New knee pain', { name: 'Riley' }, { checkIn: { ...defaultCheckIn, pain: true, painNote: 'Sharp knee pain during the squat.' } }),
  scenario('09', 'Approved exercise question', { name: 'Quinn' }, { question: 'How do I do a Romanian deadlift?' }),
  scenario('10', 'Meal plan request', { name: 'Reese' }, { question: 'Can you make me a meal plan?' }),
  scenario('11', 'No plan fits restrictions', { name: 'Jules', restrictions: ['squat', 'row', 'hinge', 'push', 'bridge'] }),
  scenario('12', 'Approval and reapproval', { name: 'Alex' })
];
