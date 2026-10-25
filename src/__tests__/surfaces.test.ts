import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');
const CLI = resolve(ROOT, 'tool/numerology-cli.mjs');
const MCP = resolve(ROOT, 'mcp/server.mjs');
const DIST = resolve(ROOT, 'dist/numerology-core.mjs');
const PEOPLE_DIST = resolve(ROOT, 'dist/people.mjs');

let peopleDirectory: string;

beforeAll(() => {
  if (!existsSync(DIST) || !existsSync(PEOPLE_DIST)) {
    // Surfaces import the built engine; CI may run tests before its build step.
    execFileSync('npx', ['vite', 'build', '--logLevel', 'silent'], { cwd: ROOT, stdio: 'ignore' });
  }
  expect(existsSync(DIST)).toBe(true);
  expect(existsSync(PEOPLE_DIST)).toBe(true);

  // Keep tests away from the real gitignored roster. These dates are the public
  // fixture dates already committed in the docs, not anyone's private data.
  peopleDirectory = mkdtempSync(join(tmpdir(), 'numerology-surfaces-'));
  process.env.NUMEROLOGY_PEOPLE_FILE = join(peopleDirectory, 'people.json');
  process.env.NUMEROLOGY_BIRTH_DATE = '2003-05-23';
  writeFileSync(
    process.env.NUMEROLOGY_PEOPLE_FILE,
    JSON.stringify(
      {
        people: [
          { id: 'franco', name: 'Franco', birthdate: '2003-05-23', tags: ['self'], notes: '', primary: true },
          { id: 'gary', name: 'Gary', birthdate: '1963-02-17', tags: ['friend', 'research'], notes: 'GG11', primary: false },
          { id: 'lin', name: 'Lin', birthdate: '1847-02-11', tags: ['research'], notes: '', primary: false },
          { id: 'wealth', name: 'Wealth', birthdate: '1935-02-08', tags: ['test'], notes: '', primary: false }
        ]
      },
      null,
      2
    ) + '\n',
    'utf8'
  );
});

afterAll(() => {
  if (peopleDirectory) rmSync(peopleDirectory, { recursive: true, force: true });
  delete process.env.NUMEROLOGY_PEOPLE_FILE;
  delete process.env.NUMEROLOGY_BIRTH_DATE;
});

function cli(mode: string, args: Record<string, unknown> = {}) {
  return JSON.parse(
    execFileSync('node', [CLI, mode, JSON.stringify(args)], { encoding: 'utf8', cwd: ROOT })
  );
}

/** Send one JSON-RPC request to the MCP server and return the parsed response. */
function mcp(request: Record<string, unknown>) {
  const result = spawnSync('node', [MCP], {
    input: JSON.stringify(request) + '\n',
    encoding: 'utf8',
    cwd: ROOT,
    timeout: 20000
  });
  const line = (result.stdout ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('{'))
    .pop();
  if (!line) throw new Error(`No JSON-RPC response. stderr: ${result.stderr}`);
  return JSON.parse(line);
}

describe('CLI date-energy fixtures', () => {
  const fixtures: Array<[string, string]> = [
    ['2025-11-08', '28 / 8'],
    ['2025-11-12', '5 / 3'],
    ['2025-12-07', '1/28 / 7'],
    ['2025-11-11', '4 / 11'],
    ['2025-09-15', '6/33 / 6'],
    ['2025-09-22', '4 / 22'],
    ['2026-10-28', '3 / 1'],
    ['2025-02-09', '20/2 / 9']
  ];

  it.each(fixtures)('%s → %s', (date, expected) => {
    const out = cli('date_energy', { date });
    expect(`${out.full_date_energy} / ${out.secondary_energy}`).toBe(expected);
    expect(out.ok).toBe(true);
  });
});

