# CLI Reference — numerology-cli.mjs

Deterministic command-line wrapper around the GG33 numerology engine.
Zero reimplemented rules — it imports `dist/numerology-core.mjs` and calls the same
functions the web component, Übersicht widget, and Android app use.

## Install & Build

```bash
npm install
npm run build          # required — dist/ is gitignored
```

## Usage

```bash
node tool/numerology-cli.mjs <mode> '<json-args>'
# or via npm:
npm run tool -- <mode> '<json-args>'
```

Modes: `profile`, `date_energy`, `range_scan`, `life_path`, `calendar`.

---

## Modes

### `profile`

Full numerology profile for a reference date (today by default).

```bash
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

**Args** (all optional):
- `birth_date` — `YYYY-MM-DD` (default `2003-05-23`)
- `reference_date` — `YYYY-MM-DD` (default today)

---

### `date_energy`

One day's full-date and secondary energy.

```bash
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

**Args** (required):
- `date` — `YYYY-MM-DD`

---

### `range_scan`

Every day in an inclusive range, optionally filtered by target energies.

```bash
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

**Args** (required):
- `start` — `YYYY-MM-DD`
- `end` — `YYYY-MM-DD`
- `target_energies` (optional) — array of strings, matches either `full_date_energy` or `secondary_energy`

Returns `count` before `days`. Ranges may cross months and years.

---

### `life_path`

```bash
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

**Args** (optional):
- `birth_date` — `YYYY-MM-DD` (default `2003-05-23`)

`underlying` is the single-digit root under a master number (11/2, 22/4, 33/6)
or `1` under the Wealth Life Path 28.

---

### `calendar`

A whole month as a flat day list.

```bash
node tool/numerology-cli.mjs calendar '{"month":"2026-10"}'
```

**Args** (optional):
- `month` — `YYYY-MM` (default current month)

Each day includes `weekday` (3-letter form: `Thu`, `Fri`, etc.),
`full_date_energy`, `secondary_energy`, and `publish_eligible`.

---

## Semantics

- **`publish_eligible`** is *not* derived from the displayed energy. It takes the
  **day of the month**, reduces it with the engine's `reduceToSingleDigit`
  (masters stay whole: 22 stays 22, 11 stays 11), and checks membership in
  `{3, 5, 6, 9}`. So 2026-10-22 is `false` because the day is `22` — a master
  number, not one of those four.

- The `6/33` full-date pairs come from the **two methods** which differ on the
  10s (October and the year-sum). For 2026-10-22:
  - Method 1: `1 + 22 + 10 = 33 → 33`
  - Method 2: `10 + 22 + 10 = 42 → 6`
  Hence `6/33`.

- Default `birth_date` is `2003-05-23`. Pass explicitly for other people.

---

## Exit Codes

| Code | Meaning |
|------|---------|
| 0    | Mode ran, `ok: true` |
| 1    | Missing/invalid args, unknown mode, or missing `dist` build — JSON with `ok: false` on stdout |

---

## Missing Build Output

If `dist/numerology-core.mjs` is missing (e.g. fresh clone, `npm run build` not run),
the CLI exits 1 with:

```json
{ "ok": false, "error": "dist/numerology-core.mjs is missing — run `npm run build` first" }
```

No stack trace — just parseable JSON, so callers can always handle it.

---

## Test Fixtures (must match)

**Date energies** (`full_date_energy / secondary_energy`):

| Date | Expected |
|------|----------|
| 2025-11-08 | 28 / 8 |
| 2025-11-12 | 5 / 3 |
| 2025-12-07 | 1/28 / 7 |
| 2025-11-11 | 4 / 11 |
| 2025-09-15 | 6/33 / 6 |
| 2025-09-22 | 4 / 22 |
| 2026-10-28 | 3 / 1 |
| 2025-02-09 | 20/2 / 9 |

**Life paths:**

| Birth date | Expected |
|------------|----------|
| 2003-05-23 | 6 |
| 1963-02-17 | 11 |
| 1847-02-11 | 33 |
| 1935-02-08 | 28 (1 underneath) |
