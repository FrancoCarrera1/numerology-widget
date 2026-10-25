# People and the roster

Store other people's birthdays, then read everyone's daily energy in one place.
Every number is still produced by `src/numerology-core.ts`; the people layer only
stores names and birthdates and passes them to the existing calculations.

## Privacy and storage

- Default file: `data/people.json`
- Override: `NUMEROLOGY_PEOPLE_FILE=/path/to/people.json`
- `data/*` is gitignored. Only `data/people.example.json` is committed, with
  obviously fake dates.
- Computed values (Life Path, daily energies, cycles) are never stored.

```json
{
  "people": [
    {
      "id": "franco",
      "name": "Franco",
      "birthdate": "2003-05-23",
      "tags": ["self"],
      "notes": "",
      "primary": true
    }
  ]
}
```

`id` is a slug derived from the name unless supplied. `birthdate` must be a real
ISO date in `YYYY-MM-DD` form. `tags` are free strings. Exactly one person is
primary; the primary is pinned first and is the fallback for the existing
single-user CLI modes.

If the file does not exist, the first command that needs it creates one with a
single primary person. The birthdate comes from, in order:
`NUMEROLOGY_BIRTH_DATE`, `CHART_BIRTH_DATE`, `BIRTHDAY`, the gitignored
`uebersicht/birthday.txt`, then the built-in public default. Existing users
therefore see the same profile as before.

## Node API

The Node storage entry is `numerology-widget/people` (built to
`dist/people.mjs`). It is separate from the browser-safe core because it uses the
filesystem.

```ts
import {
  listPeople,
  getPerson,
  addPerson,
  removePerson,
  setPrimary,
  getPersonEnergies,
  getRoster,
  getUpcoming
} from 'numerology-widget/people';

const gary = addPerson({
  name: 'Gary',
  birthdate: '1963-02-17',
  tags: ['friend', 'research'],
  notes: 'GG33'
});

const today = getPersonEnergies(gary.id, '2026-10-23');
// { person, lifePath, fullDateEnergy, secondaryEnergy, combinedKey, cycles }

const roster = getRoster('2026-10-23');       // primary first
const days = getUpcoming(gary.id, {
  date: '2026-10-23',
  days: 30,
  favourableOnly: true
});
```

Dates are local calendar dates. Every read wrapper accepts a date so the roster
can be rendered for any day, not only today.

`getUpcoming` scans `days` calendar days starting at `date` (inclusive) and
returns ascending days. A day is favourable when either full-date calculation
method resolves to **3, 5, 6 or 9**, or when the day is the special **28**
(including a `1/28` display). Reduction still goes through the engine, so a
`20/2` day reads as 11 and does not qualify.

## CLI

JSON-argument style still works, and the new modes also accept flags:

```bash
node tool/numerology-cli.mjs roster --date 2026-10-23 --tag research --json
node tool/numerology-cli.mjs person gary --date 2026-10-23 --json
node tool/numerology-cli.mjs upcoming gary --days 30 --json

node tool/numerology-cli.mjs people add --name "Gary" \
  --birthdate 1963-02-17 --tags friend,research --notes "GG33"
node tool/numerology-cli.mjs people remove gary
node tool/numerology-cli.mjs people primary gary
```

`roster`, `person`, and `upcoming` print a readable summary by default and the
documented JSON with `--json`. The write modes print their updated person as
JSON. Existing modes (`profile`, `date_energy`, `range_scan`, `life_path`,
`calendar`) are unchanged; `profile` and `life_path` use the primary person when
no `birth_date` is supplied.

## MCP

The MCP server exposes three additional tools alongside `user_profile` and
`numerology_query`:

- `roster({ date?, tag? })`
- `person({ id, date? })`
- `upcoming({ id, date?, days?, favourable_only? })`

Their JSON shapes match the CLI.

## Web client

The static web demo has no server (by design), so its roster is stored in
`localStorage` under `numerology-widget-people`. It seeds from the existing
`numerology-widget-birthday` value when present. The web roster and the CLI file
are intentionally not synced; use the CLI/MCP for the local file, or the web
form for the browser copy.

The demo shows one row per person with name, Life Path, full-date energy and
secondary energy. The primary row is pinned and visually marked. Selecting a row
opens that person in the existing `<numerology-widget>` detail card with today,
this week, cycles, calendar, and the next five favourable days. Add/edit uses a
native date picker plus name, tags and notes fields.

## Native ports

These are specified but not implemented in this change; the web client is the
priority and the native ports should not block it.

### macOS / Übersicht

1. Extend `scripts/build-uebersicht.mjs` to read `data/people.json` when present
   and inject a sanitized `PEOPLE` array next to the existing `BIRTHDAY`
   fallback. Never copy the file into git.
2. Keep an in-widget localStorage override for edits, matching the web roster
   shape (`people`, `primary`).
3. Render a compact roster above the existing detail card; primary first.
4. Reuse the bundled `NumerologyCore` for `calculateLifePath`,
   `calculateNumerologyEnergies`, and `calculateCycleEnergies`. Do not port the
   people calculations to JSX.
5. The existing single Birthday control becomes the primary person's editor.

### Android

1. Replace the single `BirthdayStore` value with a JSON string preference
   (`people`) containing the same person records. Migrate the existing
   `birthday` key into one primary person on first read.
2. Add `PersonStore.kt` with list/get/add/remove/setPrimary and slug/id rules
   matching `src/people-model.ts`.
3. Add a roster activity/screen: one row per person (name, Life Path, full-date
   energy, secondary), primary pinned. Use the existing date picker for
   add/edit.
4. Keep `DailyEnergyWidgetProvider` and the calendar provider showing the
   primary person. A later widget picker can choose another id via
   `SharedPreferences`.
5. Reuse `Numerology.calculate`, `LifePath.calculate`, and
   `Cycles.calculateCycleEnergies`; only storage and layout change.
6. Add Kotlin tests for an 11 Life Path, Wealth 28, 33, "2 reads as 11",
   primary ordering, and the favourable-day filter.