describe('CLI life-path fixtures', () => {
  const fixtures: Array<[string, string, number | null]> = [
    ['2003-05-23', '6', null],
    ['1963-02-17', '11', 2],
    ['1847-02-11', '33', 6],
    ['1935-02-08', '28', 1]
  ];

  it.each(fixtures)('%s → %s', (birth_date, expected, underlying) => {
    const out = cli('life_path', { birth_date });
    expect(out.life_path).toBe(expected);
    expect(out.underlying).toBe(underlying);
  });
});

describe('CLI surface contract', () => {
  it('keeps 2026-10-22 ineligible because the day is 22, not 3/5/6/9', () => {
    const out = cli('date_energy', { date: '2026-10-22' });
    expect(out.full_date_energy).toBe('6/33');
    expect(out.secondary_energy).toBe('22');
    expect(out.publish_eligible).toBe(false);
  });

  it('reports count before days in range_scan', () => {
    const out = cli('range_scan', { start: '2026-10-20', end: '2026-10-26' });
    expect(out.count).toBe(7);
    expect(out.days).toHaveLength(7);
    expect(Object.keys(out).indexOf('count')).toBeLessThan(Object.keys(out).indexOf('days'));
  });

  it('filters range_scan by either energy', () => {
    const out = cli('range_scan', {
      start: '2026-10-20',
      end: '2026-10-26',
      target_energies: ['3', '6/33']
    });
    expect(out.days.map((d: { date: string }) => d.date)).toEqual(['2026-10-21', '2026-10-22']);
  });

  it('uses 3-letter weekdays in calendar output', () => {
    const out = cli('calendar', { month: '2026-10' });
    expect(out.days).toHaveLength(31);
    expect(new Set(out.days.map((d: { weekday: string }) => d.weekday))).toEqual(
      new Set(['Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed'])
    );
  });

  it('accepts numeric year and month for calendar', () => {
    const out = cli('calendar', { year: 2026, month: 10 });
    expect(out.ok).toBe(true);
    expect(out.month).toBe('2026-10');
    expect(out.days).toHaveLength(31);
    expect(out.days[0].date).toBe('2026-10-01');
    expect(out.days[30].date).toBe('2026-10-31');
  });

  it('returns ok:false and exit 1 for a bad mode', () => {
    let failed = false;
    try {
      execFileSync('node', [CLI, 'nonsense', '{}'], { encoding: 'utf8', cwd: ROOT });
    } catch (error) {
      failed = true;
      const stdout = (error as { stdout?: string }).stdout ?? '';
      expect(JSON.parse(stdout).ok).toBe(false);
    }
    expect(failed).toBe(true);
  });

  it('returns ok:false for a missing required argument', () => {
    let failed = false;
    try {
      execFileSync('node', [CLI, 'date_energy', '{}'], { encoding: 'utf8', cwd: ROOT });
    } catch (error) {
      failed = true;
      const parsed = JSON.parse((error as { stdout?: string }).stdout ?? '{}');
      expect(parsed.ok).toBe(false);
      expect(parsed.error).toContain('date');
    }
    expect(failed).toBe(true);
  });
});

