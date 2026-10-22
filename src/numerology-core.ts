/**
 * Numerology Core Calculation Engine
 * 
 * Based on the Gary the Numbers Guy (matrixprime on X.com) GG33 numerology
 * system, including the universal and personal timing cycles.
 * 
 * This module has ZERO dependencies and can run in any JavaScript environment:
 * - Browser
 * - Node.js
 * - Deno
 * - Bun
 * - React Native
 * - Web Workers
 */

// ============================================================================
// Types
// ============================================================================

export interface FullDateEnergyResult {
  originalSum: number;
  reducedNumber: number;
  displayValue: string;
  /** Full audit trail of both calculation methods. */
  calculationNote: string;
  /** Short human-readable note suitable for compact UI. */
  summary: string;
}

export interface SecondaryEnergyResult {
  originalDay: number;
  reducedNumber: number;
  displayValue: string;
  note?: string;
}

export interface NumerologyEnergiesResult {
  date: Date;
  fullDateEnergy: FullDateEnergyResult;
  secondaryEnergy: SecondaryEnergyResult;
  combinedKey: string;
  formattedDate: string;
}

export interface WeeklyScheduleDay {
  /** Local calendar date key in YYYY-MM-DD format. */
  date: string;
  dayNumber: number;
  dayName: string;
  formattedDate: string;
  fullDateEnergy: string;
  secondaryEnergy: string;
  combinedKey: string;
  numerology: NumerologyEnergiesResult;
}

export interface MonthlyScheduleDay extends WeeklyScheduleDay {}

export interface MonthlyCalendarCell {
  /** Local date key, or null for a leading/trailing blank cell. */
  date: string | null;
  dayNumber: number | null;
  schedule: MonthlyScheduleDay | null;
}

export interface MonthlyCalendarResult {
  year: number;
  /** Zero-based month, matching Date#getMonth(). */
  month: number;
  monthLabel: string;
  /** Sunday-first weeks. Each week always has exactly seven cells. */
  weeks: MonthlyCalendarCell[][];
  days: MonthlyScheduleDay[];
}

export interface CycleReductionResult {
  /** The unreduced sum that went into the calculation. */
  originalSum: number;
  reducedNumber: number;
  displayValue: string;
  calculationNote: string;
}

export interface CycleResult extends CycleReductionResult {
  /** First day of the cycle, YYYY-MM-DD. */
  startDate: string;
  /** The next cycle's first day, YYYY-MM-DD (exclusive end). */
  endDate: string;
  /** Compact label for the cycle, e.g. "October 2026" or "Sep 23 – Oct 23, 2026". */
  dateLabel: string;
}

export interface CycleEnergiesResult {
  universalYear: CycleResult;
  universalMonth: CycleResult;
  personalYear: CycleResult | null;
  personalMonth: CycleResult | null;
}

export interface BirthdayParts {
  /** 1–12 */
  month: number;
  /** 1–31 */
  day: number;
}

export interface BirthDateParts extends BirthdayParts {
  /** Four-digit birth year, e.g. 2003. */
  year: number;
}

export interface LifePathResult {
  /** Normalized birth date in YYYY-MM-DD format. */
  birthday: string;
  month: number;
  day: number;
  year: number;
  /** Reduced month component (November stays 11). */
  monthValue: number;
  /** Reduced day component (11 and 22 stay whole). */
  dayValue: number;
  /** Sum of the birth year's digits; it is not reduced further. */
  yearValue: number;
  /** monthValue + dayValue + yearValue. */
  total: number;
  /** 1–9, 11, 22, 33, or the special 28. */
  reducedNumber: number;
  /** The number to display: "28" for the Wealth Life Path, otherwise the reduced number. */
  displayValue: string;
  /** Single-digit root under a master (11/2, 22/4, 33/6) or 28/1. */
  underlyingNumber: number | null;
  isMaster: boolean;
  isWealth: boolean;
  /** Short archetype label for compact UI. */
  summary: string;
  /** Full audit trail of the reduction. */
  calculationNote: string;
}

// ============================================================================
// Constants
// ============================================================================

