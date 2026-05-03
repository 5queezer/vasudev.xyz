# Blog Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add dependency-free live search and autocomplete to the Hugo blog index.

**Architecture:** Hugo emits a complete per-language JSON index for blog posts. The blog index progressively enhances its normal card grid with a search form, suggestion chips, and a JavaScript renderer that filters the full index on each keystroke.

**Tech Stack:** Hugo templates, Hugo output formats, vanilla JavaScript, existing `assets/css/main.css`, local `hugo` verification.

---

## File Structure

- Create `layouts/blog/search.json`: JSON template for all regular posts in the current blog section and language.
- Create `assets/js/blog-search.js`: focused client-side module for loading the index, autocomplete, filtering, rendering cards, error state, and keyboard behavior.
- Modify `hugo.toml`: add JSON media/output format support for the blog section.
- Modify `layouts/blog/list.html`: add search UI and data attributes while preserving no-JS cards.
- Modify `layouts/_default/baseof.html`: include the fingerprinted `blog-search.js` bundle.
- Modify `assets/css/main.css`: add search input, suggestions, count, and empty-state styles.

## Task 1: Generate the blog search JSON index

**Files:**
- Create: `layouts/blog/search.json`
- Modify: `hugo.toml`

- [ ] **Step 1: Add JSON output config**

Edit `hugo.toml` so the existing output format sections include:

```toml
[mediaTypes]
  [mediaTypes."application/json"]
    suffixes = ["json"]
  [mediaTypes."text/plain"]
    suffixes = ["txt"]

[outputFormats]
  [outputFormats.searchjson]
    mediaType = "application/json"
    baseName = "search"
    isPlainText = true
    notAlternative = true
  [outputFormats.llmstxt]
    mediaType = "text/plain"
    baseName = "llms"
    isPlainText = true
    notAlternative = true
  [outputFormats.llmstxtfull]
    mediaType = "text/plain"
    baseName = "llms-full"
    isPlainText = true
    notAlternative = true
  [outputFormats.txtplain]
    mediaType = "text/plain"
    baseName = "index"
    isPlainText = true
    notAlternative = true
    permalinkable = true

[outputs]
  home = ["html", "llmstxt", "llmstxtfull"]
  section = ["html", "searchjson"]
  page = ["html", "txtplain"]
```

- [ ] **Step 2: Create the JSON template**

Create `layouts/blog/search.json` with this exact content:

```go-html-template
{{- $posts := where .RegularPages "Section" "blog" -}}
{{- $items := slice -}}
{{- range $posts -}}
  {{- $tags := .Params.tags | default (slice) -}}
  {{- $searchText := printf "%s %s %s" .Title .Description (delimit $tags " ") | lower -}}
  {{- $items = $items | append (dict
    "title" .Title
    "url" .RelPermalink
    "description" .Description
    "date" (.Date.Format "02 Jan 2006")
    "readingTime" (printf "%d min read" .ReadingTime)
    "tags" $tags
    "searchText" $searchText
  ) -}}
{{- end -}}
{{- $items | jsonify -}}
```

- [ ] **Step 3: Run Hugo and verify the generated index**

Run:

```bash
hugo
```

Expected: command exits 0 and `public/blog/search.json` exists.

Run:

```bash
python3 -m json.tool public/blog/search.json >/tmp/blog-search.json.pretty
```

Expected: command exits 0.

- [ ] **Step 4: Commit Task 1**

```bash
git add hugo.toml layouts/blog/search.json
git commit -m "feat: generate blog search index"
```

## Task 2: Add the progressive-enhancement search UI

**Files:**
- Modify: `layouts/blog/list.html`

- [ ] **Step 1: Replace the blog list template**

Replace `layouts/blog/list.html` with:

