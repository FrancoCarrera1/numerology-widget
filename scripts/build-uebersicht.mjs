import { build } from 'esbuild';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const result = await build({
  entryPoints: [resolve(root, 'src/numerology-core.ts')],
  bundle: true,
  format: 'iife',
  globalName: 'NumerologyCore',
  platform: 'browser',
  target: 'es2018',
  minify: true,
  write: false,
  legalComments: 'none'
});

const core = result.outputFiles[0].text;
const template = await readFile(resolve(root, 'uebersicht/widget.template.jsx'), 'utf8');

if (!template.includes('/*__CORE__*/')) {
  throw new Error('Template is missing the /*__CORE__*/ marker');
}
if (!template.includes('__BIRTHDAY__')) {
  throw new Error('Template is missing the __BIRTHDAY__ marker');
}
if (!template.includes('__ROSTER_COMMAND__')) {
  throw new Error('Template is missing the __ROSTER_COMMAND__ marker');
}

/**
 * The widget reads the roster at runtime instead of baking it in. Birthdays are
 * personal, and this generated file is tracked — so the only thing shipped here
 * is the path to the CLI, never a date.
 */
const shellQuote = (value) => `'${String(value).replace(/'/g, `'\\''`)}'`;

// Prefer a stable system node over the one running this build: a Hermes update
// moves its private runtime and the widget's command would silently break.
const NODE_CANDIDATES = ['/opt/homebrew/bin/node', '/usr/local/bin/node', process.execPath];
const nodeBin = NODE_CANDIDATES.find((candidate) => existsSync(candidate)) || 'node';

const rosterCommand =
  `${shellQuote(nodeBin)} ` +
  `${shellQuote(resolve(root, 'tool/numerology-cli.mjs'))} roster --json 2>/dev/null`;

let birthday = (process.env.BIRTHDAY || '').trim();
if (!birthday) {
  try {
    birthday = (await readFile(resolve(root, 'uebersicht/birthday.txt'), 'utf8')).trim();
  } catch {
    // No local birthday file; personal cycles will show "Set birthday".
  }
}

if (
  birthday &&
  !/^\d{4}-\d{2}-\d{2}$/.test(birthday) &&
  !/^\d{1,2}-\d{1,2}$/.test(birthday)
) {
  throw new Error('BIRTHDAY must be YYYY-MM-DD or MM-DD');
}

// Use replacer functions so `$` characters in the bundle are not interpreted.
const widget = template
  .replace('/*__CORE__*/', () => core)
  .replace('__BIRTHDAY__', () => JSON.stringify(birthday))
  .replace('__ROSTER_COMMAND__', () => JSON.stringify(rosterCommand));

const outDir = resolve(root, 'uebersicht/DailyEnergy.widget');
await mkdir(outDir, { recursive: true });
const outFile = resolve(outDir, 'index.jsx');
await writeFile(outFile, widget, 'utf8');

// Validate that the generated file is valid JSX.
await build({
  entryPoints: [outFile],
  bundle: false,
  format: 'esm',
  loader: { '.jsx': 'jsx' },
  jsx: 'transform',
  target: 'es2018',
  write: false,
  logLevel: 'silent'
});

console.log(`Generated ${outFile} (${(widget.length / 1024).toFixed(1)} kB)`);
