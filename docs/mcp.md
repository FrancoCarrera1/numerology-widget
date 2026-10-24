# MCP server

`mcp/server.mjs` exposes the engine to any MCP host over **stdio**. Two tools, no
more: an agent should ask for a profile or a query, not for fourteen variants.

It shells out to `tool/numerology-cli.mjs`, so what an MCP host sees is exactly
what a shell user sees — including the `ok: false` JSON error shape.

## Prerequisites

```bash
npm install
npm run build          # dist/ is gitignored; the CLI needs it
npm install @modelcontextprotocol/sdk
```

## Smoke test

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node mcp/server.mjs
```

You should see two tool names on stdout. The server prints its readiness line on
**stderr**, so stdout stays a clean protocol channel.

## Tool schemas

### `user_profile`

No required arguments.

| Field | Type | Notes |
|---|---|---|
| `reference_date` | string `YYYY-MM-DD` | default: today |
| `birth_date` | string `YYYY-MM-DD` | default: `2003-05-23` |

Returns:

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

It **recomputes** every call — nothing is cached. Personal Month flips on the
birth day (the 23rd here), so a cached profile is wrong for most of that day.

### `numerology_query`

| Field | Type | Notes |
|---|---|---|
| `mode` | `date_energy` \| `range_scan` \| `life_path` \| `calendar` | required |
| `date` | string | `date_energy` only |
| `start`, `end` | string | `range_scan` only |
| `target_energies` | string[] | optional `range_scan` filter, matches full or secondary |
| `birth_date` | string | `life_path` only |
| `month` | string `YYYY-MM` | `calendar` only |

Example result for `date_energy` on 2026-10-22:

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

`publish_eligible` is false because the **day of the month** is 22 — a master
number, and not one of 3/5/6/9. It is not derived from `6/33`.

## Client configuration

Paths below assume the repo is at `/Users/franco/Documents/git/numerology-widget`.
Use absolute paths; MCP hosts start servers outside your shell's cwd.

### Claude Code

`~/.claude.json` (or project `.mcp.json`):

```json
{
  "mcpServers": {
    "numerology": {
      "command": "node",
      "args": ["/Users/franco/Documents/git/numerology-widget/mcp/server.mjs"]
    }
  }
}
```

### Cursor

`~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "numerology": {
      "command": "node",
      "args": ["/Users/franco/Documents/git/numerology-widget/mcp/server.mjs"]
    }
  }
}
```

### Pi

`~/.pi/mcp.json`:

```json
{
  "servers": {
    "numerology": {
      "command": "node",
      "args": ["/Users/franco/Documents/git/numerology-widget/mcp/server.mjs"]
    }
  }
}
```

(The app in `app/` does **not** use this server — it registers the same two tools
in-process. Keep MCP for third-party hosts.)

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `dist/numerology-core.mjs is missing` | engine not built | `npm run build` |
| `Cannot find package '@modelcontextprotocol/sdk'` | not installed | `npm install @modelcontextprotocol/sdk` |
| Host shows zero tools | server wrote to stdout before responding | check for stray `console.log`; only stderr is safe |
| `CLI exited 1: ...` | bad arguments for the requested mode | read the JSON error; each mode documents its required args |
| Tools appear but every call errors | CLI path wrong after moving the repo | the server resolves `../tool/numerology-cli.mjs` relative to itself |
| Personal Month looks stale | host cached the response | the server does not cache; call again |

## Why not one tool per mode?

Four narrow modes behind one `mode` field keeps the tool list small and the schema
honest: every argument is optional except `mode`, and the CLI validates which ones
the chosen mode needs. A host that adds a fifth mode later breaks no existing
client.
