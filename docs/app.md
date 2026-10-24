# The Chart — the Pi app

`app/` is a personal planning agent built on the [Pi SDK](https://pi.dev/docs/latest/sdk)
(`@earendil-works/pi-coding-agent`). It produces **timing decisions**, not copy:
given "when should I launch X", it answers with dates.

It is not a poster. It does not write social copy and does not do career strategy.

## Prerequisites

```bash
npm install            # repo root: builds, engine deps
npm run build          # dist/numerology-core.mjs — required
cd app && npm install  # Pi SDK + typebox
```

Pi needs provider credentials. Run `pi` once and log in, or export the provider's
API key. Without credentials the app exits with a clear message (see *No
credentials* below).

## Run

```bash
# from the repo root
node app/index.mjs          # agent run
node app/index.mjs --once   # single non-interactive run
node app/index.mjs --dry    # engine-only brief, no model, no credentials
```

`npm run app` is wired to the first form.

## Config

| Env | Default | Meaning |
|---|---|---|
| `CHART_BIRTH_DATE` | `2003-05-23` | birth date used when a tool call omits one |
| `CANON_DIR` | `~/franco/canon` | where canon files are read from — **outside the repo, never committed** |
| `CHART_MODEL` | Pi's configured default | `provider/model`, e.g. `anthropic/claude-sonnet-4` |
| `MNEMOSYNE_MCP_COMMAND` | unset | presence is reported at startup; wiring needs the `pi-mcp` extension |

### Canon

The system prompt is assembled at runtime from these files in `CANON_DIR`, in this
order, each optional:

| File | Section |
|---|---|
| `brand-bible.md` | Brand Bible |
| `gg33-brief.md` | GG33 Brief |
| `letterology-brief.md` | Letterology Brief |
| `goals-12mo.md` | 12-Month Goals |

Missing files are skipped silently — the app still runs with the core rule only.
The canon is deliberately **not** in this repo: it is personal material, and the
agent only needs it at runtime. Nothing in `app/` reads canon from the working
tree.

## Tools

Registered **in-process** with `customTools` (not MCP — MCP is for other hosts):

| Tool | Args | Returns |
|---|---|---|
| `user_profile` | `birth_date?`, `reference_date?` | life path + universal year/month + personal year/month and their ranges |
| `numerology_query` | `mode` plus mode args | `date_energy`, `range_scan`, `life_path`, `calendar` |

Both call `dist/numerology-core.mjs` directly. They recompute on every call; there
is no cache, because Personal Month changes mid-month.

Tool failures are returned as `isError` results with `{ok:false,error}` — never
thrown, because a thrown error aborts the whole agent turn.

## The 15-call budget

The tool wrappers count calls and, after 15, return
`Tool budget exhausted (15 calls)` with `isError: true`. The model sees that and
must finish with what it has. This bounds both cost and a runaway loop; the number
is `MAX_TOOL_CALLS` in `app/index.mjs`.

## Output

Each run writes:

- `weekly-timing-brief.md` (repo root) — the brief
- `briefs/YYYY-MM-DD-weekly-timing-brief.md` — an archive copy

Brief format:

```markdown
# Timing brief — week of [range]

## Cycle
Personal Year: X   (changes May 23)
Personal Month: Y  (changes [date])
Universal Month: Z

## Publish days
- [weekday] [date] — full [n], secondary [n]
  1:08 / 2:08 / 3:08pm

## Number of the week
[one Tier 1 number: 5, 6, 8 or 9]

## Flags
[cycle boundaries, enemy-sign days]

## Decisions
Publish: / Hold: / Launch:

## Attribution
[numerology | letterology | astroletterology per line]
```

`--dry` fills this template from the engine alone, so the format can be checked
without a model. Its "Number of the week" line is the most frequent Tier 1
full-date energy in the week — a documented convention of the fallback, not a canon
rule. The agent's own output should come from canon reasoning over engine values.

## No credentials

```text
No provider credentials found. Run `pi` once to log in, or set the provider API key env var.
To exercise the app without a model: node app/index.mjs --dry
```

Exit code 2. Nothing is written.

## SDK notes (resolved from the installed package, not guessed)

`@earendil-works/pi-coding-agent` v1.4.0:

- `createAgentSession({ resourceLoader, modelRuntime, cwd, sessionManager, customTools, tools })`
- `defineTool({ name, label, description, parameters, execute })` — `parameters` is a
  TypeBox schema; `execute(toolCallId, params, signal, onUpdate, ctx)` returns
  `{ content: [{type:'text',text}], details, isError? }`
- `DefaultResourceLoader` requires `cwd` and `agentDir`; without them it throws on
  `undefined.startsWith` while resolving the agent dir.
- The app passes `tools: ['read','write']` (no bash/edit) and `noContextFiles: true`
  so repo AGENTS.md files cannot silently join the prompt.

Without provider credentials, `session.prompt()` throws "No API key found for the
selected model" — the app converts that into exit 2 plus a pointer to `--dry`.

## Extending it

- **New tool:** add a `defineTool` entry in `buildTools()`. Give it a TypeBox
  `parameters` schema, call the engine, and return `toolResult()` or `toolError()`.
  Add it to the prompt's Tools section or the model will not know it exists.
- **New canon file:** add it to `CANON_FILES` with a section title.
- **Different cadence:** the app writes a weekly brief; a 90-day context file is
  generated separately with the CLI (see `docs/cli.md`).
- **Memory:** Mnemosyne is detected via `MNEMOSYNE_MCP_COMMAND` but not wired. To
  wire it, add the `@earendil-works/pi-mcp` extension and pass the server config;
  keep the no-memory path working, since the app must run without it.

## Boundaries (do not drift)

- The agent never computes. Every number comes from a tool.
- Letterology is a separate system from Gematria Club and is not in the engine;
  canon may reference it, but it must not be presented as engine output.
- No posting, no publishing, no social copy.