```go-html-template
{{ define "main" }}
<section class="writing container">
  <div class="section-header blog-search-header">
    <h2 class="section-eyebrow">{{ i18n "section_writing" }}</h2>
    <h3 class="section-title">{{ .Title }}</h3>

    <div class="blog-search" data-blog-search data-index-url="{{ "search.json" | relURL }}">
      <label class="blog-search-label" for="blog-search-input">Search posts</label>
      <div class="blog-search-input-wrap">
        <span class="blog-search-icon" aria-hidden="true">⌕</span>
        <input
          id="blog-search-input"
          class="blog-search-input"
          type="search"
          autocomplete="off"
          placeholder="Search posts by title, tag, or summary..."
          aria-describedby="blog-search-status"
          data-blog-search-input
        />
      </div>
      <div class="blog-search-suggestions" aria-label="Search suggestions" data-blog-search-suggestions></div>
      <p id="blog-search-status" class="blog-search-status" data-blog-search-status></p>
    </div>
  </div>

  <div class="writing-grid" data-blog-search-results>
    {{ range .Pages }}
      <a href="{{ .RelPermalink }}" class="essay-card">
        <div class="essay-meta">
          <span>{{ .Date.Format "02 Jan 2006" }}</span>
          <span>{{ .ReadingTime }} min read</span>
        </div>
        <h4 class="essay-title">{{ .Title }}</h4>
        <p class="essay-desc">{{ .Description }}</p>
        <div class="tag-row mt-auto">
          {{ range .Params.tags }}<span class="tag tag-sm">{{ . }}</span>{{ end }}
        </div>
      </a>
    {{ end }}
  </div>
</section>
{{ end }}
```

- [ ] **Step 2: Run Hugo**

Run:

```bash
hugo
```

Expected: command exits 0 and `/blog/` still renders the original cards with a search input above them.

- [ ] **Step 3: Commit Task 2**

```bash
git add layouts/blog/list.html
git commit -m "feat: add blog search UI"
```

## Task 3: Implement client-side live filtering and autocomplete

**Files:**
- Create: `assets/js/blog-search.js`
- Modify: `layouts/_default/baseof.html`

- [ ] **Step 1: Create the search module**

Create `assets/js/blog-search.js` with:

