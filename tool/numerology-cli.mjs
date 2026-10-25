#!/usr/bin/env node
/**
 * numerology-cli.mjs — deterministic tool wrapper for the Chart agent.
 * Wraps the existing engine. Does NOT reimplement any rule.
 *
 * Run:      node tool/numerology-cli.mjs <mode> '{"json":"args"}'
 * Or flags: node tool/numerology-cli.mjs roster --date 2026-10-25 --json
 *
 * `dist/` is gitignored, so the engine must be built first: `npm run build`.
 * Missing build output is reported as JSON on stdout, not as a stack trace, so
 * a calling agent can always parse the result.
 */

let core;
try {
  core = await import('../dist/numerology-core.mjs');
} catch {
  process.stdout.write(
    JSON.stringify(
      {
        ok: false,
        error: 'dist/numerology-core.mjs is missing — run `npm run build` first',
      },
      null,
      2
    ) + '\n'
  );
  process.exit(1);
}

// People storage is Node-only, so it has its own build entry. Existing modes
// still work if an older build predates it.
let people = null;
try {
  people = await import('../dist/people.mjs');
} catch {
  people = null;
}

const {
  calculateNumerologyEnergies,
  calculateCycleEnergies,
  calculateLifePath,
  generateMonthlySchedule,
  formatDateKey,
  reduceToSingleDigit,
  getEasternZodiac,
} = core;

const BIRTH_DATE = '2003-05-23';
const PUBLISH_DIGITS = new Set([3, 5, 6, 9]);

/**
 * Eligibility uses the engine's own reduction, so master numbers stay whole
 * exactly as they do everywhere else (22 is 22, never 4).
 */
function publishEligible(dateKey) {
  const day = Number(dateKey.slice(8, 10));
  return PUBLISH_DIGITS.has(reduceToSingleDigit(day));
}

function out(obj) {
  process.stdout.write(JSON.stringify(obj, null, 2) + '\n');
}

function text(value) {
  process.stdout.write(value + '\n');
}

function fail(msg) {
  out({ ok: false, error: msg });
  process.exit(1);
}

function requirePeople() {
  if (!people) {
    fail('dist/people.mjs is missing — run `npm run build` first');
  }
  return people;
}

function todayKey() {
  return formatDateKey(new Date());
}

function primaryBirthDate() {
  if (people) {
    const primary = people.getPrimaryPerson();
    if (primary) return primary.birthdate;
  }
  return BIRTH_DATE;
}

function wantsJson(args, jsonArgs) {
  return jsonArgs || args.json === true;
}

/** Convert --birth-date / --birthdate / --reference-date to the existing keys. */
function normalizeArgs(raw) {
  const args = { ...raw };
  if (args.birth_date === undefined && args.birthdate !== undefined) {
    args.birth_date = args.birthdate;
  }
  if (args.birth_date === undefined && args.birthDate !== undefined) {
    args.birth_date = args.birthDate;
  }
  if (args.reference_date === undefined && args.referenceDate !== undefined) {
    args.reference_date = args.referenceDate;
  }
  if (args.favourable_only === undefined && args.favourableOnly !== undefined) {
    args.favourable_only = args.favourableOnly;
  }
  return args;
}

/** Parse `--key value`, `--flag`, and positional arguments. */
function parseFlags(argv) {
  const args = { _: [] };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      args._.push(token);
      continue;
    }

    const key = token.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    const next = argv[index + 1];
    const value = next !== undefined && !next.startsWith('--') ? next : true;
    if (value !== true) index += 1;

    if (args[key] === undefined) {
      args[key] = value;
    } else if (Array.isArray(args[key])) {
      args[key].push(value);
    } else {
      args[key] = [args[key], value];
    }
  }

  return normalizeArgs(args);
}

function parseJsonArguments(token) {
  try {
    const parsed = JSON.parse(token);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      fail('JSON arguments must be an object');
    }
    return parsed;
  } catch (error) {
    fail(`Could not parse JSON arguments: ${error.message}`);
  }
}

/**
 * Accept both existing forms and the readable mixed form used in the docs:
 *   person '{"id":"gary","date":"2026-10-23"}'
 *   person gary '{"date":"2026-10-23"}'
 *   person gary --date 2026-10-23 --json
 * Flags win over JSON when both name the same option.
 */
function parseInvocation(argv) {
  const last = argv[argv.length - 1];
  if (typeof last !== 'string' || !last.trim().startsWith('{')) {
    return { args: parseFlags(argv), jsonArgs: false };
  }

  const parsed = normalizeArgs(parseJsonArguments(last));
  if (argv.length === 1) {
    return { args: parsed, jsonArgs: true };
  }

  const flags = parseFlags(argv.slice(0, -1));
  return {
    args: normalizeArgs({ ...parsed, ...flags }),
    jsonArgs: true
  };
}