describe('CLI people surfaces', () => {
  it('renders the roster with the primary first and each life path intact', () => {
    const out = cli('roster', { date: '2026-10-23' });
    expect(out.ok).toBe(true);
    expect(out.count).toBe(4);
    expect(out.people.map((person: { id: string }) => person.id)).toEqual([
      'franco',
      'gary',
      'lin',
      'wealth'
    ]);
    expect(out.people.map((person: { life_path: string }) => person.life_path)).toEqual([
      '6',
      '11',
      '33',
      '28'
    ]);
    expect(out.people[0].primary).toBe(true);
    expect(out.people[1].cycles.personal_month_range).toBe('Oct 17 – Nov 17, 2026');
  });

  it('accepts flag syntax and filters the roster by tag', () => {
    const stdout = execFileSync(
      'node',
      [CLI, 'roster', '--date', '2026-10-23', '--tag', 'research', '--json'],
      { encoding: 'utf8', cwd: ROOT }
    );
    const out = JSON.parse(stdout);
    expect(out.people.map((person: { id: string }) => person.id)).toEqual(['gary', 'lin']);
  });

  it('accepts a positional id together with a JSON argument', () => {
    const stdout = execFileSync(
      'node',
      [CLI, 'person', 'gary', '{"date":"2026-10-23"}'],
      { encoding: 'utf8', cwd: ROOT }
    );
    const out = JSON.parse(stdout);
    expect(out.date).toBe('2026-10-23');
    expect(out.person.id).toBe('gary');
    expect(out.person.life_path).toBe('11');
  });

  it('shows an 11 life path as 11, never 2', () => {
    const out = cli('person', { id: 'gary', date: '2026-10-23' });
    expect(out.person.life_path).toBe('11');
    expect(out.person.life_path_underlying).toBe(2);
    expect(out.person.life_path_is_master).toBe(true);
    expect(out.person.life_path).not.toBe('2');
  });

  it('returns favourable upcoming days as ascending JSON', () => {
    const out = cli('upcoming', { id: 'gary', date: '2026-10-20', days: 15 });
    expect(out.ok).toBe(true);
    expect(out.count).toBe(8);
    expect(out.upcoming.map((day: { date: string }) => day.date)).toEqual([
      '2026-10-21',
      '2026-10-22',
      '2026-10-25',
      '2026-10-28',
      '2026-10-30',
      '2026-10-31',
      '2026-11-02',
      '2026-11-03'
    ]);
    expect(out.upcoming.every((day: { favourable: boolean }) => day.favourable)).toBe(true);
  });

  it('adds and removes a person from the command line', () => {
    const added = cli('people', {
      action: 'add',
      name: 'Test Person',
      birthdate: '1990-01-01',
      tags: ['temp'],
      notes: 'temporary'
    });
    expect(added.person.id).toBe('test-person');
    expect(added.person.tags).toEqual(['temp']);

    const person = cli('person', { id: 'test-person', date: '2026-10-23' });
    expect(person.person.life_path).toBe('3');

    const removed = cli('people', { action: 'remove', id: 'test-person' });
    expect(removed.ok).toBe(true);
    expect(cli('roster', { date: '2026-10-23' }).count).toBe(4);
  });

  it('requires an id for people remove and primary', () => {
    for (const action of ['remove', 'primary']) {
      const result = spawnSync('node', [CLI, 'people', action], {
        encoding: 'utf8',
        cwd: ROOT
      });
      expect(result.status).toBe(1);
      const output = JSON.parse(result.stdout);
      expect(output.ok).toBe(false);
      expect(output.error).toContain('requires an id');
    }
  });

  it('can change the primary person and pins them first', () => {
    const changed = cli('people', { action: 'primary', id: 'gary' });
    expect(changed.person.primary).toBe(true);

    const roster = cli('roster', { date: '2026-10-23' });
    expect(roster.people[0].id).toBe('gary');

    cli('people', { action: 'primary', id: 'franco' });
    expect(cli('roster', { date: '2026-10-23' }).people[0].id).toBe('franco');
  });
});

