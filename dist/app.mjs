import { cases, exercises } from './data.mjs';
import { startCase, generate, edit, approve, clientView, planForProfile } from './planner.mjs';

const get = id => document.getElementById(id);
const make = (tag, text, classes) => {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (classes) node.className = classes;
  return node;
};
let state;
const tabs = [...document.querySelectorAll('.tab')];
const stages = tabs.map(tab => tab.dataset.view);
const summaries = {
  draft: 'Draft generated', escalation: 'Planning paused', answer: 'Library answer',
  coach_queued: 'Simulated coach notification', approved: 'Approved and released',
  edited: 'Edited, awaiting approval', release_withdrawn: 'Approved plan withdrawn after pain report'
};

function selectView(view) {
  for (const tab of tabs) {
    const active = tab.dataset.view === view;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-pressed', String(active));
  }
  for (const stage of stages) get(stage).hidden = stage !== view;
}

function renderLoadInputs(profile, checkIn) {
  const entries = planForProfile(profile)?.sessions.flat() ?? [];
  const weighted = new Map(entries.filter(({ id }) => exercises[id].gear !== 'Bodyweight').map(entry => [entry.id, entry]));
  const loads = checkIn?.loads ?? { [checkIn?.trackedExercise]: checkIn?.weight };
  const fields = get('load-inputs');
  fields.replaceChildren();
  get('exercise-loads').hidden = weighted.size === 0;
  for (const [id, entry] of weighted) {
    const label = make('label', exercises[id].name);
    const input = make('input');
    input.type = 'number';
    input.min = '0';
    input.max = '999';
    input.step = 'any';
    input.dataset.exercise = id;
    input.placeholder = `Plan: ${entry.weight} lb`;
    if (Object.hasOwn(loads, id)) input.value = loads[id];
    label.append(input);
    fields.append(label);
  }
}

function loadCase(id) {
  const input = structuredClone(cases.find(item => item.id === id));
  state = startCase(input);
  get('case-count').textContent = `${id} / ${cases.length}`;
  const profile = input.profile;
  const facts = {
    Client: profile.name, Goal: profile.goal, Experience: profile.level,
    Availability: `${profile.days} days × ${profile.minutes} min`,
    Equipment: profile.equipment.join(', ') || 'Bodyweight only',
    Restrictions: profile.restrictions.map(id => exercises[id].name).join(', ') || 'None'
  };
  const list = make('dl');
  for (const [label, value] of Object.entries(facts)) list.append(make('dt', label), make('dd', value));
  get('profile').replaceChildren(list);
  get('history').replaceChildren(...input.history.map(row =>
    make('p', `${row.week} · ${row.sessions} sessions · difficulty ${row.difficulty} · ${row.weight} lb goblet squat`)));
  get('missing').checked = input.checkIn === null;
  get('checkin-fields').disabled = input.checkIn === null;
  get('difficulty').value = input.checkIn?.difficulty ?? 6;
  renderLoadInputs(profile, input.checkIn);
  get('complete').checked = input.checkIn?.complete ?? false;
  get('pain').checked = input.checkIn?.pain ?? false;
  get('pain-note').value = input.checkIn?.painNote ?? '';
  get('question').value = input.question;
  render();
  selectView('checkin');
}

function renderPlan(container, versioned) {
  const { plan, version } = versioned;
  container.append(make('p', `${plan.name} · ${plan.minutes} min per session · Version ${version}`, 'chip'));
  if (plan.note) container.append(make('p', `Coach note · ${plan.note}`, 'notice'));
  plan.sessions.forEach((session, index) => {
    const section = make('section', undefined, 'session');
    section.append(make('h3', `Session ${index + 1}`));
    const table = make('table');
    const header = table.createTHead().insertRow();
    for (const heading of ['Exercise', 'Sets', 'Reps', 'Load']) {
      const cell = make('th', heading);
      cell.scope = 'col';
      header.append(cell);
    }
    const body = table.createTBody();
    for (const entry of session) {
      const row = body.insertRow();
      for (const value of [exercises[entry.id].name, entry.sets, entry.reps, exercises[entry.id].gear === 'Bodyweight' ? 'Bodyweight' : `${entry.weight} lb`]) {
        row.append(make('td', String(value)));
      }
    }
    section.append(table);
    container.append(section);
  });
}

