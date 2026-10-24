# Architecture — one engine, three surfaces

```
                    src/numerology-core.ts
                    (the only place rules live)
                              |
        +---------------------+---------------------+
        |                     |                     |
   tool/numerology-cli.mjs  mcp/server.mjs       app/index.mjs
        |                     |                     |
   shell + external       MCP hosts             The Chart
   agent consumption      (Claude Code,         (Pi SDK, in-process
                           Cursor, Pi)           tools, timing briefs)
```

Every surface imports the **same built engine** (`dist/numerology-core.mjs`).
None of them re-implements a reduction, a master-number rule, or a cycle
boundary. That is the hard constraint of this repo: if a number looks wrong, the
bug is in `src/numerology-core.ts` (or its fixtures), never in a surface.

## Why the engine is separate

- **One definition of truth.** Life Path has three exceptions (28 wealth, 33, and
  2 reads as 11) and daily energy has two methods. Duplicating those in four
  languages — TS, JSX, Kotlin, and an agent prompt — is how the Android widget and
  the web widget drift apart.
- **Fixtures pin behaviour.** `src/__tests__/numerology-core.test.ts` locks the
  twelve canonical values. Surfaces are tested against those same values, so a
  surface cannot pass while disagreeing with the engine.
- **No dependencies.** The engine is dependency-free TypeScript, which is why it
  can be bundled into an Übersicht widget, a standalone IIFE, a Kotlin port's
  reference, and a Pi tool without dragging a runtime along.

## Build artefact boundary

`dist/` is gitignored. Anything that imports `dist/numerology-core.mjs` — the CLI,
the MCP server, the app — requires `npm run build` first. Both the CLI and the app
detect the missing build and fail with a one-line message instead of a stack
trace; `docs/cli.md` documents the exact JSON error.

The web component, React wrapper, and Übersicht widget are built by the same
`npm run build` (Vite lib + IIFE + JSX template).

## Why the CLI exists when the app imports the engine directly

The CLI is for **shell scripts, cron, and agents that are not Node**: a stable
JSON contract with no SDK to install. The app is a Pi agent that needs typed tool
definitions, so it imports the engine in-process and skips the subprocess hop.

The MCP server deliberately spawns the CLI rather than re-implementing the
wrappers: one code path, one JSON shape, and an MCP host sees exactly what a shell
user sees. The cost is a subprocess per call; the benefit is that a fix to the CLI
cannot diverge from what MCP returns.

## Data flow of a typical question

"When should I launch?"

1. Canon + core rule → the agent's system prompt.
2. Agent calls `user_profile()` → engine → Personal Year/Month + ranges.
3. Agent calls `numerology_query({mode:'range_scan', start, end})` → engine →
   day-by-day energies.
4. Agent picks publish days from `publish_eligible`, writes
   `weekly-timing-brief.md`.

At no point does the model add digits. The prompt says so explicitly, the tool
descriptions repeat it, and the tools return raw engine values rather than
pre-digested prose — so a wrong number is traceable to one file.

## Adding a surface

1. Call the engine; never copy a rule.
2. Add the pinned twelve fixtures to that surface's tests.
3. Document it in `docs/`, including what it does *not* do.
