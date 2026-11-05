# streamlineops.co.uk

The StreamlineOps website and the Business Analyser, hosted on Netlify.

## What's where

| Path | What it is |
|---|---|
| `site/` | The published website (plain HTML, CSS, JS). |
| `site/js/analyser-domains.js` | The analyser's stages (McKinsey 7S, then operations), each domain's wording, ratings and service links. |
| `site/js/analyser.js` | How the analyser works: description, domain cards, follow-up questions, results and the "send my results" form. |
| `netlify/lib/prompts.mjs` | The instructions given to Claude for each kind of analyser request. |
| `netlify/lib/core.mjs` | The rules: email sign-up, two free analyses per email, spending caps. |
| `netlify/functions/` | The three server endpoints: `/api/start`, `/api/begin`, `/api/claude`. |
| `tools/build.py` | Regenerates all HTML pages, including `site/analyser/tool.html`. Article text is in `tools/content/`. |
| `tests/` | Tests for the server rules. Run `npm test` (no API key needed). |

## How the analyser is protected

The Anthropic API key is **never** in the website code. It is stored in Netlify as an
environment variable and used only by the server functions.

The visitor describes their business in their own words. The analyser then works through
two stages, one card at a time: the McKinsey 7S model (Strategy, Structure, Systems, Shared
values, Style, Staff, Skills), then seven operational domains (processes, people, tools,
standards, measures, customer journey, capacity). If the description is too thin to judge a
domain, that card asks one short follow-up question first; the answer is also used by later
cards. Each card says what was found, why it matters and what good looks like, with the
matching service, and deliberately never how to fix it: that is the paid work. A final
summary picks the top three priorities. A full run is about 15-20 Claude calls.

1. The visitor enters name, email and consent on `/analyser.html` (also saved to Netlify Forms
   as `analyser-signup`).
2. `/api/start` records the sign-up and gives the browser a session code.
3. **Begin analysis** calls `/api/begin`, which uses one of that email's free analyses.
4. Each card and the summary call `/api/claude` with a prompt name (`domain-check` or
   `final-summary`, defined in `prompts.mjs`). The server checks the session, uses a fixed
   model, caps the answer length and the number of calls, then calls Claude.
5. If the visitor sends their results, they arrive in Netlify Forms as `analyser-results`
   (contact details, description, scores, every rating and the top priorities).

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
| `CALLS_PER_ANALYSIS` | `40` | AI requests allowed within one analysis (14 cards, follow-ups and the summary come to about 30). |
| `MAX_TOKENS_CAP` | `1200` | Longest answer any single request can ask for. |
| `MAX_INPUT_CHARS` | `12000` | Longest text a visitor can send in one request. |
| `DAILY_CALL_LIMIT` | `600` | Site-wide cap on AI requests per day. |
| `IP_DAILY_ANALYSES` | `6` | Analyses that can be started from one internet connection per day. |
| `SESSION_HOURS` | `24` | How long a sign-up session lasts. |

## Changing the analyser

- Changing the stages or domains: edit `site/js/analyser-domains.js`. Each domain's `focus`
  line tells Claude what to look at. No rebuild needed.
- Changing how Claude assesses or writes: edit `domain-check` or `final-summary` in
  `netlify/lib/prompts.mjs`. Keep the JSON shapes the same, because `analyser.js` reads them.
- Changing the page wording around the tool: edit the `analyser/tool.html` section of
  `tools/build.py`, then run `python3 tools/build.py`.
- Never call `api.anthropic.com` from the page, and never put a key in any file here.
