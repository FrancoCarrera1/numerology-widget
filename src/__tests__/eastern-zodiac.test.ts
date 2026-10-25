import { describe, expect, it } from 'vitest';

import {
  CAT_ALIASES,
  easternZodiacForYear,
  getEasternZodiac,
  resolveLunarYear
} from '../eastern-zodiac';
import { buildRoster, type Person } from '../people-model';

/**
 * These dates are already public in the docs (the fixture people the engine
 * tests use), so nothing private lands in the repo.
 */
const fixtures: Array<[string, string, string, number, number]> = [
  ['2003-05-23', 'Water Goat', '癸未', 2003, 20],
  ['1984-06-01', 'Wood Rat', '甲子', 1984, 1],
  ['2000-11-07', 'Metal Dragon', '庚辰', 2000, 17],
  ['1935-02-08', 'Wood Pig', '乙亥', 1935, 12],
  ['1847-02-11', 'Fire Horse', '丙午', 1846, 43],
  ['1963-02-17', 'Water Cat', '癸卯', 1963, 40],
  ['2026-10-25', 'Fire Horse', '丙午', 2026, 43]
];

describe('eastern zodiac fixtures', () => {
  it.each(fixtures)('%s → %s (%s)', (date, display, yearName, lunarYear, cycle) => {
    const zodiac = getEasternZodiac(date);

    expect(zodiac.display).toBe(display);
    expect(zodiac.yearName).toBe(yearName);
    expect(zodiac.year).toBe(lunarYear);
    expect(zodiac.cyclePosition).toBe(cycle);
    expect(zodiac.display).toBe(`${zodiac.element} ${zodiac.animal}`);
  });
});

describe('lunar new year boundary', () => {
  it('puts an early-February birthday in the previous animal year', () => {
    // 1985 Lunar New Year fell on 20 February; the 10th is still the Rat year.
    expect(getEasternZodiac('1985-02-10').display).toBe('Wood Rat');
    expect(getEasternZodiac('1985-02-10').year).toBe(1984);
    expect(getEasternZodiac('1985-02-21').year).toBe(1985);
  });

  it('turns over on the actual new year day, not 1 January', () => {
    // 2023 new year: 22 January. 2024 new year: 10 February.
    expect(getEasternZodiac('2023-01-21').display).toBe('Water Tiger');
    expect(getEasternZodiac('2023-02-01').display).toBe('Water Cat');
    expect(getEasternZodiac('2024-02-09').display).toBe('Water Cat');
    expect(getEasternZodiac('2024-02-10').display).toBe('Wood Dragon');
  });

  it('reports that the lunar calendar resolved the year', () => {
    expect(getEasternZodiac('2003-05-23').boundary).toBe('lunar');
    expect(resolveLunarYear('2003-01-15').year).toBe(2002);
  });
});

describe('sixty-year cycle', () => {
  it('repeats every sixty years', () => {
    const a = easternZodiacForYear(1984);
    const b = easternZodiacForYear(2044);
    const c = easternZodiacForYear(1924);

    expect([a.display, a.cyclePosition]).toEqual(['Wood Rat', 1]);
    expect([b.display, b.cyclePosition]).toEqual(['Wood Rat', 1]);
    expect([c.display, c.cyclePosition]).toEqual(['Wood Rat', 1]);
  });

  it('rotates all ten stems before repeating one', () => {
    const stems = Array.from({ length: 10 }, (_, index) => easternZodiacForYear(1984 + index).stem);
    expect(new Set(stems).size).toBe(10);
  });

  it('alternates polarity year by year', () => {
    expect(easternZodiacForYear(1984).polarity).toBe('yang');
    expect(easternZodiacForYear(1985).polarity).toBe('yin');
    expect(easternZodiacForYear(1986).polarity).toBe('yang');
  });

  it('handles years before the common era anchor without going negative', () => {
    const zodiac = easternZodiacForYear(4);
    expect(zodiac.cyclePosition).toBe(1);
    expect(zodiac.display).toBe('Wood Rat');
  });
});

describe('zodiac on people', () => {
  const people: Person[] = [
    { id: 'franco', name: 'Franco', birthdate: '2003-05-23', tags: ['self'], notes: '', primary: true },
    { id: 'lin', name: 'Lin', birthdate: '1985-02-10', tags: ['research'], notes: '', primary: false }
  ];

  it('derives each person\'s zodiac from their own birthdate', () => {
    const roster = buildRoster(people, '2026-10-25');

    expect(roster.map((entry) => entry.person.id)).toEqual(['franco', 'lin']);
    expect(roster.map((entry) => entry.zodiac.display)).toEqual(['Water Goat', 'Wood Rat']);
    expect(roster.map((entry) => entry.zodiac.yearName)).toEqual(['癸未', '甲子']);
  });

  it('keeps the zodiac fixed while the chosen date changes', () => {
    const first = buildRoster(people, '2026-10-25')[0].zodiac;
    const second = buildRoster(people, '1999-01-01')[0].zodiac;

    expect(second.display).toBe(first.display);
    expect(second.cyclePosition).toBe(first.cyclePosition);
  });
});

describe('invalid input', () => {
  it('rejects a malformed date', () => {
    expect(() => getEasternZodiac('23-05-2003')).toThrow(/YYYY-MM-DD/);
  });

  it('rejects a non-integer year', () => {
    expect(() => easternZodiacForYear(2003.5)).toThrow(/integer/);
  });
});

describe('the new year rule', () => {
  /** First date in `year` whose lunar year is `year`. */
  function newYearOf(year: number): string {
    for (let offset = 0; offset < 60; offset += 1) {
      const day = new Date(Date.UTC(year, 0, 1 + offset));
      const key = day.toISOString().slice(0, 10);
      if (resolveLunarYear(key).year === year) return key;
    }
    throw new Error(`no new year found for ${year}`);
  }

  it('always falls between 21 January and 20 February', () => {
    for (let year = 1950; year <= 2050; year += 1) {
      const key = newYearOf(year);
      const month = Number(key.slice(5, 7));
      const day = Number(key.slice(8, 10));

      expect([1, 2]).toContain(month);
      if (month === 1) expect(day).toBeGreaterThanOrEqual(21);
      if (month === 2) expect(day).toBeLessThanOrEqual(20);
    }
  });

  it('pins a known new year pair either side of the flip', () => {
    // 2024 new year was 10 February; 2023 was 22 January.
    expect(newYearOf(2024)).toBe('2024-02-10');
    expect(newYearOf(2023)).toBe('2023-01-22');
  });

  it('keeps the previous animal for the whole day before the flip', () => {
    const eve = new Date('2024-02-09T12:00:00Z');
    expect(getEasternZodiac(eve).animal).toBe('Cat');

    // 卯 is the Cat in GG33; Rabbit is the mainland Chinese name for the same
    // branch and stays accepted as an alias.
    expect(CAT_ALIASES).toContain('Rabbit');
    expect(getEasternZodiac('2024-02-10').animal).toBe('Dragon');
  });
});
