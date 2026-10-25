/**
 * People model and per-person energy wrappers.
 *
 * This module is deliberately browser-safe: it has no filesystem imports so the
 * web roster can share the same validation and ordering rules as the Node
 * storage layer. Every number still comes from `numerology-core.ts`; nothing
 * here re-implements a reduction.
 */

import {
  calculateCycleEnergies,
  calculateLifePath,
  calculateNumerologyEnergies,
  formatDateKey,
  parseBirthDateInput,
  parseDateInput,
  reduceToSingleDigit,
  type CycleEnergiesResult,
  type FullDateEnergyResult,
  type LifePathResult,
  type SecondaryEnergyResult
} from './numerology-core';

export interface Person {
  id: string;
  name: string;
  birthdate: string;
  tags: string[];
  notes: string;
  primary: boolean;
}

export interface PeopleData {
  people: Person[];
}

export interface AddPersonInput {
  name: string;
  birthdate: string;
  tags?: string[] | string;
  notes?: string;
  /** Optional explicit id; otherwise derived from the name. */
  id?: string;
  /** Ask for the new person to become primary. The first person is always primary. */
  primary?: boolean;
}

export interface PersonEnergies {
  person: Person;
  lifePath: LifePathResult;
  fullDateEnergy: FullDateEnergyResult;
  secondaryEnergy: SecondaryEnergyResult;
  combinedKey: string;
  cycles: CycleEnergiesResult;
}

export interface UpcomingOptions {
  /** Start date, inclusive. Defaults to today. */
  date?: string | Date;
  /** Number of calendar days to scan, starting at `date`. Defaults to 30. */
  days?: number;
  /** Defaults to true: only days that qualify as favourable are returned. */
  favourableOnly?: boolean;
}

export interface UpcomingDay {
  date: string;
  weekday: string;
  fullDateEnergy: FullDateEnergyResult;
  secondaryEnergy: SecondaryEnergyResult;
  combinedKey: string;
  favourable: boolean;
  /** Human-readable reason when the day is favourable, otherwise null. */
  reason: string | null;
}

export const FAVOURABLE_NUMBERS = new Set([3, 5, 6, 9]);

const DEFAULT_BIRTHDATE = '2003-05-23';

function padTwo(value: number): string {
  return String(value).padStart(2, '0');
}

/** Turn a display name into a stable, URL-safe id. */
export function slugifyPersonId(value: string): string {
  const slug = String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'person';
}

