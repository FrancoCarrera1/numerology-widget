/**
 * Month navigation for the Übersicht widget.
 *
 * Tests the built artifact (`DailyEnergy.widget/index.jsx`) because that is what
 * Übersicht actually loads, and because the template still contains the
 * `__BIRTHDAY__` placeholder. Rebuild before running if the template changed:
 *   npm run build:uebersicht
 */
import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Übersicht provides React globally and compiles the widget with the classic
// JSX runtime, so the widget calls React.createElement without importing it.
globalThis.React = React;

import {
  initialState,
  render,
  updateState
} from '../DailyEnergy.widget/index.jsx';

/** Epoch seconds for a UTC noon timestamp, matching `date +%s` output. */
const epochSeconds = (isoDate) => String(Date.parse(`${isoDate}T12:00:00Z`) / 1000);

const MARCH = epochSeconds('2026-03-15');
const APRIL = epochSeconds('2026-04-15');

const stateWith = (overrides = {}) => ({
  ...initialState,
  output: MARCH,
  birthday: null,
  ...overrides
});

const markup = (state) => renderToStaticMarkup(render(state, () => {}));

/** Text of the calendar header label ("March 2026"), not the UM tile. */
const calendarLabel = (html) => {
  const match = html.match(/min-width:82px[^>]*>([^<]+)</);
  if (!match) throw new Error('Calendar month label not found');
  return match[1];
};

const labelIndex = (html) => html.indexOf('min-width:82px');

describe('calendar month state', () => {
  it('starts on the current month', () => {
    expect(initialState.calendarMonth).toBeNull();
  });

  it('shifts back and forward from the current month', () => {
    const previous = updateState({ type: 'CALENDAR_SHIFT', delta: -1 }, stateWith());
    expect(previous.calendarMonth).toBe('2026-02-01');

    const next = updateState({ type: 'CALENDAR_SHIFT', delta: 1 }, stateWith());
    expect(next.calendarMonth).toBe('2026-04-01');
  });

  it('accumulates repeated shifts', () => {
    let state = stateWith();
    for (let i = 0; i < 3; i += 1) {
      state = updateState({ type: 'CALENDAR_SHIFT', delta: 1 }, state);
    }
    expect(state.calendarMonth).toBe('2026-06-01');
  });

  it('crosses year boundaries in both directions', () => {
    const january = stateWith({ output: epochSeconds('2026-01-10') });
    const back = updateState({ type: 'CALENDAR_SHIFT', delta: -1 }, january);
    expect(back.calendarMonth).toBe('2025-12-01');

    const december = stateWith({ calendarMonth: '2026-12-01' });
    const forward = updateState({ type: 'CALENDAR_SHIFT', delta: 1 }, december);
    expect(forward.calendarMonth).toBe('2027-01-01');
  });

  it('ignores invalid deltas', () => {
    const state = stateWith({ calendarMonth: '2026-05-01' });
    expect(updateState({ type: 'CALENDAR_SHIFT', delta: 0 }, state)).toBe(state);
    expect(updateState({ type: 'CALENDAR_SHIFT', delta: 'x' }, state)).toBe(state);
  });

  it('returns to the current month', () => {
    const state = updateState(
      { type: 'CALENDAR_TODAY' },
      stateWith({ calendarMonth: '2026-09-01' })
    );
    expect(state.calendarMonth).toBeNull();
  });

  it('drops a pin on the current month when the day rolls into a new month', () => {
    const state = updateState(
      { output: APRIL },
      stateWith({ calendarMonth: '2026-03-01' })
    );
    expect(state.calendarMonth).toBeNull();
  });

  it('keeps a pin on the current month while the day stays inside it', () => {
    const state = updateState(
      { output: epochSeconds('2026-03-16') },
      stateWith({ calendarMonth: '2026-03-01' })
    );
    expect(state.calendarMonth).toBe('2026-03-01');
  });

  it('keeps a non-current month across clock ticks', () => {
    const state = updateState(
      { output: epochSeconds('2026-05-20') },
      stateWith({ calendarMonth: '2026-02-01' })
    );
    expect(state.calendarMonth).toBe('2026-02-01');
  });
});

describe('calendar month rendering', () => {
  it('renders the current month with both arrows and no Today button', () => {
    const html = markup(stateWith());
    expect(calendarLabel(html)).toBe('March 2026');
    expect(html).toContain('Previous month');
    expect(html).toContain('Next month');
    expect(html).not.toContain('Back to the current month');
  });

  it('renders the shifted month with a Today button', () => {
    const html = markup(stateWith({ calendarMonth: '2026-04-01' }));
    expect(calendarLabel(html)).toBe('April 2026');
    expect(html).toContain('Back to the current month');
  });

  it('renders the nav inside the calendar header', () => {
    const html = markup(stateWith({ calendarMonth: '2026-04-01' }));
    const label = labelIndex(html);
    const prev = html.indexOf('Previous month');
    const next = html.indexOf('Next month');
    expect(label).toBeGreaterThan(-1);
    expect(prev).toBeGreaterThan(-1);
    expect(prev).toBeLessThan(label);
    expect(next).toBeGreaterThan(label);
  });
});
