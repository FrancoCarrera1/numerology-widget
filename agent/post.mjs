#!/usr/bin/env node
/**
 * Daily Energy posting agent.
 *
 * The agent reads today's numerology, a little repository context, and the
 * recent post history, asks an OpenAI-compatible model for one post, validates
 * it, and publishes it with the X API v2 using OAuth 1.0a user context.
 *
 * Usage:
 *   node agent/post.mjs --preview   # print data + prompt, no network
 *   node agent/post.mjs             # call the model, print the post, no post
 *   node agent/post.mjs --post      # publish to X
 *   node agent/post.mjs --post --force
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  calculateCycleEnergies,
  calculateLifePath,
  calculateNumerologyEnergies,
  formatDateKey,
} from '../dist/numerology-core.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const statePath = resolve(__dirname, 'state.json');
const personaPath = resolve(__dirname, 'persona.md');

loadDotEnv();

function loadDotEnv() {
  const envPath = resolve(__dirname, '.env');
  if (!existsSync(envPath)) return;

  for (const rawLine of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const equals = line.indexOf('=');
    if (equals < 0) continue;

    const key = line.slice(0, equals).trim();
    if (!key || key in process.env) continue;

    let value = line.slice(equals + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function parseFlags(argv) {
  const flags = { preview: false, post: false, force: false };

  for (const arg of argv) {
    switch (arg) {
      case '--preview':
        flags.preview = true;
        break;
      case '--post':
        flags.post = true;
        break;
      case '--force':
        flags.force = true;
        break;
      case '--help':
      case '-h':
        console.log('Usage: node agent/post.mjs [--preview | --post] [--force]');
        process.exit(0);
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (flags.preview && flags.post) {
    throw new Error('Use either --preview or --post, not both.');
  }

  return flags;
}

function env(name) {
  const value = process.env[name];
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function getDateInTimeZone(timeZone) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const valueOf = (type) => Number(parts.find((part) => part.type === type)?.value);
    const year = valueOf('year');
    const month = valueOf('month');
    const day = valueOf('day');

    if (!year || !month || !day) {
      throw new Error('could not resolve the calendar date');
    }

    // Build a local Date with those components so the rest of the app uses
    // the selected timezone's calendar day, not the runner's day.
    return new Date(year, month - 1, day);
  } catch (error) {
    throw new Error(`Invalid BOT_TIMEZONE "${timeZone}": ${error.message}`);
  }
}

function buildDataBlock(date, birthday) {
  const energies = calculateNumerologyEnergies(date);
  const cycles = calculateCycleEnergies(date, birthday || null);
  const lifePath = /^\d{4}-\d{1,2}-\d{1,2}$/.test(birthday)
    ? calculateLifePath(birthday)
    : null;

  const lines = [
    `Date: ${energies.formattedDate}`,
    `Primary / full-date energy: ${energies.fullDateEnergy.displayValue}`,
    `Secondary energy: ${energies.secondaryEnergy.displayValue}`,
    `Combined: ${energies.combinedKey}`,
    `Universal Year: ${cycles.universalYear.displayValue} (${cycles.universalYear.dateLabel})`,
    `Universal Month: ${cycles.universalMonth.displayValue} (${cycles.universalMonth.dateLabel})`,
  ];

  if (cycles.personalYear && cycles.personalMonth) {
    lines.push(
      `Personal Year: ${cycles.personalYear.displayValue} (${cycles.personalYear.dateLabel})`,
      `Personal Month: ${cycles.personalMonth.displayValue} (${cycles.personalMonth.dateLabel})`
    );
  } else {
    lines.push('Personal cycles: not configured (do not invent them)');
  }

  if (lifePath) {
    lines.push(`Life Path: ${lifePath.displayValue} — ${lifePath.summary}`);
  }

  return lines.join('\n');
}

function buildRepoContext() {
  let version = 'unknown';
  try {
    version = JSON.parse(readFileSync(resolve(repoRoot, 'package.json'), 'utf8')).version;
  } catch {
    // Keep the context useful even if package.json is missing.
  }

  let commits = 'Git history unavailable.';
  try {
    commits =
      execFileSync('git', ['log', '-8', '--pretty=format:%h %s'], {
        cwd: repoRoot,
        encoding: 'utf8',
      }).trim() || 'No commits found.';
  } catch {
    // The agent can still post without git.
  }

  let readme = 'README unavailable.';
  try {
    readme = readFileSync(resolve(repoRoot, 'README.md'), 'utf8')
      .split('\n')
      .filter((line) => !line.trim().startsWith('|'))
      .slice(0, 35)
      .join('\n')
      .slice(0, 1200);
  } catch {
    // Keep the default.
  }

  return [
    `Project: numerology-widget v${version}`,
    `Recent commits:\n${commits}`,
    `README excerpt:\n${readme}`,
  ].join('\n\n');
}

function readState() {
  if (!existsSync(statePath)) return { recentPosts: [] };

  try {
    const parsed = JSON.parse(readFileSync(statePath, 'utf8'));
    return {
      recentPosts: Array.isArray(parsed.recentPosts) ? parsed.recentPosts : [],
      ...parsed,
    };
  } catch {
    return { recentPosts: [] };
  }
}

function writeState(state) {
  writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

function recentPostText(state) {
  if (!state.recentPosts.length) return 'None';

  return state.recentPosts
    .slice(-3)
    .map((post) => `- ${post.date}: ${post.text}`)
    .join('\n');
}

function buildPrompt(dataBlock, repoContext, recentPosts) {
  return [
    'Write one X post for the OpenSource Occult account.',
    '',
    "Today's numbers:",
    dataBlock,
    '',
    'Repo context (use only if it genuinely improves the post; do not turn it into a changelog):',
    repoContext,
    '',
    'Recent posts (avoid repeating their phrasing and structure):',
    recentPosts,
    '',
    'Rules:',
    '- One post, 240 characters or fewer.',
    '- Plain text only. No URLs, hashtags, or @mentions.',
    '- Do not mention third-party apps or claim any affiliation.',
    '- Do not invent numbers, dates, or features.',
    '- Lead with the signal, not with "Today\'s numerology".',
    '- Sound calm, precise, and a little occult. No hype. No emojis unless essential.',
    '- Output only the post text.',
  ].join('\n');
}

function cleanupTweet(raw) {
  let text = String(raw ?? '').trim();
  text = text
    .replace(/^```(?:text|markdown)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  text = text.replace(/^(?:here(?:'s| is) (?:the|your) )?(?:post|tweet)\s*:\s*/i, '').trim();

  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith('\u201c') && text.endsWith('\u201d'))
  ) {
    text = text.slice(1, -1).trim();
  }

  if (text.startsWith('**') && text.endsWith('**')) {
    text = text.slice(2, -2).trim();
  }

  return text;
}

