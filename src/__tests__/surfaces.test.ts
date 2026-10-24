import { describe, expect, it, beforeAll } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');
const CLI = resolve(ROOT, 'tool/numerology-cli.mjs');
const MCP = resolve(ROOT, 'mcp/server.mjs');
const DIST = resolve(ROOT, 'dist/numerology-core.mjs');

beforeAll(() => {
  if (!existsSync(DIST)) {
    // Surfaces import the built engine; CI may run tests before its build step.
    execFileSync('npx', ['vite', 'build', '--logLevel', 'silent'], { cwd: ROOT, stdio: 'ignore' });
  }
  expect(existsSync(DIST)).toBe(true);
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

describe('MCP surface', () => {
  it('lists exactly the two tools', () => {
    const res = mcp({ jsonrpc: '2.0', id: 1, method: 'tools/list' });
    const names = res.result.tools.map((t: { name: string }) => t.name).sort();
    expect(names).toEqual(['numerology_query', 'user_profile']);
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
