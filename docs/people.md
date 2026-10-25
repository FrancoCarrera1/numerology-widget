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

The demo shows one row per person with name, eastern zodiac chip, Life Path,
full-date energy and secondary energy. The primary row is pinned and visually
marked. Selecting a row
opens that person in the existing `<numerology-widget>` detail card with today,
this week, cycles, calendar, and the next five favourable days. Add/edit uses a
native date picker plus name, tags and notes fields.

## Eastern zodiac

Every person also carries a Chinese zodiac derived from their birth year. It is
computed in `src/eastern-zodiac.ts` and reached through the same person objects,
so the roster, the CLI, the MCP tools and the web client cannot disagree.

Two independent axes, in the standard 60-year cycle:

- **Animal** = the Earthly Branch (12), 1984 = Rat.
- **Element and polarity** = the Heavenly Stem (10), 1984 = Yang Wood.

`2003-05-23` is Water Goat (癸未), cycle position 20. Element is *not* derived
from the animal; Water Goat and Wood Goat are twelve years apart.

The year turns over at **Lunar New Year**, not 1 January.

Chinese New Year is lunisolar: it falls on the second new moon after the winter
solstice, which puts it between 21 January and 20 February. The date is
astronomical — the moment of the new moon is computed, then placed against the
calendar's rules for months and leap months — which is why it moves on the
Western calendar. New moons and solstices can be computed centuries ahead, so
future dates are known rather than guessed; a year far out can always be
confirmed against an astronomical almanac, and it can shift by a day with time
zone.

The lunar year comes from the platform calendar
(`Intl.DateTimeFormat('en-u-ca-chinese')`), which carries those new-moon dates.
Dates resolve at 12:00 UTC so a birthday near midnight cannot land on the wrong
side of the date line. `1985-02-10` resolves to lunar 1984, Wood Rat, because
that year's new year fell on 20 February.

`src/__tests__/eastern-zodiac.test.ts` holds the rule to account: every new year
from 1950 to 2050 is asserted to fall inside that 21 January – 20 February
window, with 2023-01-22 and 2024-02-10 pinned. If ICU has no
Chinese calendar, the module falls back to the Gregorian year and sets
`boundary: 'gregorian'` on the result instead of pretending it is exact.

Surfaces:

- `getEasternZodiac(date)` and `easternZodiacForYear(year)` from the core package
  (`src/eastern-zodiac.ts`, re-exported by `numerology-core`).
- `person.zodiac` on every roster entry and `entryPayload`.
- `year_zodiac` on `date_energy`, the zodiac of that date's lunar year.
- `person` and `roster` MCP tools return it inside the same payloads.
- The web roster shows an element-and-animal chip; the detail meta shows the
  traditional name (e.g. 癸未).
- `row` carries Goat; Sheep and Ram are the same branch and some traditions use
  those names (`GOAT_ALIASES`).

Nothing here touches reduction: the zodiac is calendar arithmetic, not
numerology, and it never feeds a Life Path or a daily energy.

## Native ports

These are specified but not implemented in this change; the web client is the
priority and the native ports should not block it.

### macOS / Übersicht

**Implemented, read-only by design.** The widget shows the roster and switches
between people; it never writes a birthday. Editing happens in the CLI or
through an agent, which is the point: one storage path, one set of rules.

1. `scripts/build-uebersicht.mjs` injects a **command**, not data:
   `node tool/numerology-cli.mjs roster --json`. The widget re-runs it every 60s
   and parses the payload.
   Nothing is baked in, so a build cannot copy a friend's birthday into the
   tracked `index.jsx`. The only date in that file is the empty `BIRTHDAY`
   fallback.
2. `parseRoster(output)` accepts that JSON and falls back to the old `date +%s`
   epoch, so an older build, a missing people file, or a broken CLI leaves the
   single-birthday widget working exactly as before.
3. A compact roster sits above the detail card, primary first. Clicking a row
   dispatches `SELECT_PERSON`, which stores the id in `localStorage` and makes
   that person the active birthdate — the life path, cycles and calendar then
   follow from the same engine calls as before.
4. The primary is the default view when nothing has been picked, matching the
   single-user behaviour.
5. With a roster present the Birthday control becomes a read-only label
   (`from data/people.json`); the editable form only appears when there is no
   roster.
6. Zodiac comes through in the roster payload (`person.zodiac.display`) and is
   used as the row's tooltip next to the life path.

### Android

1. Replace the single `BirthdayStore` value with a JSON string preference
   (`people`) containing the same person records. Migrate the existing
   `birthday` key into one primary person on first read.
2. Add `PersonStore.kt` with list/get/add/remove/setPrimary and slug/id rules
   matching `src/people-model.ts`.
2b. Add `EasternZodiac.kt` with the same stem/branch tables and the same
   `java.time.chrono.ChineseChronology` year lookup for the Lunar New Year
   boundary. Do not hard-code an animal from the Gregorian year: January
   birthdays would be wrong. Pin the same fixtures used by
   `src/__tests__/eastern-zodiac.test.ts`.
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
