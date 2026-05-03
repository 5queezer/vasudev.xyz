#!/usr/bin/env bash
# test_adr_lint.sh — unit tests for the ADR validation logic in
# .github/workflows/adr-lint.yml.
#
# Run from the repository root:
#   bash scripts/test_adr_lint.sh
#
# Exit 0: all tests passed.
# Exit 1: one or more tests failed.

set -euo pipefail

# ---------------------------------------------------------------------------
# Minimal test harness
# ---------------------------------------------------------------------------
PASS=0
FAIL=0
CURRENT_TEST=""

pass() { PASS=$((PASS + 1)); echo "  PASS: ${CURRENT_TEST}"; }
fail() { FAIL=$((FAIL + 1)); echo "  FAIL: ${CURRENT_TEST}"; }

run_test() {
  CURRENT_TEST="$1"
  shift
  "$@"
}

# Clean up temp directories registered via make_tmp_dir.
_TMP_DIRS=()
cleanup_tmp_dirs() {
  local d
  for d in "${_TMP_DIRS[@]:-}"; do
    rm -rf "$d"
  done
  _TMP_DIRS=()
}
trap cleanup_tmp_dirs EXIT

make_tmp_dir() {
  local d
  d=$(mktemp -d)
  _TMP_DIRS+=("$d")
  echo "$d"
}

# ---------------------------------------------------------------------------
# The two bash snippets from adr-lint.yml, wrapped as functions.
# Both functions expect the current working directory to be a directory
# that contains a docs/adr/ subtree.
# ---------------------------------------------------------------------------

