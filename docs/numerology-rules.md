# Numerology rules this engine implements

Plain English, so a reader can understand the system without reading TypeScript.
Every statement here is implemented in `src/numerology-core.ts` and pinned by
fixtures in `src/__tests__/numerology-core.test.ts`.

Source: the **GG33** system (Gary Grinberg / @matrixprime). Nothing in this repo
is derived from CueApp, and **letterology is a separate system from Gematria Club
that is not implemented here** — do not conflate the two. If a surface mentions
letterology, that text is canon, not engine output.

---

## 1. Reduction

Numbers are reduced by summing their digits:

```
1999 → 1+9+9+9 = 28 → 2+8 = 10 → 1+0 = 1
```

**Master numbers 11, 22 and 33 never reduce further.** They stop the loop the
moment they appear.

**Special rule — 2 reads as 11.** When a reduction lands on 2, the engine reports
11 instead. This applies both to Life Path and to every timing cycle
(`reduceCycleNumber`). There is no Life Path 2 in this system.

**28 is special in two places** (below): it is the Wealth Life Path, and it is a
special full-date total that stays visible.

---

## 2. Life Path

Components are reduced **separately**, then summed:

```
month → reduced (November 11 stays 11)
day   → reduced (11 and 22 stay whole)
year  → the sum of its digits, kept as a two-digit component (1963 → 19)
total = month + day + year
```

Then the total is reduced, with three exceptions:

| Total | Result |
|---|---|
| exactly 28 | **28 — Wealth Life Path**, displayed `28`, with `1` underneath. Never reduced to 1. |
| 33 | stays 33, with `6` underneath. Never called 6. |
| any 2 | reads as **11** |

Fixtures:

| Birth date | Life Path |
|---|---|
| 2003-05-23 | 6 |
| 1963-02-17 | 11 |
| 1847-02-11 | 33 |
| 1935-02-08 | 28 (1 underneath) |

---

## 3. Daily energy

Two values per day, plus a combined key.

### Full-date energy — two methods

Method 1 keeps master numbers whole and reduces everything else; Method 2 keeps
everything whole and sums. When they disagree the engine shows both as `n/xx`.

For 2026-10-22 (month 10, day 22, year 2026 → year digits sum 10):

- Method 1: `1 + 22 + 10 = 33 → 33` (10 reduces to 1, 22 stays whole)
- Method 2: `10 + 22 + 10 = 42 → 6` (10 stays whole)
- Result: **`6/33`**

The disagreement is always about the 10s — never about the master day itself.
`22` is `22` in both methods.

Other special cases in the full-date path:
- a total of **20** is displayed `20/2` and reads as **11**
- a Method 1 total of **28** stays `28`
- a Method 1 result of **2** reads as **11**

### Secondary energy — the day of the month

| Day | Secondary |
|---|---|
| 2 | `11` (day 2 = 11 energy) |
| 11 / 22 | kept whole (`Master number day`) |
| 20 | displayed `20/2`, reads as 11 |
| 28 | `2+8 = 10 → 1` — reduces normally |
| anything else | normally reduced |

Note that day 28 is **not** treated as wealth here. Wealth is a Life Path thing.

Fixtures (`full / secondary`):

| Date | Expected |
|---|---|
| 2025-11-08 | 28 / 8 |
| 2025-11-12 | 5 / 3 |
| 2025-12-07 | 1/28 / 7 |
| 2025-11-11 | 4 / 11 |
| 2025-09-15 | 6/33 / 6 |
| 2025-09-22 | 4 / 22 |
| 2026-10-28 | 3 / 1 |
| 2025-02-09 | 20/2 / 9 |

---

## 4. Timing cycles

### Universal Year

Every digit of the calendar year, summed and reduced with the cycle rule.
2026 → `2+0+2+6 = 10 → 1`.

### Universal Month

Universal Year **plus** the calendar month (each reduced first), then reduced.
Changes on the 1st for everyone.

### Personal Year

Birth month + birth day + the digits of the year in which the current
birthday-to-birthday cycle **began**.

**It changes on your birthday, not January 1.** For 2003-05-23:
- 2026-05-23 → 2027-05-22 is the 2026 cycle
- the 2027 cycle starts 2027-05-23

### Personal Month

Active Personal Year **plus** the month in which the current birthday-to-birthday
cycle began.

**It changes on your birth day each month, not the 1st.** For a May 23 birthday,
the Sep 23 – Oct 23 cycle uses September; the October cycle begins Oct 23.

---

## 5. Publish eligibility (surface rule, not an engine rule)

`publish_eligible` lives in the CLI, MCP server and app — not in the engine:

> true when the **day of the month** reduces to **3, 5, 6 or 9**

It uses the engine's master-preserving `reduceToSingleDigit`, so 22 stays 22 and
11 stays 11. Both fall outside the set, which is why 2026-10-22 (`6/33 + 22`) is
**not** publish-eligible despite a striking energy.

Every number it consumes comes from the engine; the four-digit set is a
publishing convention chosen for this project, not a GG33 rule.

---

## 6. What the engine deliberately does not do

- No astrology, no transits, no ephemeris.
- No letterology / gematria of names.
- No publishing, scheduling, or scoring of social content.
- No caching: every call recomputes, because Personal Month flips mid-month and a
  stale cache would be wrong for most of the day it matters.

If you need one of these, build it in a surface — but the numbers it uses must
still come from the engine.