function render() {
  const coach = get('coach');
  coach.replaceChildren(make('h2', 'Coach review'));
  if (!state.result) coach.append(make('p', 'Run a check-in to see the coach’s decision.', 'muted'));
  if (state.result) {
    const message = make('p', state.result.message, state.result.notifyCoach ? 'notice alert' : 'notice');
    message.setAttribute('role', 'status');
    coach.append(message);
  }
  if (state.result?.notifyCoach) {
    coach.append(make('p', 'Added to the simulated coach queue.', 'muted'));
    if (state.input.checkIn?.painNote) coach.append(make('p', state.input.checkIn.painNote));
  }
  if (state.draft) {
    const { version, plan } = state.draft;
    renderPlan(coach, state.draft);
    const editForm = make('form', undefined, 'actions');
    const note = make('input');
    note.id = 'coach-note';
    note.maxLength = 240;
    note.required = true;
    note.value = plan.note ?? '';
    note.placeholder = 'Add a note to the client’s plan';
    const label = make('label', 'Coach note');
    label.htmlFor = note.id;
    label.append(note);
    const save = make('button', 'Save edit', 'outline');
    save.type = 'submit';
    editForm.append(label, save);
    editForm.addEventListener('submit', event => {
      event.preventDefault();
      state = edit(state, note.value);
      render();
      get('coach-note').focus();
    });
    const accept = make('button', 'Approve and release', 'primary');
    accept.type = 'button';
    accept.disabled = state.released?.version === version;
    if (accept.disabled) accept.textContent = 'Version approved';
    accept.addEventListener('click', () => {
      state = approve(state, version);
      render();
      document.querySelector('[data-view="client"]').focus();
    });
    const actions = make('div', undefined, 'actions');
    actions.append(accept);
    coach.append(editForm, actions);
  }

  const client = get('client');
  client.replaceChildren(make('h2', 'Client preview'));
  const released = clientView(state);
  if (released) {
    if (released.version !== state.draft?.version) {
      client.append(make('p', `Showing approved version ${released.version}. Any new draft awaits coach approval.`, 'notice'));
    }
    renderPlan(client, released);
  } else {
    const display = state.result?.type === 'draft' ? 'Awaiting coach approval.' :
      state.result?.type === 'answer' || state.result?.reason === 'new_pain' ? state.result.message : 'No plan released.';
    client.append(make('p', display, 'notice'));
  }

  const events = get('events');
  get('download').disabled = !state.events.length;
  if (!state.events.length) {
    events.replaceChildren(make('p', 'No runs recorded for this case.', 'muted'));
    return;
  }
  const log = make('ul');
  for (const event of state.events) {
    log.append(make('li', summaries[event.event] + (event.version ? ` · version ${event.version}` : '') +
      (event.message ? ` · ${event.message}` : '')));
  }
  events.replaceChildren(log);
}

for (const item of cases) {
  const option = make('option', `${item.id} · ${item.title}`);
  option.value = item.id;
  get('cases').append(option);
}
get('cases').addEventListener('change', event => loadCase(event.target.value));
get('reset').addEventListener('click', () => loadCase(get('cases').value));
get('missing').addEventListener('change', event => { get('checkin-fields').disabled = event.target.checked; });
tabs.forEach(tab => tab.addEventListener('click', () => selectView(tab.dataset.view)));
get('run-form').addEventListener('submit', event => {
  event.preventDefault();
  const loads = Object.fromEntries([...get('load-inputs').querySelectorAll('input')]
    .filter(input => input.value !== '').map(input => [input.dataset.exercise, input.valueAsNumber]));
  const checkIn = get('missing').checked ? null : {
    difficulty: get('difficulty').valueAsNumber, complete: get('complete').checked,
    pain: get('pain').checked, painNote: get('pain-note').value, loads
  };
  state = generate({ ...state, input: { ...state.input, checkIn, question: get('question').value } });
  render();
  selectView('coach');
  document.querySelector('[data-view="coach"]').focus();
});
get('download').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }));
  const anchor = make('a');
  anchor.href = url;
  anchor.download = `case-${state.input.id}-run.json`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
loadCase(cases[0].id);
