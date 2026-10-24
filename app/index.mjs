#!/usr/bin/env node
/**
 * The Chart — a GG33 timing agent built on the Pi SDK.
 *
 * It answers "when should I launch X" with dates, not vibes. Every number comes
 * from the engine through one of two in-process tools; the model never computes.
 *
 *   user_profile(birth_date?, reference_date?)
 *   numerology_query(mode, ...)
 *
 * Usage:
 *   node --experimental-strip-types app/index.mjs          # interactive-ish run
 *   node --experimental-strip-types app/index.mjs --once   # single non-interactive run
 *   node --experimental-strip-types app/index.mjs --dry    # engine-only brief, no model
 *
 * Config (env):
 *   CHART_BIRTH_DATE   default 2003-05-23
 *   CANON_DIR          default ~/franco/canon (optional; canon stays outside the repo)
 *   CHART_MODEL        e.g. anthropic/claude-sonnet-4 (otherwise Pi's configured default)
 */

import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { homedir } from 'node:os';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const CANON_DIR = process.env.CANON_DIR ?? join(homedir(), 'franco', 'canon');
const BIRTH_DATE = process.env.CHART_BIRTH_DATE ?? '2003-05-23';
const BRIEF_PATH = resolve(REPO_ROOT, 'weekly-timing-brief.md');
const BRIEF_ARCHIVE_DIR = resolve(REPO_ROOT, 'briefs');
const MAX_TOOL_CALLS = 15;

const CANON_FILES = [
  ['brand-bible.md', 'Brand Bible'],
  ['gg33-brief.md', 'GG33 Brief'],
  ['letterology-brief.md', 'Letterology Brief'],
  ['goals-12mo.md', '12-Month Goals']
];

// The engine is the only source of numbers. If the build is missing, say so
// plainly instead of failing halfway through a model turn.
let core;
try {
  core = await import('../dist/numerology-core.mjs');
} catch {
  console.error('dist/numerology-core.mjs is missing — run `npm run build` first.');
  process.exit(1);
}

const {
  calculateLifePath,
  calculateCycleEnergies,
  calculateNumerologyEnergies,
  generateMonthlySchedule,
  formatDateKey,
  reduceToSingleDigit
} = core;

// =============================================================================
// Numbers — every value comes from the engine
// =============================================================================

const PUBLISH_DIGITS = new Set([3, 5, 6, 9]);

/** Master-preserving reduction, exactly as the engine does it. */
const publishEligible = (dateKey) =>
  PUBLISH_DIGITS.has(reduceToSingleDigit(Number(dateKey.slice(8, 10))));

function profile(referenceDate = formatDateKey(new Date()), birthDate = BIRTH_DATE) {
  const cycles = calculateCycleEnergies(referenceDate, birthDate);
  return {
    reference_date: referenceDate,
    birth_date: birthDate,
    life_path: calculateLifePath(birthDate).displayValue,
    universal_year: cycles.universalYear.displayValue,
    universal_month: cycles.universalMonth.displayValue,
    personal_year: cycles.personalYear?.displayValue ?? null,
    personal_year_range: cycles.personalYear?.dateLabel ?? null,
    personal_month: cycles.personalMonth?.displayValue ?? null,
    personal_month_range: cycles.personalMonth?.dateLabel ?? null
  };
}

function dateEnergy(dateKey) {
  const r = calculateNumerologyEnergies(dateKey);
  return {
    date: dateKey,
    weekday: new Date(dateKey + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' }),
    full_date_energy: r.fullDateEnergy.displayValue,
    secondary_energy: r.secondaryEnergy.displayValue,
    combined: r.combinedKey,
    publish_eligible: publishEligible(dateKey)
  };
}

function daysBetween(startKey, endKey) {
  const days = [];
  const cur = new Date(startKey + 'T00:00:00');
  const end = new Date(endKey + 'T00:00:00');
  while (cur <= end) {
    days.push(dateEnergy(formatDateKey(cur)));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

function rangeScan({ start, end, target_energies: targets }) {
  const wanted = targets ? new Set(targets.map(String)) : null;
  const days = daysBetween(start, end).filter(
    (d) => !wanted || wanted.has(d.full_date_energy) || wanted.has(d.secondary_energy)
  );
  return { start, end, count: days.length, days };
}

function lifePath(birthDate = BIRTH_DATE) {
  const r = calculateLifePath(birthDate);
  return {
    birth_date: r.birthday,
    life_path: r.displayValue,
    underlying: r.underlyingNumber,
    is_master: r.isMaster,
    is_wealth: r.isWealth,
    summary: r.summary,
    note: r.calculationNote
  };
}

function calendar(month = formatDateKey(new Date()).slice(0, 7)) {
  const days = generateMonthlySchedule(month + '-01').map((d) => ({
    date: d.date,
    weekday: String(d.dayName).slice(0, 3),
    full_date_energy: d.fullDateEnergy,
    secondary_energy: d.secondaryEnergy,
    publish_eligible: publishEligible(d.date)
  }));
  return { month, days };
}

// =============================================================================
// Tools — registered in-process, never via MCP
// =============================================================================

let toolCalls = 0;

function toolResult(payload) {
  toolCalls += 1;
  if (toolCalls > MAX_TOOL_CALLS) {
    return {
      content: [
        {
          type: 'text',
          text: `Tool budget exhausted (${MAX_TOOL_CALLS} calls). Produce the brief with what you already have.`
        }
      ],
      details: { budget_exhausted: true },
      isError: true
    };
  }
  return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }], details: payload };
}

