# streamlineops.co.uk

The StreamlineOps website and the Business Analyser, hosted on Netlify.

## What's where

| Path | What it is |
|---|---|
| `site/` | The published website (plain HTML, CSS, JS). |
| `site/js/analyser-questions.js` | The Business Analyser's questions, rating scale and service links. Edit this to change what is asked. |
| `site/js/analyser.js` | How the analyser works: steps, scoring, report display and the "send my results" form. |
| `netlify/lib/prompts.mjs` | The instructions given to Claude for each kind of analyser request. |
| `netlify/lib/core.mjs` | The rules: email sign-up, two free analyses per email, spending caps. |
| `netlify/functions/` | The three server endpoints: `/api/start`, `/api/begin`, `/api/claude`. |
| `tools/build.py` | Regenerates all HTML pages, including `site/analyser/tool.html`. Article text is in `tools/content/`. |
| `tests/` | Tests for the server rules. Run `npm test` (no API key needed). |

## How the analyser is protected

The Anthropic API key is **never** in the website code. It is stored in Netlify as an
environment variable and used only by the server functions.

The analyser is an operations health check for existing businesses: a short profile, then
20 statements across four areas (processes, tools, procedures and measures, customers),
rated 1-5. Scores are worked out in the browser; Claude writes one report with the three
biggest gaps, each linked to a StreamlineOps service. For each gap the report says what was
found, why it matters and what good looks like, but deliberately not how to fix it: that is
the paid work. The prompt in `prompts.mjs` tells Claude never to give steps or methods.

1. The visitor enters name, email and consent on `/analyser.html` (also saved to Netlify Forms
   as `analyser-signup`).
2. `/api/start` records the sign-up and gives the browser a session code.
3. Pressing **See my results** calls `/api/begin`, which uses one of that email's free analyses,
   then `/api/claude` with the `gap-report` prompt from `prompts.mjs`. The server checks the
   session, uses a fixed model, caps the answer length and the number of calls, then calls Claude.
4. If the visitor ticks the box and sends their results, they arrive in Netlify Forms as
   `analyser-results` (name, email, phone, scores and top gaps) so you can follow up.

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
| `ANTHROPIC_EFFORT` | `medium` | How much newer models think before answering: `low`, `medium` or `high`. Higher costs more. |
| `THINKING_ROOM` | `2000` | Extra tokens allowed for that thinking, on top of the answer. |
| `FREE_ANALYSES` | `2` | Free analyses per email address. |
| `CALLS_PER_ANALYSIS` | `5` | AI requests allowed within one analysis (one report, plus retries). |
| `MAX_TOKENS_CAP` | `1500` | Longest answer any single request can ask for. |
| `MAX_INPUT_CHARS` | `8000` | Longest text a visitor can send in one request. |
| `DAILY_CALL_LIMIT` | `600` | Site-wide cap on AI requests per day. |
| `IP_DAILY_ANALYSES` | `6` | Analyses that can be started from one internet connection per day. |
| `SESSION_HOURS` | `24` | How long a sign-up session lasts. |

## Changing the analyser

- Changing questions: edit `site/js/analyser-questions.js` (statements, areas, sectors and
  which services each area links to). No rebuild needed.
- Changing what the report says or how it is written: edit the `gap-report` text in
  `netlify/lib/prompts.mjs`. Keep the JSON shape the same, because `analyser.js` reads it.
- Changing the page wording around the tool: edit the `analyser/tool.html` section of
  `tools/build.py`, then run `python3 tools/build.py`.
- Never call `api.anthropic.com` from the page, and never put a key in any file here.
