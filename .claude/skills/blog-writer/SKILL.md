---
name: blog-writer
description: "Write technical blog posts for vasudev.xyz (Hugo, Markdown). Use this skill whenever Christian asks to write a blog post, article, write-up, or wants to document learnings from a PR, project, or technical decision. Also trigger when Christian says 'blog this', 'write this up', 'mach einen Post daraus', 'document this for the blog', or mentions publishing something on vasudev.xyz. Covers: extracting gotchas from PRs/code, opinion/architecture posts, structuring dual-audience posts (recruiters + dev community), SEO front matter, og:image, and concrete CTAs."
---

# Blog Writer -- vasudev.xyz

## Purpose

Write technical blog posts that serve two audiences simultaneously: potential employers who evaluate depth of understanding, and the dev community who wants actionable gotchas or sharp opinions. Posts live on vasudev.xyz (Hugo, Markdown).

---

## Language

Match Christian's input language. Default: English for posts (broader reach). German only if explicitly requested.

---

## Pre-Flight

Before writing, gather context. Use available tools:

| Source | Tool | What to extract |
|---|---|---|
| PR on GitHub | `web_fetch` the PR URL | Description, commit messages, file list, security notes |
| PR diff | `web_fetch` the /files URL | Actual code changes, patterns, edge cases |
| Related issues | `web_fetch` linked issues | Original problem statement, constraints |
| Past conversations | `conversation_search` | Context Christian discussed but didn't write down |
| Existing posts | `web_fetch https://vasudev.xyz/blog/` | Avoid overlap, find internal linking opportunities |

If Christian provides a PR URL, always fetch both the PR description and the diff before drafting.

---

## Post Types

### Type 1: Gotcha Post (default for PRs and technical work)

Best for: documenting what broke, what was non-obvious, what tutorials skip.

### Type 2: Opinion/Architecture Post

Best for: arguing a position, proposing an architectural shift, challenging conventional wisdom. The MCP post ("Stop Putting AI in Your Apps") is the reference example.

Choose the type based on the source material. If Christian gives you a PR, default to Gotcha. If he gives you a thesis or a rant, default to Opinion.

---

## Gotcha Post Structure

### 1. Title
Format: `[Action] [Thing] in [Language/Context]: [Number] [Insight Type] [Hook]`

Examples:
- "Shipping A2A Protocol Support in Rust: 7 Gotchas Nobody Warns You About"
- "Adding OAuth 2.1 to a Self-Hosted MCP Server: 4 Gotchas from the Trenches"

Rules:
- Specific number of items (odd numbers perform better: 5, 7, 9)
- The hook implies the reader will learn something unavailable elsewhere
- No clickbait -- the post must deliver on the title

### 2. Opening (3-5 sentences)
- What the thing is (1 sentence, with link)
- What Christian built (1 sentence, with PR/repo link)
- Proof it works (1 sentence -- test count, deployment target, real hardware)
- Transition to gotchas (1 sentence)

### 3. BLUF (Bold thesis, 1 line)
Immediately after the opening, one bold sentence that states the core takeaway. Under 20 words. This is the anchor for scanners.

Example: **MCP OAuth works, but the spec leaves four traps that tutorials skip.**

### 4. Gotchas (the body)
Each gotcha follows this exact pattern:

```
## N. [Gotcha title -- concise, searchable]

[1-2 sentences: what the problem is and why it's not obvious]

[Technical explanation: why naive approach fails]

[Code snippet: the solution, minimal, commented]

[Lesson: 1-2 sentences, generalizable takeaway]
```

Rules per gotcha:
- Code snippets: language matching the project. Max 15 lines. Compilable in isolation where possible.
- No `// ...` elisions unless the surrounding code is truly irrelevant.
- Bold the non-obvious insight. The thing the reader wouldn't have guessed.
- Each gotcha must be independently valuable -- someone landing via search on gotcha #4 should get full value without reading #1-3.