function entryPayload(entry) {
  const { person, zodiac, lifePath, fullDateEnergy, secondaryEnergy, combinedKey, cycles } = entry;

  return {
    id: person.id,
    name: person.name,
    birthdate: person.birthdate,
    tags: [...person.tags],
    notes: person.notes,
    primary: person.primary,
    zodiac: zodiac
      ? {
          animal: zodiac.animal,
          element: zodiac.element,
          polarity: zodiac.polarity,
          display: zodiac.display,
          year_name: zodiac.yearName,
          lunar_year: zodiac.year,
          cycle_position: zodiac.cyclePosition,
          boundary: zodiac.boundary,
          note: zodiac.note,
        }
      : null,
    life_path: lifePath.displayValue,
    life_path_underlying: lifePath.underlyingNumber,
    life_path_is_master: lifePath.isMaster,
    life_path_is_wealth: lifePath.isWealth,
    life_path_summary: lifePath.summary,
    life_path_note: lifePath.calculationNote,
    full_date_energy: fullDateEnergy.displayValue,
    secondary_energy: secondaryEnergy.displayValue,
    combined: combinedKey,
    cycles: {
      universal_year: cycles.universalYear.displayValue,
      universal_year_range: cycles.universalYear.dateLabel,
      universal_month: cycles.universalMonth.displayValue,
      universal_month_range: cycles.universalMonth.dateLabel,
      personal_year: cycles.personalYear?.displayValue ?? null,
      personal_year_range: cycles.personalYear?.dateLabel ?? null,
      personal_month: cycles.personalMonth?.displayValue ?? null,
      personal_month_range: cycles.personalMonth?.dateLabel ?? null,
    },
  };
}

function upcomingPayload(day) {
  return {
    date: day.date,
    weekday: day.weekday,
    full_date_energy: day.fullDateEnergy.displayValue,
    secondary_energy: day.secondaryEnergy.displayValue,
    combined: day.combinedKey,
    favourable: day.favourable,
    reason: day.reason,
  };
}

function personTag(person) {
  if (person.primary) return ' [primary]';
  return '';
}

function lifePathNote(lifePath) {
  if (lifePath.isWealth) return ' (1 underneath)';
  if (lifePath.underlyingNumber) return ` (${lifePath.underlyingNumber} underneath)`;
  return '';
}

function formatEntry(entry) {
  const person = entry.person;
  const personalYear = entry.cycles.personalYear?.displayValue ?? '—';
  const personalMonth = entry.cycles.personalMonth?.displayValue ?? '—';

  const zodiac = entry.zodiac ? `${entry.zodiac.display} · ` : '';

  return [
    `${person.name}${personTag(person)} · ${zodiac}Life Path ${entry.lifePath.displayValue}${lifePathNote(entry.lifePath)}`,
    `  ${entry.combinedKey} · PY ${personalYear} · PM ${personalMonth}`,
  ].join('\n');
}

function rosterText(date, entries) {
  const lines = [`Roster — ${date}`, ''];
  if (entries.length === 0) {
    lines.push('No people yet. Add one with `people add`.');
  } else {
    lines.push(entries.map(formatEntry).join('\n\n'));
  }
  return lines.join('\n');
}

function personText(date, entry) {
  const person = entry.person;
  const cycles = entry.cycles;
  const lines = [
    `${person.name}${personTag(person)}`,
    `  Birthdate  ${person.birthdate}`,
    `  Zodiac     ${entry.zodiac.display} · ${entry.zodiac.yearName} · ${entry.zodiac.note}`,
    `  Life Path  ${entry.lifePath.displayValue}${lifePathNote(entry.lifePath)} · ${entry.lifePath.summary}`,
    `  ${entry.lifePath.calculationNote}`,
    '',
    `${date}`,
    `  Full date  ${entry.fullDateEnergy.displayValue}`,
    `  Secondary  ${entry.secondaryEnergy.displayValue}`,
    `  Combined   ${entry.combinedKey}`,
    '',
    `  Universal Year   ${cycles.universalYear.displayValue} · ${cycles.universalYear.dateLabel}`,
    `  Universal Month  ${cycles.universalMonth.displayValue} · ${cycles.universalMonth.dateLabel}`,
    `  Personal Year    ${cycles.personalYear?.displayValue ?? '—'} · ${cycles.personalYear?.dateLabel ?? 'birthday needed'}`,
    `  Personal Month   ${cycles.personalMonth?.displayValue ?? '—'} · ${cycles.personalMonth?.dateLabel ?? 'birthday needed'}`,
  ];

  if (person.tags.length) lines.push('', `  Tags   ${person.tags.join(', ')}`);
  if (person.notes) lines.push(`  Notes  ${person.notes}`);

  return lines.join('\n');
}

