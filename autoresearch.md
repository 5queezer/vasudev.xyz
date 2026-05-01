# Autoresearch: Deploy Green and Blog Online

## Objective
Get the current merge result pushed to `master`, make GitHub Pages deploy green, and verify the new vasudev.xyz site is online. This is a correctness loop, not a performance benchmark.

## Metrics
- **Primary**: deploy_failures (unitless, lower is better) — 0 means the checked step succeeded, 1 means it failed.
- **Secondary**: build_seconds, conflict_markers, unmerged_files — tradeoff and diagnostic signals.

## How to Run
`./autoresearch.sh` — checks local merge/build readiness and outputs `METRIC` lines.

For remote deployment, run `git push origin master`, inspect GitHub Actions with `gh run list` and `gh run watch`, then verify `https://vasudev.xyz/` with `curl`.

## Files in Scope
- `.github/workflows/deploy.yml` — GitHub Pages deployment workflow.
- `content/**` — Hugo content and generated pages affected by the merge.
- `layouts/**`, `themes/vasudev/**`, `assets/**`, `i18n/**`, `hugo.toml` — Hugo rendering and site structure.
- Graphify-related files — may be removed because the user asked to remove the Graphify graph from the page and workflow.

## Off Limits
- Do not reintroduce Graphify page, Graphify workflow steps, or generated graph data.
- Do not cheat by disabling the deploy workflow or hiding failing checks.
- Do not overfit to local checks. GitHub Pages and the live site are the target.

## Constraints
- Hugo build must pass locally.
- Git merge conflicts must be fully resolved.
- GitHub Actions deploy must complete successfully.
- The live site must return HTTP 200.

## What's Been Tried
- Resolved merge conflicts in blog front matter and the deploy workflow.
- Removed Graphify deploy steps, graph page content, graph layout, graph data, graph community data, graph nav link, graph i18n strings, and graph page CSS.
- Fixed duplicate `images` front matter entries that broke Hugo parsing.
- Pushed HEAD `4fd1ba1` to `origin/master`.
- Verified Deploy to GitHub Pages runs `25226889617` and `25226974565` completed successfully for current HEAD.
- Verified live `https://vasudev.xyz/` returns HTTP 200.
- Extended diagnostics verified `https://vasudev.xyz/blog/` returns HTTP 200 and removed `https://vasudev.xyz/graph/` returns HTTP 404.
- Avoid stale GitHub Actions conclusions by selecting the deploy run whose `headSha` equals `git rev-parse HEAD`.
