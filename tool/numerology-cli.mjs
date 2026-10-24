#!/usr/bin/env node
/**
 * numerology-cli.mjs — deterministic tool wrapper for the Chart agent.
 * Wraps the existing engine. Does NOT reimplement any rule.
 *
 * Place at: numerology-widget/tool/numerology-cli.mjs
 * Run:      node tool/numerology-cli.mjs <mode> '{"json":"args"}'
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

const {
  calculateNumerologyEnergies,
  calculateCycleEnergies,
  calculateLifePath,
  generateMonthlySchedule,
  formatDateKey,
} = core;

const BIRTH_DATE = '2003-05-23';
const PUBLISH_DIGITS = new Set([3, 5, 6, 9]);

function reduceFull(n) {
  while (n > 9) {
    n = String(n).split('').reduce((s, d) => s + Number(d), 0);
  }
  return n;
}

function publishEligible(dateKey) {
  const day = Number(dateKey.slice(8, 10));
  return PUBLISH_DIGITS.has(reduceFull(day));
}

function out(obj) {
  process.stdout.write(JSON.stringify(obj, null, 2) + '\n');
}

function fail(msg) {
  out({ ok: false, error: msg });
  process.exit(1);
}

const mode = process.argv[2];
const args = process.argv[3] ? JSON.parse(process.argv[3]) : {};

switch (mode) {
  case 'profile': {
    const bd = args.birth_date ?? BIRTH_DATE;
    const ref = args.reference_date ?? formatDateKey(new Date());
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
    out({
      ok: true,
      mode,
      date: args.date,
      full_date_energy: r.fullDateEnergy.displayValue,
      secondary_energy: r.secondaryEnergy.displayValue,
      combined: r.combinedKey,
      publish_eligible: publishEligible(args.date),
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
    const bd = args.birth_date ?? BIRTH_DATE;
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
    const month = args.month ?? formatDateKey(new Date()).slice(0, 7);
    const days = generateMonthlySchedule(month + '-01').map((d) => ({
      date: d.date,
      // Same 3-letter form as range_scan so callers can rely on one shape.
      weekday: String(d.dayName).slice(0, 3),
      full_date_energy: d.fullDateEnergy,
      secondary_energy: d.secondaryEnergy,
      publish_eligible: publishEligible(d.date),
    }));
    out({ ok: true, mode, month, days });
    break;
  }

  default:
    fail('usage: node tool/numerology-cli.mjs <profile|date_energy|range_scan|life_path|calendar> \'{"..."}\'');
}