const MASTER_NUMBERS = new Set([11, 22, 33]);

/**
 * Numbers that get a special display treatment in the full-date calculation.
 * NOTE: this does NOT change digit reduction. In particular day 28 reduces
 * normally for secondary energy (2+8 = 10 → 1), matching the GG33 rules.
 */
const SPECIAL_NUMBERS = new Set([20, 28]);

// ============================================================================
// Core Reduction Logic
// ============================================================================

/**
 * Calculate the sum of all digits in a number, reducing to a single digit
 * unless the result is a master number (11, 22, 33).
 *
 * @param num - The number to reduce
 * @returns The reduced number
 */
export function reduceToSingleDigit(num: number): number {
  // Special master numbers that don't reduce further
  if (MASTER_NUMBERS.has(num)) {
    return num;
  }

  while (num > 9) {
    num = sumDigits(num);

    // Check again for master numbers after reduction
    if (MASTER_NUMBERS.has(num)) {
      break;
    }
  }

  return num;
}

/**
 * Sum the digits of a number
 */
function sumDigits(num: number): number {
  return num.toString().split('').reduce((sum, digit) => sum + parseInt(digit, 10), 0);
}

/**
 * Format a date as a YYYY-MM-DD key using local calendar components.
 *
 * `toISOString()` converts to UTC first, which shifts the date back one day
 * for users east of UTC. All schedules and lookups use this helper instead.
 */
export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse a date input as local midnight.
 * Accepts a Date or a YYYY-MM-DD string and throws on invalid input.
 */
export function parseDateInput(dateInput: Date | string): Date {
  const date = typeof dateInput === 'string'
    ? new Date(`${dateInput}T00:00:00`)
    : new Date(dateInput);

  if (isNaN(date.getTime())) {
    throw new Error('Invalid date provided');
  }

  return date;
}

/**
 * Reduction for timing cycles (Universal and Personal Year/Month).
 *
 * - 11, 22 and 33 stay whole.
 * - A final 2 is read as 11 (so 20 → 2 → 11).
 * - 28 is not special here; it reduces like any other non-master number.
 */
export function reduceCycleNumber(input: number): CycleReductionResult {
  if (!Number.isFinite(input)) {
    throw new Error('Invalid number provided');
  }

  const originalSum = Math.abs(Math.trunc(input));
  let number = originalSum;

  while (number > 9 && !MASTER_NUMBERS.has(number)) {
    number = sumDigits(number);
  }

  if (number === 2) {
    return {
      originalSum,
      reducedNumber: 11,
      displayValue: '11',
      calculationNote: `${originalSum} → 2; timing cycles read 2 as 11`
    };
  }

  return {
    originalSum,
    reducedNumber: number,
    displayValue: String(number),
    calculationNote: MASTER_NUMBERS.has(number)
      ? `${originalSum}; ${number} is a master number and stays whole`
      : `${originalSum} → ${number}`
  };
}

/**
 * Parse a birthday from YYYY-MM-DD, MM-DD, a Date, or month/day parts.
 * Only the month and day matter for Personal Year/Month cycles.
 */
export function parseBirthdayInput(
  input: string | Date | BirthdayParts
): BirthdayParts {
  let month: number;
  let day: number;

  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (/^\d{1,2}-\d{1,2}$/.test(trimmed)) {
      const [m, d] = trimmed.split('-').map(Number);
      month = m;
      day = d;
    } else {
      const date = parseDateInput(trimmed);
      month = date.getMonth() + 1;
      day = date.getDate();
    }
  } else if (input instanceof Date) {
    if (isNaN(input.getTime())) throw new Error('Invalid birthday provided');
    month = input.getMonth() + 1;
    day = input.getDate();
  } else {
    month = input.month;
    day = input.day;
  }

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error('Birthday month must be between 1 and 12');
  }
  if (!Number.isInteger(day) || day < 1 || day > 31) {
    throw new Error('Birthday day must be between 1 and 31');
  }

  // Validate the day against a leap year so 02-29 is allowed but 02-30 is not.
  const probe = new Date(2000, month - 1, day);
  if (probe.getMonth() !== month - 1) {
    throw new Error('Invalid birthday day for the selected month');
  }

  return { month, day };
}

