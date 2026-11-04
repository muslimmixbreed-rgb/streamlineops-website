# streamlineops.co.uk

The StreamlineOps website and the Business Analyser, hosted on Netlify.

## What's where

| Path | What it is |
|---|---|
| `site/` | The published website (plain HTML, CSS, JS). |
| `site/analyser/tool.html` | The Business Analyser itself. Edit this file directly to change questions, layout or wording. |
| `netlify/lib/prompts.mjs` | The instructions given to Claude for each kind of analyser request. |
| `netlify/lib/core.mjs` | The rules: email sign-up, two free analyses per email, spending caps. |
| `netlify/functions/` | The three server endpoints: `/api/start`, `/api/begin`, `/api/claude`. |
| `tools/build.py` | Regenerates the main site pages (not the analyser). Article text is in `tools/content/`. |
| `tests/` | Tests for the server rules. Run `npm test` (no API key needed). |

## How the analyser is protected

The Anthropic API key is **never** in the website code. It is stored in Netlify as an
environment variable and used only by the server functions.

1. The visitor enters name, email and consent on `/analyser.html` (also saved to Netlify Forms).
2. `/api/start` records the sign-up and gives the browser a session code.
3. Pressing **Begin Analysis** calls `/api/begin`, which uses one of that email's free analyses.
4. Every AI step calls `/api/claude`, which checks the session, uses a fixed model and a
   prompt from `prompts.mjs`, caps the answer length and the number of calls, then calls Claude.

## One-time setup in Netlify

1. **Connect this repository** to the Netlify project (Project configuration → Build & deploy →
   link the GitHub repository). Netlify reads `netlify.toml`; no build command is needed.
2. **Add the API key**: Project configuration → Environment variables → add
   `ANTHROPIC_API_KEY` with a **new** key from the Anthropic Console. Mark it as secret.
   Never paste the key into any file in this repository.
3. **Turn on form detection** if Netlify asks (Forms section), so the `contact` and
   `analyser-signup` forms are collected. Set up email notifications there if you want them.
4. In the Anthropic Console, set a **monthly spend limit** as a final safety net.

## Optional settings (environment variables)

| Name | Default | Meaning |
|---|---|---|
| `ANTHROPIC_MODEL` | `claude-haiku-5-5` | Model used for every analyser request (e.g. `claude-sonnet-5-5` for stronger, pricier answers). |
| `ANTHROPIC_EFFORT` | `low` | How much newer models think before answering: `low`, `medium` or `high`. Higher costs more. |
| `THINKING_ROOM` | `1000` | Extra tokens allowed for that thinking, on top of the answer. |
| `FREE_ANALYSES` | `2` | Free analyses per email address. |
| `CALLS_PER_ANALYSIS` | `40` | AI requests allowed within one analysis (a full run uses about 29). |
| `MAX_TOKENS_CAP` | `1000` | Longest answer any single request can ask for. |
| `MAX_INPUT_CHARS` | `8000` | Longest text a visitor can send in one request. |
| `DAILY_CALL_LIMIT` | `600` | Site-wide cap on AI requests per day. |
| `IP_DAILY_ANALYSES` | `6` | Analyses that can be started from one internet connection per day. |
| `SESSION_HOURS` | `24` | How long a sign-up session lasts. |

## Changing the analyser

- Changing questions, text or layout: edit `site/analyser/tool.html`.
- Whenever the page needs Claude, call `callClaude(promptId, text, maxTokens)`, where `promptId`
  is one of the names in `netlify/lib/prompts.mjs`. To add a new kind of request, add a new
  entry there first.
- Don't add `fetch` calls to `api.anthropic.com` in the page, and never put a key in it.
