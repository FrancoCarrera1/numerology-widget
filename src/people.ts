/**
 * Node people storage.
 *
 * The calculation and validation rules live in `people-model.ts`; this file only
 * reads and writes the local JSON roster. Birthdays are personal data, so the
 * default file (`data/people.json`) is gitignored.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync
} from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  addPersonToData,
  buildPersonEnergies,
  buildRoster,
  buildUpcoming,
  createDefaultPeopleData,
  normalizeBirthdate,
  normalizePeopleData,
  orderPeople,
  removePersonFromData,
  serializePeopleData,
  setPrimaryInData,
  type AddPersonInput,
  type PeopleData,
  type Person,
  type PersonEnergies,
  type UpcomingDay,
  type UpcomingOptions
} from './people-model';

export * from './people-model';

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(MODULE_DIR, '..');
const DEFAULT_BIRTHDATE = '2003-05-23';
const LEGACY_BIRTHDAY_FILE = resolve(REPO_ROOT, 'uebersicht', 'birthday.txt');

/** The people file in use. Relative overrides are resolved from the cwd. */
export function getPeopleFilePath(): string {
  const configured = process.env.NUMEROLOGY_PEOPLE_FILE?.trim();
  if (!configured) return resolve(REPO_ROOT, 'data', 'people.json');
  return isAbsolute(configured) ? configured : resolve(process.cwd(), configured);
}

function firstValidBirthdate(values: Array<string | undefined>): string | null {
  for (const value of values) {
    if (!value) continue;
    try {
      return normalizeBirthdate(value.trim());
    } catch {
      // Legacy MM-DD values cannot supply Life Path; keep looking.
    }
  }
  return null;
}

/**
 * Preserve the single-user setup on first run. The CLI/app use
 * CHART_BIRTH_DATE or the built-in default; the Übersicht widget uses BIRTHDAY
 * or its gitignored birthday.txt.
 */
function migrationBirthdate(): string {
  const fromEnv = firstValidBirthdate([
    process.env.NUMEROLOGY_BIRTH_DATE,
    process.env.CHART_BIRTH_DATE,
    process.env.BIRTHDAY
  ]);
  if (fromEnv) return fromEnv;

  if (existsSync(LEGACY_BIRTHDAY_FILE)) {
    try {
      const fromFile = firstValidBirthdate([readFileSync(LEGACY_BIRTHDAY_FILE, 'utf8')]);
      if (fromFile) return fromFile;
    } catch {
      // Ignore an unreadable legacy file and use the built-in default.
    }
  }

  return DEFAULT_BIRTHDATE;
}

function writePeopleData(data: PeopleData): void {
  const file = getPeopleFilePath();
  mkdirSync(dirname(file), { recursive: true });

  const payload = JSON.stringify(serializePeopleData(data), null, 2) + '\n';
  const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;

  writeFileSync(temporary, payload, 'utf8');
  renameSync(temporary, file);
}

/**
 * Read the roster, creating it with the existing single-user birthdate when the
 * file does not exist. There is no cache: a CLI write is visible immediately.
 */
export function readPeopleData(): PeopleData {
  const file = getPeopleFilePath();

  if (!existsSync(file)) {
    const data = createDefaultPeopleData(migrationBirthdate());
    writePeopleData(data);
    return data;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not read people file ${file}: ${message}`);
  }

  return normalizePeopleData(parsed);
}

/** Everyone in the roster, primary first, otherwise insertion order. */
export function listPeople(): Person[] {
  return orderPeople(readPeopleData().people);
}

export function getPerson(id: string): Person | null {
  return readPeopleData().people.find((person) => person.id === id) ?? null;
}

export function getPrimaryPerson(): Person | null {
  const people = orderPeople(readPeopleData().people);
  return people[0] ?? null;
}

function requirePerson(id: string): Person {
  const person = getPerson(id);
  if (!person) throw new Error(`Unknown person: ${id}`);
  return person;
}

export function addPerson(input: AddPersonInput): Person {
  const { data, person } = addPersonToData(readPeopleData(), input);
  writePeopleData(data);
  return person;
}

export function removePerson(id: string): Person {
  const { data, person } = removePersonFromData(readPeopleData(), id);
  writePeopleData(data);
  return person;
}

export function setPrimary(id: string): Person {
  const { data, person } = setPrimaryInData(readPeopleData(), id);
  writePeopleData(data);
  return person;
}

export function getPersonEnergies(
  personId: string,
  date: string | Date = new Date()
): PersonEnergies {
  return buildPersonEnergies(requirePerson(personId), date);
}

export function getRoster(date: string | Date = new Date()): PersonEnergies[] {
  return buildRoster(readPeopleData().people, date);
}

export function getUpcoming(
  personId: string,
  options: UpcomingOptions = {}
): UpcomingDay[] {
  return buildUpcoming(requirePerson(personId), options);
}