/**
 * Parse a full birth date from YYYY-MM-DD or a Date.
 *
 * Life Path needs the year, so unlike parseBirthdayInput this rejects MM-DD.
 */
export function parseBirthDateInput(input: string | Date): BirthDateParts {
  let year: number;
  let month: number;
  let day: number;

  if (typeof input === 'string') {
    const trimmed = input.trim();
    const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(trimmed);
    if (!match) {
      throw new Error('Life Path needs a full birth date (YYYY-MM-DD)');
    }
    year = Number(match[1]);
    month = Number(match[2]);
    day = Number(match[3]);
  } else if (input instanceof Date) {
    if (isNaN(input.getTime())) throw new Error('Invalid birth date provided');
    year = input.getFullYear();
    month = input.getMonth() + 1;
    day = input.getDate();
  } else {
    throw new Error('Invalid birth date provided');
  }

  if (!Number.isInteger(year) || year < 1000 || year > 9999) {
    throw new Error('Birth year must be a four-digit year');
  }

  const birthday = parseBirthdayInput({ month, day });
  const probe = new Date(year, month - 1, day);
  if (
    probe.getFullYear() !== year ||
    probe.getMonth() !== month - 1 ||
    probe.getDate() !== day
  ) {
    throw new Error('Invalid birth date provided');
  }

  return { year, month: birthday.month, day: birthday.day };
}

const LIFE_PATH_SUMMARIES: Record<number, string> = {
  1: 'Initiator and leader',
  3: 'Creative communicator',
  4: 'Builder and foundation',
  5: 'Explorer and freedom seeker',
  6: 'Protector and nurturer',
  7: 'Seeker and analyst',
  8: 'Achiever and abundance',
  9: 'Humanitarian and completion',
  11: 'Intuitive teacher',
  22: 'Master builder',
  33: 'Master teacher',
  28: 'Wealth Life Path · 1 underneath'
};

function reduceLifePathComponent(value: number): number {
  let number = value;
  while (number > 9 && !MASTER_NUMBERS.has(number)) {
    number = sumDigits(number);
  }
  return number;
}

/**
 * Calculate the Life Path from the whole birth date.
 *
 * GG33 whole-date rules:
 * - Reduce month and day separately; November, day 11 and day 22 stay whole.
 * - Sum the year's digits but do not reduce that sum again (1963 → 19,
 *   1847 → 20), so master years naturally stay whole.
 * - Add the three parts and reduce the total, stopping at 11/22/33.
 * - An exact total of 28 is the Wealth Life Path with a 1 underneath.
 * - A total of 2 (including 20 → 2) reads as 11. There is no Life Path 2.
 *
 * The Life Path is the primary birth number and outranks the birth-day
 * Secondary Energy, which remains a separate daily signal.
 */
export function calculateLifePath(input: string | Date): LifePathResult {
  const { year, month, day } = parseBirthDateInput(input);

  const monthValue = reduceLifePathComponent(month);
  const dayValue = reduceLifePathComponent(day);
  // The year is summed once and kept as a two-digit component.
  const yearValue = sumDigits(year);
  const total = monthValue + dayValue + yearValue;

  let reducedNumber: number;
  let underlyingNumber: number | null = null;
  let reductionNote: string;

  if (total === 28) {
    reducedNumber = 28;
    underlyingNumber = 1;
    reductionNote = '28 is the Wealth Life Path; 1 underneath';
  } else {
    let number = total;
    const steps = [total];
    while (number > 9 && !MASTER_NUMBERS.has(number)) {
      number = sumDigits(number);
      steps.push(number);
    }

    if (number === 2) {
      number = 11;
      steps.push(11);
    }

    reducedNumber = number;
    underlyingNumber = number === 11 ? 2 : number === 22 ? 4 : number === 33 ? 6 : null;
    const cameFromTwo = number === 11 && steps[steps.length - 2] === 2;
    reductionNote = steps.length > 1
      ? `${steps.join(' → ')}${cameFromTwo ? '; 2 reads as 11' : ''}`
      : MASTER_NUMBERS.has(number)
        ? `${number} is a master number and stays whole` +
          (underlyingNumber ? `; ${underlyingNumber} underneath` : '')
        : `${number}`;
  }

  const calculationNote =
    `Month ${month} → ${monthValue} · Day ${day} → ${dayValue} · ` +
    `Year ${year} digits = ${yearValue}. ` +
    `${monthValue} + ${dayValue} + ${yearValue} = ${total}; ${reductionNote}`;

  return {
    birthday: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    month,
    day,
    year,
    monthValue,
    dayValue,
    yearValue,
    total,
    reducedNumber,
    displayValue: String(reducedNumber),
    underlyingNumber,
    isMaster: MASTER_NUMBERS.has(reducedNumber),
    isWealth: reducedNumber === 28,
    summary: LIFE_PATH_SUMMARIES[reducedNumber] || 'Life Path',
    calculationNote
  };
}