/** Errors are results, never thrown: a thrown error aborts the agent turn. */
function toolError(message) {
  return {
    content: [{ type: 'text', text: JSON.stringify({ ok: false, error: message }, null, 2) }],
    details: { ok: false, error: message },
    isError: true
  };
}

function buildTools(Type, defineTool) {
  const userProfileTool = defineTool({
    name: 'user_profile',
    label: 'User profile',
    description:
      'Full numerology profile: life path, universal year/month, personal year/month with their date ranges. Recomputed on every call, so it is never stale.',
    promptSnippet: 'user_profile() — life path and the four timing cycles with date ranges',
    parameters: Type.Object({
      birth_date: Type.Optional(Type.String({ description: 'YYYY-MM-DD (default CHART_BIRTH_DATE)' })),
      reference_date: Type.Optional(Type.String({ description: 'YYYY-MM-DD (default today)' }))
    }),
    async execute(_id, params) {
      try {
        return toolResult(
          profile(
            params?.reference_date ?? formatDateKey(new Date()),
            params?.birth_date ?? BIRTH_DATE
          )
        );
      } catch (error) {
        return toolError(error.message);
      }
    }
  });

  const numerologyQueryTool = defineTool({
    name: 'numerology_query',
    label: 'Numerology query',
    description:
      'Query the engine. Modes: date_energy (date), range_scan (start, end, optional target_energies), life_path (optional birth_date), calendar (optional month).',
    promptSnippet: 'numerology_query(mode, ...) — date_energy, range_scan, life_path, calendar',
    parameters: Type.Object({
      mode: Type.Union([
        Type.Literal('date_energy'),
        Type.Literal('range_scan'),
        Type.Literal('life_path'),
        Type.Literal('calendar')
      ]),
      date: Type.Optional(Type.String({ description: 'YYYY-MM-DD (date_energy)' })),
      start: Type.Optional(Type.String({ description: 'YYYY-MM-DD (range_scan)' })),
      end: Type.Optional(Type.String({ description: 'YYYY-MM-DD (range_scan)' })),
      target_energies: Type.Optional(
        Type.Array(Type.String(), { description: 'range_scan filter' })
      ),
      birth_date: Type.Optional(Type.String({ description: 'YYYY-MM-DD (life_path)' })),
      month: Type.Optional(Type.String({ description: 'YYYY-MM (calendar)' }))
    }),
    async execute(_id, params) {
      try {
        switch (params?.mode) {
          case 'date_energy':
            if (!params.date) return toolError('date_energy requires "date"');
            return toolResult(dateEnergy(params.date));
          case 'range_scan':
            if (!params.start || !params.end) {
              return toolError('range_scan requires "start" and "end"');
            }
            return toolResult(rangeScan(params));
          case 'life_path':
            return toolResult(lifePath(params.birth_date ?? BIRTH_DATE));
          case 'calendar':
            return toolResult(calendar(params.month));
          default:
            return toolError(`Unknown mode: ${params?.mode}`);
        }
      } catch (error) {
        return toolError(error.message);
      }
    }
  });

  return [userProfileTool, numerologyQueryTool];
}

// =============================================================================
// System prompt
// =============================================================================

function readCanon(file) {
  const path = join(CANON_DIR, file);
  return existsSync(path) ? readFileSync(path, 'utf8').trim() : '';
}

