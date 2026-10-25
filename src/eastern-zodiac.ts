/**
 * Eastern (Chinese) zodiac.
 *
 * The year boundary is Lunar New Year, not 1 January.
 *
 * Chinese New Year follows the lunisolar calendar: it falls on the second new
 * moon after the winter solstice, which usually lands between 21 January and
 * 20 February. The date is astronomical — the exact moment of the new moon is
 * computed and then placed against the calendar's rules for months and leap
 * months — which is why it moves on the Western calendar. New moons and
 * solstices can be computed centuries ahead, so future dates are known, not
 * guessed. A year far out can always be confirmed against an astronomical
 * almanac, and it can shift by a day depending on time zone.
 *
 * Two things this module deliberately does not do:
 *  - It does not use the Gregorian year alone. The sexagenary cycle turns over
 *    at Lunar New Year, so a January birthday usually belongs to the previous
 *    animal. The lunar year comes from the platform's ICU calendar
 *    (`en-u-ca-chinese`), which carries those astronomical new-moon dates.
 *  - It does not guess an element from the animal. Element and animal are
 *    independent: the animal is the Earthly Branch (12) and the element is the
 *    Heavenly Stem (10), together the 60-year cycle.
 *
 * Dates are resolved at 12:00 UTC so a birthday near midnight local time cannot
 * flip the result by sitting on the other side of a date line.
 *
 * Browser-safe: no filesystem, no Node built-ins beyond Intl.
 */

export type EasternElement = 'Wood' | 'Fire' | 'Earth' | 'Metal' | 'Water';
export type EasternPolarity = 'yang' | 'yin';

export interface EasternZodiac {
  /** Lunar year that actually contains the date. */
  year: number;
  /** Gregorian year of the input date, for display alongside it. */
  gregorianYear: number;
  /** Heavenly Stem (one of ten). */
  stem: string;
  stemPinyin: string;
  element: EasternElement;
  polarity: EasternPolarity;
  /** Earthly Branch (one of twelve). */
  branch: string;
  branchPinyin: string;
  animal: string;
  /** Position in the 60-year cycle, 1-60. 1984 = 1 (Wood Rat). */
  cyclePosition: number;
  /** Traditional two-character name, e.g. 癸未. */
  yearName: string;
  /** "Water Goat" — element first, animal second. */
  display: string;
  /** Which calendar resolved the year. */
  boundary: 'lunar' | 'gregorian';
  note: string;
}

const STEMS: ReadonlyArray<readonly [EasternElement, EasternPolarity, string, string]> = [
  ['Wood', 'yang', '甲', 'jia'],
  ['Wood', 'yin', '乙', 'yi'],
  ['Fire', 'yang', '丙', 'bing'],
  ['Fire', 'yin', '丁', 'ding'],
  ['Earth', 'yang', '戊', 'wu'],
  ['Earth', 'yin', '己', 'ji'],
  ['Metal', 'yang', '庚', 'geng'],
  ['Metal', 'yin', '辛', 'xin'],
  ['Water', 'yang', '壬', 'ren'],
  ['Water', 'yin', '癸', 'gui']
];

const BRANCHES: ReadonlyArray<readonly [string, string, string]> = [
  ['Rat', '子', 'zi'],
  ['Ox', '丑', 'chou'],
  ['Tiger', '寅', 'yin'],
  ['Cat', '卯', 'mao'],
  ['Dragon', '辰', 'chen'],
  ['Snake', '巳', 'si'],
  ['Horse', '午', 'wu'],
  ['Goat', '未', 'wei'],
  ['Monkey', '申', 'shen'],
  ['Rooster', '酉', 'you'],
  ['Dog', '戌', 'xu'],
  ['Pig', '亥', 'hai']
];

/** Calendars that render Goat as Sheep or Ram. Kept here so callers can note it. */
export const GOAT_ALIASES = ['Sheep', 'Ram'] as const;

/**
 * 卯 is the Cat here. The mainland Chinese calendar calls that branch the
 * Rabbit; the Vietnamese one, and GG33, call it the Cat. Same branch, same
 * stem, same cycle position — only the name differs, so Rabbit is accepted as
 * an alias rather than a second animal.
 */
export const CAT_ALIASES = ['Rabbit', 'Hare'] as const;

function mod(value: number, base: number): number {
  return ((value % base) + base) % base;
}

function toDate(input: string | Date): Date {
  if (input instanceof Date) return input;
  const text = String(input).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw new Error(`Invalid date "${text}": expected YYYY-MM-DD`);
  }
  return new Date(`${text}T12:00:00Z`);
}

/**
 * The lunar year containing `date`, from the platform's Chinese calendar.
 * Falls back to the Gregorian year when ICU is unavailable, and says so.
 */
let chineseYearFormatter: Intl.DateTimeFormat | null = null;

function chineseYearFormat(): Intl.DateTimeFormat | null {
  if (chineseYearFormatter) return chineseYearFormatter;
  try {
    chineseYearFormatter = new Intl.DateTimeFormat('en-u-ca-chinese', { year: 'numeric' });
    return chineseYearFormatter;
  } catch {
    return null;
  }
}

export function resolveLunarYear(date: string | Date): { year: number; boundary: 'lunar' | 'gregorian' } {
  const when = toDate(date);
  const formatter = chineseYearFormat();
  try {
    if (!formatter) throw new Error('no chinese calendar');
    // `relatedYear` is not in TypeScript's part-type union, so compare as string.
    const part = formatter.formatToParts(when).find((entry) => String(entry.type) === 'relatedYear');
    const parsed = part ? Number.parseInt(part.value, 10) : Number.NaN;
    if (Number.isFinite(parsed)) return { year: parsed, boundary: 'lunar' };
  } catch {
    // ICU without the Chinese calendar; fall through to the Gregorian year.
  }
  return { year: when.getUTCFullYear(), boundary: 'gregorian' };
}

/** Zodiac for a lunar year number. 1984 is cycle position 1 (Wood Rat). */
export function easternZodiacForYear(year: number): EasternZodiac {
  if (!Number.isInteger(year)) {
    throw new Error(`Invalid year "${String(year)}": expected an integer`);
  }

  const [element, polarity, stem, stemPinyin] = STEMS[mod(year - 4, 10)];
  const [animal, branch, branchPinyin] = BRANCHES[mod(year - 4, 12)];

  return {
    year,
    gregorianYear: year,
    stem,
    stemPinyin,
    element,
    polarity,
    branch,
    branchPinyin,
    animal,
    cyclePosition: mod(year - 4, 60) + 1,
    yearName: `${stem}${branch}`,
    display: `${element} ${animal}`,
    boundary: 'gregorian',
    note: `${element} ${animal}, ${polarity}. Year ${year}, cycle position ${mod(year - 4, 60) + 1} of 60.`
  };
}

/**
 * Zodiac for a date of birth. January and early-February birthdays resolve to
 * the previous animal because the lunar year has not turned over yet.
 */
export function getEasternZodiac(date: string | Date): EasternZodiac {
  const when = toDate(date);
  const { year, boundary } = resolveLunarYear(when);
  const base = easternZodiacForYear(year);

  return {
    ...base,
    gregorianYear: when.getUTCFullYear(),
    boundary,
    note: boundary === 'lunar'
      ? `${base.element} ${base.animal}, ${base.polarity}. Lunar year ${year}, cycle position ${base.cyclePosition} of 60.`
      : `${base.element} ${base.animal}, ${base.polarity}. Gregorian year ${year}: the Chinese calendar is unavailable here, so a January or early-February birthday may belong to the previous animal.`
  };
}
