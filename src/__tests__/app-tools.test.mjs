/**
 * The app's tool wiring, exercised without a model or provider credentials.
 *
 * `buildTools(Type, defineTool)` takes the schema + tool helpers as arguments,
 * so these tests pass minimal stand-ins: the point is to prove the tools call the
 * engine, expose the right names, and return errors as results.
 */
import { describe, expect, it } from 'vitest';

import { buildTools, buildDryBrief, buildSystemPrompt } from '../../app/index.mjs';

// Stand-ins for TypeBox and Pi's defineTool: both are identity-shaped here.
const Type = {
  Object: (shape) => shape,
  Optional: (value) => value,
  String: (options) => options,
  Union: (variants) => variants,
  Literal: (value) => value,
  Array: (items, options) => ({ items, options })
};
const defineTool = (tool) => tool;

const tools = buildTools(Type, defineTool);
const byName = Object.fromEntries(tools.map((tool) => [tool.name, tool]));

const parse = (result) => JSON.parse(result.content[0].text);

describe('app tool wiring', () => {
  it('registers exactly the two documented tools', () => {
    expect(tools.map((t) => t.name).sort()).toEqual(['numerology_query', 'user_profile']);
    for (const tool of tools) {
      expect(typeof tool.label).toBe('string');
      expect(typeof tool.description).toBe('string');
      expect(tool.parameters).toBeTruthy();
      expect(typeof tool.execute).toBe('function');
    }
  });

  it('user_profile returns engine cycle values', async () => {
    const result = await byName.user_profile.execute('call-1', { reference_date: '2026-10-23' });
    const payload = parse(result);
    expect(payload.life_path).toBe('6');
    expect(payload.universal_year).toBe('1');
    expect(payload.universal_month).toBe('11');
    expect(payload.personal_year).toBe('11');
    expect(payload.personal_month).toBe('3');
    expect(payload.personal_month_range).toBe('Oct 23 – Nov 23, 2026');
    expect(result.isError).toBeUndefined();
  });

  it('numerology_query covers date_energy and keeps 22 whole', async () => {
    const result = await byName.numerology_query.execute('call-2', {
      mode: 'date_energy',
      date: '2026-10-22'
    });
    const payload = parse(result);
    expect(payload.full_date_energy).toBe('6/33');
    expect(payload.secondary_energy).toBe('22');
    expect(payload.publish_eligible).toBe(false);
  });

  it('numerology_query rejects a missing argument as a result, not a throw', async () => {
    const result = await byName.numerology_query.execute('call-3', { mode: 'date_energy' });
    expect(result.isError).toBe(true);
    expect(parse(result).ok).toBe(false);
    expect(parse(result).error).toContain('date');
  });

  it('numerology_query rejects an unknown mode as a result', async () => {
    const result = await byName.numerology_query.execute('call-4', { mode: 'nope' });
    expect(result.isError).toBe(true);
    expect(parse(result).error).toContain('Unknown mode');
  });

  it('stops answering after the 15-call budget', async () => {
    // Budget state is module-level; exhaust it, then expect a refusal.
    for (let i = 0; i < 20; i += 1) {
      await byName.numerology_query.execute('budget', { mode: 'life_path' });
    }
    const result = await byName.numerology_query.execute('budget', { mode: 'life_path' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('budget exhausted');
  });
});

describe('system prompt and dry brief', () => {
  it('states the core rule and never inlines computed numbers', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain('You never compute a number');
    expect(prompt).toContain('user_profile');
    expect(prompt).toContain('numerology_query');
    // Canon lives outside the repo; with none present the prompt says so.
    expect(prompt).toMatch(/No canon files found|## Canon/);
  });

  it('dry brief matches the documented headings, in order', () => {
    const brief = buildDryBrief('2026-10-23');
    const headings = brief
      .split('\n')
      .filter((line) => line.startsWith('#'))
      .map((line) => line.replace(/^#+\s*/, ''));
    expect(headings).toEqual([
      'Timing brief — week of 2026-10-23 – 2026-10-29',
      'Cycle',
      'Publish days',
      'Number of the week',
      'Flags',
      'Decisions',
      'Attribution'
    ]);
  });

  it('dry brief only lists engine-eligible publish days', () => {
    const brief = buildDryBrief('2026-10-23');
    // From the engine: 23 (5), 24 (6), 27 (9) are eligible; 25, 26, 28, 29 are not.
    expect(brief).toContain('Fri 2026-10-23');
    expect(brief).toContain('Sat 2026-10-24');
    expect(brief).toContain('Tue 2026-10-27');
    expect(brief).not.toContain('Sun 2026-10-25');
    expect(brief).not.toContain('Wed 2026-10-28');
  });
});