const BRIEF_TEMPLATE = `# Timing brief — week of [range]

## Cycle
Personal Year: X   (changes May 23)
Personal Month: Y  (changes [date])
Universal Month: Z

## Publish days
- [weekday] [date] — full [n], secondary [n]
  1:08 / 2:08 / 3:08pm

## Number of the week
[one Tier 1 number: 5, 6, 8 or 9]

## Flags
[cycle boundaries, enemy-sign days]

## Decisions
Publish: / Hold: / Launch:

## Attribution
[numerology | letterology | astroletterology per line]`;

function buildSystemPrompt() {
  const canon = CANON_FILES.map(([file, title]) => {
    const body = readCanon(file);
    return body ? `### ${title}\n\n${body}` : null;
  }).filter(Boolean);

  return [
    '# The Chart',
    '',
    'You are The Chart, a timing agent working in the GG33 numerology system.',
    'You produce timing decisions — specific dates — not encouragement.',
    '',
    '## Core rule',
    'You never compute a number. Every life path, daily energy, cycle value and',
    'publish-eligibility flag comes from a tool call. If you find yourself adding',
    'digits, stop and call `numerology_query` instead. Never infer a number from an',
    'example in this prompt.',
    '',
    '## Tools',
    '- `user_profile(birth_date?, reference_date?)` — life path plus universal and',
    '  personal year/month with their date ranges. Recomputes every call.',
    '- `numerology_query(mode, ...)` — `date_energy`, `range_scan`, `life_path`,',
    '  `calendar`. Raw engine values.',
    '',
    'Tools return JSON. Errors come back as results with `ok: false`; read them and',
    'adapt rather than retrying the same call.',
    '',
    '## Brief',
    'Write the brief to `weekly-timing-brief.md` in the repo root, matching this',
    'structure exactly (headings, order, and the attribution line on every claim):',
    '',
    '```markdown',
    BRIEF_TEMPLATE,
    '```',
    '',
    '## Boundaries',
    '- You do not post, publish, or write social copy.',
    '- You do not do career strategy. Timing only.',
    '- Letterology is a separate system from Gematria Club and is not implemented in',
    '  this engine; if canon mentions it, attribute it as letterology, never as',
    '  engine output.',
    '',
    canon.length
      ? '## Canon'
      : '## Canon\n\n(No canon files found; proceeding with the core rule only.)',
    ...canon
  ].join('\n');
}

// =============================================================================
// Brief writing
// =============================================================================

function writeBrief(markdown) {
  const cleaned = markdown
    .replace(/^```(?:markdown|md)?\n/i, '')
    .replace(/\n```\s*$/i, '')
    .trim();

  writeFileSync(BRIEF_PATH, cleaned + '\n', 'utf8');
  mkdirSync(BRIEF_ARCHIVE_DIR, { recursive: true });
  const stamp = formatDateKey(new Date());
  writeFileSync(join(BRIEF_ARCHIVE_DIR, `${stamp}-weekly-timing-brief.md`), cleaned + '\n', 'utf8');
  return BRIEF_PATH;
}

/**
 * Deterministic fallback used by --dry: the engine fills the template with no
 * model involved, so the app can be exercised and its format verified without
 * provider credentials. "Number of the week" picks the most frequent Tier 1
 * full-date energy among the week's days — a documented convention of this
 * fallback, not a canon rule.
 */