describe('MCP surface', () => {
  it('lists the two original tools plus roster, person, and upcoming', () => {
    const res = mcp({ jsonrpc: '2.0', id: 1, method: 'tools/list' });
    const names = res.result.tools.map((t: { name: string }) => t.name).sort();
    expect(names).toEqual(['numerology_query', 'person', 'roster', 'upcoming', 'user_profile']);
  });

  it('user_profile recomputes the cycles', () => {
    const res = mcp({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: { name: 'user_profile', arguments: { reference_date: '2026-10-23' } }
    });
    const payload = JSON.parse(res.result.content[0].text);
    expect(payload.life_path).toBe('6');
    expect(payload.personal_month).toBe('3');
    expect(payload.personal_month_range).toBe('Oct 23 – Nov 23, 2026');
    expect(payload.personal_year_range).toBe('May 23, 2026 – May 23, 2027');
  });

  it('numerology_query passes through to the engine', () => {
    const res = mcp({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'numerology_query',
        arguments: { mode: 'date_energy', date: '2025-09-15' }
      }
    });
    const payload = JSON.parse(res.result.content[0].text);
    expect(payload.full_date_energy).toBe('6/33');
    expect(payload.secondary_energy).toBe('6');
  });

  it('roster returns the same shape as the CLI, primary first', () => {
    const res = mcp({
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: { name: 'roster', arguments: { date: '2026-10-23' } }
    });
    const payload = JSON.parse(res.result.content[0].text);
    expect(payload.ok).toBe(true);
    expect(payload.people.map((person: { id: string }) => person.id)).toEqual([
      'franco',
      'gary',
      'lin',
      'wealth'
    ]);
    expect(payload.people[1].life_path).toBe('11');
  });

  it('person and upcoming use the same JSON shapes as the CLI', () => {
    const personRes = mcp({
      jsonrpc: '2.0',
      id: 6,
      method: 'tools/call',
      params: { name: 'person', arguments: { id: 'gary', date: '2026-10-23' } }
    });
    const person = JSON.parse(personRes.result.content[0].text);
    expect(person.person.life_path).toBe('11');
    expect(person.person.cycles.personal_month_range).toBe('Oct 17 – Nov 17, 2026');

    const upcomingRes = mcp({
      jsonrpc: '2.0',
      id: 7,
      method: 'tools/call',
      params: {
        name: 'upcoming',
        arguments: { id: 'gary', date: '2026-10-20', days: 15 }
      }
    });
    const upcoming = JSON.parse(upcomingRes.result.content[0].text);
    expect(upcoming.count).toBe(8);
    expect(upcoming.upcoming[0].date).toBe('2026-10-21');
  });

  it('returns an error result instead of throwing for bad input', () => {
    const res = mcp({
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: { name: 'numerology_query', arguments: { mode: 'date_energy' } }
    });
    const payload = JSON.parse(res.result.content[0].text);
    expect(payload.ok).toBe(false);
    expect(res.result.isError).toBe(true);
  });
});


describe('eastern zodiac surfaces', () => {
  it('carries the zodiac in roster payloads, one per person', () => {
    const roster = cli('roster', { date: '2026-10-23' });

    expect(roster.people.map((person: { zodiac: { display: string } }) => person.zodiac.display)).toEqual([
      'Water Goat',
      'Water Cat',
      'Fire Horse',
      'Wood Pig'
    ]);
    expect(roster.people[2].zodiac.lunar_year).toBe(1846);
    expect(roster.people[0].zodiac.year_name).toBe('癸未');
  });

  it('carries the zodiac in a single person payload', () => {
    const person = cli('person', { id: 'gary', date: '2026-10-23' });

    expect(person.person.zodiac.display).toBe('Water Cat');
    expect(person.person.zodiac.cycle_position).toBe(40);
    expect(person.person.zodiac.boundary).toBe('lunar');
  });

  it('reports the year zodiac on date_energy', () => {
    const out = cli('date_energy', { date: '2003-05-23' });

    expect(out.year_zodiac.display).toBe('Water Goat');
    expect(out.year_zodiac.lunar_year).toBe(2003);
    expect(out.year_zodiac.cycle_position).toBe(20);
  });

  it('exposes the zodiac through the MCP roster tool', () => {
    const res = mcp({
      jsonrpc: '2.0',
      id: 9,
      method: 'tools/call',
      params: { name: 'roster', arguments: { date: '2026-10-23' } }
    });
    const payload = JSON.parse(res.result.content[0].text);

    expect(payload.people[0].zodiac.display).toBe('Water Goat');
    expect(payload.people[1].zodiac.display).toBe('Water Cat');
  });
});