function upcomingText(id, date, days, daysList) {
  const lines = [`Upcoming favourable days for ${id} — ${days} days from ${date}`, ''];
  if (daysList.length === 0) {
    lines.push('None in this window.');
  } else {
    for (const day of daysList) {
      lines.push(
        `${day.weekday} ${day.date} · ${day.full_date_energy} + ${day.secondary_energy} · ${day.reason}`
      );
    }
  }
  return lines.join('\n');
}

const mode = process.argv[2];
const { args, jsonArgs } = parseInvocation(process.argv.slice(3));

switch (mode) {
  case 'profile': {
    const bd = args.birth_date ?? primaryBirthDate();
    const ref = args.reference_date ?? todayKey();
    const c = calculateCycleEnergies(ref, bd);
    out({
      ok: true,
      mode,
      reference_date: ref,
      birth_date: bd,
      life_path: calculateLifePath(bd).displayValue,
      universal_year: c.universalYear.displayValue,
      universal_month: c.universalMonth.displayValue,
      personal_year: c.personalYear?.displayValue ?? null,
      personal_year_range: c.personalYear?.dateLabel ?? null,
      personal_month: c.personalMonth?.displayValue ?? null,
      personal_month_range: c.personalMonth?.dateLabel ?? null,
    });
    break;
  }

  case 'date_energy': {
    if (!args.date) fail('date_energy requires {"date":"YYYY-MM-DD"}');
    const r = calculateNumerologyEnergies(args.date);
    const zodiac = getEasternZodiac(args.date);
    out({
      ok: true,
      mode,
      date: args.date,
      full_date_energy: r.fullDateEnergy.displayValue,
      secondary_energy: r.secondaryEnergy.displayValue,
      combined: r.combinedKey,
      publish_eligible: publishEligible(args.date),
      year_zodiac: {
        display: zodiac.display,
        animal: zodiac.animal,
        element: zodiac.element,
        polarity: zodiac.polarity,
        year_name: zodiac.yearName,
        lunar_year: zodiac.year,
        cycle_position: zodiac.cyclePosition,
      },
    });
    break;
  }

  case 'range_scan': {
    if (!args.start || !args.end) fail('range_scan requires {"start":"YYYY-MM-DD","end":"YYYY-MM-DD"}');
    const targets = args.target_energies ? new Set(args.target_energies.map(String)) : null;
    const days = [];
    const cur = new Date(args.start + 'T00:00:00');
    const end = new Date(args.end + 'T00:00:00');
    while (cur <= end) {
      const key = formatDateKey(cur);
      const r = calculateNumerologyEnergies(key);
      const full = r.fullDateEnergy.displayValue;
      const sec = r.secondaryEnergy.displayValue;
      if (!targets || targets.has(full) || targets.has(sec)) {
        days.push({
          date: key,
          weekday: cur.toLocaleDateString('en-US', { weekday: 'short' }),
          full_date_energy: full,
          secondary_energy: sec,
          publish_eligible: publishEligible(key),
        });
      }
      cur.setDate(cur.getDate() + 1);
    }
    out({ ok: true, mode, start: args.start, end: args.end, count: days.length, days });
    break;
  }

  case 'life_path': {
    const bd = args.birth_date ?? primaryBirthDate();
    const r = calculateLifePath(bd);
    out({
      ok: true,
      mode,
      birth_date: r.birthday,
      life_path: r.displayValue,
      underlying: r.underlyingNumber,
      is_master: r.isMaster,
      is_wealth: r.isWealth,
      summary: r.summary,
      note: r.calculationNote,
    });
    break;
  }

  case 'calendar': {
    const currentMonth = todayKey().slice(0, 7);
    let month;

    if (typeof args.month === 'string' && /^\d{4}-\d{2}$/.test(args.month)) {
      month = args.month;
    } else if (args.month !== undefined && args.month !== null) {
      const monthNumber = Number(args.month);
      const year = args.year === undefined ? Number(currentMonth.slice(0, 4)) : Number(args.year);
      if (!Number.isInteger(monthNumber) || monthNumber < 1 || monthNumber > 12) {
        fail('calendar month must be 1-12 or "YYYY-MM"');
      }
      if (!Number.isInteger(year) || year < 1900 || year > 2100) {
        fail('calendar year must be a four-digit year');
      }
      month = `${year}-${String(monthNumber).padStart(2, '0')}`;
    } else if (args.year !== undefined) {
      fail('calendar requires {"month":"YYYY-MM"} or {"year":2026,"month":10}');
    } else {
      month = currentMonth;
    }

    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      fail('calendar month must be "YYYY-MM"');
    }

    const days = generateMonthlySchedule(month + '-01').map((d) => ({
      date: d.date,
      // Same 3-letter form as range_scan so callers can rely on one shape.
      weekday: String(d.dayName).slice(0, 3),
      full_date_energy: d.fullDateEnergy,
      secondary_energy: d.secondaryEnergy,
      publish_eligible: publishEligible(d.date),
    }));
    if (days.length === 0) fail(`calendar could not generate days for ${month}`);
    out({ ok: true, mode, month, count: days.length, days });
    break;
  }

  case 'roster': {
    const api = requirePeople();
    const date = args.date ?? args.reference_date ?? todayKey();
    let entries;
    try {
      entries = api.getRoster(date);
    } catch (error) {
      fail(error.message);
    }

    const tags = args.tag === undefined
      ? []
      : (Array.isArray(args.tag) ? args.tag : [args.tag]).map(String);
    if (tags.length) {
      entries = entries.filter((entry) => tags.some((tag) => entry.person.tags.includes(tag)));
    }

    if (wantsJson(args, jsonArgs)) {
      out({
        ok: true,
        mode,
        date,
        count: entries.length,
        people: entries.map(entryPayload),
      });
    } else {
      text(rosterText(date, entries));
    }
    break;
  }

  case 'person': {
    const api = requirePeople();
    const id = args.id ?? args._[0];
    if (!id) fail('person requires an id: person <id> [--date YYYY-MM-DD] [--json]');
    const date = args.date ?? args.reference_date ?? todayKey();

    let entry;
    try {
      entry = api.getPersonEnergies(id, date);
    } catch (error) {
      fail(error.message);
    }

    if (wantsJson(args, jsonArgs)) {
      out({ ok: true, mode, date, person: entryPayload(entry) });
    } else {
      text(personText(date, entry));
    }
    break;
  }

  case 'upcoming': {
    const api = requirePeople();
    const id = args.id ?? args._[0];
    if (!id) fail('upcoming requires an id: upcoming <id> [--days 30] [--json]');
    const date = args.date ?? args.reference_date ?? todayKey();
    const days = args.days === undefined ? 30 : Number(args.days);
    if (!Number.isInteger(days) || days < 1) {
      fail('days must be a positive integer');
    }
    const favourableOnly = args.all === true ? false : args.favourable_only !== false;

    let upcoming;
    try {
      upcoming = api.getUpcoming(id, { date, days, favourableOnly });
    } catch (error) {
      fail(error.message);
    }

    if (wantsJson(args, jsonArgs)) {
      out({
        ok: true,
        mode,
        id,
        date,
        days,
        count: upcoming.length,
        upcoming: upcoming.map(upcomingPayload),
      });
    } else {
      text(upcomingText(id, date, days, upcoming.map(upcomingPayload)));
    }
    break;
  }

  case 'people': {
    const api = requirePeople();
    const action = args.action ?? args._[0];

    if (action === 'add') {
      const birthdate = args.birthdate ?? args.birth_date;
      if (!args.name) fail('people add requires --name "<name>" --birthdate YYYY-MM-DD');
      if (!birthdate) fail('people add requires --birthdate YYYY-MM-DD');

      let person;
      try {
        person = api.addPerson({
          name: args.name,
          birthdate,
          tags: args.tags ?? args.tag ?? [],
          notes: args.notes ?? '',
          primary: args.primary === true,
        });
      } catch (error) {
        fail(error.message);
      }

      out({ ok: true, mode, action, person });
      break;
    }

    const id = args.id ?? args._[1];

    if (action === 'remove') {
      if (!id) fail('people remove requires an id: people remove <id>');
      let person;
      try {
        person = api.removePerson(id);
      } catch (error) {
        fail(error.message);
      }
      out({ ok: true, mode, action, person });
      break;
    }

    if (action === 'primary') {
      if (!id) fail('people primary requires an id: people primary <id>');
      let person;
      try {
        person = api.setPrimary(id);
      } catch (error) {
        fail(error.message);
      }
      out({ ok: true, mode, action, person });
      break;
    }

    fail('usage: people <add|remove|primary> ...');
    break;
  }

  default:
    fail(
      'usage: node tool/numerology-cli.mjs <profile|date_energy|range_scan|life_path|calendar|roster|person|upcoming|people> \'{"..."}\''
    );
}