function buildDryBrief(referenceDate = formatDateKey(new Date())) {
  const start = new Date(referenceDate + 'T00:00:00');
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const days = daysBetween(formatDateKey(start), formatDateKey(end));
  const today = profile(referenceDate);
  const publishDays = days.filter((d) => d.publish_eligible);

  const tierOne = [5, 6, 8, 9];
  const counts = new Map();
  for (const day of days) {
    const value = Number(day.full_date_energy.split('/')[0]);
    if (tierOne.includes(value)) counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  const number =
    [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0] ?? '—';

  const range = `${days[0].date} – ${days[days.length - 1].date}`;

  return [
    `# Timing brief — week of ${range}`,
    '',
    '## Cycle',
    `Personal Year: ${today.personal_year}   (changes ${today.personal_year_range ?? 'birthday'})`,
    `Personal Month: ${today.personal_month}  (changes ${today.personal_month_range ?? 'birth day'})`,
    `Universal Month: ${today.universal_month}`,
    '',
    '## Publish days',
    ...(publishDays.length
      ? publishDays.map(
          (d) =>
            `- ${d.weekday} ${d.date} — full ${d.full_date_energy}, secondary ${d.secondary_energy}\n  1:08 / 2:08 / 3:08pm`
        )
      : ['- none this week']),
    '',
    '## Number of the week',
    String(number),
    '',
    '## Flags',
    `- Personal Month changes ${today.personal_month_range ?? 'on the birth day'}`,
    `- Life Path ${today.life_path} (engine)`,
    '',
    '## Decisions',
    `Publish: ${publishDays.length ? publishDays.map((d) => d.date).join(', ') : 'hold'}`,
    'Hold: ',
    'Launch: ',
    '',
    '## Attribution',
    'numerology: all cycle and energy values (engine, --dry)',
    'letterology: not used',
    'astroletterology: not used'
  ].join('\n');
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  const once = process.argv.includes('--once');
  const useDry = process.argv.includes('--dry');

  if (useDry) {
    console.log(`The Chart (dry, no model) wrote ${writeBrief(buildDryBrief())}`);
    return;
  }

  let pi;
  try {
    pi = await import('@earendil-works/pi-coding-agent');
  } catch {
    console.error('Pi SDK not installed — run `npm install` in app/.');
    process.exit(1);
  }

  let Type;
  try {
    ({ Type } = await import('typebox'));
  } catch {
    console.error('typebox is required (ships with the Pi SDK) — run `npm install` in app/.');
    process.exit(1);
  }

  const { createAgentSession, ModelRuntime, DefaultResourceLoader, SessionManager, defineTool } = pi;

  const modelRuntime = await ModelRuntime.create();
  const loader = new DefaultResourceLoader({
    cwd: REPO_ROOT,
    agentDir: REPO_ROOT,
    systemPromptOverride: () => buildSystemPrompt(),
    skillsOverride: () => ({ skills: [], diagnostics: [] }),
    agentsFilesOverride: () => ({ agentsFiles: [], diagnostics: [] }),
    promptsOverride: () => ({ prompts: [], diagnostics: [] }),
    noContextFiles: true
  });
  await loader.reload();

  const options = {
    resourceLoader: loader,
    modelRuntime,
    cwd: REPO_ROOT,
    sessionManager: SessionManager.inMemory(),
    customTools: buildTools(Type, defineTool),
    tools: ['read', 'write']
  };

  if (process.env.CHART_MODEL) {
    try {
      const [provider, ...rest] = process.env.CHART_MODEL.split('/');
      options.model = pi.getModel(provider, rest.join('/'));
    } catch (error) {
      console.error(`CHART_MODEL is not a known model: ${error.message}`);
      process.exit(1);
    }
  }

  const { session } = await createAgentSession(options);

  console.log(
    process.env.MNEMOSYNE_MCP_COMMAND
      ? 'memory: Mnemosyne configured via MNEMOSYNE_MCP_COMMAND (requires the pi-mcp extension)'
      : 'memory: Mnemosyne not configured — running without it'
  );

  const prompt = once
    ? "Produce this week's timing brief now, following your brief template exactly. " +
      'Use the tools for every number. Write it to weekly-timing-brief.md, then reply DONE.'
    : "Produce this week's timing brief. Use the tools for every number. " +
      'Write it to weekly-timing-brief.md, then reply DONE.';

  try {
    await session.prompt(prompt);
  } catch (error) {
    const message = String(error?.message ?? error);
    if (/api key/i.test(message)) {
      console.error(
        'No provider credentials found. Run `pi` once to log in, or set the provider API key env ' +
        'var. To exercise the app without a model: node app/index.mjs --dry'
      );
      session.dispose();
      process.exit(2);
    }
    console.error('Agent run failed:', message);
    session.dispose();
    process.exit(1);
  }

  const text = session.getLastAssistantText() ?? '';
  const used = toolCalls;
  session.dispose();

  if (!/\bDONE\b/.test(text)) {
    console.error(
      `The agent stopped without DONE (${used} tool call(s)). ` +
      'weekly-timing-brief.md was left as the agent wrote it.'
    );
    process.exit(1);
  }

  console.log(`The Chart wrote ${BRIEF_PATH} (${used} tool call(s), cap ${MAX_TOOL_CALLS}).`);
}

export { buildTools, buildSystemPrompt, buildDryBrief, profile, dateEnergy, rangeScan, lifePath, calendar };

// Only run when executed directly (tests import this module for the tool wiring).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error('Fatal:', error);
    process.exit(1);
  });
}
