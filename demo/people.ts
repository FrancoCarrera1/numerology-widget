/**
 * Web people roster.
 *
 * The static site has no server, so this local-only layer persists to
 * localStorage. It shares validation and energy calculations with the Node
 * roster via `src/people-model.ts`; every number still comes from the engine.
 */

import {
  addPersonToData,
  buildPersonEnergies,
  buildUpcoming,
  createDefaultPeopleData,
  normalizeBirthdate,
  normalizePeopleData,
  normalizePersonName,
  normalizeTags,
  orderPeople,
  removePersonFromData,
  serializePeopleData,
  setPrimaryInData,
  type PeopleData,
  type Person
} from '../src/people-model';
import type { NumerologyWidget } from '../src/web-component';

const PEOPLE_KEY = 'numerology-widget-people';
const BIRTHDAY_KEY = 'numerology-widget-birthday';
const DEFAULT_BIRTHDATE = '2003-05-23';

interface MountOptions {
  widget: NumerologyWidget;
  datePicker: HTMLInputElement;
  todayButton: HTMLButtonElement;
}

function escapeHtml(value: unknown): string {
  return String(value).replace(/[&<>"']/g, (character) => {
    switch (character) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      default: return '&#39;';
    }
  });
}

function readLegacyBirthday(): string {
  try {
    const saved = localStorage.getItem(BIRTHDAY_KEY);
    if (saved) return normalizeBirthdate(saved);
  } catch {
    // Fall through to the same public demo default the CLI uses.
  }
  return DEFAULT_BIRTHDATE;
}

