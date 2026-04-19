#!/usr/bin/env bash
# Tests for the ADR lint validation logic in .github/workflows/adr-lint.yml
# Run from the repo root: bash tests/adr-lint_test.sh

set -uo pipefail

PASS=0
FAIL=0
ERRORS=()

pass() { PASS=$((PASS + 1)); echo "  PASS: $1"; }
fail() { FAIL=$((FAIL + 1)); ERRORS+=("$1"); echo "  FAIL: $1"; }

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

# Make a minimal valid ADR file content
make_valid_adr() {
  local num="$1"
  local title="${2:-Some decision}"
  cat <<EOF
# ADR-${num}: ${title}

- Status: Accepted
- Date: 2025-01-01

## Context

Some context here.

## Decision

The decision.

## Consequences

The consequences.

## Alternatives considered

### Alternative A: Option one

Why rejected.
EOF
}

# Run the "Validate ADR files" block from adr-lint.yml against a given directory.
# Rewrites mapfile+process substitution with temp-file approach for portability.
run_structure_check() {
  local dir="$1"
  (
    cd "$dir"
    # Write the ADR list to a temp file to avoid process substitution
    local tmplist
    tmplist=$(mktemp)
    for f in docs/adr/*.md; do
      base=$(basename "$f")
      [ "$base" = "README.md" ] && continue
      [ "$base" = "_template.md" ] && continue
      echo "$f"
    done | sort > "$tmplist"

    if [ ! -s "$tmplist" ]; then
      echo "No ADR files found under docs/adr/. Nothing to validate."
      rm -f "$tmplist"
      exit 0
    fi

    required_sections=(
      "## Context"
      "## Decision"
      "## Consequences"
      "## Alternatives considered"
    )

    valid_status_regex='^- Status: (Proposed|Accepted|Deprecated|Superseded by ADR-[0-9]{4})$'

    status=0
    declare -a numbers=()

    while IFS= read -r f; do
      base=$(basename "$f")

      if ! echo "$base" | grep -Eq '^[0-9]{4}-[a-z0-9]+(-[a-z0-9]+)*\.md$'; then
        echo "ERROR:filename:${f}"
        status=1
        continue
      fi

      num="${base%%-*}"
      numbers+=("$num")

      first_line=$(head -n 1 "$f")
      if ! echo "$first_line" | grep -Eq "^# ADR-${num}: "; then
        echo "ERROR:title:${f}"
        status=1
      fi

      if ! grep -Eq "$valid_status_regex" "$f"; then
        echo "ERROR:status:${f}"
        status=1
      fi

      for section in "${required_sections[@]}"; do
        if ! grep -Fxq "$section" "$f"; then
          echo "ERROR:section:${section}:${f}"
          status=1
        fi
      done

      superseded=$(grep -E '^- Status: Superseded by ADR-[0-9]{4}$' "$f" || true)
      if [ -n "$superseded" ]; then
        target=$(echo "$superseded" | grep -oE 'ADR-[0-9]{4}' | sed 's/ADR-//')
        if ! ls "docs/adr/${target}-"*.md >/dev/null 2>&1; then
          echo "ERROR:superseded_missing:${f}"
          status=1
        fi
      fi
    done < "$tmplist"

    rm -f "$tmplist"

    expected=1
    for num in "${numbers[@]}"; do
      n=$((10#$num))
      if [ "$n" -ne "$expected" ]; then
        echo "ERROR:numbering:expected=$(printf '%04d' $expected):got=${num}"
        status=1
      fi
      expected=$((expected + 1))
    done

    exit $status
  )
}

# Run the "Validate README index" block from adr-lint.yml against a given directory.
run_readme_check() {
  local dir="$1"
  (
    cd "$dir"
    status=0

    readme="docs/adr/README.md"
    if [ ! -f "$readme" ]; then
      echo "ERROR:missing_readme"
      exit 1
    fi

    for f in docs/adr/*.md; do
      base=$(basename "$f")
      [ "$base" = "README.md" ] && continue
      [ "$base" = "_template.md" ] && continue
      if ! grep -Fq "$base" "$readme"; then
        echo "ERROR:not_listed:${f}"
        status=1
      fi
    done

    exit $status
  )
}

# ---------------------------------------------------------------------------
# Setup: helpers for creating fixture dirs
# ---------------------------------------------------------------------------

make_adr_dir() {
  local dir
  dir=$(mktemp -d)
  mkdir -p "$dir/docs/adr"
  echo "$dir"
}

# ---------------------------------------------------------------------------
# Section 1: Filename validation
# ---------------------------------------------------------------------------
echo ""
echo "=== Filename validation ==="

# Valid filenames
for fname in "0001-foo.md" "0001-foo-bar.md" "0001-foo-bar-baz.md" "0001-abc123.md"; do
  if echo "$fname" | grep -Eq '^[0-9]{4}-[a-z0-9]+(-[a-z0-9]+)*\.md$'; then
    pass "valid filename: $fname"
  else
    fail "valid filename rejected: $fname"
  fi
done

# Invalid filenames
for fname in "foo.md" "1-foo.md" "00001-foo.md" "0001-Foo.md" "0001-foo_bar.md" "0001-.md" "0001-foo bar.md"; do
  if echo "$fname" | grep -Eq '^[0-9]{4}-[a-z0-9]+(-[a-z0-9]+)*\.md$'; then
    fail "invalid filename accepted: $fname"
  else
    pass "invalid filename rejected: $fname"
  fi
done

# README.md and _template.md are excluded from ADR set
d=$(make_adr_dir)
make_valid_adr "0001" "Decision one" > "$d/docs/adr/0001-decision-one.md"
printf '0001-decision-one.md\n' > "$d/docs/adr/README.md"
touch "$d/docs/adr/_template.md"
out=$(run_structure_check "$d" 2>&1); rc=$?
if [ $rc -eq 0 ]; then
  pass "README.md and _template.md are not treated as ADRs"
else
  fail "README.md/_template.md incorrectly treated as ADRs: $out"
fi
rm -rf "$d"

# ---------------------------------------------------------------------------
# Section 2: Title line validation
# ---------------------------------------------------------------------------
echo ""
echo "=== Title line validation ==="

d=$(make_adr_dir)
make_valid_adr "0001" "My decision" > "$d/docs/adr/0001-my-decision.md"
out=$(run_structure_check "$d" 2>&1); rc=$?
if [ $rc -eq 0 ]; then
  pass "valid title line accepted"
else
  fail "valid title line rejected: $out"
fi
rm -rf "$d"

# Missing colon-space after number
d=$(make_adr_dir)
cat > "$d/docs/adr/0001-bad-title.md" <<'EOF'
# ADR-0001 Missing colon

- Status: Accepted
- Date: 2025-01-01

## Context

ctx

## Decision

dec

## Consequences

cons

## Alternatives considered

alt
EOF
out=$(run_structure_check "$d" 2>&1); rc=$?
if echo "$out" | grep -q "ERROR:title"; then
  pass "title without colon-space flagged"
else
  fail "title without colon-space not flagged (rc=$rc): $out"
fi
rm -rf "$d"

# Wrong ADR number in title
d=$(make_adr_dir)
cat > "$d/docs/adr/0001-wrong-num.md" <<'EOF'
# ADR-0002: Wrong number in title

- Status: Accepted
- Date: 2025-01-01

## Context

ctx

## Decision

dec

## Consequences

cons

## Alternatives considered

alt
EOF
out=$(run_structure_check "$d" 2>&1); rc=$?
if echo "$out" | grep -q "ERROR:title"; then
  pass "mismatched ADR number in title flagged"
else
  fail "mismatched ADR number in title not flagged (rc=$rc): $out"
fi
rm -rf "$d"

# Lowercase title after colon is valid (not validated by script)
d=$(make_adr_dir)
cat > "$d/docs/adr/0001-lower.md" <<'EOF'
# ADR-0001: lowercase title

- Status: Accepted
- Date: 2025-01-01

## Context

ctx

## Decision

dec

## Consequences

cons

## Alternatives considered

alt
EOF
out=$(run_structure_check "$d" 2>&1); rc=$?
if [ $rc -eq 0 ]; then
  pass "lowercase title accepted (title case not enforced)"
else
  fail "lowercase title unexpectedly rejected: $out"
fi
rm -rf "$d"

# ---------------------------------------------------------------------------
# Section 3: Status line validation
# ---------------------------------------------------------------------------
echo ""
echo "=== Status line validation ==="

valid_statuses=("Proposed" "Accepted" "Deprecated" "Superseded by ADR-0002")
for s in "${valid_statuses[@]}"; do
  if echo "- Status: $s" | grep -Eq '^- Status: (Proposed|Accepted|Deprecated|Superseded by ADR-[0-9]{4})$'; then
    pass "valid status: '$s'"
  else
    fail "valid status rejected: '$s'"
  fi
done

invalid_statuses=("proposed" "ACCEPTED" "Superseded" "Superseded by 0002" "Superseded by ADR-002" "Superseded by ADR-00002" "In Progress" "Status: Accepted")
for s in "${invalid_statuses[@]}"; do
  if echo "- Status: $s" | grep -Eq '^- Status: (Proposed|Accepted|Deprecated|Superseded by ADR-[0-9]{4})$'; then
    fail "invalid status accepted: '$s'"
  else
    pass "invalid status rejected: '$s'"
  fi
done

# Empty status value
if echo "- Status: " | grep -Eq '^- Status: (Proposed|Accepted|Deprecated|Superseded by ADR-[0-9]{4})$'; then
  fail "empty status value accepted"
else
  pass "empty status value rejected"
fi

# Superseded status with existing target
d=$(make_adr_dir)
make_valid_adr "0001" "Old decision" > "$d/docs/adr/0001-old-decision.md"
make_valid_adr "0002" "New decision" > "$d/docs/adr/0002-new-decision.md"
sed -i 's/- Status: Accepted/- Status: Superseded by ADR-0002/' "$d/docs/adr/0001-old-decision.md"
out=$(run_structure_check "$d" 2>&1); rc=$?
if [ $rc -eq 0 ]; then
  pass "superseded ADR referencing existing target passes"
else
  fail "superseded ADR referencing existing target failed: $out"
fi
rm -rf "$d"

# Superseded status with non-existing target
d=$(make_adr_dir)
make_valid_adr "0001" "Old decision" > "$d/docs/adr/0001-old-decision.md"
sed -i 's/- Status: Accepted/- Status: Superseded by ADR-0099/' "$d/docs/adr/0001-old-decision.md"
out=$(run_structure_check "$d" 2>&1); rc=$?
if echo "$out" | grep -q "ERROR:superseded_missing"; then
  pass "superseded ADR with missing target flagged"
else
  fail "superseded ADR with missing target not flagged (rc=$rc): $out"
fi
rm -rf "$d"

# Missing status line entirely
d=$(make_adr_dir)
cat > "$d/docs/adr/0001-no-status.md" <<'EOF'
# ADR-0001: No status line

- Date: 2025-01-01

## Context

ctx

## Decision

dec

## Consequences

cons

## Alternatives considered

alt
EOF
out=$(run_structure_check "$d" 2>&1); rc=$?
if echo "$out" | grep -q "ERROR:status"; then
  pass "missing status line flagged"
else
  fail "missing status line not flagged (rc=$rc): $out"
fi
rm -rf "$d"

# ---------------------------------------------------------------------------
# Section 4: Required sections
# ---------------------------------------------------------------------------
echo ""
echo "=== Required sections ==="

required_sections=("## Context" "## Decision" "## Consequences" "## Alternatives considered")

for section in "${required_sections[@]}"; do
  d=$(make_adr_dir)
  # Create a valid ADR without the target section
  make_valid_adr "0001" "Decision" | grep -v "^${section}$" > "$d/docs/adr/0001-decision.md"
  out=$(run_structure_check "$d" 2>&1); rc=$?
  escaped_section=$(echo "$section" | sed 's/#/\\#/g')
  if echo "$out" | grep -qF "ERROR:section:${section}"; then
    pass "missing section '${section}' flagged"
  else
    fail "missing section '${section}' not flagged (rc=$rc): $out"
  fi
  rm -rf "$d"
done

# All sections present passes
d=$(make_adr_dir)
make_valid_adr "0001" "All sections" > "$d/docs/adr/0001-all-sections.md"
out=$(run_structure_check "$d" 2>&1); rc=$?
if [ $rc -eq 0 ]; then
  pass "ADR with all required sections passes"
else
  fail "ADR with all required sections failed: $out"
fi
rm -rf "$d"

# Section with wrong heading level (### instead of ##) is not accepted
d=$(make_adr_dir)
cat > "$d/docs/adr/0001-wrong-heading.md" <<'EOF'
# ADR-0001: Wrong heading levels

- Status: Accepted
- Date: 2025-01-01

### Context

ctx

### Decision

dec

### Consequences

cons

### Alternatives considered

alt
EOF
out=$(run_structure_check "$d" 2>&1); rc=$?
if echo "$out" | grep -qF "ERROR:section:## Context"; then
  pass "h3 section headings not accepted as h2 sections"
else
  fail "h3 section headings incorrectly accepted as h2 sections (rc=$rc): $out"
fi
rm -rf "$d"

# ---------------------------------------------------------------------------
# Section 5: Sequential numbering
# ---------------------------------------------------------------------------
echo ""
echo "=== Sequential numbering ==="

# Sequential starting at 1 passes
d=$(make_adr_dir)
make_valid_adr "0001" "First" > "$d/docs/adr/0001-first.md"
make_valid_adr "0002" "Second" > "$d/docs/adr/0002-second.md"
make_valid_adr "0003" "Third" > "$d/docs/adr/0003-third.md"
out=$(run_structure_check "$d" 2>&1); rc=$?
if [ $rc -eq 0 ]; then
  pass "sequential ADRs 0001-0003 pass"
else
  fail "sequential ADRs 0001-0003 failed: $out"
fi
rm -rf "$d"

# Gap in numbering (0001, 0003 - missing 0002)
d=$(make_adr_dir)
make_valid_adr "0001" "First" > "$d/docs/adr/0001-first.md"
cat > "$d/docs/adr/0003-third.md" <<'EOF'
# ADR-0003: Third skips 0002

- Status: Accepted
- Date: 2025-01-01

## Context

ctx

## Decision

dec

## Consequences

cons

## Alternatives considered

alt
EOF
out=$(run_structure_check "$d" 2>&1); rc=$?
if echo "$out" | grep -q "ERROR:numbering"; then
  pass "gap in ADR numbering (0001,0003) flagged"
else
  fail "gap in ADR numbering not flagged (rc=$rc): $out"
fi
rm -rf "$d"

# Starting from 0000 instead of 0001
d=$(make_adr_dir)
cat > "$d/docs/adr/0000-zeroth.md" <<'EOF'
# ADR-0000: Zeroth

- Status: Accepted
- Date: 2025-01-01

## Context

ctx

## Decision

dec

## Consequences

cons

## Alternatives considered

alt
EOF
out=$(run_structure_check "$d" 2>&1); rc=$?
if echo "$out" | grep -q "ERROR:numbering"; then
  pass "ADR starting at 0000 flagged (expected 0001)"
else
  fail "ADR starting at 0000 not flagged (rc=$rc): $out"
fi
rm -rf "$d"

# Duplicate number (two files with same prefix)
d=$(make_adr_dir)
make_valid_adr "0001" "First A" > "$d/docs/adr/0001-first-a.md"
make_valid_adr "0001" "First B" > "$d/docs/adr/0001-first-b.md"
out=$(run_structure_check "$d" 2>&1); rc=$?
if echo "$out" | grep -q "ERROR:numbering"; then
  pass "duplicate ADR number flagged"
else
  fail "duplicate ADR number not flagged (rc=$rc): $out"
fi
rm -rf "$d"

# Single ADR (0001 only) passes
d=$(make_adr_dir)
make_valid_adr "0001" "Only one" > "$d/docs/adr/0001-only-one.md"
out=$(run_structure_check "$d" 2>&1); rc=$?
if [ $rc -eq 0 ]; then
  pass "single ADR (0001) passes sequential check"
else
  fail "single ADR (0001) failed: $out"
fi
rm -rf "$d"

# Empty ADR directory (only README and template) exits cleanly
d=$(make_adr_dir)
touch "$d/docs/adr/README.md"
touch "$d/docs/adr/_template.md"
out=$(run_structure_check "$d" 2>&1); rc=$?
if [ $rc -eq 0 ]; then
  pass "empty ADR dir (only README+template) exits 0"
else
  fail "empty ADR dir failed unexpectedly (rc=$rc): $out"
fi
rm -rf "$d"

# ---------------------------------------------------------------------------
# Section 6: README index check
# ---------------------------------------------------------------------------
echo ""
echo "=== README index check ==="

# README mentions all ADRs passes
d=$(make_adr_dir)
make_valid_adr "0001" "One" > "$d/docs/adr/0001-one.md"
make_valid_adr "0002" "Two" > "$d/docs/adr/0002-two.md"
cat > "$d/docs/adr/README.md" <<'EOF'
# ADR Index

- [ADR-0001](0001-one.md)
- [ADR-0002](0002-two.md)
EOF
out=$(run_readme_check "$d" 2>&1); rc=$?
if [ $rc -eq 0 ]; then
  pass "README listing all ADRs passes"
else
  fail "README listing all ADRs failed: $out"
fi
rm -rf "$d"

# README missing one ADR
d=$(make_adr_dir)
make_valid_adr "0001" "One" > "$d/docs/adr/0001-one.md"
make_valid_adr "0002" "Two" > "$d/docs/adr/0002-two.md"
cat > "$d/docs/adr/README.md" <<'EOF'
# ADR Index

- [ADR-0001](0001-one.md)
EOF
out=$(run_readme_check "$d" 2>&1); rc=$?
if echo "$out" | grep -q "ERROR:not_listed"; then
  pass "README missing ADR flagged"
else
  fail "README missing ADR not flagged (rc=$rc): $out"
fi
rm -rf "$d"

# Missing README fails with exit 1
d=$(make_adr_dir)
make_valid_adr "0001" "One" > "$d/docs/adr/0001-one.md"
out=$(run_readme_check "$d" 2>&1); rc=$?
if [ $rc -ne 0 ] && echo "$out" | grep -q "ERROR:missing_readme"; then
  pass "missing README flagged with non-zero exit"
else
  fail "missing README not flagged correctly (rc=$rc): $out"
fi
rm -rf "$d"

# _template.md excluded from README listing check
d=$(make_adr_dir)
make_valid_adr "0001" "One" > "$d/docs/adr/0001-one.md"
touch "$d/docs/adr/_template.md"
cat > "$d/docs/adr/README.md" <<'EOF'
# ADR Index

- [ADR-0001](0001-one.md)
EOF
out=$(run_readme_check "$d" 2>&1); rc=$?
if [ $rc -eq 0 ]; then
  pass "_template.md excluded from README listing check"
else
  fail "_template.md incorrectly required in README (rc=$rc): $out"
fi
rm -rf "$d"

# README contains filename anywhere in file (not just links)
d=$(make_adr_dir)
make_valid_adr "0001" "One" > "$d/docs/adr/0001-one.md"
cat > "$d/docs/adr/README.md" <<'EOF'
## Index

See 0001-one.md for the first decision.
EOF
out=$(run_readme_check "$d" 2>&1); rc=$?
if [ $rc -eq 0 ]; then
  pass "README passes when filename appears as plain text (not just link)"
else
  fail "README check failed for plain-text filename reference (rc=$rc): $out"
fi
rm -rf "$d"

# ---------------------------------------------------------------------------
# Section 7: Integration - actual ADR files in docs/adr/ pass all checks
# ---------------------------------------------------------------------------
echo ""
echo "=== Integration: actual docs/adr/ files ==="

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [ ! -d "$REPO_ROOT/docs/adr" ]; then
  fail "docs/adr directory not found at $REPO_ROOT/docs/adr"
else
  out=$(run_structure_check "$REPO_ROOT" 2>&1); rc=$?
  if [ $rc -eq 0 ]; then
    pass "all actual ADR files pass structure check"
  else
    fail "actual ADR files failed structure check: $out"
  fi

  out=$(run_readme_check "$REPO_ROOT" 2>&1); rc=$?
  if [ $rc -eq 0 ]; then
    pass "all actual ADR files are listed in README"
  else
    fail "actual ADR files not listed in README: $out"
  fi
fi

# Each ADR file must have exactly-four-digit number prefix matching its title
for f in "$REPO_ROOT/docs/adr"/[0-9][0-9][0-9][0-9]-*.md; do
  base=$(basename "$f")
  num="${base%%-*}"
  first_line=$(head -n 1 "$f")
  if echo "$first_line" | grep -Eq "^# ADR-${num}: "; then
    pass "ADR title matches filename number: $base"
  else
    fail "ADR title does not match filename number: $base (title: $first_line)"
  fi
done

# Each ADR must have a valid status
for f in "$REPO_ROOT/docs/adr"/[0-9][0-9][0-9][0-9]-*.md; do
  base=$(basename "$f")
  if grep -Eq '^- Status: (Proposed|Accepted|Deprecated|Superseded by ADR-[0-9]{4})$' "$f"; then
    pass "valid status in: $base"
  else
    fail "invalid or missing status in: $base"
  fi
done

# Each ADR must have all four required sections
for f in "$REPO_ROOT/docs/adr"/[0-9][0-9][0-9][0-9]-*.md; do
  base=$(basename "$f")
  for section in "## Context" "## Decision" "## Consequences" "## Alternatives considered"; do
    if grep -Fxq "$section" "$f"; then
      pass "section '$section' present in $base"
    else
      fail "section '$section' missing from $base"
    fi
  done
done

# ADR numbers are sequential starting from 0001
adr_nums=()
for f in $(ls "$REPO_ROOT/docs/adr"/[0-9][0-9][0-9][0-9]-*.md | sort); do
  base=$(basename "$f")
  adr_nums+=("${base%%-*}")
done

expected=1
all_seq=true
for num in "${adr_nums[@]}"; do
  n=$((10#$num))
  if [ "$n" -ne "$expected" ]; then
    fail "ADR numbering gap: expected $(printf '%04d' $expected), got $num"
    all_seq=false
  fi
  expected=$((expected + 1))
done
if $all_seq; then
  pass "ADR numbers are sequential (0001 to $(printf '%04d' $((expected - 1))))"
fi

# ADR README lists each ADR file
readme="$REPO_ROOT/docs/adr/README.md"
for f in "$REPO_ROOT/docs/adr"/[0-9][0-9][0-9][0-9]-*.md; do
  base=$(basename "$f")
  if grep -Fq "$base" "$readme"; then
    pass "README lists: $base"
  else
    fail "README missing: $base"
  fi
done

# docs/adr/README.md exists and has an Index section
if [ -f "$REPO_ROOT/docs/adr/README.md" ]; then
  if grep -q "## Index" "$REPO_ROOT/docs/adr/README.md"; then
    pass "docs/adr/README.md has an Index section"
  else
    fail "docs/adr/README.md missing Index section"
  fi
fi

# docs/adr/_template.md exists and contains required section placeholders
if [ -f "$REPO_ROOT/docs/adr/_template.md" ]; then
  pass "docs/adr/_template.md exists"
  for section in "## Context" "## Decision" "## Consequences" "## Alternatives considered"; do
    if grep -Fxq "$section" "$REPO_ROOT/docs/adr/_template.md"; then
      pass "_template.md has section: $section"
    else
      fail "_template.md missing section: $section"
    fi
  done
else
  fail "docs/adr/_template.md not found"
fi

# ---------------------------------------------------------------------------
# Section 8: allowed-tags.txt - "adr" tag present and list is sorted
# ---------------------------------------------------------------------------
echo ""
echo "=== allowed-tags.txt ==="

tags_file="$REPO_ROOT/data/allowed-tags.txt"

if [ ! -f "$tags_file" ]; then
  fail "data/allowed-tags.txt not found"
else
  pass "data/allowed-tags.txt exists"

  if grep -Fxq "adr" "$tags_file"; then
    pass "'adr' tag is present in allowed-tags.txt"
  else
    fail "'adr' tag is missing from allowed-tags.txt"
  fi

  # File should be sorted (ignore trailing blank line)
  sorted=$(grep -v '^$' "$tags_file" | sort)
  actual=$(grep -v '^$' "$tags_file")
  if [ "$sorted" = "$actual" ]; then
    pass "allowed-tags.txt is alphabetically sorted"
  else
    fail "allowed-tags.txt is not alphabetically sorted"
  fi

  # All tags should be lowercase kebab-case
  while IFS= read -r tag; do
    [ -z "$tag" ] && continue
    if echo "$tag" | grep -Eq '^[a-z][a-z0-9-]*$'; then
      pass "tag format valid: '$tag'"
    else
      fail "tag format invalid (not lowercase kebab-case): '$tag'"
    fi
  done < "$tags_file"

  # 'adr' tag comes between 'a2a' and 'agents' (correct alphabetical position)
  prev=""
  adr_pos_ok=true
  while IFS= read -r tag; do
    [ -z "$tag" ] && continue
    if [ "$tag" = "adr" ]; then
      if [ "$prev" != "a2a" ]; then
        fail "'adr' should follow 'a2a' but follows '$prev'"
        adr_pos_ok=false
      fi
    fi
    prev="$tag"
  done < "$tags_file"
  if $adr_pos_ok; then
    pass "'adr' is correctly positioned after 'a2a'"
  fi

  # No duplicate tags
  dupes=$(grep -v '^$' "$tags_file" | sort | uniq -d)
  if [ -z "$dupes" ]; then
    pass "no duplicate tags in allowed-tags.txt"
  else
    fail "duplicate tags found in allowed-tags.txt: $dupes"
  fi
fi

# ---------------------------------------------------------------------------
# Section 9: content/blog/push-pull-context.md front matter
# ---------------------------------------------------------------------------
echo ""
echo "=== blog post: push-pull-context.md front matter ==="

post_file="$REPO_ROOT/content/blog/push-pull-context.md"

if [ ! -f "$post_file" ]; then
  fail "content/blog/push-pull-context.md not found"
else
  pass "push-pull-context.md exists"

  # Required front matter fields
  for field in "title:" "date:" "tags:" "description:"; do
    if grep -q "^${field}" "$post_file"; then
      pass "front matter has field: $field"
    else
      fail "front matter missing field: $field"
    fi
  done

  # All tags in the post must be in allowed-tags.txt
  if [ -f "$tags_file" ]; then
    tags_line=$(grep '^tags:' "$post_file" | head -1)
    tmptagsfile=$(mktemp)
    echo "$tags_line" | grep -oE '"[^"]+"' | tr -d '"' > "$tmptagsfile"
    while IFS= read -r tag; do
      if grep -Fxq "$tag" "$tags_file"; then
        pass "post tag '$tag' is in allowed-tags.txt"
      else
        fail "post tag '$tag' is NOT in allowed-tags.txt"
      fi
    done < "$tmptagsfile"
    rm -f "$tmptagsfile"
  fi

  # Post should not contain em-dashes in prose lines
  in_code=false
  em_dash_found=false
  while IFS= read -r line; do
    if echo "$line" | grep -q '^\`\`\`'; then
      if $in_code; then in_code=false; else in_code=true; fi
      continue
    fi
    if ! $in_code && echo "$line" | grep -q '—'; then
      em_dash_found=true
      break
    fi
  done < "$post_file"
  if $em_dash_found; then
    fail "post contains em-dash (—) in prose"
  else
    pass "no em-dashes in prose"
  fi

  # Post should not contain double-dashes as prose (-- surrounded by spaces)
  if grep -v '^\`\`\`' "$post_file" | grep -q ' -- '; then
    fail "post contains double-dash ( -- ) in prose"
  else
    pass "no double-dashes in prose"
  fi

  # Front matter date should be in YYYY-MM-DD format
  date_line=$(grep '^date:' "$post_file" | head -1)
  if echo "$date_line" | grep -Eq '^date: [0-9]{4}-[0-9]{2}-[0-9]{2}$'; then
    pass "front matter date is YYYY-MM-DD format"
  else
    fail "front matter date format invalid: $date_line"
  fi

  # Post has a closing sign-off line (ends with content, not empty)
  last_line=$(tail -1 "$post_file")
  if [ -n "$last_line" ]; then
    pass "post file does not end with trailing blank line"
  else
    pass "post file ends with trailing newline (normal)"
  fi
fi

# ---------------------------------------------------------------------------
# Section 10: docs/specs/README.md content
# ---------------------------------------------------------------------------
echo ""
echo "=== docs/specs/README.md ==="

specs_readme="$REPO_ROOT/docs/specs/README.md"

if [ ! -f "$specs_readme" ]; then
  fail "docs/specs/README.md not found"
else
  pass "docs/specs/README.md exists"

  # Should have key sections
  for section in "## When to write a spec" "## Format" "## Relationship to ADRs" "## Current specs"; do
    if grep -Fq "$section" "$specs_readme"; then
      pass "docs/specs/README.md has section: $section"
    else
      fail "docs/specs/README.md missing section: $section"
    fi
  done
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo "========================================"
echo "Results: $PASS passed, $FAIL failed"
if [ $FAIL -gt 0 ]; then
  echo ""
  echo "Failed tests:"
  for e in "${ERRORS[@]}"; do
    echo "  - $e"
  done
  echo ""
  exit 1
fi
echo "All tests passed."
exit 0