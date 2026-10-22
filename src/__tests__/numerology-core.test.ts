import { describe, expect, it } from 'vitest';
import {
  calculateCycleEnergies,
  calculateFullDateEnergy,
  calculateLifePath,
  calculateNumerologyEnergies,
  calculatePersonalMonth,
  calculatePersonalYear,
  calculateSecondaryEnergy,
  calculateUniversalMonth,
  calculateUniversalYear,
  formatDateKey,
  generateMonthlyCalendar,
  generateMonthlySchedule,
  generateWeeklySchedule,
  getEnergyStatisticalKey,
  getSecondaryEnergyStatisticalKey,
  parseBirthDateInput,
  parseBirthdayInput,
  parseDateInput,
  reduceCycleNumber,
  reduceToSingleDigit
} from '../numerology-core';

const date = (value: string) => parseDateInput(value);

describe('reduceToSingleDigit', () => {
  it('keeps master numbers whole', () => {
    expect(reduceToSingleDigit(11)).toBe(11);
    expect(reduceToSingleDigit(22)).toBe(22);
    expect(reduceToSingleDigit(33)).toBe(33);
  });

  it('reduces master numbers found during reduction', () => {
    expect(reduceToSingleDigit(29)).toBe(11);
    expect(reduceToSingleDigit(38)).toBe(11);
    expect(reduceToSingleDigit(499)).toBe(22);
  });

  it('reduces 28 like any other number (day 28 is not a master day)', () => {
    expect(reduceToSingleDigit(28)).toBe(1);
  });
});

describe('calculateFullDateEnergy', () => {
  // Expected values follow the GG33 / matrixprime rules
  const cases: Array<[string, string]> = [
    ['2025-11-08', '28'],
    ['2025-11-12', '5'],
    ['2025-12-07', '1/28'],
    ['2025-11-11', '4'],
    ['2025-09-15', '6/33'],
    ['2025-09-22', '4'],
    ['2025-02-09', '20/2'],
    ['2026-10-28', '3']
  ];

  it.each(cases)('%s -> %s', (input, expected) => {
    expect(calculateFullDateEnergy(date(input)).displayValue).toBe(expected);
  });

  it('treats a sum of 20 as 20/2 with a reduced value of 11', () => {
    const result = calculateFullDateEnergy(date('2025-02-09'));
    expect(result.displayValue).toBe('20/2');
    expect(result.reducedNumber).toBe(11);
    expect(result.originalSum).toBe(20);
  });

  it('keeps 28 whole for the full-date energy', () => {
    const result = calculateFullDateEnergy(date('2025-11-08'));
    expect(result.displayValue).toBe('28');
    expect(result.reducedNumber).toBe(28);
  });
});

describe('calculateSecondaryEnergy', () => {
  it('turns the 2nd into 11 energy', () => {
    expect(calculateSecondaryEnergy(date('2026-10-02')).displayValue).toBe('11');
  });

  it('shows the 20th as 20/2 and reduces to 11', () => {
    const result = calculateSecondaryEnergy(date('2026-10-20'));
    expect(result.displayValue).toBe('20/2');
    expect(result.reducedNumber).toBe(11);
  });

  it('keeps master days whole', () => {
    expect(calculateSecondaryEnergy(date('2026-10-11')).displayValue).toBe('11');
    expect(calculateSecondaryEnergy(date('2026-10-22')).displayValue).toBe('22');
  });

  it('reduces day 28 normally to 1', () => {
    const result = calculateSecondaryEnergy(date('2026-10-28'));
    expect(result.displayValue).toBe('1');
    expect(result.reducedNumber).toBe(1);
  });

  it('reduces ordinary days', () => {
    expect(calculateSecondaryEnergy(date('2026-10-15')).displayValue).toBe('6');
    expect(calculateSecondaryEnergy(date('2026-10-31')).displayValue).toBe('4');
  });
});

describe('calculateNumerologyEnergies', () => {
  it('combines both energies', () => {
    const result = calculateNumerologyEnergies('2025-11-08');
    expect(result.fullDateEnergy.displayValue).toBe('28');
    expect(result.secondaryEnergy.displayValue).toBe('8');
    expect(result.combinedKey).toBe('28 + 8');
  });

  it('accepts Date objects', () => {
    const result = calculateNumerologyEnergies(new Date(2025, 10, 8));
    expect(result.combinedKey).toBe('28 + 8');
  });

  it('rejects invalid dates', () => {
    expect(() => calculateNumerologyEnergies('not-a-date')).toThrow('Invalid date');
  });

  it('normalizes 20/2 for statistical grouping', () => {
    const result = calculateNumerologyEnergies('2025-02-09');
    expect(getEnergyStatisticalKey(result)).toBe('11');
  });

  it('normalizes the secondary 20/2 to 11', () => {
    const result = calculateNumerologyEnergies('2026-10-20');
    expect(getSecondaryEnergyStatisticalKey(result)).toBe('11');
  });
});

