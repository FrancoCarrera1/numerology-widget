# Agent integration

How an external agent should use this repo's tools.

## The core rule

> **The engine is the single source of truth. Nothing may reimplement a rule.**

Every number — Life Path, daily energy, cycle values, publish eligibility — must
come from one of the tools below. An agent that adds digits is a bug, even when it
gets the answer right, because the next date will quietly disagree with the widget.

## Surfaces, and which to use

| You are | Use | Why |
|---|---|---|
| A shell script or cron job | `tool/numerology-cli.mjs` | JSON on stdout, no SDK |
| Claude Code / Cursor / Pi (third-party host) | `mcp/server.mjs` | stdio MCP, five tools |
| A Node agent you control | import `dist/numerology-core.mjs` (or `dist/people.mjs` for the roster) | no subprocess hop |
| The Chart (`app/`) | its in-process tools | same engine, typed schemas |

## Tool contracts

Both the CLI and the MCP server return the same documents. `ok` is always present.

### Profile

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

Call it fresh each session. Personal Month changes on the birth day, so a profile
cached from yesterday can be wrong today.

### Date energy

```json
{
  "ok": true,
  "mode": "date_energy",
  "date": "2026-10-22",
  "full_date_energy": "6/33",
  "secondary_energy": "22",
  "combined": "6/33 + 22",
  "publish_eligible": false
}
```

### Range scan

`count` comes before `days`. `target_energies` matches either the full-date or the
secondary value.

### Life path

Returns `displayValue`, `underlyingNumber`, `isMaster`, `isWealth`, and the full
`calculationNote` — quote the note when explaining, rather than re-deriving.

### Errors

Failures never throw. They arrive as:

```json
{ "ok": false, "error": "date_energy requires {\"date\":\"YYYY-MM-DD\"}" }
```

Exit code 1 from the CLI, `isError: true` from MCP. Read the message; do not retry
the identical call.

## Rules an agent must not infer

These are cheap to get wrong and expensive to debug:

1. **2 reads as 11.** There is no Life Path 2.
2. **28 is the Wealth Life Path**, shown `28` with `1` underneath — not reduced.
3. **33 keeps a 6 underneath** but is never called 6.
4. **Day 28 reduces normally** for secondary energy (`2+8 → 10 → 1`). Wealth does
   not apply to the day.
5. **`6/33` is a two-method result**, not a range. The methods differ on the tens,
   never on the master day itself.
6. **Personal Year changes on the birthday**; **Personal Month on the birth day**,
   not the 1st.
7. **`publish_eligible` uses the day of the month**, master-preserving, against
   `{3,5,6,9}`. It is unrelated to the headline energy: 2026-10-22 is `6/33` and
   ineligible.

## What not to ask these tools for

- Astrology, transits, birth charts — not implemented.
- Letterology or name gematria — not implemented. Letterology is a separate system
  from Gematria Club; do not present canon text as engine output.
- Publishing or scheduling — the tools compute; they never post.

## Cost and latency

- CLI: ~60 ms per invocation (Node startup dominates). Batch with `range_scan` or
  `calendar` instead of looping `date_energy`.
- MCP: one subprocess per call. Same advice.
- In-process: negligible.

For repeated timing questions, generate a 90-day context file once and let the
agent read it instead of calling tools per turn:

```bash
node tool/numerology-cli.mjs calendar '{"month":"2026-10"}' > timing-calendar.md
```

## Minimum prompt block

If you are wiring an agent from scratch, this is the smallest prompt that keeps it
honest:

```text
You never compute numerology. Every number comes from a tool call:
user_profile() for cycles, numerology_query(mode, ...) for dates.
Quote the engine's calculationNote instead of re-deriving a value.
Personal Month changes on the birth day; never assume it matches the calendar month.
```