```javascript
(() => {
  const root = document.querySelector('[data-blog-search]');
  if (!root) return;

  const input = root.querySelector('[data-blog-search-input]');
  const suggestions = root.querySelector('[data-blog-search-suggestions]');
  const status = root.querySelector('[data-blog-search-status]');
  const results = document.querySelector('[data-blog-search-results]');
  const indexUrl = root.dataset.indexUrl;
  const maxSuggestions = 8;
  let posts = [];
  let firstPostSuggestionUrl = '';

  const normalize = value => (value || '').toString().trim().toLowerCase();
  const escapeHtml = value => (value || '').toString().replace(/[&<>"]/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;'
  }[char]));

  const renderTags = tags => (tags || []).map(tag => `<span class="tag tag-sm">${escapeHtml(tag)}</span>`).join('');

  const renderPost = post => `
    <a href="${post.url}" class="essay-card">
      <div class="essay-meta">
        <span>${escapeHtml(post.date)}</span>
        <span>${escapeHtml(post.readingTime)}</span>
      </div>
      <h4 class="essay-title">${escapeHtml(post.title)}</h4>
      <p class="essay-desc">${escapeHtml(post.description)}</p>
      <div class="tag-row mt-auto">${renderTags(post.tags)}</div>
    </a>
  `;

  const setStatus = message => {
    status.textContent = message;
  };

  const matchingPosts = query => {
    const q = normalize(query);
    if (!q) return posts;
    return posts.filter(post => normalize(post.searchText).includes(q));
  };

  const buildSuggestions = query => {
    const q = normalize(query);
    firstPostSuggestionUrl = '';
    suggestions.innerHTML = '';
    if (!q) return;

    const seen = new Set();
    const items = [];

    posts.forEach(post => {
      if (normalize(post.title).includes(q) && !seen.has(`post:${post.url}`)) {
        seen.add(`post:${post.url}`);
        items.push({ type: 'post', label: post.title, url: post.url });
      }

      (post.tags || []).forEach(tag => {
        const key = `tag:${normalize(tag)}`;
        if (normalize(tag).includes(q) && !seen.has(key)) {
          seen.add(key);
          items.push({ type: 'tag', label: tag });
        }
      });
    });

    items.slice(0, maxSuggestions).forEach(item => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `blog-search-suggestion is-${item.type}`;
      button.textContent = item.type === 'tag' ? `#${item.label}` : item.label;
      button.addEventListener('click', () => {
        if (item.type === 'post') {
          window.location.href = item.url;
          return;
        }
        input.value = item.label;
        update();
        input.focus();
      });
      suggestions.appendChild(button);
    });

    const firstPost = items.find(item => item.type === 'post');
    firstPostSuggestionUrl = firstPost ? firstPost.url : '';
  };

  function update() {
    const query = input.value;
    const matches = matchingPosts(query);

    if (matches.length === 0) {
      results.innerHTML = '<div class="blog-search-empty">No posts match that search.</div>';
    } else {
      results.innerHTML = matches.map(renderPost).join('');
    }

    buildSuggestions(query);

    if (!normalize(query)) {
      setStatus('');
    } else if (matches.length === 1) {
      setStatus('1 matching post');
    } else {
      setStatus(`${matches.length} matching posts`);
    }
  }

  input.addEventListener('input', update);
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter' && firstPostSuggestionUrl) {
      event.preventDefault();
      window.location.href = firstPostSuggestionUrl;
    }
  });

  fetch(indexUrl, { headers: { Accept: 'application/json' } })
    .then(response => {
      if (!response.ok) throw new Error(`Search index failed with ${response.status}`);
      return response.json();
    })
    .then(index => {
      posts = Array.isArray(index) ? index : [];
      update();
    })
    .catch(() => {
      input.disabled = true;
      root.classList.add('is-unavailable');
      setStatus('Search is unavailable right now.');
    });
})();
```

- [ ] **Step 2: Include the script in the base template**

In `layouts/_default/baseof.html`, add this block after the existing `code-copy.js` script include:

```go-html-template
  {{- $blogSearchJS := resources.Get "js/blog-search.js" | resources.Minify | resources.Fingerprint -}}
  <script defer src="{{ $blogSearchJS.RelPermalink }}"></script>