function birthdayInYear(year: number, birthday: BirthdayParts): Date {
  const lastDay = new Date(year, birthday.month, 0).getDate();
  return new Date(year, birthday.month - 1, Math.min(birthday.day, lastDay));
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function cycleDateLabel(start: Date, endExclusive: Date): string {
  if (start.getFullYear() === endExclusive.getFullYear()) {
    return `${start.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })} – ${endExclusive.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })}`;
  }

  return `${start.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })} – ${endExclusive.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })}`;
}

function makeCycleResult(
  reduction: CycleReductionResult,
  start: Date,
  endExclusive: Date,
  dateLabel: string
): CycleResult {
  return {
    ...reduction,
    startDate: formatDateKey(start),
    endDate: formatDateKey(endExclusive),
    dateLabel
  };
}

/** Universal Year: every digit of the calendar year, reduced using the timing-cycle rule. */
export function calculateUniversalYear(year: number): CycleResult {
  let yearSum = 0;
  for (const digit of String(year)) {
    yearSum += Number(digit);
  }

  return makeCycleResult(
    reduceCycleNumber(yearSum),
    new Date(year, 0, 1),
    new Date(year + 1, 0, 1),
    String(year)
  );
}

/**
 * Universal Month: Universal Year + the calendar month (itself reduced),
 * then reduced using the timing-cycle rule. It changes on the 1st for everyone.
 */
export function calculateUniversalMonth(dateInput: string | Date): CycleResult {
  const date = parseDateInput(dateInput);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const universalYear = calculateUniversalYear(year);
  const monthReduction = reduceCycleNumber(month);
  const total = reduceCycleNumber(
    universalYear.reducedNumber + monthReduction.reducedNumber
  );

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  return makeCycleResult(
    total,
    start,
    end,
    date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  );
}

/**
 * Personal Year: birth month + birth day + the year of the current birthday
 * cycle, counting every digit. It changes on the birthday, not January 1.
 */
export function calculatePersonalYear(
  referenceDateInput: string | Date,
  birthdayInput: string | Date | BirthdayParts
): CycleResult {
  const reference = startOfLocalDay(parseDateInput(referenceDateInput));
  const birthday = parseBirthdayInput(birthdayInput);
  const currentYear = reference.getFullYear();
  const thisYearsBirthday = birthdayInYear(currentYear, birthday);
  const anchorYear = reference >= thisYearsBirthday ? currentYear : currentYear - 1;

  const start = birthdayInYear(anchorYear, birthday);
  const end = birthdayInYear(anchorYear + 1, birthday);

  const sum =
    sumDigits(birthday.month) +
    sumDigits(birthday.day) +
    sumDigits(anchorYear);
  const reduction = reduceCycleNumber(sum);

  return makeCycleResult(
    reduction,
    start,
    end,
    cycleDateLabel(start, end)
  );
}

/**
 * Personal Month: active Personal Year + the month in which the current
 * birthday-to-birthday cycle began, reduced using the timing-cycle rule.
 *
 * For a May 23 birthday, the Sep 23–Oct 23 cycle uses September. The new
 * October cycle starts on Oct 23.
 */
export function calculatePersonalMonth(
  referenceDateInput: string | Date,
  birthdayInput: string | Date | BirthdayParts
): CycleResult {
  const reference = startOfLocalDay(parseDateInput(referenceDateInput));
  const birthday = parseBirthdayInput(birthdayInput);
  const personalYear = calculatePersonalYear(reference, birthday);

  // Most recent birth-day transition on or before the reference date.
  let startYear = reference.getFullYear();
  let startMonth = reference.getMonth() + 1;
  let start = birthdayInYear(
    startYear,
    { month: startMonth, day: birthday.day }
  );

  if (start > reference) {
    startMonth -= 1;
    if (startMonth === 0) {
      startMonth = 12;
      startYear -= 1;
    }
    start = birthdayInYear(startYear, { month: startMonth, day: birthday.day });
  }

  const nextMonth = startMonth === 12 ? 1 : startMonth + 1;
  const nextYear = startMonth === 12 ? startYear + 1 : startYear;
  const end = birthdayInYear(nextYear, {
    month: nextMonth,
    day: birthday.day
  });

  const monthReduction = reduceCycleNumber(startMonth);
  const total = reduceCycleNumber(
    personalYear.reducedNumber + monthReduction.reducedNumber
  );

  return makeCycleResult(total, start, end, cycleDateLabel(start, end));
}

/** All four timing cycles for a date, with personal values when a birthday is set. */
export function calculateCycleEnergies(
  referenceDateInput: string | Date,
  birthdayInput?: string | Date | BirthdayParts | null
): CycleEnergiesResult {
  const reference = parseDateInput(referenceDateInput);
  const universalYear = calculateUniversalYear(reference.getFullYear());
  const universalMonth = calculateUniversalMonth(reference);

  if (!birthdayInput) {
    return {
      universalYear,
      universalMonth,
      personalYear: null,
      personalMonth: null
    };
  }

  return {
    universalYear,
    universalMonth,
    personalYear: calculatePersonalYear(reference, birthdayInput),
    personalMonth: calculatePersonalMonth(reference, birthdayInput)
  };
}

// ============================================================================
// Full Date Energy Calculation
// ============================================================================

/**
 * Calculate Full Date Energy from a date
 * 
 * ALWAYS USE TWO CALCULATION METHODS:
 * 
 * Method 1: Break down non-masters (but keep master numbers whole)
 *   - Month: If 11/22/33 keep whole, else break to digits
 *   - Day: If 11/22/33 keep whole, else break to digits
 *   - Year: Always break to digits
 *   - Then reduce the sum
 * 
 * Method 2: Keep everything whole
 *   - Month: Keep whole
 *   - Day: Keep whole
 *   - Year: Break to digits
 *   - DO NOT reduce
 * 
 * If both methods yield the same result → display single number
 * If different → display as "X/Y" (Method2/Method1)
 * 
 * Special case: Sum of 20 = 20/2 but numerologically means 11
 * 
 * @param date - The date to calculate energy for
 * @returns Object with original sum, final reduced number, and display format
 */
export function calculateFullDateEnergy(date: Date): FullDateEnergyResult {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear();
  const yearDigits = year.toString().split('').map(d => parseInt(d, 10));
  const yearSum = yearDigits.reduce((sum, d) => sum + d, 0);

  // METHOD 1: Break down non-masters (keep master numbers whole)
  const method1MonthValue = MASTER_NUMBERS.has(month)
    ? month
    : sumDigits(month);

  const method1DayValue = MASTER_NUMBERS.has(day)
    ? day
    : sumDigits(day);

  const method1Sum = method1MonthValue + method1DayValue + yearSum;

  // Reduce the sum, but 28 is special and stays as-is
  let method1Reduced: number;
  if (method1Sum === 28) {
    method1Reduced = 28; // 28 is special, doesn't reduce
  } else if (MASTER_NUMBERS.has(method1Sum)) {
    method1Reduced = method1Sum; // Already a master number
  } else if (method1Sum <= 9) {
    method1Reduced = method1Sum; // Already single digit
  } else {
    method1Reduced = reduceToSingleDigit(method1Sum); // Reduce everything else
  }

  const finalMethod1 = (method1Reduced === 2) ? 11 : method1Reduced;

  // METHOD 2: Keep everything whole (never reduce)
  const method2Sum = month + day + yearSum;

  // Special case: 20 = 20/2 but numerologically means 11
  if (method2Sum === 20) {
    return {
      originalSum: method2Sum,
      reducedNumber: 11,
      displayValue: "20/2",
      calculationNote: `${month} + ${day} + ${yearDigits.join('+')} = ${method2Sum} (special: 20 = 11 numerologically)`,
      summary: '20 reduces to 11'
    };
  }

  // If both methods give the same result
  if (method2Sum === finalMethod1) {
    let displayResult = method2Sum;

    // Only reduce multiples of 10 (except 20)
    if (method2Sum % 10 === 0 && method2Sum !== 20) {
      displayResult = method2Sum / 10; // 40→4, 30→3, 50→5
    }
    // For other numbers > 9: reduce and check if it's a master number
    // 28 is special and should never be reduced
    else if (method2Sum > 9 && !MASTER_NUMBERS.has(method2Sum) && method2Sum !== 28) {
      const reduced = reduceToSingleDigit(method2Sum);
      // Only show reduced value if it's a master number, otherwise keep original
      if (MASTER_NUMBERS.has(reduced)) {
        displayResult = reduced; // 29→11, 38→11
      }
      // Otherwise keep original sum (27 stays 27, etc.)
    }

    return {
      originalSum: method2Sum,
      reducedNumber: displayResult,
      displayValue: displayResult.toString(),
      calculationNote: `Both methods agree: ${method1MonthValue}+${method1DayValue}+${yearSum} = ${method1Sum}${displayResult !== method2Sum ? ` (${method2Sum}→${displayResult})` : ''}`,
      summary: 'Both methods agree'
    };
  }

  // Methods differ: Display as "X/Y" (Method2/Method1)
  // Always reduce method2Sum to compare properly
  let method2Display = method2Sum;

  // Check if multiple of 10 (10, 30, 40, 50, etc.) - reduce to single digit
  if (method2Sum % 10 === 0 && method2Sum !== 20) {
    method2Display = method2Sum / 10; // 30→3, 40→4, 50→5
  }
  // For all other numbers > 9 that aren't already master numbers or 28, reduce them
  // 28 is a special number that should NOT be reduced
  else if (method2Sum > 9 && !MASTER_NUMBERS.has(method2Sum) && method2Sum !== 28) {
    const reduced = reduceToSingleDigit(method2Sum);
    // If it reduces to a master number, use the master number
    if (MASTER_NUMBERS.has(reduced)) {
      method2Display = reduced; // 29→11, 38→11
    }
    // Otherwise use the reduced single digit
    else {
      method2Display = reduced; // 32→5, 25→7
    }
  }

  // If after reduction they're the same, just show single number
  if (method2Display === finalMethod1) {
    return {
      originalSum: method2Sum,
      reducedNumber: finalMethod1,
      displayValue: finalMethod1.toString(),
      calculationNote: `Both methods agree after reduction: ${method2Sum} → ${method2Display}`,
      summary: 'Both methods agree'
    };
  }

  // Always display smaller number first to prevent duplicate keys
  // (1/28 not 28/1, 4/22 not 22/4, etc.)
  const smallerNum = Math.min(method2Display, finalMethod1);
  const largerNum = Math.max(method2Display, finalMethod1);

  return {
    originalSum: method2Sum,
    reducedNumber: finalMethod1,
    displayValue: `${smallerNum}/${largerNum}`,
    calculationNote: `Method 1: ${method1MonthValue}+${method1DayValue}+${yearSum} = ${method1Sum} → ${finalMethod1}; Method 2: ${month}+${day}+${yearSum} = ${method2Sum} → ${method2Display}`,
    summary: `Method 1: ${finalMethod1}\nMethod 2: ${method2Display}`
  };
}

// ============================================================================
// Secondary Energy Calculation
// ============================================================================

/**
 * Calculate Secondary Energy from the day of the month
 * Special rules:
 * - Day 2nd = 11
 * - Days 11/22/33 = master numbers
 * - Day 20th = 20/2 (numerologically 11)
 * 
 * @param date - The date to calculate energy for
 * @returns Object with original day, reduced number, and display format
 */
export function calculateSecondaryEnergy(date: Date): SecondaryEnergyResult {
  const day = date.getDate();

  // Special case: 2nd day = 11 energy
  if (day === 2) {
    return {
      originalDay: day,
      reducedNumber: 11,
      displayValue: "11",
      note: "Day 2nd = 11 energy"
    };
  }

  // Special case: 20th day = 20/2 but numerologically means 11
  if (day === 20) {
    return {
      originalDay: day,
      reducedNumber: 11,
      displayValue: "20/2",
      note: "Day 20th = 20/2 (numerologically 11)"
    };
  }

  // Master number days (11, 22, 33) show as-is
  if (MASTER_NUMBERS.has(day)) {
    return {
      originalDay: day,
      reducedNumber: day,
      displayValue: day.toString(),
      note: "Master number day"
    };
  }

  // Regular calculation
  const reducedNumber = reduceToSingleDigit(day);

  return {
    originalDay: day,
    reducedNumber,
    displayValue: reducedNumber.toString()
  };
}

// ============================================================================
// Combined Energy Calculation
// ============================================================================

/**
 * Calculate both Full Date and Secondary Energy for a given date
 * 
 * @param dateInput - Date object or date string (YYYY-MM-DD format)
 * @returns Object containing both energy calculations
 */
export function calculateNumerologyEnergies(dateInput: Date | string): NumerologyEnergiesResult {
  const date = parseDateInput(dateInput);

  const fullDateEnergy = calculateFullDateEnergy(date);
  const secondaryEnergy = calculateSecondaryEnergy(date);

  return {
    date,
    fullDateEnergy,
    secondaryEnergy,
    combinedKey: `${fullDateEnergy.displayValue} + ${secondaryEnergy.displayValue}`,
    formattedDate: date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  };
}

/**
 * Get the energy key for statistical grouping
 * 
 * @param numerologyResult - Result from calculateNumerologyEnergies
 * @returns The key to use for statistical grouping
 */
export function getEnergyStatisticalKey(numerologyResult: NumerologyEnergiesResult): string {
  const displayValue = numerologyResult.fullDateEnergy.displayValue;

  if (displayValue === '20/2') {
    return '11';
  }

  return displayValue;
}

/**
 * Get the secondary energy key for statistical grouping.
 * Always uses the reduced number so 20/2 normalizes to 11.
 */
export function getSecondaryEnergyStatisticalKey(
  numerologyResult: NumerologyEnergiesResult
): string {
  return numerologyResult.secondaryEnergy.reducedNumber.toString();
}

// ============================================================================
// Schedule Generation
// ============================================================================

/**
 * Generate weekly schedule starting from a given date
 * 
 * @param startDate - Start date in YYYY-MM-DD format
 * @returns Array of 7 days with numerology energies
 */
export function generateWeeklySchedule(startDate: string): WeeklyScheduleDay[] {
  const schedule: WeeklyScheduleDay[] = [];
  const start = new Date(startDate + 'T00:00:00');

  for (let i = 0; i < 7; i++) {
    const currentDate = new Date(start);
    currentDate.setDate(start.getDate() + i);

    const numerology = calculateNumerologyEnergies(currentDate);

    schedule.push({
      date: formatDateKey(currentDate),
      dayNumber: currentDate.getDate(),
      dayName: currentDate.toLocaleDateString('en-US', { weekday: 'long' }),
      formattedDate: currentDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      fullDateEnergy: numerology.fullDateEnergy.displayValue,
      secondaryEnergy: numerology.secondaryEnergy.displayValue,
      combinedKey: numerology.combinedKey,
      numerology
    });
  }

  return schedule;
}

/**
 * Generate monthly schedule for a given date's month
 * 
 * @param dateString - Date in YYYY-MM-DD format
 * @returns Array of all days in the month with numerology energies
 */
export function generateMonthlySchedule(dateString: string): MonthlyScheduleDay[] {
  const schedule: MonthlyScheduleDay[] = [];
  const date = new Date(dateString + 'T00:00:00');
  const year = date.getFullYear();
  const month = date.getMonth();

  // Last day of the month (day 0 of the next month)
  const lastDay = new Date(year, month + 1, 0);

  for (let day = 1; day <= lastDay.getDate(); day++) {
    const currentDate = new Date(year, month, day);
    const numerology = calculateNumerologyEnergies(currentDate);

    schedule.push({
      date: formatDateKey(currentDate),
      dayNumber: day,
      dayName: currentDate.toLocaleDateString('en-US', { weekday: 'long' }),
      formattedDate: currentDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      fullDateEnergy: numerology.fullDateEnergy.displayValue,
      secondaryEnergy: numerology.secondaryEnergy.displayValue,
      combinedKey: numerology.combinedKey,
      numerology
    });
  }

  return schedule;
}

/**
 * Build a Sunday-first month grid ready for a calendar UI.
 *
 * Leading and trailing cells are included as null placeholders so every week
 * has exactly seven cells. The number of weeks is 4–6, depending on the month.
 */
export function generateMonthlyCalendar(
  dateInput: string | Date
): MonthlyCalendarResult {
  const date = parseDateInput(dateInput);
  const days = generateMonthlySchedule(formatDateKey(date));
  const cells: MonthlyCalendarCell[] = [];

  // Sunday-first: getDay() is 0 for Sunday, 6 for Saturday.
  const leadingBlanks = new Date(`${days[0].date}T00:00:00`).getDay();
  for (let i = 0; i < leadingBlanks; i++) {
    cells.push({ date: null, dayNumber: null, schedule: null });
  }

  for (const day of days) {
    cells.push({ date: day.date, dayNumber: day.dayNumber, schedule: day });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ date: null, dayNumber: null, schedule: null });
  }

  const weeks: MonthlyCalendarCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return {
    year: date.getFullYear(),
    month: date.getMonth(),
    monthLabel: date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    }),
    weeks,
    days
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if a number is a master number
 */
