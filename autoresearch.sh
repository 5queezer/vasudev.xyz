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

workflow_run_id=0
site_http=0

if [ "$failures" -eq 0 ]; then
  head_sha=$(git rev-parse HEAD)
  if ! git push origin master >/tmp/autoresearch-push.log 2>&1; then
    failures=1
    cat /tmp/autoresearch-push.log >&2
  else
    for _ in {1..36}; do
      workflow_run_id=$(gh run list --branch master --limit 20 --json databaseId,workflowName,status,createdAt,headSha --jq '[.[] | select(.workflowName=="Deploy to GitHub Pages" and .headSha=="'"$head_sha"'")][0].databaseId // 0')
      if [ "$workflow_run_id" != "0" ]; then
        break
      fi
      sleep 5
    done

    if [ "$workflow_run_id" = "0" ]; then
      failures=1
      echo "No Deploy to GitHub Pages workflow run found after push" >&2
    elif ! gh run watch "$workflow_run_id" --exit-status --interval 10 >/tmp/autoresearch-gh-watch.log 2>&1; then
      failures=1
      cat /tmp/autoresearch-gh-watch.log >&2
      gh run view "$workflow_run_id" --log-failed >&2 || true
    else
      # Give GitHub Pages a short propagation window, then verify the live site.
      sleep 15
      site_http=$(curl -L -s -o /tmp/autoresearch-site.html -w '%{http_code}' https://vasudev.xyz/ || echo 0)
      if [ "$site_http" != "200" ]; then
        failures=1
        echo "Live site returned HTTP $site_http" >&2
      fi
    fi
  fi
fi

echo "METRIC deploy_failures=$failures"
echo "METRIC build_seconds=$build_seconds"
echo "METRIC conflict_markers=$markers"
echo "METRIC unmerged_files=$unmerged"
echo "METRIC graph_refs=$graph_refs"
echo "METRIC workflow_run_id=$workflow_run_id"
echo "METRIC site_http=$site_http"

if [ "$failures" -ne 0 ]; then
  echo "Deploy readiness or remote verification failed" >&2
  if [ "$markers" -ne 0 ]; then cat /tmp/autoresearch-conflicts.txt >&2; fi
  if [ "$graph_refs" -ne 0 ]; then cat /tmp/autoresearch-graph-refs.txt >&2; fi
  exit 1
fi