### 5. "What I Left Out" section
List 3-5 things that were intentionally deferred. For each:
- What it is
- Why it's not in v1
- Where the follow-up lives (link to issue)

This section signals architectural maturity. Knowing what to cut is as important as knowing what to build.

### 6. Proof section (optional but strong)
Describe the actual deployment: hardware, topology, what was tested E2E. Concrete details (RAM, core count, instance count) over vague claims.

### 7. CTA + Closing
A concrete call-to-action (1-2 sentences) before the footer separator. Not "like and subscribe", but actionable: "Read PR #X for the full implementation", "Try connecting Claude to your own instance", "Start with file X and file Y."

Then: one-liner bio with link to vasudev.xyz after the `---`.

---

## Opinion Post Structure

### 1. Title
Format: `[Provocative statement]. [Inversion or consequence].`

Example: "Stop Putting AI in Your Apps. Put Your Apps in AI."

Rules:
- Takes a clear position. Not a question, not a "how to".
- The second half flips expectations.

### 2. Hook (1-2 paragraphs)
Start with a concrete personal experience, not an abstract claim. "I tried X. It felt wrong." The reader needs to feel the problem before hearing the thesis.

### 3. BLUF (Bold thesis, 1 line)
After the hook, one bold sentence. Under 20 words. This is what gets quoted when people share the post.

Example: **The AI should orchestrate your apps, not live inside them.**

### 4. Body sections
Structure: Thesis -> Proof -> Why alternative fails -> Implications -> Limitations -> CTA

Key rules:
- **Proof before theory.** Show the concrete example ("What This Actually Looks Like") before the abstract argument ("The Uncomfortable Implication").
- **Name names.** Don't say "SaaS companies". Say "Notion's AI will never know you. Neither will Jira's."
- **Include limitations.** One honest paragraph about what doesn't work yet. This separates engineers from evangelists.

### 5. CTA + Closing
Same as Gotcha pattern: concrete, actionable, 1-2 sentences. Link to repo, PR, or fork.

---

## SEO & Social Front Matter

Every post must include these Hugo front matter fields:

```yaml
---
title: "..."
date: YYYY-MM-DD
tags: ["rust", "a2a", "security"]
description: "Sharp 1-2 sentence summary, under 160 chars. This becomes og:description."
images: ["/blog/post-slug/og-image.png"]
---
```

Rules:
- `description` is mandatory. It controls what LinkedIn, Twitter, and HN show. Write it like a tweet, not an abstract.
- `tags` must only use values from `data/allowed-tags.txt`. If a new post genuinely needs a new tag, add it to the allowlist file first (keep sorted), then use it. Do not invent ad-hoc tags.
- `images` points to the og:image (1200x630px). If no image exists, omit the field (Hugo falls back to site default).
- Hugo uses `_internal/opengraph.html` for og:* tags. Twitter cards need `_internal/twitter_cards.html` in the theme's baseof.html.

---

## Images

### og:image (mandatory for social sharing)
Every post needs a social preview image. Without it, LinkedIn/Twitter shares are invisible.

Format: 1200x630px PNG. Store in the post's directory or Hugo's static folder.

Best options (in order of preference):
1. **Architecture diagram** (SVG rendered to PNG). Two-panel comparison, system topology, or flow diagram. Clean, dark theme, minimal.
2. **Screenshot** of the actual tool/setup in action. Authentic, shows it's real.
3. **Title card** with post title on solid background. Fallback only.

### In-post images
Only when they add information text can't convey (diagrams, architecture comparisons). No stock photos. No AI-generated decorative images. No puppies, no kitties.

---

## Formatting Rules