export function isMasterNumber(num: number): boolean {
  return MASTER_NUMBERS.has(num);
}

/**
 * Check if a number is a special number (20, 28)
 */
export function isSpecialNumber(num: number): boolean {
  return SPECIAL_NUMBERS.has(num);
}

/**
 * Get today's numerology energies
 */
export function getTodayEnergies(): NumerologyEnergiesResult {
  return calculateNumerologyEnergies(new Date());
}

/**
 * Get tomorrow's numerology energies
 */
export function getTomorrowEnergies(): NumerologyEnergiesResult {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return calculateNumerologyEnergies(tomorrow);
}

/**
 * Get energies for a specific date string (YYYY-MM-DD)
 */
export function getEnergiesForDate(dateString: string): NumerologyEnergiesResult {
  return calculateNumerologyEnergies(dateString);
}

// ============================================================================
// Export all
// ============================================================================

export const numerologyCore = {
  // Core calculations
  reduceToSingleDigit,
  calculateFullDateEnergy,
  calculateSecondaryEnergy,
  calculateNumerologyEnergies,
  getEnergyStatisticalKey,
  getSecondaryEnergyStatisticalKey,
  
  // Schedule generation
  generateWeeklySchedule,
  generateMonthlySchedule,
  generateMonthlyCalendar,

  // Timing cycles
  reduceCycleNumber,
  parseBirthdayInput,
  parseBirthDateInput,
  calculateLifePath,
  calculateUniversalYear,
  calculateUniversalMonth,
  calculatePersonalYear,
  calculatePersonalMonth,
  calculateCycleEnergies,
  
  // Utilities
  isMasterNumber,
  isSpecialNumber,
  formatDateKey,
  parseDateInput,
  getTodayEnergies,
  getTomorrowEnergies,
  getEnergiesForDate,
  
  // Constants
  MASTER_NUMBERS,
  SPECIAL_NUMBERS
};

export default numerologyCore;