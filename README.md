# vasudev.xyz — Hugo template

A Hugo + GitHub Pages implementation of the redesign concept for [vasudev.xyz](https://vasudev.xyz). Includes:

- **Multilingual** content in EN/DE/ES (via Hugo's built-in `[languages]` config)
- **Giscus** comments on blog posts (sign-in via GitHub, no database)
- **On-site AI agent**: a tiny vanilla-JS chat island that streams answers from a Cloudflare Worker fronting a free Nemotron model
- **Zero monthly cost**: GitHub Pages + Cloudflare Workers free tier + OpenRouter free Nemotron

```
hugo-template/
├── hugo.toml                     # site config + [languages] + [params].agentEndpoint
├── content/
│   ├── _index.{en,de,es}.md
│   ├── about.{en,de,es}.md
│   └── blog/*.en.md              # add .de.md / .es.md alongside to translate
├── data/
│   ├── work.yaml                 # the 4 projects in the Selected Work section
│   └── principles.yaml           # the 3 numbered principles in Manifesto
├── i18n/{en,de,es}.yaml          # all UI strings live here
├── layouts/
│   ├── _default/                 # baseof.html, single.html, list.html
│   ├── partials/                 # hero, manifesto, work, writing, about, agent-chat, giscus, …
│   └── index.html                # home assembles partials in order
├── assets/
│   ├── css/main.css              # hand-rolled CSS port of the React preview
│   └── js/
│       ├── agent.js              # chat island (vanilla JS, no bundler needed)
│       └── lang-toggle.js        # navbar scroll state + smooth anchors
├── worker/                       # Cloudflare Worker — the agent backend
│   ├── src/index.ts
│   ├── wrangler.toml
│   └── package.json
└── .github/workflows/deploy.yml  # GitHub Pages CI
```

## Local dev

```bash
# 1. site
hugo server -D

# 2. agent worker (in another terminal)
cd worker
npm install
wrangler secret put OPENROUTER_API_KEY      # paste your free OpenRouter key
wrangler secret put LANGFUSE_PUBLIC_KEY     # optional, enables tracing
wrangler secret put LANGFUSE_SECRET_KEY     # optional, enables tracing
wrangler dev                                # → http://localhost:8787
```

By default `hugo.toml` points `[params].agentEndpoint` at `https://agent.vasudev.workers.dev`. For local dev override it with an env var:

```bash
HUGO_PARAMS_AGENTENDPOINT=http://localhost:8787 hugo server -D
```

## Deploying

**Site → GitHub Pages**

1. Push to GitHub, then in repo Settings → Pages, set source = "GitHub Actions".
2. Add a repo variable `AGENT_ENDPOINT` pointing at your deployed Worker (e.g. `https://agent.vasudev.workers.dev`).
3. Push to `master` — `.github/workflows/deploy.yml` builds Hugo and publishes.

**Worker → Cloudflare**

```bash
cd worker
npm install
wrangler login
wrangler secret put OPENROUTER_API_KEY
wrangler secret put LANGFUSE_PUBLIC_KEY
wrangler secret put LANGFUSE_SECRET_KEY
wrangler deploy
```

The Worker runs on Cloudflare's free tier (100k requests/day). OpenRouter's `nvidia/nemotron-3-nano-30b-a3b:free` model is rate-limited but free. Langfuse tracing is disabled unless both Langfuse secrets are set.

## Giscus

Set up the repo at <https://giscus.app>, then paste the resulting `data-repo-id` and `data-category-id` into `[params.giscus]` in `hugo.toml`. Comments live in GitHub Discussions on `5queezer/vasudev.xyz`.

## How the agent works

```
┌──────────────┐  POST /     ┌──────────────────┐  POST chat completions  ┌─────────┐
│  Hugo page   │ ─────────► │ Cloudflare Worker │ ──────────────────────► │ Nemotron│
│  + agent.js  │ ◄───────── │  (free tier)      │ ◄────────────────────── │ (free)  │
└──────────────┘  SSE       └────────┬─────────┘  SSE                     └─────────┘
                                     │ optional trace
                                     ▼
                                 Langfuse
```

`assets/js/agent.js` is a ~5 KB vanilla island. It:

1. POSTs `{ messages: [...] }` to `[params].agentEndpoint` with page metadata, language, mode, and an anonymous session ID stored in `sessionStorage`.
2. Reads the response body as SSE: each `data: <chunk>\n\n` frame is appended to the streaming bubble; a final `data: [DONE]\n\n` ends the stream.
3. Keeps conversation history in-memory only. Refreshing the page resets it.

The Worker (`worker/src/index.ts`) translates the upstream OpenAI-compatible streaming format into the simpler `data: <chunk>` frames the island expects, so swapping providers (NVIDIA NIM, HuggingFace, Groq, etc.) is a one-line change to `UPSTREAM` and `MODEL`.

If Langfuse secrets are present, the Worker records one `onsite-agent-chat` trace per request via the official `langfuse` JS/TS SDK. By default it captures chat content, page URL, language, mode, model metadata, latency, status, and token usage when the upstream returns usage. Set `LANGFUSE_CAPTURE_CONTENT = "false"` to keep metadata-only traces, or tune `LANGFUSE_SAMPLE_RATE` in `worker/wrangler.toml`.

### Swapping to Vercel AI SDK `useChat`

The wire protocol above is intentionally minimal so the island stays dependency-free. If you'd rather use the official React `useChat` hook:

1. Change the Worker to return `streamText(...).toDataStreamResponse()` from the `ai` package — that emits Vercel's data-stream protocol.
2. Mount a small React island instead of `assets/js/agent.js`. Bundle with `esbuild assets/js/agent-react.tsx --bundle --minify --outfile=static/js/agent.bundle.js` and reference it from `agent-chat.html` in place of `agent.js`.

The visual chrome and i18n strings stay the same — only the chat client changes.

## Adding a translation

1. Drop a sibling file alongside the EN one: `content/blog/<slug>.de.md`, `content/blog/<slug>.es.md`.
2. Add or update the matching keys in `i18n/de.yaml` / `i18n/es.yaml`.
3. The navbar lang toggle picks them up automatically.

## Adding a project / essay

- Edit `data/work.yaml` for projects.
- Drop a new markdown file in `content/blog/` for essays. Front matter:

  ```yaml
  ---
  title: "..."
  date: 2026-04-19
  slug: ...
  tags: [ai, agents]
  description: "Card subtitle, also used as <meta description>."
  coAuthor: "Claude"   # optional — appears in the byline
  ---
  ```

## Notes

- Default theme is dark. The CSS variables in `assets/css/main.css` are the single source of truth for the palette (amber primary `hsl(38 92% 50%)` on a `hsl(0 0% 6%)` background).
- Fonts are loaded from Google Fonts: Inter (sans), Newsreader (serif), JetBrains Mono (mono).
- No JS framework, no Tailwind build step. Hugo's asset pipeline handles minification + fingerprinting.