function uniquePersonId(base: string, usedIds: Iterable<string>): string {
  const used = new Set(usedIds);
  if (!used.has(base)) return base;

  let suffix = 2;
  while (used.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

export function normalizePersonName(value: unknown): string {
  const name = typeof value === 'string' ? value.trim() : '';
  if (!name) throw new Error('Person name is required');
  return name;
}

/**
 * Validate a full birth date and return it in canonical YYYY-MM-DD form.
 * Malformed input gets a message that names the expected format.
 */
export function normalizeBirthdate(value: unknown): string {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw new Error(`Invalid birthdate "${String(value ?? '')}": expected YYYY-MM-DD`);
  }

  try {
    const { year, month, day } = parseBirthDateInput(text);
    return `${year}-${padTwo(month)}-${padTwo(day)}`;
  } catch {
    throw new Error(`Invalid birthdate "${text}": not a real calendar date`);
  }
}

export function normalizeTags(value: unknown): string[] {
  const raw = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : [];

  const tags: string[] = [];
  for (const item of raw) {
    const tag = String(item).trim();
    if (tag && !tags.includes(tag)) tags.push(tag);
  }
  return tags;
}

function normalizeNotes(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function serializePerson(person: Person): Person {
  return {
    id: person.id,
    name: person.name,
    birthdate: person.birthdate,
    tags: [...person.tags],
    notes: person.notes,
    primary: person.primary
  };
}

/** Normalize a parsed people document, keeping exactly one primary person. */
export function normalizePeopleData(raw: unknown): PeopleData {
  const peopleRaw = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object' && Array.isArray((raw as { people?: unknown }).people)
      ? (raw as { people: unknown[] }).people
      : null;

  if (!peopleRaw) {
    throw new Error('People file must contain a "people" array');
  }

  const usedIds = new Set<string>();
  const people = peopleRaw.map((entry, index) => {
    if (!entry || typeof entry !== 'object') {
      throw new Error(`Person ${index + 1} must be an object`);
    }

    const record = entry as Record<string, unknown>;
    const name = normalizePersonName(record.name);
    const requestedId = typeof record.id === 'string' && record.id.trim()
      ? slugifyPersonId(record.id)
      : slugifyPersonId(name);

    if (usedIds.has(requestedId)) {
      throw new Error(`Duplicate person id "${requestedId}"`);
    }
    usedIds.add(requestedId);

    return {
      id: requestedId,
      name,
      birthdate: normalizeBirthdate(record.birthdate),
      tags: normalizeTags(record.tags),
      notes: normalizeNotes(record.notes),
      primary: record.primary === true
    };
  });

  const primaryCount = people.filter((person) => person.primary).length;
  if (primaryCount > 1) {
    throw new Error('Only one person may be primary');
  }
  if (primaryCount === 0 && people.length > 0) {
    people[0] = { ...people[0], primary: true };
  }

  return { people };
}

export function serializePeopleData(data: PeopleData): PeopleData {
  return { people: data.people.map(serializePerson) };
}

export function orderPeople(people: Person[]): Person[] {
  return [
    ...people.filter((person) => person.primary),
    ...people.filter((person) => !person.primary)
  ];
}

export function addPersonToData(
  data: PeopleData,
  input: AddPersonInput
): { data: PeopleData; person: Person } {
  const name = normalizePersonName(input.name);
  const birthdate = normalizeBirthdate(input.birthdate);
  const usedIds = data.people.map((person) => person.id);
  const baseId = input.id && input.id.trim()
    ? slugifyPersonId(input.id)
    : slugifyPersonId(name);
  const id = uniquePersonId(baseId, usedIds);

  const makePrimary = data.people.length === 0 || input.primary === true;
  const people = data.people.map((person) => ({
    ...person,
    tags: [...person.tags],
    primary: makePrimary ? false : person.primary
  }));

  const person: Person = {
    id,
    name,
    birthdate,
    tags: normalizeTags(input.tags),
    notes: normalizeNotes(input.notes),
    primary: makePrimary
  };

  people.push(person);
  return { data: { people }, person };
}

export function removePersonFromData(
  data: PeopleData,
  id: string
): { data: PeopleData; person: Person } {
  const index = data.people.findIndex((person) => person.id === id);
  if (index < 0) throw new Error(`Unknown person: ${id}`);
  if (data.people.length === 1) {
    throw new Error('Cannot remove the last person; add someone else first');
  }

  const person = data.people[index];
  const people = data.people.filter((candidate) => candidate.id !== id);

  if (person.primary) {
    people[0] = { ...people[0], primary: true };
  }

  return { data: { people }, person };
}

export function setPrimaryInData(
  data: PeopleData,
  id: string
): { data: PeopleData; person: Person } {
  const found = data.people.find((person) => person.id === id);
  if (!found) throw new Error(`Unknown person: ${id}`);

  const people = data.people.map((person) => ({
    ...person,
    primary: person.id === id
  }));

  return {
    data: { people },
    person: people.find((person) => person.id === id)!
  };
}

/** Default roster used when a people file does not exist yet. */
export function createDefaultPeopleData(birthdate = DEFAULT_BIRTHDATE): PeopleData {
  return {
    people: [
      {
        id: 'franco',
        name: 'Franco',
        birthdate: normalizeBirthdate(birthdate),
        tags: ['self'],
        notes: '',
        primary: true
      }
    ]
  };
}

/** All energies for one person on one date. */
export function buildPersonEnergies(
  person: Person,
  dateInput: string | Date = new Date()
): PersonEnergies {
  const date = parseDateInput(dateInput);
  const daily = calculateNumerologyEnergies(date);

  return {
    person,
    lifePath: calculateLifePath(person.birthdate),
    fullDateEnergy: daily.fullDateEnergy,
    secondaryEnergy: daily.secondaryEnergy,
    combinedKey: daily.combinedKey,
    cycles: calculateCycleEnergies(date, person.birthdate)
  };
}

/** One entry per person, primary first, each computed from their own birthdate. */
export function buildRoster(
  people: Person[],
  dateInput: string | Date = new Date()
): PersonEnergies[] {
  return orderPeople(people).map((person) => buildPersonEnergies(person, dateInput));
}

/**
 * A day is favourable when either calculation method resolves to 3/5/6/9, or
 * when the day is the special Wealth 28. Reduction still goes through the
 * engine, so 20/2 stays 11 and does not qualify.
 */
export function isFavourableDay(fullDateEnergy: FullDateEnergyResult): boolean {
  return favourableReason(fullDateEnergy) !== null;
}

function favourableReason(fullDateEnergy: FullDateEnergyResult): string | null {
  const tokens = String(fullDateEnergy.displayValue).split('/');

  if (tokens.includes('28')) return '28 Wealth day';

  for (const token of tokens) {
    const value = Number(token);
    if (!Number.isFinite(value)) continue;
    if (FAVOURABLE_NUMBERS.has(reduceToSingleDigit(value))) {
      return `full date ${fullDateEnergy.displayValue}`;
    }
  }

  return null;
}

/**
 * Upcoming days for one person. The window starts on `date` (inclusive), scans
 * `days` calendar days, and returns ascending results.
 */
export function buildUpcoming(
  person: Person,
  options: UpcomingOptions = {}
): UpcomingDay[] {
  const start = parseDateInput(options.date ?? new Date());
  const days = options.days ?? 30;
  const favourableOnly = options.favourableOnly !== false;

  if (!Number.isInteger(days) || days < 1) {
    throw new Error('days must be a positive integer');
  }

  const first = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const upcoming: UpcomingDay[] = [];

  for (let offset = 0; offset < days; offset += 1) {
    const current = new Date(first);
    current.setDate(first.getDate() + offset);

    const daily = calculateNumerologyEnergies(current);
    const reason = favourableReason(daily.fullDateEnergy);
    const favourable = reason !== null;

    if (favourableOnly && !favourable) continue;

    upcoming.push({
      date: formatDateKey(current),
      weekday: current.toLocaleDateString('en-US', { weekday: 'short' }),
      fullDateEnergy: daily.fullDateEnergy,
      secondaryEnergy: daily.secondaryEnergy,
      combinedKey: daily.combinedKey,
      favourable,
      reason
    });
  }

  return upcoming;
}