describe('date keys', () => {
  it('formats local dates without a UTC off-by-one', () => {
    expect(formatDateKey(new Date(2026, 9, 22))).toBe('2026-10-22');
    expect(formatDateKey(new Date(2026, 0, 1))).toBe('2026-01-01');
  });

  it('parses YYYY-MM-DD as local midnight', () => {
    const parsed = parseDateInput('2026-10-22');
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(9);
    expect(parsed.getDate()).toBe(22);
    expect(parsed.getHours()).toBe(0);
  });
});

describe('schedules', () => {
  it('generates seven consecutive days', () => {
    const schedule = generateWeeklySchedule('2026-10-22');
    expect(schedule).toHaveLength(7);
    expect(schedule[0].date).toBe('2026-10-22');
    expect(schedule[0].dayNumber).toBe(22);
    expect(schedule[6].date).toBe('2026-10-28');
    expect(schedule[6].dayNumber).toBe(28);
    expect(schedule[6].secondaryEnergy).toBe('1');
  });

  it('generates every day of a month', () => {
    expect(generateMonthlySchedule('2024-02-10')).toHaveLength(29);
    expect(generateMonthlySchedule('2025-02-10')).toHaveLength(28);
    expect(generateMonthlySchedule('2026-10-01')).toHaveLength(31);
  });
});

describe('generateMonthlyCalendar', () => {
  it('builds a Sunday-first grid with seven cells per week', () => {
    const calendar = generateMonthlyCalendar('2026-10-22');

    expect(calendar.monthLabel).toBe('October 2026');
    expect(calendar.days).toHaveLength(31);
    expect(calendar.weeks).toHaveLength(5);
    expect(calendar.weeks.every(week => week.length === 7)).toBe(true);

    // October 1, 2026 is a Thursday: four leading blanks.
    expect(calendar.weeks[0].slice(0, 4).every(cell => cell.date === null)).toBe(true);
    expect(calendar.weeks[0][4].date).toBe('2026-10-01');
    expect(calendar.weeks.flat().filter(cell => cell.date).length).toBe(31);
  });

  it('handles a month that starts on Sunday', () => {
    const calendar = generateMonthlyCalendar('2026-02-15');

    expect(calendar.weeks[0][0].date).toBe('2026-02-01');
    expect(calendar.weeks).toHaveLength(4);
    expect(calendar.days).toHaveLength(28);
  });

  it('handles a six-week month', () => {
    const calendar = generateMonthlyCalendar('2026-08-15');

    expect(calendar.weeks).toHaveLength(6);
    expect(calendar.weeks[0].filter(cell => cell.date).length).toBe(1);
  });

  it('handles leap February', () => {
    const calendar = generateMonthlyCalendar('2024-02-10');

    expect(calendar.days).toHaveLength(29);
    expect(calendar.weeks.flat().filter(cell => cell.date).length).toBe(29);
  });

  it('uses the same energies as the daily calculation', () => {
    const calendar = generateMonthlyCalendar('2026-10-22');
    const cell = calendar.weeks.flat().find(cell => cell.date === '2026-10-22');

    expect(cell?.schedule?.fullDateEnergy).toBe('6/33');
    expect(cell?.schedule?.secondaryEnergy).toBe('22');
  });
});

describe('Life Path', () => {
  const cases: Array<[string, string]> = [
    ['2003-05-23', '6'],
    ['1963-02-17', '11'],
    ['1847-02-11', '33'],
    ['1935-02-08', '28']
  ];

  it.each(cases)('%s -> %s', (input, expected) => {
    expect(calculateLifePath(input).displayValue).toBe(expected);
  });

  it('uses the whole birth date and keeps year digit sums whole', () => {
    const jordan = calculateLifePath('1963-02-17');
    expect(jordan.monthValue).toBe(2);
    expect(jordan.dayValue).toBe(8);
    expect(jordan.yearValue).toBe(19);
    expect(jordan.total).toBe(29);
    expect(jordan.reducedNumber).toBe(11);
    expect(jordan.isMaster).toBe(true);
    expect(jordan.calculationNote).toContain('29 → 11');
    expect(jordan.calculationNote).not.toContain('2 reads as 11');
  });

  it('keeps November, day 11 and day 22 whole', () => {
    const result = calculateLifePath('2003-11-22');
    expect(result.monthValue).toBe(11);
    expect(result.dayValue).toBe(22);
    expect(result.yearValue).toBe(5);
    expect(result.total).toBe(38);
    expect(result.displayValue).toBe('11');
  });

  it('keeps 33 as a master number with a 6 underneath', () => {
    const result = calculateLifePath('1847-02-11');
    expect(result.reducedNumber).toBe(33);
    expect(result.underlyingNumber).toBe(6);
    expect(result.isMaster).toBe(true);
    expect(result.displayValue).toBe('33');
    expect(result.summary).not.toBe('6');
  });

  it('reads a total of 20 as 11', () => {
    const result = calculateLifePath('2000-11-07');
    expect(result.total).toBe(20);
    expect(result.displayValue).toBe('11');
    expect(result.reducedNumber).toBe(11);
    expect(result.calculationNote).toContain('2 → 11');
  });

  it('keeps an exact 28 as the Wealth Life Path with a 1 underneath', () => {
    const result = calculateLifePath('1935-02-08');
    expect(result.total).toBe(28);
    expect(result.displayValue).toBe('28');
    expect(result.reducedNumber).toBe(28);
    expect(result.underlyingNumber).toBe(1);
    expect(result.isWealth).toBe(true);
    expect(result.isMaster).toBe(false);
    expect(result.summary).toContain('Wealth');
  });

  it('keeps a year whose digits total a master number whole', () => {
    const result = calculateLifePath('2009-01-01');
    expect(result.yearValue).toBe(11);
    expect(result.total).toBe(13);
    expect(result.displayValue).toBe('4');
  });

  it('requires a full birth date and validates the calendar date', () => {
    expect(parseBirthDateInput('2003-05-23')).toEqual({
      year: 2003,
      month: 5,
      day: 23
    });
    expect(() => parseBirthDateInput('05-23')).toThrow(/full birth date/i);
    expect(() => parseBirthDateInput('2003-02-30')).toThrow(/invalid/i);
  });
});