- **No em dashes or double dashes.** Rephrase instead.
- **No bullet-point lists in the post body.** Prose paragraphs. Lists only in the "What I Left Out" section and metadata tables.
- **Horizontal rules** (`---`) between gotchas for scanability.
- **Code blocks** with language annotation (```rust, ```toml, ```json).
- **Links** inline, not reference-style. Reader should see where they're going.
- **Wikipedia links** for Sanskrit, yogic, or philosophical terms on first mention. Use the English Wikipedia URL (e.g. `https://en.wikipedia.org/wiki/Pratyahara`). The translation pipeline will convert these to the target language automatically. Only link terms that have a dedicated Wikipedia article.
- **Headers:** `#` for title, `##` for sections/gotchas, `###` sparingly within sections.

---

## Tone

- **Direct.** First sentence of each section = the point. No throat-clearing.
- **Opinionated.** "Use it." not "You might consider using it."
- **Honest about trade-offs.** "Known residual risk" is a strength, not a weakness.
- **No hedging.** If Christian built it and it works, say so. No "I think" or "arguably".
- **Technical but accessible.** A senior dev should learn something. A recruiter should understand the reasoning even if not the syntax.
- **Name names.** Specific products, specific RFCs, specific files. Vague posts don't get shared.

---

## Dual-Audience Signals

The post must work for both audiences without explicitly addressing either:

| Signal | Employer reads | Community reads |
|---|---|---|
| Security trade-off reasoning | "Thinks about attack surface" | "Useful SSRF checklist" |
| Explicit scope decisions | "Knows when to stop" | "Good v1 boundary" |
| Real hardware deployment | "Ships to production" | "Works on my Pi too" |
| Test count + coverage areas | "Quality discipline" | "Can I trust this code" |
| "What I Left Out" section | "Architectural maturity" | "Roadmap for contributions" |
| Linking to follow-up issues | "Structured workflow" | "Where to help" |
| Limitations paragraph | "Honest engineer" | "Won't waste my time" |

Never say "this shows I can..." -- let the work speak. The structure itself is the signal.

---

## Anti-Patterns

- **No "In this blog post, I will..."** -- just start.
- **No recap at the end** ("In summary, we learned...") -- the reader just read it.
- **No apologies** ("I'm not an expert but...") -- you shipped the code.
- **No filler gotchas.** If you only have 5 real ones, write 5. Don't pad to 10.
- **No screenshots of terminal output.** Use code blocks.
- **No "stay tuned for part 2"** unless part 2 is already drafted.
- **No stock photos or decorative AI images.** Diagrams or nothing.
- **No passive footer links without CTA.** Tell the reader what to do, not just where to look.

---

## Series Planning

If the topic spans multiple posts (e.g., A2A + Near + Escrow), plan as independent posts that link to each other, not chapters of one story. Each post must stand alone.

Suggested series structure:
1. **Gotchas post** (what broke, what you learned) -- highest engagement
2. **Architecture/Opinion post** (why you designed it this way, or why the status quo is wrong) -- deepest signal
3. **Vision post** (where this is going) -- broadest reach

---

## Output

Deliver the post as a Markdown file in `content/blog/<slug>.md`.

### Post-write: Vale lint

After writing or editing the post, run Vale to catch style and spelling issues:

1. Run `vale sync` if styles have not been synced yet.
2. Run `vale --glob='!*.{de,es}.md' content/blog/<slug>.md`.
3. Fix any style errors (EmDash, Semicolon, BulletList, DoubleDash) by rephrasing the prose.
4. For `Vale.Spelling` errors on legitimate proper nouns, Sanskrit terms, product names, or technical acronyms, add them to `styles/config/vocabularies/Blog/accept.txt` (sorted alphabetically, case-sensitive, one per line). Then re-run Vale to confirm.
5. Commit vocab additions separately with `chore:` prefix before or after the post commit.

Hugo front matter template:

```yaml
---
title: "..."
date: YYYY-MM-DD
tags: ["ai", "mcp"]  # only values from data/allowed-tags.txt
description: "Under 160 chars. Sharp. This is the social preview."
images: ["/blog/post-slug/og-image.png"]
---
```
