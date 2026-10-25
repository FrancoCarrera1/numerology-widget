#!/usr/bin/env node
/**
 * MCP server for the numerology engine.
 *
 * Five tools:
 *   - user_profile()                  → life path + the four timing cycles
 *   - numerology_query(mode, ...)     → date_energy | range_scan | life_path | calendar
 *   - roster(date?, tag?)             → everyone's energies, primary first
 *   - person(id, date?)               → one person's detail
 *   - upcoming(id, date?, days?)      → favourable days, ascending
 *
 * The server shells out to tool/numerology-cli.mjs rather than re-implementing
 * the wrappers: one code path, one JSON shape, so an MCP host sees exactly what a
 * shell user sees.
 *
 * Transport: stdio. See docs/mcp.md for client config.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const CLI = resolve(REPO_ROOT, 'tool', 'numerology-cli.mjs');

/** Run the CLI with a mode + JSON args; resolve with the parsed document. */
function runCli(mode, args = {}) {
  return new Promise((_resolve, reject) => {
    // Strip undefined so the CLI sees only what was asked for.
    const clean = Object.fromEntries(Object.entries(args).filter(([, v]) => v !== undefined));
    const child = spawn('node', [CLI, mode, JSON.stringify(clean)], {
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: REPO_ROOT
    });
    let out = '';
    let err = '';
    child.stdout.on('data', (chunk) => (out += chunk));
    child.stderr.on('data', (chunk) => (err += chunk));
    child.on('error', (error) => reject(new Error(`Could not start CLI: ${error.message}`)));
    child.on('close', (code) => {
      // The CLI reports its own failures as JSON with exit 1.
      if (code !== 0) {
        reject(new Error(`CLI exited ${code}: ${(err || out).trim()}`));
        return;
      }
      try {
        _resolve(JSON.parse(out.trim()));
      } catch (error) {
        reject(new Error(`Unparseable CLI output: ${error.message}\n${out}`));
      }
    });
  });
}

const server = new Server({ name: 'numerology', version: '1.0.0' }, { capabilities: { tools: {} } });

const TOOLS = [
  {
    name: 'user_profile',
    description:
      'Life Path plus universal year/month and personal year/month with their date ranges. Recomputed on every call, so Personal Month is never stale.',
    inputSchema: {
      type: 'object',
      properties: {
        reference_date: { type: 'string', description: 'YYYY-MM-DD (default: today)' },
        birth_date: { type: 'string', description: 'YYYY-MM-DD (default: 2003-05-23)' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'roster',
    description:
      'Everyone in the local people roster with Eastern zodiac (animal, element, polarity, 60-year cycle position), life path, full-date energy, secondary energy, combined key and timing cycles. Primary person first. Optional date and tag filter.',
    inputSchema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'YYYY-MM-DD (default: today)' },
        tag: { type: 'string', description: 'Only include people carrying this tag' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'person',
    description:
      'One person from the roster: Eastern zodiac, life path, a chosen date\'s energies, and universal/personal cycles. Use roster first to discover ids.',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'string', description: 'Person id, e.g. "franco"' },
        date: { type: 'string', description: 'YYYY-MM-DD (default: today)' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'upcoming',
    description:
      'Upcoming favourable days for one person: dates whose daily energy resolves to 3, 5, 6 or 9, or is 28. Ascending from the start date.',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'string', description: 'Person id, e.g. "gary"' },
        date: { type: 'string', description: 'YYYY-MM-DD start date (default: today)' },
        days: { type: 'number', description: 'Calendar days to scan, default 30' },
        favourable_only: {
          type: 'boolean',
          description: 'Default true; set false to include every day in the window'
        }
      },
      additionalProperties: false
    }
  },
  {
    name: 'numerology_query',
    description:
      'Query the engine. mode=date_energy needs date; range_scan needs start and end (optional target_energies); life_path takes optional birth_date; calendar takes optional month (YYYY-MM).',
    inputSchema: {
      type: 'object',
      required: ['mode'],
      properties: {
        mode: {
          type: 'string',
          enum: ['date_energy', 'range_scan', 'life_path', 'calendar'],
          description: 'Which query to run'
        },
        date: { type: 'string', description: 'YYYY-MM-DD (date_energy)' },
        start: { type: 'string', description: 'YYYY-MM-DD (range_scan)' },
        end: { type: 'string', description: 'YYYY-MM-DD (range_scan)' },
        target_energies: {
          type: 'array',
          items: { type: 'string' },
          description: 'range_scan filter, e.g. ["3","6/33"]'
        },
        birth_date: { type: 'string', description: 'YYYY-MM-DD (life_path)' },
        month: { type: 'string', description: 'YYYY-MM (calendar)' }
      },
      additionalProperties: false
    }
  }
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;
  try {
    if (name === 'user_profile') {
      const result = await runCli('profile', {
        reference_date: args.reference_date,
        birth_date: args.birth_date
      });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }

    if (name === 'numerology_query') {
      const { mode, ...rest } = args;
      if (!mode) return errorResult('numerology_query requires "mode"');
      const result = await runCli(mode, rest);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }

    if (name === 'roster') {
      const result = await runCli('roster', { date: args.date, tag: args.tag });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }

    if (name === 'person') {
      if (!args.id) return errorResult('person requires "id"');
      const result = await runCli('person', { id: args.id, date: args.date });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }

    if (name === 'upcoming') {
      if (!args.id) return errorResult('upcoming requires "id"');
      const result = await runCli('upcoming', {
        id: args.id,
        date: args.date,
        days: args.days,
        favourable_only: args.favourable_only
      });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }

    return errorResult(`Unknown tool: ${name}`);
  } catch (error) {
    return errorResult(error.message);
  }
});

function errorResult(message) {
  return {
    content: [{ type: 'text', text: JSON.stringify({ ok: false, error: message }, null, 2) }],
    isError: true
  };
}

async function main() {
  await server.connect(new StdioServerTransport());
  // stderr only: stdout is the protocol channel.
  console.error(`numerology MCP server ready (engine: ${CLI})`);
}

main().catch((error) => {
  console.error('Fatal:', error);
  process.exit(1);
});