describe('timing cycles', () => {
  const birthday = '1990-05-23';

  it('reads a final 2 as 11 and preserves masters', () => {
    expect(reduceCycleNumber(2).displayValue).toBe('11');
    expect(reduceCycleNumber(20).displayValue).toBe('11');
    expect(reduceCycleNumber(29).displayValue).toBe('11');
    expect(reduceCycleNumber(11).displayValue).toBe('11');
    expect(reduceCycleNumber(22).displayValue).toBe('22');
    expect(reduceCycleNumber(33).displayValue).toBe('33');
    expect(reduceCycleNumber(28).displayValue).toBe('1');
  });

  it('calculates the Universal Year', () => {
    expect(calculateUniversalYear(2026).displayValue).toBe('1');
    expect(calculateUniversalYear(2026).originalSum).toBe(10);
    expect(calculateUniversalYear(2027).displayValue).toBe('11');
    expect(calculateUniversalYear(2028).displayValue).toBe('3');
  });

  it('calculates the Universal Month', () => {
    expect(calculateUniversalMonth('2026-10-22').displayValue).toBe('11');
    expect(calculateUniversalMonth('2026-11-15').displayValue).toBe('3');
    expect(calculateUniversalMonth('2026-12-01').displayValue).toBe('4');
    expect(calculateUniversalMonth('2027-01-01').displayValue).toBe('3');
    expect(calculateUniversalMonth('2027-11-01').displayValue).toBe('22');
  });

  it('calculates the birthday-based Personal Year', () => {
    const current = calculatePersonalYear('2026-10-22', birthday);
    expect(current.displayValue).toBe('11');
    expect(current.startDate).toBe('2026-05-23');
    expect(current.endDate).toBe('2027-05-23');

    // Before the birthday, the previous year's cycle is still active.
    const beforeBirthday = calculatePersonalYear('2026-01-01', birthday);
    expect(beforeBirthday.displayValue).toBe('1');
    expect(beforeBirthday.startDate).toBe('2025-05-23');

    const nextYear = calculatePersonalYear('2027-05-23', birthday);
    expect(nextYear.displayValue).toBe('3');
    expect(nextYear.startDate).toBe('2027-05-23');
  });

  it('calculates the birthday-based Personal Month', () => {
    // The Sep 23–Oct 23 cycle uses September: 11 + 9 = 20 → 11.
    const current = calculatePersonalMonth('2026-10-22', birthday);
    expect(current.displayValue).toBe('11');
    expect(current.startDate).toBe('2026-09-23');
    expect(current.endDate).toBe('2026-10-23');

    // On the 23rd, October starts: 11 + 10 = 21 → 3.
    const nextCycle = calculatePersonalMonth('2026-10-23', birthday);
    expect(nextCycle.displayValue).toBe('3');
    expect(nextCycle.startDate).toBe('2026-10-23');
    expect(nextCycle.endDate).toBe('2026-11-23');

    // November keeps its master month: 11 + 11 = 22.
    expect(calculatePersonalMonth('2026-11-23', birthday).displayValue).toBe('22');

    // Before the September transition, August is active.
    expect(calculatePersonalMonth('2026-09-22', birthday).displayValue).toBe('1');
  });

  it('returns universal cycles without a birthday and personal cycles with one', () => {
    const universalOnly = calculateCycleEnergies('2026-10-22');
    expect(universalOnly.universalMonth.displayValue).toBe('11');
    expect(universalOnly.personalYear).toBeNull();
    expect(universalOnly.personalMonth).toBeNull();

    const full = calculateCycleEnergies('2026-10-22', birthday);
    expect(full.universalYear.displayValue).toBe('1');
    expect(full.universalMonth.displayValue).toBe('11');
    expect(full.personalYear?.displayValue).toBe('11');
    expect(full.personalMonth?.displayValue).toBe('11');
  });

  it('accepts MM-DD birthdays for the desktop widget', () => {
    expect(parseBirthdayInput('05-23')).toEqual({ month: 5, day: 23 });
    expect(parseBirthdayInput('1990-05-23')).toEqual({ month: 5, day: 23 });
  });
});
