import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  addPerson,
  getPerson,
  getPersonEnergies,
  getPrimaryPerson,
  getRoster,
  getUpcoming,
  listPeople,
  removePerson,
  setPrimary
} from '../people';

let directory: string;
let peopleFile: string;

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'numerology-people-'));
  peopleFile = join(directory, 'people.json');
  process.env.NUMEROLOGY_PEOPLE_FILE = peopleFile;
  process.env.NUMEROLOGY_BIRTH_DATE = '2003-05-23';
  delete process.env.CHART_BIRTH_DATE;
  delete process.env.BIRTHDAY;
});

afterEach(() => {
  rmSync(directory, { recursive: true, force: true });
  delete process.env.NUMEROLOGY_PEOPLE_FILE;
  delete process.env.NUMEROLOGY_BIRTH_DATE;
});

describe('people storage', () => {
  it('creates the primary person from the existing single-user config on first read', () => {
    const primary = getPrimaryPerson();

    expect(primary).toEqual({
      id: 'franco',
      name: 'Franco',
      birthdate: '2003-05-23',
      tags: ['self'],
      notes: '',
      primary: true
    });
    expect(existsSync(peopleFile)).toBe(true);
    expect(JSON.parse(readFileSync(peopleFile, 'utf8'))).toEqual({ people: [primary] });
  });

  it('adds people with unique derived ids and persists them across reads', () => {
    const gary = addPerson({
      name: 'Gary',
      birthdate: '1963-02-17',
      tags: ['friend', 'research'],
      notes: 'GG33'
    });
    const secondGary = addPerson({ name: 'Gary', birthdate: '1935-02-08' });

    expect(gary.id).toBe('gary');
    expect(secondGary.id).toBe('gary-2');
    expect(getPerson('gary')).toEqual(gary);

    const onDisk = JSON.parse(readFileSync(peopleFile, 'utf8'));
    expect(onDisk.people.map((person: { id: string }) => person.id)).toEqual([
      'franco',
      'gary',
      'gary-2'
    ]);
  });

  it('promotes a new primary and promotes the next person after a removal', () => {
    const gary = addPerson({ name: 'Gary', birthdate: '1963-02-17' });

    expect(setPrimary(gary.id)).toEqual({ ...gary, primary: true });
    expect(listPeople()[0].id).toBe('gary');

    removePerson('gary');
    expect(getPrimaryPerson()?.id).toBe('franco');
    expect(listPeople()).toHaveLength(1);
    expect(() => removePerson('franco')).toThrow(/last person/i);
  });

  it('rejects malformed or impossible birthdates with a clear message', () => {
    expect(() => addPerson({ name: 'Bad', birthdate: '05-23' })).toThrow(/YYYY-MM-DD/);
    expect(() => addPerson({ name: 'Bad', birthdate: '2003-02-30' })).toThrow(
      /not a real calendar date/
    );
  });
});

describe('multi-person life-path fixtures', () => {
  const fixtures: Array<[string, string, string, number | null]> = [
    ['Gary', '1963-02-17', '11', 2],
    ['Wealth', '1935-02-08', '28', 1],
    ['Teacher', '1847-02-11', '33', 6],
    ['Two becomes eleven', '2000-11-07', '11', 2]
  ];

  it.each(fixtures)('%s (%s) -> %s', (name, birthdate, display, underlying) => {
    const person = addPerson({ name, birthdate });
    const energies = getPersonEnergies(person.id, '2026-10-23');

    expect(energies.lifePath.displayValue).toBe(display);
    expect(energies.lifePath.reducedNumber).toBe(display === '28' ? 28 : Number(display));
    expect(energies.lifePath.underlyingNumber).toBe(underlying);
    expect(energies.lifePath.displayValue).not.toBe('2');
  });

  it('asserts the Wealth 28 keeps a 1 underneath', () => {
    const person = addPerson({ name: 'Wealth', birthdate: '1935-02-08' });
    const result = getPersonEnergies(person.id, '2026-10-23').lifePath;

    expect(result.isWealth).toBe(true);
    expect(result.total).toBe(28);
    expect(result.displayValue).toBe('28');
    expect(result.underlyingNumber).toBe(1);
  });

  it('asserts a final total of 2 reads as 11', () => {
    const person = addPerson({ name: 'Two becomes eleven', birthdate: '2000-11-07' });
    const result = getPersonEnergies(person.id, '2026-10-23').lifePath;

    expect(result.total).toBe(20);
    expect(result.reducedNumber).toBe(11);
    expect(result.displayValue).toBe('11');
    expect(result.calculationNote).toContain('2 → 11');
  });
});

describe('roster fixtures', () => {
  it('pins the primary first and computes every person from their own birthdate', () => {
    addPerson({ name: 'Gary', birthdate: '1963-02-17' });
    addPerson({ name: 'Lin', birthdate: '1847-02-11' });
    addPerson({ name: 'Wealth', birthdate: '1935-02-08' });

    const roster = getRoster('2026-10-23');

    expect(roster.map((entry) => entry.person.id)).toEqual([
      'franco',
      'gary',
      'lin',
      'wealth'
    ]);
    expect(roster.map((entry) => entry.lifePath.displayValue)).toEqual([
      '6',
      '11',
      '33',
      '28'
    ]);
    expect(roster.map((entry) => entry.cycles.personalMonth?.startDate)).toEqual([
      '2026-10-23',
      '2026-10-17',
      '2026-10-11',
      '2026-10-08'
    ]);

    // If the roster accidentally used the primary's birthdate, these would all
    // repeat Franco's October 23 personal-month boundary.
    expect(new Set(roster.map((entry) => entry.cycles.personalMonth?.startDate)).size).toBe(4);
  });
});

describe('upcoming fixtures', () => {
  it('returns only favourable days, ascending, inside the requested window', () => {
    addPerson({ name: 'Gary', birthdate: '1963-02-17' });

    const upcoming = getUpcoming('gary', { date: '2026-10-20', days: 15 });

    expect(upcoming.map((day) => day.date)).toEqual([
      '2026-10-21',
      '2026-10-22',
      '2026-10-25',
      '2026-10-28',
      '2026-10-30',
      '2026-10-31',
      '2026-11-02',
      '2026-11-03'
    ]);
    expect(upcoming.every((day) => day.favourable)).toBe(true);
    expect(upcoming.every((day) => day.date >= '2026-10-20' && day.date < '2026-11-04')).toBe(true);

    const allDays = getUpcoming('gary', {
      date: '2026-10-20',
      days: 15,
      favourableOnly: false
    });
    expect(allDays).toHaveLength(15);
    expect(allDays.map((day) => day.date)).toEqual(
      [...allDays.map((day) => day.date)].sort()
    );
    expect(allDays.filter((day) => day.favourable).map((day) => day.date)).toEqual(
      upcoming.map((day) => day.date)
    );
  });

  it('keeps a Wealth 28 day even though 28 would reduce to 1', () => {
    addPerson({ name: 'Wealth', birthdate: '1935-02-08' });

    const upcoming = getUpcoming('wealth', { date: '2025-11-01', days: 31 });
    const wealthDay = upcoming.find((day) => day.date === '2025-11-08');

    expect(wealthDay?.fullDateEnergy.displayValue).toBe('28');
    expect(wealthDay?.reason).toContain('28');
    expect(upcoming.every((day) => day.favourable)).toBe(true);
  });
});