function validateTweet(text) {
  if (!text) throw new Error('the post is empty');

  const length = [...text].length;
  if (length > 280) throw new Error(`the post is too long (${length}/280)`);
  if (
    /(?:https?:\/\/|www\.|\b[a-z0-9-]+\.(?:com|org|net|io|dev|app|co|xyz|gg)\b)/i.test(
      text
    )
  ) {
    throw new Error('the post contains a URL');
  }
  if (/(?:^|[\s.,!?;:])#[\p{L}\p{N}_]+/u.test(text)) {
    throw new Error('the post contains a hashtag');
  }
  if (/(?:^|[\s.,!?;:])@[A-Za-z0-9_]{1,15}/.test(text)) {
    throw new Error('the post contains an @mention');
  }
  if (/\b(?:guaranteed|financial advice|investment advice)\b/i.test(text)) {
    throw new Error('the post makes a promise or gives advice');
  }

  return length;
}

async function callLLM(system, user) {
  const apiKey = env('LLM_API_KEY');
  if (!apiKey) throw new Error('LLM_API_KEY is not set');

  const baseUrl = (env('LLM_BASE_URL') || 'https://api.groq.com/openai/v1').replace(/\/+$/, '');
  const model = env('LLM_MODEL') || 'llama-3.3-70b-versatile';
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };

  // GitHub Models is OpenAI-compatible but also accepts the GitHub API
  // version/accept headers. Other providers ignore them, so send them only
  // when the endpoint is GitHub Models.
  if (baseUrl.includes('models.github.ai')) {
    headers.Accept = 'application/vnd.github+json';
    headers['X-GitHub-Api-Version'] = '2022-11-28';
  }

  let response;
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0.9,
        max_tokens: 160,
      }),
      signal: AbortSignal.timeout(45_000),
    });
  } catch (error) {
    throw new Error(`LLM request failed: ${error.message}`);
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`LLM returned ${response.status}: ${body.slice(0, 500)}`);
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;

  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part === 'string' ? part : part?.text ?? ''))
      .join('');
  }

  throw new Error('LLM response did not contain text');
}