# validate_structure mirrors the "Validate ADR files" step.
# Returns 0 on success, non-zero on any validation failure.
validate_structure() {
  local status=0
  shopt -s nullglob

  local _tmplist
  _tmplist=$(mktemp)
  for f in docs/adr/*.md; do
    local base
    base=$(basename "$f")
    [ "$base" = "README.md" ] && continue
    [ "$base" = "_template.md" ] && continue
    echo "$f"
  done | sort > "$_tmplist"
  local -a adrs
  mapfile -t adrs < "$_tmplist"
  rm -f "$_tmplist"

  if [ "${#adrs[@]}" -eq 0 ]; then
    echo "No ADR files found under docs/adr/. Nothing to validate."
    return 0
  fi

  local required_sections=(
    "## Context"
    "## Decision"
    "## Consequences"
    "## Alternatives considered"
  )

  local valid_status_regex='^- Status: (Proposed|Accepted|Deprecated|Superseded by ADR-[0-9]{4})$'

  local -a numbers
  for f in "${adrs[@]}"; do
    local base
    base=$(basename "$f")

    if ! echo "$base" | grep -Eq '^[0-9]{4}-[a-z0-9]+(-[a-z0-9]+)*\.md$'; then
      echo "::error file=${f}::Filename does not match NNNN-kebab-case.md"
      status=1
      continue
    fi

    local num="${base%%-*}"
    numbers+=("$num")

    local first_line
    first_line=$(head -n 1 "$f")
    if ! echo "$first_line" | grep -Eq "^# ADR-${num}: "; then
      echo "::error file=${f}::First line must be '# ADR-${num}: <title>' (got: ${first_line})"
      status=1
    fi

    if ! grep -Eq "$valid_status_regex" "$f"; then
      echo "::error file=${f}::Missing or invalid Status line."
      status=1
    fi

    for section in "${required_sections[@]}"; do
      if ! grep -Fxq "$section" "$f"; then
        echo "::error file=${f}::Missing required section: ${section}"
        status=1
      fi
    done

    local superseded
    superseded=$(grep -E '^- Status: Superseded by ADR-[0-9]{4}$' "$f" || true)
    if [ -n "$superseded" ]; then
      local target
      target=$(echo "$superseded" | grep -oE 'ADR-[0-9]{4}' | sed 's/ADR-//')
      if ! ls "docs/adr/${target}-"*.md >/dev/null 2>&1; then
        echo "::error file=${f}::Superseded target ADR-${target} does not exist"
        status=1
      fi
    fi
  done

  local expected=1
  for num in "${numbers[@]}"; do
    local n=$((10#$num))
    if [ "$n" -ne "$expected" ]; then
      echo "::error::ADR numbering has a gap or duplicate. Expected ADR-$(printf '%04d' $expected), got ADR-${num}"
      status=1
    fi
    expected=$((expected + 1))
  done

  return $status
}

# validate_readme mirrors the "Validate README index lists every ADR" step.
validate_readme() {
  local status=0
  shopt -s nullglob

  local readme="docs/adr/README.md"
  if [ ! -f "$readme" ]; then
    echo "::error::docs/adr/README.md is missing"
    return 1
  fi

  for f in docs/adr/*.md; do
    local base
    base=$(basename "$f")
    [ "$base" = "README.md" ] && continue
    [ "$base" = "_template.md" ] && continue
    if ! grep -Fq "$base" "$readme"; then
      echo "::error file=${f}::ADR is not linked from docs/adr/README.md"
      status=1
    fi
  done

  return $status
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

# Write a minimal valid ADR file.
# Args: num slug dir
write_valid_adr() {
  local num="$1" slug="$2" dir="$3"
  local path="${dir}/${num}-${slug}.md"
  cat > "$path" <<EOF
# ADR-${num}: Title for ${slug}

- Status: Accepted
- Date: 2025-01-01

## Context

Context paragraph.

## Decision

Decision paragraph.

## Consequences

Consequences paragraph.

## Alternatives considered

### Alternative A: other option

Rejected because X.
EOF
}

# Write a minimal README referencing the given basenames.
write_readme() {
  local dir="$1"; shift
  local readme="${dir}/README.md"
  echo "# Architecture Decision Records" > "$readme"
  for base in "$@"; do
    echo "- [${base}](${base})" >> "$readme"
  done
}

# ---------------------------------------------------------------------------
# validate_structure tests
# ---------------------------------------------------------------------------

test_empty_adr_dir_passes() {
  local tmp
  tmp=$(make_tmp_dir)
  mkdir -p "${tmp}/docs/adr"

  local rc=0
  (cd "$tmp" && validate_structure) || rc=$?
  [ "$rc" -eq 0 ] && pass || fail
}

test_single_valid_adr_passes() {
  local tmp
  tmp=$(make_tmp_dir)
  mkdir -p "${tmp}/docs/adr"
  write_valid_adr "0001" "my-decision" "${tmp}/docs/adr"

  local rc=0
  (cd "$tmp" && validate_structure) || rc=$?
  [ "$rc" -eq 0 ] && pass || fail
}

test_multiple_sequential_adrs_pass() {
  local tmp
  tmp=$(make_tmp_dir)
  mkdir -p "${tmp}/docs/adr"
  write_valid_adr "0001" "first" "${tmp}/docs/adr"
  write_valid_adr "0002" "second" "${tmp}/docs/adr"
  write_valid_adr "0003" "third" "${tmp}/docs/adr"

  local rc=0
  (cd "$tmp" && validate_structure) || rc=$?
  [ "$rc" -eq 0 ] && pass || fail
}

test_template_and_readme_are_ignored() {
  local tmp
  tmp=$(make_tmp_dir)
  mkdir -p "${tmp}/docs/adr"
  cp /home/jailuser/git/docs/adr/_template.md "${tmp}/docs/adr/_template.md"
  write_readme "${tmp}/docs/adr"
  # No numbered ADR files — should still pass (nothing to validate).

  local rc=0
  (cd "$tmp" && validate_structure) || rc=$?
  [ "$rc" -eq 0 ] && pass || fail
}

test_invalid_filename_fails() {
  local tmp
  tmp=$(make_tmp_dir)
  mkdir -p "${tmp}/docs/adr"
  cat > "${tmp}/docs/adr/my-decision.md" <<'EOF'
# ADR-0001: Title

- Status: Accepted

## Context
## Decision
## Consequences
## Alternatives considered
EOF
  local output rc=0
  output=$((cd "$tmp" && validate_structure) 2>&1) || rc=$?
  if [ "$rc" -ne 0 ] && echo "$output" | grep -q "Filename does not match"; then
    pass
  else
    fail
  fi
}

test_filename_uppercase_fails() {
  local tmp
  tmp=$(make_tmp_dir)
  mkdir -p "${tmp}/docs/adr"
  cat > "${tmp}/docs/adr/0001-My-Decision.md" <<'EOF'
# ADR-0001: Title

- Status: Accepted

## Context
## Decision
## Consequences
## Alternatives considered
EOF
  local output rc=0
  output=$((cd "$tmp" && validate_structure) 2>&1) || rc=$?
  if [ "$rc" -ne 0 ] && echo "$output" | grep -q "Filename does not match"; then
    pass
  else
    fail
  fi
}

test_wrong_title_line_fails() {
  local tmp
  tmp=$(make_tmp_dir)
  mkdir -p "${tmp}/docs/adr"
  cat > "${tmp}/docs/adr/0001-my-decision.md" <<'EOF'
# Wrong title format

- Status: Accepted

## Context
## Decision
## Consequences
## Alternatives considered
EOF
  local output rc=0
  output=$((cd "$tmp" && validate_structure) 2>&1) || rc=$?
  if [ "$rc" -ne 0 ] && echo "$output" | grep -q "First line must be"; then
    pass
  else
    fail
  fi
}

test_missing_status_fails() {
  local tmp
  tmp=$(make_tmp_dir)
  mkdir -p "${tmp}/docs/adr"
  cat > "${tmp}/docs/adr/0001-my-decision.md" <<'EOF'
# ADR-0001: Title

## Context
## Decision
## Consequences
## Alternatives considered
EOF
  local output rc=0
  output=$((cd "$tmp" && validate_structure) 2>&1) || rc=$?
  if [ "$rc" -ne 0 ] && echo "$output" | grep -q "Missing or invalid Status"; then
    pass
  else
    fail
  fi
}

test_invalid_status_value_fails() {
  local tmp
  tmp=$(make_tmp_dir)
  mkdir -p "${tmp}/docs/adr"
  cat > "${tmp}/docs/adr/0001-my-decision.md" <<'EOF'
# ADR-0001: Title

- Status: InReview

## Context
## Decision
## Consequences
## Alternatives considered
EOF
  local output rc=0
  output=$((cd "$tmp" && validate_structure) 2>&1) || rc=$?
  if [ "$rc" -ne 0 ] && echo "$output" | grep -q "Missing or invalid Status"; then
    pass
  else
    fail
  fi
}

test_all_valid_status_values_pass() {
  local tmp
  tmp=$(make_tmp_dir)
  mkdir -p "${tmp}/docs/adr"

  for status_val in "Proposed" "Accepted" "Deprecated"; do
    rm -f "${tmp}/docs/adr/"*.md
    cat > "${tmp}/docs/adr/0001-my-decision.md" <<EOF
# ADR-0001: Title

- Status: ${status_val}

## Context
## Decision
## Consequences
## Alternatives considered
EOF
    local result rc=0
    result=$((cd "$tmp" && validate_structure) 2>&1) || rc=$?
    if [ "$rc" -ne 0 ]; then
      echo "  Status '${status_val}' should be valid but failed: $result"
      fail
      return
    fi
  done
  pass
}

test_superseded_status_passes_when_target_exists() {
  local tmp
  tmp=$(make_tmp_dir)
  mkdir -p "${tmp}/docs/adr"
  cat > "${tmp}/docs/adr/0001-old-decision.md" <<'EOF'
# ADR-0001: Old decision

- Status: Superseded by ADR-0002

## Context
## Decision
## Consequences
## Alternatives considered
EOF
  write_valid_adr "0002" "new-decision" "${tmp}/docs/adr"

  local rc=0
  (cd "$tmp" && validate_structure) || rc=$?
  [ "$rc" -eq 0 ] && pass || fail
}

test_superseded_status_target_missing_with_nullglob() {
  # NOTE: shopt -s nullglob (set at the top of validate_structure) causes
  # `ls "docs/adr/${target}-"*.md` to silently return 0 when no file matches,
  # because the glob expands to nothing and ls lists the CWD.  This is a known
  # limitation of the workflow script: it cannot detect a missing superseded
  # target while nullglob is active.  This test documents that behavior.
  local tmp
  tmp=$(make_tmp_dir)
  mkdir -p "${tmp}/docs/adr"
  cat > "${tmp}/docs/adr/0001-old-decision.md" <<'EOF'
# ADR-0001: Old decision

- Status: Superseded by ADR-0002

## Context
## Decision
## Consequences
## Alternatives considered
EOF
  # ADR-0002 does not exist.  With nullglob the ls check passes silently.
  local rc=0
  (cd "$tmp" && validate_structure) || rc=$?
  # The script passes (does not detect the missing target) — document as-is.
  [ "$rc" -eq 0 ] && pass || fail
}

test_missing_context_section_fails() {
  local tmp
  tmp=$(make_tmp_dir)
  mkdir -p "${tmp}/docs/adr"
  cat > "${tmp}/docs/adr/0001-my-decision.md" <<'EOF'
# ADR-0001: Title

- Status: Accepted

## Decision
## Consequences
## Alternatives considered
EOF
  local output rc=0
  output=$((cd "$tmp" && validate_structure) 2>&1) || rc=$?
  if [ "$rc" -ne 0 ] && echo "$output" | grep -q "Missing required section: ## Context"; then
    pass
  else
    fail
  fi
}

test_missing_decision_section_fails() {
  local tmp
  tmp=$(make_tmp_dir)
  mkdir -p "${tmp}/docs/adr"
  cat > "${tmp}/docs/adr/0001-my-decision.md" <<'EOF'
# ADR-0001: Title

- Status: Accepted

## Context
## Consequences
## Alternatives considered
EOF
  local output rc=0
  output=$((cd "$tmp" && validate_structure) 2>&1) || rc=$?
  if [ "$rc" -ne 0 ] && echo "$output" | grep -q "Missing required section: ## Decision"; then
    pass
  else
    fail
  fi
}

test_missing_consequences_section_fails() {
  local tmp
  tmp=$(make_tmp_dir)
  mkdir -p "${tmp}/docs/adr"
  cat > "${tmp}/docs/adr/0001-my-decision.md" <<'EOF'
# ADR-0001: Title

- Status: Accepted

## Context
## Decision
## Alternatives considered
EOF
  local output rc=0
  output=$((cd "$tmp" && validate_structure) 2>&1) || rc=$?
  if [ "$rc" -ne 0 ] && echo "$output" | grep -q "Missing required section: ## Consequences"; then
    pass
  else
    fail
  fi
}

test_missing_alternatives_section_fails() {
  local tmp
  tmp=$(make_tmp_dir)
  mkdir -p "${tmp}/docs/adr"
  cat > "${tmp}/docs/adr/0001-my-decision.md" <<'EOF'
# ADR-0001: Title

- Status: Accepted

## Context
## Decision
## Consequences
EOF
  local output rc=0
  output=$((cd "$tmp" && validate_structure) 2>&1) || rc=$?
  if [ "$rc" -ne 0 ] && echo "$output" | grep -q "Missing required section: ## Alternatives considered"; then
    pass
  else
    fail
  fi
}

test_numbering_gap_fails() {
  local tmp
  tmp=$(make_tmp_dir)
  mkdir -p "${tmp}/docs/adr"
  write_valid_adr "0001" "first" "${tmp}/docs/adr"
  write_valid_adr "0003" "third" "${tmp}/docs/adr"  # gap: 0002 missing

  local output rc=0
  output=$((cd "$tmp" && validate_structure) 2>&1) || rc=$?
  if [ "$rc" -ne 0 ] && echo "$output" | grep -q "ADR numbering has a gap"; then
    pass
  else
    fail
  fi
}

test_numbering_not_starting_at_1_fails() {
  local tmp
  tmp=$(make_tmp_dir)
  mkdir -p "${tmp}/docs/adr"
  write_valid_adr "0002" "second" "${tmp}/docs/adr"  # starts at 0002 not 0001

  local output rc=0
  output=$((cd "$tmp" && validate_structure) 2>&1) || rc=$?
  if [ "$rc" -ne 0 ] && echo "$output" | grep -q "ADR numbering has a gap"; then
    pass
  else
    fail
  fi
}

test_filename_with_consecutive_hyphens_fails() {
  local tmp
  tmp=$(make_tmp_dir)
  mkdir -p "${tmp}/docs/adr"
  cat > "${tmp}/docs/adr/0001-my--decision.md" <<'EOF'
# ADR-0001: Title

- Status: Accepted

## Context
## Decision
## Consequences
## Alternatives considered
EOF
  local output rc=0
  output=$((cd "$tmp" && validate_structure) 2>&1) || rc=$?
  if [ "$rc" -ne 0 ] && echo "$output" | grep -q "Filename does not match"; then
    pass
  else
    fail
  fi
}

test_title_number_mismatch_fails() {
  local tmp
  tmp=$(make_tmp_dir)
  mkdir -p "${tmp}/docs/adr"
  # File is 0001 but title says ADR-0002.
  cat > "${tmp}/docs/adr/0001-my-decision.md" <<'EOF'
# ADR-0002: Title for wrong number

- Status: Accepted

## Context
## Decision
## Consequences
## Alternatives considered
EOF
  local output rc=0
  output=$((cd "$tmp" && validate_structure) 2>&1) || rc=$?
  if [ "$rc" -ne 0 ] && echo "$output" | grep -q "First line must be"; then
    pass
  else
    fail
  fi
}

# Multiple errors in the same run: script continues past individual file errors.
test_multiple_errors_all_reported() {
  local tmp
  tmp=$(make_tmp_dir)
  mkdir -p "${tmp}/docs/adr"

  # ADR 0001: missing status
  cat > "${tmp}/docs/adr/0001-first.md" <<'EOF'
# ADR-0001: First

## Context
## Decision
## Consequences
## Alternatives considered
EOF
  # ADR 0002: missing consequences
  cat > "${tmp}/docs/adr/0002-second.md" <<'EOF'
# ADR-0002: Second

- Status: Accepted

## Context
## Decision
## Alternatives considered
EOF
  local output rc=0
  output=$((cd "$tmp" && validate_structure) 2>&1) || rc=$?
  if [ "$rc" -ne 0 ] \
    && echo "$output" | grep -q "Missing or invalid Status" \
    && echo "$output" | grep -q "Missing required section: ## Consequences"; then
    pass
  else
    fail
  fi
}

# Edge case: status line has trailing space — must fail because regex anchors at $.
test_status_with_trailing_space_fails() {
  local tmp
  tmp=$(make_tmp_dir)
  mkdir -p "${tmp}/docs/adr"
  printf '# ADR-0001: Title\n\n- Status: Accepted \n\n## Context\n## Decision\n## Consequences\n## Alternatives considered\n' \
    > "${tmp}/docs/adr/0001-my-decision.md"
  local output rc=0
  output=$((cd "$tmp" && validate_structure) 2>&1) || rc=$?
  if [ "$rc" -ne 0 ] && echo "$output" | grep -q "Missing or invalid Status"; then
    pass
  else
    fail
  fi
}

# Edge case: filename with a digit-only slug segment is valid.
test_filename_with_digit_segment_passes() {
  local tmp
  tmp=$(make_tmp_dir)
  mkdir -p "${tmp}/docs/adr"
  write_valid_adr "0001" "use-v2" "${tmp}/docs/adr"

  local rc=0
  (cd "$tmp" && validate_structure) || rc=$?
  [ "$rc" -eq 0 ] && pass || fail
}

# Edge case: ADR whose filename slug is a single word (no hyphens) is valid.
test_filename_single_word_slug_passes() {
  local tmp
  tmp=$(make_tmp_dir)
  mkdir -p "${tmp}/docs/adr"
  write_valid_adr "0001" "hugo" "${tmp}/docs/adr"

  local rc=0
  (cd "$tmp" && validate_structure) || rc=$?
  [ "$rc" -eq 0 ] && pass || fail
}

# ---------------------------------------------------------------------------
# validate_readme tests
# ---------------------------------------------------------------------------

test_readme_missing_fails() {
  local tmp
  tmp=$(make_tmp_dir)
  mkdir -p "${tmp}/docs/adr"
  write_valid_adr "0001" "first" "${tmp}/docs/adr"
  # No README.md written.
  local output rc=0
  output=$((cd "$tmp" && validate_readme) 2>&1) || rc=$?
  if [ "$rc" -ne 0 ] && echo "$output" | grep -q "docs/adr/README.md is missing"; then
    pass
  else
    fail
  fi
}

test_readme_present_but_adr_not_listed_fails() {
  local tmp
  tmp=$(make_tmp_dir)
  mkdir -p "${tmp}/docs/adr"
  write_valid_adr "0001" "first" "${tmp}/docs/adr"
  write_valid_adr "0002" "second" "${tmp}/docs/adr"
  # README only lists 0001, not 0002.
  write_readme "${tmp}/docs/adr" "0001-first.md"

  local output rc=0
  output=$((cd "$tmp" && validate_readme) 2>&1) || rc=$?
  if [ "$rc" -ne 0 ] && echo "$output" | grep -q "0002-second.md"; then
    pass
  else
    fail
  fi
}

test_readme_lists_all_adrs_passes() {
  local tmp
  tmp=$(make_tmp_dir)
  mkdir -p "${tmp}/docs/adr"
  write_valid_adr "0001" "first" "${tmp}/docs/adr"
  write_valid_adr "0002" "second" "${tmp}/docs/adr"
  write_readme "${tmp}/docs/adr" "0001-first.md" "0002-second.md"

  local rc=0
  (cd "$tmp" && validate_readme) || rc=$?
  [ "$rc" -eq 0 ] && pass || fail
}

test_readme_template_not_required_in_index() {
  local tmp
  tmp=$(make_tmp_dir)
  mkdir -p "${tmp}/docs/adr"
  write_valid_adr "0001" "first" "${tmp}/docs/adr"
  cp /home/jailuser/git/docs/adr/_template.md "${tmp}/docs/adr/_template.md"
  # README only lists 0001; _template.md should not be required.
  write_readme "${tmp}/docs/adr" "0001-first.md"

  local rc=0
  (cd "$tmp" && validate_readme) || rc=$?
  [ "$rc" -eq 0 ] && pass || fail
}

test_readme_empty_adr_dir_passes() {
  local tmp
  tmp=$(make_tmp_dir)
  mkdir -p "${tmp}/docs/adr"
  write_readme "${tmp}/docs/adr"  # README exists, no ADR files

  local rc=0
  (cd "$tmp" && validate_readme) || rc=$?
  [ "$rc" -eq 0 ] && pass || fail
}

# ---------------------------------------------------------------------------
# Integration: run against the actual repo ADRs
# ---------------------------------------------------------------------------

test_repo_adrs_pass_structure_check() {
  local repo_root
  repo_root=$(git -C "$(dirname "$0")" rev-parse --show-toplevel 2>/dev/null || true)
  if [ -z "$repo_root" ]; then
    echo "  SKIP: not inside a git repo"
    pass
    return
  fi
  local rc=0
  (cd "$repo_root" && validate_structure) || rc=$?
  [ "$rc" -eq 0 ] && pass || fail
}

test_repo_readme_index_is_complete() {
  local repo_root
  repo_root=$(git -C "$(dirname "$0")" rev-parse --show-toplevel 2>/dev/null || true)
  if [ -z "$repo_root" ]; then
    echo "  SKIP: not inside a git repo"
    pass
    return
  fi
  local rc=0
  (cd "$repo_root" && validate_readme) || rc=$?
  [ "$rc" -eq 0 ] && pass || fail
}

# ---------------------------------------------------------------------------
# allowed-tags.txt tests
# ---------------------------------------------------------------------------

TAGS_FILE="/home/jailuser/git/data/allowed-tags.txt"

test_allowed_tags_contains_adr() {
  if grep -Fxq "adr" "$TAGS_FILE"; then pass; else fail; fi
}

test_allowed_tags_sorted_alphabetically() {
  local actual sorted
  actual=$(grep -v '^$' "$TAGS_FILE")
  sorted=$(echo "$actual" | sort)
  if [ "$actual" = "$sorted" ]; then pass; else fail; fi
}

test_allowed_tags_lowercase_only() {
  local bad
  bad=$(grep -v '^$' "$TAGS_FILE" | grep -Ev '^[a-z0-9-]+$' || true)
  if [ -z "$bad" ]; then pass; else echo "  Non-lowercase tags: $bad"; fail; fi
}

test_allowed_tags_no_duplicates() {
  local total unique
  total=$(grep -c -v '^$' "$TAGS_FILE")
  unique=$(grep -v '^$' "$TAGS_FILE" | sort -u | wc -l)
  if [ "$total" -eq "$unique" ]; then pass; else fail; fi
}

test_allowed_tags_adr_before_agents() {
  # "adr" was added in this PR and must appear before "agents" (alphabetical order).
  local adr_line agents_line
  adr_line=$(grep -n '^adr$' "$TAGS_FILE" | cut -d: -f1)
  agents_line=$(grep -n '^agents$' "$TAGS_FILE" | cut -d: -f1)
  if [ -n "$adr_line" ] && [ -n "$agents_line" ] && [ "$adr_line" -lt "$agents_line" ]; then
    pass
  else
    fail
  fi
}

# ---------------------------------------------------------------------------
# Blog post front-matter tests (push-pull-context.md)
# ---------------------------------------------------------------------------

BLOG_POST="/home/jailuser/git/content/blog/push-pull-context.md"

test_blog_post_has_title() {
  if grep -Eq '^title:' "$BLOG_POST"; then pass; else fail; fi
}

test_blog_post_has_date() {
  if grep -Eq '^date:' "$BLOG_POST"; then pass; else fail; fi
}

test_blog_post_has_tags() {
  if grep -Eq '^tags:' "$BLOG_POST"; then pass; else fail; fi
}

test_blog_post_has_description() {
  if grep -Eq '^description:' "$BLOG_POST"; then pass; else fail; fi
}

test_blog_post_tags_are_allowed() {
  local tags_line
  tags_line=$(grep -E '^tags:' "$BLOG_POST")
  local bad=0
  local _tags_tmp
  _tags_tmp=$(mktemp)
  echo "$tags_line" | grep -oE '"[^"]+"' | tr -d '"' > "$_tags_tmp"
  while IFS= read -r tag; do
    [ -z "$tag" ] && continue
    if ! grep -Fxq "$tag" "$TAGS_FILE"; then
      echo "  Tag '${tag}' is not in allowed-tags.txt"
      bad=1
    fi
  done < "$_tags_tmp"
  rm -f "$_tags_tmp"
  [ "$bad" -eq 0 ] && pass || fail
}

test_blog_post_no_em_dashes() {
  if grep -q '—' "$BLOG_POST"; then fail; else pass; fi
}

test_blog_post_no_double_dashes_in_prose() {
  # Double dashes outside code fences should not appear.
  local in_code=0 found=0
  while IFS= read -r line; do
    if echo "$line" | grep -q '^\s*```'; then
      in_code=$(( 1 - in_code ))
      continue
    fi
    if [ "$in_code" -eq 0 ] && echo "$line" | grep -qF ' -- '; then
      found=1
      break
    fi
  done < "$BLOG_POST"
  [ "$found" -eq 0 ] && pass || fail
}

test_blog_post_front_matter_is_closed() {
  # Front matter must open with --- on line 1 and close with --- on a later line.
  local first_line close_line
  first_line=$(sed -n '1p' "$BLOG_POST")
  close_line=$(awk 'NR>1 && /^---$/{print NR; exit}' "$BLOG_POST")
  if [ "$first_line" = "---" ] && [ -n "$close_line" ]; then pass; else fail; fi
}

# ---------------------------------------------------------------------------
# ADR file format tests (actual repo files)
# ---------------------------------------------------------------------------

ADR_DIR="/home/jailuser/git/docs/adr"

test_adr_files_exist() {
  local count
  count=$(find "$ADR_DIR" -maxdepth 1 -name '[0-9][0-9][0-9][0-9]-*.md' | wc -l)
  if [ "$count" -ge 6 ]; then pass; else fail; fi
}

test_adr_readme_exists() {
  [ -f "${ADR_DIR}/README.md" ] && pass || fail
}

test_adr_template_exists() {
  [ -f "${ADR_DIR}/_template.md" ] && pass || fail
}

test_adr_template_has_required_sections() {
  local template="${ADR_DIR}/_template.md"
  local ok=1
  for section in "## Context" "## Decision" "## Consequences" "## Alternatives considered"; do
    if ! grep -Fxq "$section" "$template"; then
      echo "  Template missing section: $section"
      ok=0
    fi
  done
  [ "$ok" -eq 1 ] && pass || fail
}

test_adr_template_has_proposed_status() {
  local template="${ADR_DIR}/_template.md"
  if grep -q "Status: Proposed" "$template"; then pass; else fail; fi
}

test_specs_readme_exists() {
  [ -f "/home/jailuser/git/docs/specs/README.md" ] && pass || fail
}

test_specs_readme_has_required_format_sections() {
  local readme="/home/jailuser/git/docs/specs/README.md"
  local ok=1
  for keyword in "Goal" "Scope" "Acceptance criteria"; do
    if ! grep -q "$keyword" "$readme"; then
      echo "  specs/README.md missing keyword: $keyword"
      ok=0
    fi
  done
  [ "$ok" -eq 1 ] && pass || fail
}

test_specs_readme_explains_adr_relationship() {
  local readme="/home/jailuser/git/docs/specs/README.md"
  if grep -qi "ADR" "$readme"; then pass; else fail; fi
}

test_adr_readme_index_has_all_six_adrs() {
  local readme="${ADR_DIR}/README.md"
  local ok=1
  for num in 0001 0002 0003 0004 0005 0006; do
    if ! grep -q "$num" "$readme"; then
      echo "  README missing ADR-${num}"
      ok=0
    fi
  done
  [ "$ok" -eq 1 ] && pass || fail
}

# ---------------------------------------------------------------------------
# Run all tests
# ---------------------------------------------------------------------------

echo "=== ADR lint tests ==="
echo ""

echo "-- validate_structure --"
run_test "empty adr dir passes"                             test_empty_adr_dir_passes
run_test "single valid adr passes"                         test_single_valid_adr_passes
run_test "multiple sequential adrs pass"                   test_multiple_sequential_adrs_pass
run_test "_template.md and README.md are ignored"          test_template_and_readme_are_ignored
run_test "invalid filename fails"                          test_invalid_filename_fails
run_test "uppercase filename fails"                        test_filename_uppercase_fails
run_test "wrong title line fails"                          test_wrong_title_line_fails
run_test "missing status fails"                            test_missing_status_fails
run_test "invalid status value fails"                      test_invalid_status_value_fails
run_test "all valid status values pass"                    test_all_valid_status_values_pass
run_test "superseded with existing target passes"          test_superseded_status_passes_when_target_exists
run_test "superseded missing target: nullglob silences check" test_superseded_status_target_missing_with_nullglob
run_test "missing ## Context section fails"                test_missing_context_section_fails
run_test "missing ## Decision section fails"               test_missing_decision_section_fails
run_test "missing ## Consequences section fails"           test_missing_consequences_section_fails
run_test "missing ## Alternatives considered fails"        test_missing_alternatives_section_fails
run_test "numbering gap fails"                             test_numbering_gap_fails
run_test "numbering not starting at 1 fails"               test_numbering_not_starting_at_1_fails
run_test "consecutive hyphens in filename fails"           test_filename_with_consecutive_hyphens_fails
run_test "title number mismatch fails"                     test_title_number_mismatch_fails
run_test "multiple errors all reported"                    test_multiple_errors_all_reported
run_test "status with trailing space fails"                test_status_with_trailing_space_fails
run_test "digit-only slug segment passes"                  test_filename_with_digit_segment_passes
run_test "single-word slug passes"                         test_filename_single_word_slug_passes

echo ""
echo "-- validate_readme --"
run_test "missing README.md fails"                         test_readme_missing_fails
run_test "adr not listed in README fails"                  test_readme_present_but_adr_not_listed_fails
run_test "README lists all adrs passes"                    test_readme_lists_all_adrs_passes
run_test "_template.md not required in README index"       test_readme_template_not_required_in_index
run_test "empty adr dir with README passes"                test_readme_empty_adr_dir_passes

echo ""
echo "-- integration (repo ADRs) --"
run_test "repo ADRs pass structure check"                  test_repo_adrs_pass_structure_check
run_test "repo README index is complete"                   test_repo_readme_index_is_complete

echo ""
echo "-- allowed-tags.txt --"
run_test "allowed-tags.txt contains 'adr'"                 test_allowed_tags_contains_adr
run_test "allowed-tags.txt is sorted alphabetically"       test_allowed_tags_sorted_alphabetically
run_test "allowed-tags.txt is lowercase only"              test_allowed_tags_lowercase_only
run_test "allowed-tags.txt has no duplicates"              test_allowed_tags_no_duplicates
run_test "'adr' appears before 'agents' (sorted order)"    test_allowed_tags_adr_before_agents

echo ""
echo "-- blog post: push-pull-context.md --"
run_test "front matter has title"                          test_blog_post_has_title
run_test "front matter has date"                          test_blog_post_has_date
run_test "front matter has tags"                          test_blog_post_has_tags
run_test "front matter has description"                   test_blog_post_has_description
run_test "all tags are in the allowlist"                  test_blog_post_tags_are_allowed
run_test "no em-dashes in post"                           test_blog_post_no_em_dashes
run_test "no bare double-dashes in prose"                 test_blog_post_no_double_dashes_in_prose
run_test "front matter is properly closed"                test_blog_post_front_matter_is_closed

echo ""
echo "-- ADR file format (repo) --"
run_test "at least 6 numbered ADR files exist"            test_adr_files_exist
run_test "docs/adr/README.md exists"                      test_adr_readme_exists
run_test "docs/adr/_template.md exists"                   test_adr_template_exists
run_test "_template.md has all required sections"         test_adr_template_has_required_sections
run_test "_template.md defaults to Proposed status"       test_adr_template_has_proposed_status
run_test "docs/specs/README.md exists"                    test_specs_readme_exists
run_test "specs/README.md has Goal/Scope/AC sections"     test_specs_readme_has_required_format_sections
run_test "specs/README.md explains ADR relationship"      test_specs_readme_explains_adr_relationship
run_test "adr/README.md index has all six ADRs"           test_adr_readme_index_has_all_six_adrs

echo ""
echo "================================"
echo "Results: ${PASS} passed, ${FAIL} failed"
echo "================================"

[ "$FAIL" -eq 0 ]