```

- [ ] **Step 3: Run Hugo**

Run:

```bash
hugo
```

Expected: command exits 0 and the generated HTML includes a fingerprinted `blog-search` script.

- [ ] **Step 4: Commit Task 3**

```bash
git add assets/js/blog-search.js layouts/_default/baseof.html
git commit -m "feat: filter blog posts live"
```

## Task 4: Style the search UI

**Files:**
- Modify: `assets/css/main.css`

- [ ] **Step 1: Add styles after the Writing section rules**

In `assets/css/main.css`, after `.essay-desc`, add:

```css
.blog-search-header { margin-bottom: 3rem; }
.blog-search { margin-top: 2rem; max-width: 48rem; }
.blog-search-label {
  display: block;
  margin-bottom: .75rem;
  font-family: var(--font-mono);
  font-size: .75rem;
  letter-spacing: .2em;
  text-transform: uppercase;
  color: var(--muted-fg);
}
.blog-search-input-wrap {
  display: flex;
  align-items: center;
  gap: .75rem;
  border: 1px solid var(--border);
  background: var(--bg);
  padding: .875rem 1rem;
  transition: border-color .2s, box-shadow .2s;
}
.blog-search-input-wrap:focus-within {
  border-color: hsla(38 92% 50% / .65);
  box-shadow: 0 0 0 3px hsla(38 92% 50% / .08);
}
.blog-search-icon { font-family: var(--font-mono); color: var(--primary); }
.blog-search-input {
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--fg);
  font-family: var(--font-mono);
  font-size: .875rem;
}
.blog-search-input::placeholder { color: hsla(0 0% 60% / .7); }
.blog-search-input:disabled { opacity: .45; cursor: not-allowed; }
.blog-search-suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: .5rem;
  min-height: 2rem;
  margin-top: .75rem;
}
.blog-search-suggestion {
  border: 1px solid var(--border);
  background: transparent;
  color: var(--muted-fg);
  padding: .375rem .65rem;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: .08em;
  text-transform: uppercase;
  transition: border-color .2s, color .2s, background-color .2s;
}
.blog-search-suggestion:hover,
.blog-search-suggestion:focus-visible {
  color: var(--fg);
  border-color: hsla(38 92% 50% / .6);
  background: hsla(38 92% 50% / .08);
}
.blog-search-suggestion.is-tag { color: hsla(38 92% 50% / .9); }
.blog-search-status {
  min-height: 1.25rem;
  margin: .5rem 0 0;
  color: var(--muted-fg);
  font-family: var(--font-mono);
  font-size: .75rem;
}
.blog-search-empty {
  grid-column: 1 / -1;
  border: 1px solid var(--border);
  background: var(--bg);
  padding: 2rem;
  color: var(--muted-fg);
  font-family: var(--font-mono);
  font-size: .875rem;
}
```

- [ ] **Step 2: Run Hugo**

Run:

```bash
hugo
```

Expected: command exits 0 and the search UI inherits the site’s dark visual style.

- [ ] **Step 3: Commit Task 4**

```bash
git add assets/css/main.css
git commit -m "feat: style blog search"
```

## Task 5: Verify search behavior end-to-end

**Files:**
- No new files

- [ ] **Step 1: Build the site**

Run:

```bash
hugo
```

Expected: command exits 0.

- [ ] **Step 2: Verify index content**

Run:

```bash
python3 - <<'PY'
import json
from pathlib import Path
items = json.loads(Path('public/blog/search.json').read_text())
assert items, 'search index is empty'
first = items[0]
for key in ['title', 'url', 'description', 'date', 'readingTime', 'tags', 'searchText']:
    assert key in first, f'missing {key}'
assert any(item['tags'] for item in items), 'expected at least one tagged post'
print(f'validated {len(items)} search records')
PY
```

Expected: prints `validated N search records` with N greater than 0.

- [ ] **Step 3: Verify script and markup are present**

Run:

```bash
grep -R "data-blog-search" -n public/blog/index.html && grep -R "blog-search" -n public/blog/index.html
```

Expected: both greps print matching lines.

- [ ] **Step 4: Manual browser verification**

Run:

```bash
hugo server -D
```

Open `http://localhost:1313/blog/` and verify:

1. Typing part of a post title filters results on each keystroke.
2. Typing a tag filters results on each keystroke.
3. Clicking a title suggestion opens that post.
4. Clicking a tag suggestion fills the input and filters by that tag.
5. Pressing Enter with a post suggestion opens the first suggested post.
6. Clearing the input restores the full list.
7. A no-match query shows `No posts match that search.`

Stop the server with `Ctrl-C` after verification.

- [ ] **Step 5: Final commit if manual verification required fixes**

If Task 5 required fixes, commit them:

```bash
git add -A
git commit -m "fix: verify blog search behavior"
```

If no fixes were required, do not create an empty commit.

## Self-Review

- Spec coverage: JSON index, option C UI, title and tag autocomplete, live filtering, full-index pagination safety, no-JS fallback, index failure state, and Hugo verification are covered.
- Placeholder scan: no TBD, TODO, or unspecified implementation steps remain.
- Type consistency: `title`, `url`, `description`, `date`, `readingTime`, `tags`, and `searchText` are used consistently across Hugo, JavaScript, and verification.
