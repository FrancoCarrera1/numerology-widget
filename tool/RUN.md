# RUN GUIDE — numerology tool

Expose the existing engine as a deterministic CLI, then as an MCP tool.

The wrapper in `tool/numerology-cli.mjs` **does not reimplement any rule**. It
calls the same `src/numerology-core.ts` functions the web component, the
Übersicht widget, and the Android app use, so its numbers cannot drift from the
UI. Every mode prints JSON on stdout; a human-readable status never goes to
stdout, so a caller can always parse it.

## Prerequisite: build the engine

`dist/` is gitignored, so on a fresh clone the wrapper has nothing to import:

```
npm install
npm run build          # writes dist/numerology-core.mjs
```

If the build output is missing, the CLI exits 1 with:

```json
{ "ok": false, "error": "dist/numerology-core.mjs is missing — run `npm run build` first" }
```

## Run

```
node tool/numerology-cli.mjs <mode> '<json-args>'
# or, via npm:
npm run tool -- <mode> '<json-args>'
```

Modes: `profile`, `date_energy`, `range_scan`, `life_path`, `calendar`.

### profile

Identity plus the four timing cycles for a reference date.

```
node tool/numerology-cli.mjs profile '{"reference_date":"2026-10-23"}'
```

```json
{
  "ok": true,
  "mode": "profile",
  "reference_date": "2026-10-23",
  "birth_date": "2003-05-23",
  "life_path": "6",
  "universal_year": "1",
  "universal_month": "11",
  "personal_year": "11",
  "personal_year_range": "May 23, 2026 – May 23, 2027",
  "personal_month": "3",
  "personal_month_range": "Oct 23 – Nov 23, 2026"
}
```

Args: `birth_date` (default `2003-05-23`), `reference_date` (default today).
Personal Year/Month are `null` when only an `MM-DD` birthday is available.

### date_energy

One day's numbers.

```
node tool/numerology-cli.mjs date_energy '{"date":"2026-10-23"}'
```

```json
{
  "ok": true,
  "mode": "date_energy",
  "date": "2026-10-23",
  "full_date_energy": "7",
  "secondary_energy": "5",
  "combined": "7 + 5",
  "publish_eligible": true
}
```

### range_scan

Every day in an inclusive range, optionally filtered.

```
node tool/numerology-cli.mjs range_scan '{"start":"2026-10-20","end":"2026-10-26","target_energies":["3","6/33"]}'
```

```json
{
  "ok": true,
  "mode": "range_scan",
  "start": "2026-10-20",
  "end": "2026-10-26",
  "count": 2,
  "days": [
    { "date": "2026-10-21", "weekday": "Wed", "full_date_energy": "5", "secondary_energy": "3", "publish_eligible": true },
    { "date": "2026-10-22", "weekday": "Thu", "full_date_energy": "6/33", "secondary_energy": "22", "publish_eligible": false }
  ]
}
```

`target_energies` matches either the full-date or the secondary value; omit it
for every day. Ranges may cross months and years.

### life_path

```
node tool/numerology-cli.mjs life_path '{}'
```

```json
{
  "ok": true,
  "mode": "life_path",
  "birth_date": "2003-05-23",
  "life_path": "6",
  "underlying": null,
  "is_master": false,
  "is_wealth": false,
  "summary": "Protector and nurturer",
  "note": "Month 5 → 5 · Day 23 → 5 · Year 2003 digits = 5. 5 + 5 + 5 = 15; 15 → 6"
}
```

`underlying` is the single-digit root under a master number (11/2, 22/4, 33/6)
or `1` under the Wealth Life Path 28.

### calendar

A whole month as a flat day list.

```
node tool/numerology-cli.mjs calendar '{"month":"2026-10"}'
```

Args: `month` as `YYYY-MM` (default: current month). `weekday` is the 3-letter
form in every mode.

## Semantics worth knowing

- `publish_eligible` is **not** derived from the displayed energy. It reduces the
  **day of the month** and checks membership in `{3, 5, 6, 9}`. So 2026-10-22
  (day 22 → 4) is `false` even though its full-date energy is `6/33`.
- Reduction rules live in `src/numerology-core.ts` and are covered by
  `src/__tests__/numerology-core.test.ts`. Do not add arithmetic here; if a rule
  needs to change, change the engine and its tests.
- Default `birth_date` is the maintainer's. Pass `birth_date` explicitly for
  anyone else.

## Exit codes

| Code | Meaning |
|---|---|
| 0 | mode ran, `ok: true` |
| 1 | missing/invalid args, unknown mode, or missing `dist` build — JSON with `ok: false` on stdout |

## Next step: MCP

The CLI is already the right shape for stdio transport: one process, one JSON
document on stdout, no prompts. To publish it as an MCP tool, wrap each mode in a
tool definition that shells out to this file and returns stdout verbatim — no
schema translation, because the modes are already narrow. Keep `npm run build` in
the install path so the server can never serve a stale engine.
