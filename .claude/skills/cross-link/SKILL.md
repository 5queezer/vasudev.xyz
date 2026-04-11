# Cross-Link Blog Posts

Scan all English blog posts and enrich them with internal cross-references
where genuine thematic connections exist.

## Trigger

Use when Christian asks to "cross-link", "interconnect", "link posts together",
or "add references between posts".

## Process

### Phase 1: Build the concept map

Read every English post in `content/blog/*.md` (skip `*.de.md`, `*.es.md`,
and `_index*.md`). For each post, extract:

- **Slug** (filename without extension)
- **Core technical result** (the empirical finding or shipped thing)
- **Cross-disciplinary bridge** (if any tradition/framework is referenced)
- **Key concepts** (specific terms, patterns, or metaphors)
- **Existing internal links** (already present `/blog/...` references)

Build a matrix of which concepts appear in which posts. Identify connection
pairs: posts that share concepts but do not yet link to each other.

### Phase 2: Rank connections

Not every shared concept justifies a link. Rank each candidate connection by:

1. **Structural parallel**: Both posts describe the same failure mode or
   pattern from different angles (strongest)
2. **Concept evolution**: One post introduces a concept that another post
   extends, tests, or challenges (strong)
3. **Shared vocabulary**: Both posts use the same technical term but in
   different contexts (weakest, often not worth linking)

Only act on connections ranked 1 or 2. Skip rank 3 unless the connection
genuinely adds insight.

### Phase 3: Draft edits

For each qualifying connection, choose exactly one insertion point. Prefer:

- Existing paragraphs where the shared concept is already discussed
  (add a parenthetical link or a short bridging sentence)
- "What I Left Out" sections (natural place for forward/backward references)
- The systems/technical section of a post (where parallels are drawn)

Do NOT:

- Add a "Related Posts" section at the bottom (that is boilerplate, not prose)
- Force connections that require more than one sentence to explain
- Add links in both directions for every connection (pick the direction
  that adds more value to the reader)
- Add links to posts the reader would naturally find anyway (e.g., posts
  in the same series already link to each other)
- Change the core argument or structure of any post

### Phase 4: Validate

For each modified post:

1. Run `vale --glob='!*.{de,es}.md' content/blog/<post>.md`
2. Fix any Vale errors (add vocab terms to
   `styles/config/vocabularies/Blog/accept.txt` if needed)
3. Check that no em-dashes (`—`) or semicolons (`;`) were introduced
4. Verify word counts for manifesto posts (must stay under 800 words)

### Phase 5: Commit

- One commit per post modified, prefix `post:`
- Separate `chore:` commit if vocab terms were added to accept.txt
- Push to the working branch

## Writing rules (inherited from CLAUDE.md)

- No em-dashes or double dashes. Rephrase instead.
- No semicolons. Split into separate sentences.
- No bullet lists in post body. Prose only.
- Links use Hugo relative format: `[text](/blog/slug/)`
- Keep insertions short. One sentence is ideal. Two sentences maximum.
- Match the voice of the surrounding paragraph. Do not switch register.

## Example insertions (good)

In a paragraph already discussing memory consolidation:

> Before: "The system could not distinguish signal from noise."
> After: "The system could not distinguish signal from noise, the same
> [proxy detachment problem](/blog/memory-metrics-lying-how-to-ground-them/)
> that makes memory benchmarks misleading."

In a "What I Left Out" section:

> "Whether MCP's deferred loading pattern applies to attention filtering
> in contemplative practice. The [context window post](/blog/mcp-context-window-fix/)
> suggests it might."

## Example insertions (bad, do not do)

Generic see-also at the bottom:

> "For more on this topic, see [Related Post](/blog/other-post/)."

Forced connection that needs too much explanation:

> "This reminds me of OAuth token refresh flows, which I wrote about in
> [another post](/blog/adding-oauth-mcp-server-gotchas/), where the
> intermediary problem manifests differently because..."

## Current post inventory

Update this list as new posts are added:

| Slug | Core theme |
|---|---|
| patanjali-harness-spec | Memory consolidation destroyed retrieval. Yogic attention theory as design spec. |
| memory-metrics-lying-how-to-ground-them | Proxy detachment in memory benchmarks. Goodhart's Law. |
| stop-putting-ai-in-your-apps | AI inside apps is backwards. MCP flips the architecture. |
| mcp-context-window-fix | Tool definitions burn 90% of context. Deferred loading as fix. |
| stop-hoarding-memories-let-your-agent-sleep | Memory hoarding vs. consolidation. Sleep as engineering pattern. |
| why-ai-agents-need-sleep | Biological sleep stages mapped to agent memory phases. |
| llm-sleep-memory | LLM sleep/memory consolidation research survey. |
| svapna-sushupti | Vedic consciousness states (dream/deep sleep) mapped to agent memory. |
| gemma3-sae-measurement-timing | Sycophancy at encoding vs hallucination at generation. Measurement window matters. |
| ai-environment-design | Environment design over organism design. Co-evolving evaluators. |
| adding-oauth-mcp-server-gotchas | OAuth MCP gotchas. Each section: problem, wrong assumption, fix. |
| shipping-a2a-protocol-support-in-rust | A2A protocol in Rust. Agent-to-agent without central orchestrator. |
| direct-divine-access | Direct access to the divine. Intermediaries as failure mode. |

## Key recurring patterns across the blog

These are the strongest cross-cutting themes. Use them to identify connections:

1. **Intermediary as failure mode**: Summary layers lose signal (Meta-Harness),
   tool definitions burn context (MCP), AI inside apps has no user context,
   institutions block direct spiritual access
2. **Discernment over deletion**: vrtti nirodha, dedup that preserves signal,
   selective attention vs. brute filtering
3. **Proxy detachment / Goodhart's Law**: Memory metrics lie, consolidation
   improves internal scores while retrieval degrades, institutions optimize
   for attendance while experience degrades
4. **Offline processing transforms experience**: Sleep consolidation, dream
   recombination (svapna), deep dissolution (sushupti), contemplative silence
5. **Environment over organism**: Evaluator design matters more than feature
   engineering, right conditions over right beliefs
6. **Measurement window determines visibility**: Encoding-time vs generation-time
   phenomena, pratyahara (what the agent sees vs what the engineer sees)
