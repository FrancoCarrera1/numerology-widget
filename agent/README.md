# Daily Energy posting agent

A small repo-aware agent that writes one post per day for the OpenSource Occult
X account. It reads today's numbers, the latest commits, and a short README
excerpt, asks an OpenAI-compatible model for a post, validates it, and publishes
through X API v2.

It is intentionally boring infrastructure: one post, no replies, no media, no
engagement farming. The interesting part is the voice in
[`persona.md`](./persona.md) and the repo context it reads each run.

## Quickest path

1. Create the bot's X account and X app. Set the app to **Read and Write** before
   generating the OAuth 1.0a access tokens.
2. Add the four X secrets to the repository.
3. Run the **Daily Energy agent** workflow manually with `post` unchecked to see
   the preview.
4. Run it again with `post` checked for the first real post.

The LLM needs no extra key in Actions: the workflow uses GitHub Models through
the built-in `GITHUB_TOKEN`. For local generation, use a provider key as shown
below.

## What it does

1. Resolves "today" in `BOT_TIMEZONE`.
2. Calculates the Primary, Secondary, Universal, and optional Personal cycles
   with the same engine as the widgets.
3. Reads recent commits, the package version, and the first part of the README.
4. Asks an OpenAI-compatible chat model for one post, using `persona.md` as the
   system prompt.
5. Rejects posts with URLs, hashtags, @mentions, promises/advice, or more than
   280 characters. It retries once if the first attempt is invalid.
6. Posts through X API v2 with OAuth 1.0a user context.
7. Records the post in `state.json` so a rerun does not double-post that day.

The agent does not modify source code. As the repo grows, it sees new commits and
README changes and can fold them into a post. Edit `persona.md` to change how it
sounds.

## Setup

### 1. X app

In the X developer portal:

1. Create an app. The "Web App, Automated App or Bot" type is fine.
2. Set **App permissions** to **Read and Write** *before* generating tokens.
3. Use **OAuth 1.0a** user context. Generate the access token and secret while
   logged in as the bot account.
4. Copy the API key/secret and access token/secret.

A callback URL is not used by this flow. The website URL can be the GitHub repo.

The account needs API credits. X's posting API is pay-per-use, not free. At the
current rates, a URL-free post is about $0.015; a post containing a URL is about
$0.200. The agent rejects URLs, so a daily post costs roughly $0.46/month. It
does not read mentions or timelines in this version.

### 2. Model

GitHub Actions uses **GitHub Models** by default. The workflow's built-in
`GITHUB_TOKEN` gets `models: read`, so no LLM secret is required there. Locally,
use a provider key such as Groq, or a GitHub PAT with `models:read` and the
GitHub Models endpoint.

Any OpenAI-compatible chat completions endpoint works:

| Provider | `LLM_BASE_URL` | `LLM_MODEL` |
| --- | --- | --- |
| GitHub Models | `https://models.github.ai/inference` | `openai/gpt-4.1` |
| Groq | `https://api.groq.com/openai/v1` | `llama-3.3-70b-versatile` |
| Gemini (OpenAI compatibility) | `https://generativelanguage.googleapis.com/v1beta/openai` | a current Gemini Flash model |
| OpenAI | `https://api.openai.com/v1` | a current small model |

The agent appends `/chat/completions` to the base URL. Model names change; use
whatever the provider currently lists. If the default GitHub Models model is
unavailable, pick another from the GitHub Models catalog. If you use a non-GitHub
provider in Actions, set `LLM_API_KEY`, `LLM_BASE_URL`, and `LLM_MODEL` together.

### 3. Local run

From the repository root:

```bash
npm install
npm --prefix agent install
npm run build

cp agent/.env.example agent/.env
# edit agent/.env with the X and model credentials

npm run agent:preview   # print the data and prompt; no network
npm run agent:dry       # call the model and print the post; do not publish
npm run agent:post      # publish
```

`npm run build` is required because the agent imports the compiled engine from
`dist/numerology-core.mjs`.

Do not commit `agent/.env` or `agent/state.json`; both are gitignored.

### 4. GitHub Actions

Add these repository secrets under **Settings → Secrets and variables → Actions**:

| Secret | Required | Purpose |
| --- | --- | --- |
| `X_API_KEY` | yes | X API key |
| `X_API_SECRET` | yes | X API secret |
| `X_ACCESS_TOKEN` | yes | Bot account access token |
| `X_ACCESS_SECRET` | yes | Bot account access secret |
| `LLM_API_KEY` | no | Defaults to the Actions token for GitHub Models; set with the next two for another provider |
| `LLM_BASE_URL` | no | Defaults to GitHub Models |
| `LLM_MODEL` | no | Defaults to `openai/gpt-4.1` |
| `BOT_BIRTHDAY` | no | `YYYY-MM-DD` for Life Path/personal cycles, or `MM-DD` for personal cycles only |

`BOT_BIRTHDAY` is optional. If you set it to a real birthday, the agent will
publish personal numbers derived from it. Leave it unset for universal-only
posts.

The workflow is [`.github/workflows/agent.yml`](../.github/workflows/agent.yml).
It runs daily at 14:00 UTC (9:00 AM CDT / 8:00 AM CST) and can be run manually
from the Actions tab. Manual runs default to a preview; check the `post` box to
publish. Change `BOT_TIMEZONE` and the cron expression in that file if you want a
different local posting time.

The workflow caches `agent/state.json` between runs so the same calendar day is
not posted twice. A cache eviction or a brand-new runner can lose that guard; if
you need a hard guarantee, move the state to a small database or private gist.

## Safety rails

- Local default is dry-run. Publishing requires `--post`.
- `--post` skips if `state.json` already records today; use `--force` to override.
- URLs, hashtags, @mentions, promises, and advice are rejected.
- The model is told not to invent numbers or dates.
- The X app should have only Read and Write; this agent does not need DMs or
  follows.
- Keep the credentials in GitHub Actions secrets or `agent/.env`, never in git.

## Extending it

Good next steps, in order:

1. **Mentions/replies** — poll the bot account's mentions, generate a reply, and
   keep a per-conversation cooldown. This adds read costs and moderation risk.
2. **Release-aware posts** — add a `release` mode that fires on a new tag and
   writes a short release note with no URL.
3. **Engagement memory** — store likes/replies per post and let the model learn
   which structures land. This is optional; it also adds read costs.
4. **Media** — generate a 1200×675 card from the day's numbers and attach it.
   Media upload needs the v1.1 upload endpoint and adds failure modes.

Keep the daily post cheap and legible. The account should feel like a signal, not
a scheduled content mill.
