#!/usr/bin/env bash
set -euo pipefail

start_ns=$(date +%s%N)

unmerged=$(git diff --name-only --diff-filter=U | wc -l | tr -d ' ')
markers=$(rg -n '^(<<<<<<<|=======|>>>>>>>)' . >/tmp/autoresearch-conflicts.txt 2>/dev/null; rc=$?; if [ "$rc" -eq 0 ]; then wc -l </tmp/autoresearch-conflicts.txt | tr -d ' '; else echo 0; fi)
graph_refs=$(rg -n 'graphify-out|graphify-update|sync-graph|relLangURL "graph/"|layout: "graph"|/data/graph.json|data/graph|graph_communities|graphSearchPlaceholder|3d-force-graph|Knowledge Graph page' .github content themes layouts assets data static i18n hugo.toml README.md .gitignore >/tmp/autoresearch-graph-refs.txt 2>/dev/null; rc=$?; if [ "$rc" -eq 0 ]; then wc -l </tmp/autoresearch-graph-refs.txt | tr -d ' '; else echo 0; fi)

failures=0
if [ "$unmerged" -ne 0 ] || [ "$markers" -ne 0 ] || [ "$graph_refs" -ne 0 ]; then
  failures=1
fi

if ! hugo --minify --gc >/tmp/autoresearch-hugo.log 2>&1; then
  failures=1
  tail -80 /tmp/autoresearch-hugo.log >&2
fi

end_ns=$(date +%s%N)
build_seconds=$(python3 - <<PY
print(round(($end_ns - $start_ns) / 1000000000, 3))
PY
)

echo "METRIC deploy_failures=$failures"
echo "METRIC build_seconds=$build_seconds"
echo "METRIC conflict_markers=$markers"
echo "METRIC unmerged_files=$unmerged"
echo "METRIC graph_refs=$graph_refs"

if [ "$failures" -ne 0 ]; then
  echo "Local deploy readiness failed" >&2
  if [ "$markers" -ne 0 ]; then cat /tmp/autoresearch-conflicts.txt >&2; fi
  if [ "$graph_refs" -ne 0 ]; then cat /tmp/autoresearch-graph-refs.txt >&2; fi
  exit 1
fi
