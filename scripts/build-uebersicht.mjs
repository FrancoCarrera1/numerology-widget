import { build } from 'esbuild';
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
  .replace('__BIRTHDAY__', () => JSON.stringify(birthday));

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