async function generateTweet(system, prompt) {
  let lastError = 'unknown validation error';

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const retryNote =
      attempt === 1
        ? ''
        : `\n\nYour previous attempt was rejected (${lastError}). Rewrite it and follow every rule.`;

    try {
      const raw = await callLLM(system, prompt + retryNote);
      const text = cleanupTweet(raw);
      const length = validateTweet(text);
      return { text, length };
    } catch (error) {
      lastError = error.message;
    }
  }

  throw new Error(`LLM did not produce a valid post: ${lastError}`);
}

async function postToX(text) {
  const credentials = {
    appKey: env('X_API_KEY'),
    appSecret: env('X_API_SECRET'),
    accessToken: env('X_ACCESS_TOKEN'),
    accessSecret: env('X_ACCESS_SECRET'),
  };
  const missing = Object.entries(credentials)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length) {
    throw new Error(`Missing X credentials: ${missing.join(', ')}`);
  }

  let TwitterApi;
  try {
    ({ TwitterApi } = await import('twitter-api-v2'));
  } catch {
    throw new Error('twitter-api-v2 is not installed. Run: npm --prefix agent install');
  }

  const client = new TwitterApi(credentials);
  const result = await client.v2.tweet(text);
  const id = result?.data?.id;

  if (!id) throw new Error('X API did not return a post id');
  return id;
}

async function main() {
  const flags = parseFlags(process.argv.slice(2));
  const timeZone =
    env('BOT_TIMEZONE') || env('TZ') || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const date = getDateInTimeZone(timeZone);
  const todayKey = formatDateKey(date);
  const birthday = env('BOT_BIRTHDAY');

  if (birthday && !/^(?:\d{4}-)?\d{1,2}-\d{1,2}$/.test(birthday)) {
    throw new Error('BOT_BIRTHDAY must be YYYY-MM-DD or MM-DD');
  }

  const dataBlock = buildDataBlock(date, birthday);
  const repoContext = buildRepoContext();
  const state = readState();
  const prompt = buildPrompt(dataBlock, repoContext, recentPostText(state));
  const persona = readFileSync(personaPath, 'utf8').trim();

  if (flags.preview) {
    console.log('# Daily Energy agent preview');
    console.log(`Timezone: ${timeZone}`);
    console.log(`Date: ${todayKey}\n`);
    console.log(`## Data\n${dataBlock}\n`);
    console.log(`## Repo context\n${repoContext}\n`);
    console.log(`## Prompt\n${prompt}\n`);
    return;
  }

  if (flags.post && state.lastPostDate === todayKey && !flags.force) {
    console.log(`Already posted for ${todayKey}; skipping. Use --force to override.`);
    return;
  }

  const { text, length } = await generateTweet(persona, prompt);
  console.log(`\nGenerated post (${length}/280):\n${text}\n`);

  if (!flags.post) {
    console.log('Dry run: not posted.');
    return;
  }

  const id = await postToX(text);
  writeState({
    ...state,
    lastPostDate: todayKey,
    lastTweetId: id,
    lastPostedAt: new Date().toISOString(),
    recentPosts: [...state.recentPosts, { date: todayKey, id, text }].slice(-10),
  });
  console.log(`Posted: https://x.com/i/web/status/${id}`);
}

main().catch((error) => {
  console.error(`agent: ${error.message}`);
  if (env('DEBUG')) console.error(error);
  process.exitCode = 1;
});
