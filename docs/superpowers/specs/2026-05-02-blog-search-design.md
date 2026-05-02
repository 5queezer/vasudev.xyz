# Blog Search Design

## Goal

Add a search box to the blog index that autocompletes post titles and tags, then updates visible results on every keystroke.

## Scope

The feature applies to the blog index page. It must work without a server, third-party search service, or runtime dependency. It should remain correct if blog pagination is added later.

## Recommended Approach

Use a Hugo-generated JSON search index and a small client-side JavaScript module.

Hugo will emit a language-specific search index for all regular blog posts. The blog page will load that index, listen to the search input, compute matching posts and suggestions on each input event, then render matching post cards from the index. Empty input restores the default blog list.

## User Interface

The search UI appears below the blog page heading. It uses the selected option C layout: a search field followed by autocomplete suggestion chips.

Suggestions include matching post titles and matching tags. Clicking a post-title suggestion navigates to that post. Clicking a tag suggestion fills the search box with that tag and filters the results. Pressing Enter navigates to the first matching post suggestion when one exists.

The result count updates as the query changes. If there are no matches, the page shows a small empty state and leaves the search input focused.

## Data Model

Each indexed post includes title, URL, description, date label, reading time, tags, and a normalized search text field derived from title, description, and tags.

The index is generated per language so localized blog pages only search localized posts.

## Pagination Behavior

Search does not depend on currently rendered cards. When search is active, results come from the full JSON index, so search remains correct if the blog list is later paginated. Pagination is only a browsing concern. Search bypasses pagination while active.

## Progressive Enhancement

Without JavaScript, the blog index remains a normal list of posts. If the search index fails to load, the search control reports that search is unavailable and the original post list remains visible.

## Components

- `layouts/blog/search.json`: renders the full blog search index for a language.
- `layouts/blog/list.html`: adds the search UI, initial post grid, and a search-results mount point.
- `assets/js/blog-search.js`: loads the index, handles input, builds autocomplete suggestions, filters results, and renders result cards.
- `assets/css/main.css`: styles the search input, suggestions, result count, and empty state.
- `hugo.toml`: adds a JSON output for the blog section.

## Testing

Run `hugo` to verify the site builds and `/blog/search.json` is generated. Manually verify that typing a title fragment filters results live, typing a tag filters results live, clicking a title suggestion opens the post, clicking a tag suggestion filters by tag, clearing the input restores the original list, and a no-match query shows the empty state.