export function mountPeopleRoster({ widget, datePicker, todayButton }: MountOptions) {
  const rosterList = document.getElementById('roster-list') as HTMLElement;
  const detailTitle = document.getElementById('detail-title') as HTMLElement;
  const detailEyebrow = document.getElementById('detail-eyebrow') as HTMLElement;
  const detailMeta = document.getElementById('detail-meta') as HTMLElement;
  const upcomingList = document.getElementById('upcoming-list') as HTMLElement;
  const upcomingWindow = document.getElementById('upcoming-window') as HTMLElement;
  const addButton = document.getElementById('add-person-button') as HTMLButtonElement;
  const editButton = document.getElementById('edit-person-button') as HTMLButtonElement;
  const dialog = document.getElementById('person-dialog') as HTMLDialogElement;
  const form = document.getElementById('person-form') as HTMLFormElement;
  const dialogTitle = document.getElementById('person-dialog-title') as HTMLElement;
  const formError = document.getElementById('person-form-error') as HTMLElement;
  const deleteButton = document.getElementById('delete-person-button') as HTMLButtonElement;
  const cancelButton = document.getElementById('cancel-person-button') as HTMLButtonElement;

  let peopleData: PeopleData = loadPeople();
  let selectedDate = widget.getDate();
  let selectedId = primaryPerson()?.id ?? peopleData.people[0]?.id ?? null;
  let editingId: string | null = null;

  datePicker.value = selectedDate;

  function loadPeople(): PeopleData {
    try {
      const stored = localStorage.getItem(PEOPLE_KEY);
      if (stored) return normalizePeopleData(JSON.parse(stored));
    } catch {
      // Corrupt local state should not blank the page; reseed below.
    }

    const seed = createDefaultPeopleData(readLegacyBirthday());
    persist(seed);
    return seed;
  }

  function persist(data: PeopleData) {
    try {
      localStorage.setItem(PEOPLE_KEY, JSON.stringify(serializePeopleData(data)));
      const primary = data.people.find((person) => person.primary);
      if (primary) localStorage.setItem(BIRTHDAY_KEY, primary.birthdate);
    } catch {
      // Keep the in-memory roster working even if storage is unavailable.
    }
  }

  function primaryPerson(): Person | null {
    return peopleData.people.find((person) => person.primary) ?? peopleData.people[0] ?? null;
  }

  function selectedPerson(): Person | null {
    return (
      peopleData.people.find((person) => person.id === selectedId) ??
      primaryPerson()
    );
  }

  function setPeople(data: PeopleData) {
    peopleData = data;
    persist(peopleData);
    render();
  }

  function render() {
    renderRoster();
    renderDetail();
  }

  function renderRoster() {
    const entries = orderPeople(peopleData.people).map((person) =>
      buildPersonEnergies(person, selectedDate)
    );

    rosterList.innerHTML = entries.map((entry) => {
      const person = entry.person;
      const classes = [
        'roster-row',
        person.primary ? 'primary' : '',
        person.id === selectedId ? 'selected' : ''
      ].filter(Boolean).join(' ');

      const tagLine = person.tags.length
        ? `<span class="roster-tags">${escapeHtml(person.tags.join(' · '))}</span>`
        : '';

      return `
        <article class="${classes}" data-person-id="${escapeHtml(person.id)}" role="button" tabindex="0"
                 aria-label="${escapeHtml(person.name)}${person.primary ? ', primary' : ''}. Life path ${escapeHtml(entry.lifePath.displayValue)}. Today ${escapeHtml(entry.fullDateEnergy.displayValue)} plus ${escapeHtml(entry.secondaryEnergy.displayValue)}.">
          <div class="roster-main">
            <div class="roster-identity">
              <span class="roster-name">${escapeHtml(person.name)}</span>
              ${person.primary ? '<span class="primary-badge">Primary</span>' : ''}
              ${tagLine}
            </div>
            <div class="roster-stats">
              <span class="roster-stat"><span class="roster-stat-label">LP</span><span class="roster-stat-value">${escapeHtml(entry.lifePath.displayValue)}</span></span>
              <span class="roster-stat"><span class="roster-stat-label">Full</span><span class="roster-stat-value">${escapeHtml(entry.fullDateEnergy.displayValue)}</span></span>
              <span class="roster-stat"><span class="roster-stat-label">2nd</span><span class="roster-stat-value secondary">${escapeHtml(entry.secondaryEnergy.displayValue)}</span></span>
            </div>
          </div>
          <div class="roster-actions">
            ${person.primary ? '' : `<button type="button" class="row-action" data-action="primary" data-person-id="${escapeHtml(person.id)}">Make primary</button>`}
            <button type="button" class="row-action" data-action="edit" data-person-id="${escapeHtml(person.id)}">Edit</button>
          </div>
        </article>
      `;
    }).join('');
  }

  function renderDetail() {
    const person = selectedPerson();

    if (!person) {
      detailTitle.textContent = 'No one selected';
      detailEyebrow.textContent = 'Person detail';
      detailMeta.textContent = 'Add a person to get started.';
      upcomingList.innerHTML = '';
      upcomingWindow.textContent = '';
      editButton.disabled = true;
      return;
    }

    selectedId = person.id;
    editButton.disabled = false;

    const energies = buildPersonEnergies(person, selectedDate);
    detailEyebrow.textContent = person.primary ? 'Primary person' : 'Person detail';
    detailTitle.textContent = person.name;

    const meta = [
      `<span>Life Path ${escapeHtml(energies.lifePath.displayValue)} · ${escapeHtml(energies.lifePath.summary)}</span>`,
      person.tags.length ? `<span>${escapeHtml(person.tags.join(' · '))}</span>` : '',
      person.notes ? `<span class="detail-note">${escapeHtml(person.notes)}</span>` : ''
    ].filter(Boolean).join('');
    detailMeta.innerHTML = meta;

    if (widget.getAttribute('birthday') !== person.birthdate) {
      widget.setAttribute('birthday', person.birthdate);
    }
    if (widget.getDate() !== selectedDate) {
      widget.setDate(selectedDate);
    }
    widget.setAttribute('show-weekly', '');

    const upcoming = buildUpcoming(person, {
      date: selectedDate,
      days: 30,
      favourableOnly: true
    }).slice(0, 5);

    upcomingWindow.textContent = `Next 5 · 30 days from ${selectedDate}`;
    upcomingList.innerHTML = upcoming.length
      ? upcoming.map((day) => {
          const label = new Date(`${day.date}T00:00:00`).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
          });
          return `
            <div class="upcoming-row">
              <span class="upcoming-date">${escapeHtml(label)}</span>
              <span class="upcoming-energies">
                <span class="upcoming-primary">${escapeHtml(day.fullDateEnergy.displayValue)}</span>
                <span class="upcoming-secondary">${escapeHtml(day.secondaryEnergy.displayValue)}</span>
              </span>
              <span class="upcoming-why">${escapeHtml(day.reason ?? '')}</span>
            </div>
          `;
        }).join('')
      : '<p class="upcoming-empty">No favourable days in the next 30 days.</p>';
  }

  function selectPerson(id: string) {
    selectedId = id;
    render();
  }

  function openForm(person?: Person) {
    editingId = person?.id ?? null;
    form.reset();
    formError.textContent = '';

    const name = form.elements.namedItem('name') as HTMLInputElement;
    const birthdate = form.elements.namedItem('birthdate') as HTMLInputElement;
    const tags = form.elements.namedItem('tags') as HTMLInputElement;
    const notes = form.elements.namedItem('notes') as HTMLTextAreaElement;
    const primary = form.elements.namedItem('primary') as HTMLInputElement;

    dialogTitle.textContent = person ? `Edit ${person.name}` : 'Add person';
    name.value = person?.name ?? '';
    birthdate.value = person?.birthdate ?? '';
    tags.value = person?.tags.join(', ') ?? '';
    notes.value = person?.notes ?? '';
    primary.checked = person?.primary ?? peopleData.people.length === 0;
    primary.disabled = person?.primary === true;
    deleteButton.hidden = !person;
    deleteButton.disabled = !person || peopleData.people.length <= 1;

    dialog.showModal();
    name.focus();
  }

  function closeForm() {
    dialog.close();
    editingId = null;
    formError.textContent = '';
  }

  function saveForm(event: SubmitEvent) {
    event.preventDefault();
    formError.textContent = '';

    const data = new FormData(form);
    const name = String(data.get('name') ?? '');
    const birthdate = String(data.get('birthdate') ?? '');
    const tags = String(data.get('tags') ?? '');
    const notes = String(data.get('notes') ?? '');
    const makePrimary = data.get('primary') === 'on';

    try {
      if (editingId) {
        const existing = peopleData.people.find((person) => person.id === editingId);
        if (!existing) throw new Error('That person no longer exists.');

        let next: PeopleData = {
          people: peopleData.people.map((person) =>
            person.id === editingId
              ? {
                  ...person,
                  name: normalizePersonName(name),
                  birthdate: normalizeBirthdate(birthdate),
                  tags: normalizeTags(tags),
                  notes: notes.trim(),
                  // An existing primary cannot be unset by editing the form.
                  primary: person.primary || makePrimary
                }
              : person
          )
        };

        if (makePrimary) {
          next = setPrimaryInData(next, editingId).data;
        } else {
          next = normalizePeopleData(next);
        }

        setPeople(next);
      } else {
        const { data: next, person } = addPersonToData(peopleData, {
          name,
          birthdate,
          tags,
          notes,
          primary: makePrimary
        });
        selectedId = person.id;
        setPeople(next);
      }

      closeForm();
    } catch (error) {
      formError.textContent = error instanceof Error ? error.message : String(error);
    }
  }

  function deletePerson() {
    if (!editingId) return;
    const person = peopleData.people.find((candidate) => candidate.id === editingId);
    if (!person) return;
    if (!window.confirm(`Remove ${person.name} from the roster?`)) return;

    try {
      const { data: next } = removePersonFromData(peopleData, editingId);
      if (selectedId === editingId) selectedId = next.people.find((candidate) => candidate.primary)?.id ?? null;
      setPeople(next);
      closeForm();
    } catch (error) {
      formError.textContent = error instanceof Error ? error.message : String(error);
    }
  }

  function setSelectedDate(date: string, syncWidget = true) {
    selectedDate = date;
    datePicker.value = date;
    if (syncWidget && widget.getDate() !== date) widget.setDate(date);
    renderRoster();
    renderDetail();
  }

  rosterList.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const action = target.closest<HTMLElement>('[data-action]');
    const row = target.closest<HTMLElement>('[data-person-id]');
    const id = action?.dataset.personId ?? row?.dataset.personId;
    if (!id) return;

    if (action?.dataset.action === 'edit') {
      const person = peopleData.people.find((candidate) => candidate.id === id);
      if (person) openForm(person);
      return;
    }

    if (action?.dataset.action === 'primary') {
      setPeople(setPrimaryInData(peopleData, id).data);
      return;
    }

    selectPerson(id);
  });

  rosterList.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const target = event.target as HTMLElement;
    if (target.closest('[data-action]')) return;
    const row = target.closest<HTMLElement>('[data-person-id]');
    if (!row?.dataset.personId) return;
    event.preventDefault();
    selectPerson(row.dataset.personId);
  });

  addButton.addEventListener('click', () => openForm());
  editButton.addEventListener('click', () => {
    const person = selectedPerson();
    if (person) openForm(person);
  });
  cancelButton.addEventListener('click', closeForm);
  deleteButton.addEventListener('click', deletePerson);
  form.addEventListener('submit', (event) => saveForm(event as SubmitEvent));

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) closeForm();
  });

  widget.addEventListener('date-change', (event) => {
    const date = (event as CustomEvent<{ date: string }>).detail?.date;
    if (date && date !== selectedDate) setSelectedDate(date, false);
  });

  widget.addEventListener('birthday-change', (event) => {
    const person = selectedPerson();
    const birthday = (event as CustomEvent<{ birthday: string | null }>).detail?.birthday;
    if (!person) return;

    if (!birthday) {
      widget.setAttribute('birthday', person.birthdate);
      return;
    }

    try {
      const normalized = normalizeBirthdate(birthday);
      if (normalized === person.birthdate) return;

      const next = {
        people: peopleData.people.map((candidate) =>
          candidate.id === person.id ? { ...candidate, birthdate: normalized } : candidate
        )
      };
      setPeople(next);
    } catch {
      widget.setAttribute('birthday', person.birthdate);
    }
  });

  datePicker.addEventListener('change', () => {
    if (!datePicker.value) return;
    setSelectedDate(datePicker.value);
  });

  todayButton.addEventListener('click', () => {
    widget.goToToday();
    setSelectedDate(widget.getDate(), false);
  });

  render();
}
