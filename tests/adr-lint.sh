#!/usr/bin/env bash
# Tests for the ADR lint validation logic from .github/workflows/adr-lint.yml
#
# Usage:
#   bash tests/adr-lint.sh
#
# Exit code: 0 if all tests pass, non-zero otherwise.

set -uo pipefail

# ---------------------------------------------------------------------------
# Test harness
# ---------------------------------------------------------------------------

PASS=0
FAIL=0
TEST_NAME=""

pass() { echo "  PASS: ${TEST_NAME}"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL: ${TEST_NAME} — $*"; FAIL=$((FAIL + 1)); }

assert_exit_zero() {
  if "$@" >/dev/null 2>&1; then
    pass
  else
    fail "expected exit 0, got non-zero"
  fi
}

assert_exit_nonzero() {
  if "$@" >/dev/null 2>&1; then
    fail "expected non-zero exit, got 0"
  else
    pass
  fi
}

# ---------------------------------------------------------------------------
# Script generators – write to temp file and exec, avoiding heredoc + process
# substitution incompatibility.
# ---------------------------------------------------------------------------

SCRIPT_TMPDIR="$(mktemp -d)"
trap 'rm -rf "$SCRIPT_TMPDIR" "$TMPDIR_ROOT"' EXIT

# Write the 'Validate ADR files' logic (extracted verbatim from adr-lint.yml,
# with process substitution replaced by a temp-file redirect so the script
# works on systems where /dev/fd is unavailable, e.g. restricted containers).
VALIDATE_ADRS_SCRIPT="${SCRIPT_TMPDIR}/validate_adrs.sh"
cat >"$VALIDATE_ADRS_SCRIPT" <<'SCRIPT'
#!/usr/bin/env bash
set -euo pipefail
ADR_DIR="$1"
status=0

# Collect ADR files into a temp file to avoid process-substitution dependency.
_list_tmp=$(mktemp)
trap 'rm -f "$_list_tmp"' EXIT
for f in "${ADR_DIR}"/*.md; do
  [ -e "$f" ] || continue
  base=$(basename "$f")
  [ "$base" = "README.md" ] && continue
  [ "$base" = "_template.md" ] && continue
  echo "$f"
done | sort >"$_list_tmp"

mapfile -t adrs <"$_list_tmp"

if [ "${#adrs[@]}" -eq 0 ]; then
  echo "No ADR files found under ${ADR_DIR}/. Nothing to validate."
  exit 0
fi

required_sections=(
  "## Context"
  "## Decision"
  "## Consequences"
  "## Alternatives considered"
)

valid_status_regex='^- Status: (Proposed|Accepted|Deprecated|Superseded by ADR-[0-9]{4})$'

declare -a numbers
for f in "${adrs[@]}"; do
  base=$(basename "$f")

  if ! echo "$base" | grep -Eq '^[0-9]{4}-[a-z0-9]+(-[a-z0-9]+)*\.md$'; then
    echo "::error file=${f}::Filename does not match NNNN-kebab-case.md"
    status=1
    continue
  fi

  num=${base%%-*}
  numbers+=("$num")

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

  superseded=$(grep -E '^- Status: Superseded by ADR-[0-9]{4}$' "$f" || true)
  if [ -n "$superseded" ]; then
    target=$(echo "$superseded" | grep -oE 'ADR-[0-9]{4}' | sed 's/ADR-//')
    if ! ls "${ADR_DIR}/${target}-"*.md >/dev/null 2>&1; then
      echo "::error file=${f}::Superseded target ADR-${target} does not exist"
      status=1
    fi
  fi
done

expected=1
for num in "${numbers[@]}"; do
  n=$((10#$num))
  if [ "$n" -ne "$expected" ]; then
    echo "::error::ADR numbering gap. Expected $(printf '%04d' $expected), got ${num}"
    status=1
  fi
  expected=$((expected + 1))
done

exit $status
SCRIPT
chmod +x "$VALIDATE_ADRS_SCRIPT"

# Write the 'Validate README index' logic to a temp script.
VALIDATE_README_SCRIPT="${SCRIPT_TMPDIR}/validate_readme.sh"
cat >"$VALIDATE_README_SCRIPT" <<'SCRIPT'
#!/usr/bin/env bash
set -euo pipefail
ADR_DIR="$1"
status=0

readme="${ADR_DIR}/README.md"
if [ ! -f "$readme" ]; then
  echo "::error::${ADR_DIR}/README.md is missing"
  exit 1
fi

for f in "${ADR_DIR}"/*.md; do
  [ -e "$f" ] || continue
  base=$(basename "$f")
  [ "$base" = "README.md" ] && continue
  [ "$base" = "_template.md" ] && continue
  if ! grep -Fq "$base" "$readme"; then
    echo "::error file=${f}::ADR is not linked from README.md"
    status=1
  fi
done

exit $status
SCRIPT
chmod +x "$VALIDATE_README_SCRIPT"

run_validate_adrs()  { bash "$VALIDATE_ADRS_SCRIPT"  "$1"; }
run_validate_readme() { bash "$VALIDATE_README_SCRIPT" "$1"; }

# ---------------------------------------------------------------------------
# Fixture helpers
# ---------------------------------------------------------------------------

TMPDIR_ROOT="$(mktemp -d)"

new_adr_dir() {
  local d
  d="$(mktemp -d "${TMPDIR_ROOT}/adr-XXXXXX")"
  echo "$d"
}

# Write a minimal valid ADR file and echo the path.
# Usage: write_valid_adr <dir> <number_str e.g. 0001> <slug e.g. some-title>
write_valid_adr() {
  local dir="$1" num="$2" slug="$3"
  local file="${dir}/${num}-${slug}.md"
  cat >"$file" <<CONTENT
# ADR-${num}: Some title here

- Status: Accepted
- Date: 2025-01-01

## Context

Some context paragraph.

## Decision

The decision text.

## Consequences

The consequences text.

## Alternatives considered

### Alternative A: Option one

Why it was rejected.
CONTENT
  echo "$file"
}

# ---------------------------------------------------------------------------
# ── Tests: filename validation ────────────────────────────────────────────
# ---------------------------------------------------------------------------

echo ""
echo "=== Filename validation ==="

TEST_NAME="Valid filename NNNN-kebab-case.md passes"
d=$(new_adr_dir)
write_valid_adr "$d" "0001" "some-adr-title" >/dev/null
assert_exit_zero run_validate_adrs "$d"

TEST_NAME="Filename without four-digit prefix fails"
d=$(new_adr_dir)
# Create a file with only 3-digit prefix (invalid)
f="${d}/001-bad-name.md"
cat >"$f" <<CONTENT
# ADR-001: Something

- Status: Accepted

## Context
text

## Decision
text

## Consequences
text

## Alternatives considered
text
CONTENT
assert_exit_nonzero run_validate_adrs "$d"

TEST_NAME="Filename with uppercase letters fails"
d=$(new_adr_dir)
f="${d}/0001-Bad-Name.md"
cat >"$f" <<CONTENT
# ADR-0001: Something

- Status: Accepted

## Context
text

## Decision
text

## Consequences
text

## Alternatives considered
text
CONTENT
assert_exit_nonzero run_validate_adrs "$d"

TEST_NAME="Filename with underscores fails"
d=$(new_adr_dir)
f="${d}/0001_bad_name.md"
# Even empty file triggers the filename check
printf '' >"$f"
assert_exit_nonzero run_validate_adrs "$d"

TEST_NAME="Filename with trailing dash before extension fails"
d=$(new_adr_dir)
# e.g. 0001-kebab-.md — trailing empty segment
f="${d}/0001-kebab-.md"
cat >"$f" <<CONTENT
# ADR-0001: Something

- Status: Accepted

## Context
c

## Decision
d

## Consequences
c

## Alternatives considered
a
CONTENT
assert_exit_nonzero run_validate_adrs "$d"

TEST_NAME="Filename with no slug (only number) fails"
d=$(new_adr_dir)
f="${d}/0001.md"
cat >"$f" <<CONTENT
# ADR-0001: Something

- Status: Accepted

## Context
c

## Decision
d

## Consequences
c

## Alternatives considered
a
CONTENT
assert_exit_nonzero run_validate_adrs "$d"

# ---------------------------------------------------------------------------
# ── Tests: first-line title format ────────────────────────────────────────
# ---------------------------------------------------------------------------

echo ""
echo "=== Title line validation ==="

TEST_NAME="Correct title line passes"
d=$(new_adr_dir)
write_valid_adr "$d" "0001" "my-decision" >/dev/null
assert_exit_zero run_validate_adrs "$d"

TEST_NAME="Missing colon after number in title fails"
d=$(new_adr_dir)
f="${d}/0001-my-decision.md"
cat >"$f" <<CONTENT
# ADR-0001 Missing colon after number

- Status: Accepted

## Context
text

## Decision
text

## Consequences
text

## Alternatives considered
text
CONTENT
assert_exit_nonzero run_validate_adrs "$d"

TEST_NAME="Wrong ADR number in title fails"
d=$(new_adr_dir)
f="${d}/0001-my-decision.md"
cat >"$f" <<CONTENT
# ADR-0002: Wrong number in title

- Status: Accepted

## Context
text

## Decision
text

## Consequences
text

## Alternatives considered
text
CONTENT
assert_exit_nonzero run_validate_adrs "$d"

TEST_NAME="Lowercase adr- prefix in title fails"
d=$(new_adr_dir)
f="${d}/0001-my-decision.md"
cat >"$f" <<CONTENT
# adr-0001: lowercase prefix

- Status: Accepted

## Context
text

## Decision
text

## Consequences
text

## Alternatives considered
text
CONTENT
assert_exit_nonzero run_validate_adrs "$d"

TEST_NAME="Title line that is entirely missing fails"
d=$(new_adr_dir)
f="${d}/0001-my-decision.md"
cat >"$f" <<CONTENT

- Status: Accepted

## Context
text

## Decision
text

## Consequences
text

## Alternatives considered
text
CONTENT
assert_exit_nonzero run_validate_adrs "$d"

# ---------------------------------------------------------------------------
# ── Tests: status line validation ─────────────────────────────────────────
# ---------------------------------------------------------------------------

echo ""
echo "=== Status line validation ==="

for status_val in "Proposed" "Accepted" "Deprecated"; do
  TEST_NAME="Status '${status_val}' is valid"
  d=$(new_adr_dir)
  f="${d}/0001-test.md"
  cat >"$f" <<CONTENT
# ADR-0001: Test

- Status: ${status_val}
- Date: 2025-01-01

## Context
c

## Decision
d

## Consequences
c

## Alternatives considered
a
CONTENT
  assert_exit_zero run_validate_adrs "$d"
done

TEST_NAME="Status 'Superseded by ADR-0002' is valid when target exists"
d=$(new_adr_dir)
write_valid_adr "$d" "0001" "old-decision" >/dev/null
write_valid_adr "$d" "0002" "new-decision" >/dev/null
f="${d}/0001-old-decision.md"
cat >"$f" <<CONTENT
# ADR-0001: Old decision

- Status: Superseded by ADR-0002
- Date: 2025-01-01

## Context
c

## Decision
d

## Consequences
c

## Alternatives considered
a
CONTENT
assert_exit_zero run_validate_adrs "$d"

TEST_NAME="Status 'Superseded by ADR-0002' fails when target is missing"
d=$(new_adr_dir)
f="${d}/0001-old-decision.md"
cat >"$f" <<CONTENT
# ADR-0001: Old decision

- Status: Superseded by ADR-0002
- Date: 2025-01-01

## Context
c

## Decision
d

## Consequences
c

## Alternatives considered
a
CONTENT
assert_exit_nonzero run_validate_adrs "$d"

TEST_NAME="Invalid status value 'WIP' fails"
d=$(new_adr_dir)
f="${d}/0001-test.md"
cat >"$f" <<CONTENT
# ADR-0001: Test

- Status: WIP
- Date: 2025-01-01

## Context
c

## Decision
d

## Consequences
c

## Alternatives considered
a
CONTENT
assert_exit_nonzero run_validate_adrs "$d"

TEST_NAME="Missing status line fails"
d=$(new_adr_dir)
f="${d}/0001-test.md"
cat >"$f" <<CONTENT
# ADR-0001: Test

- Date: 2025-01-01

## Context
c

## Decision
d

## Consequences
c

## Alternatives considered
a
CONTENT
assert_exit_nonzero run_validate_adrs "$d"

TEST_NAME="Status with parenthetical annotation fails"
d=$(new_adr_dir)
f="${d}/0001-test.md"
cat >"$f" <<CONTENT
# ADR-0001: Test

- Status: Accepted (with notes)
- Date: 2025-01-01

## Context
c

## Decision
d

## Consequences
c

## Alternatives considered
a
CONTENT
assert_exit_nonzero run_validate_adrs "$d"

TEST_NAME="Status 'accepted' (lowercase) fails"
d=$(new_adr_dir)
f="${d}/0001-test.md"
cat >"$f" <<CONTENT
# ADR-0001: Test

- Status: accepted
- Date: 2025-01-01

## Context
c

## Decision
d

## Consequences
c

## Alternatives considered
a
CONTENT
assert_exit_nonzero run_validate_adrs "$d"

TEST_NAME="Status line indented with leading space fails"
d=$(new_adr_dir)
f="${d}/0001-test.md"
cat >"$f" <<CONTENT
# ADR-0001: Test

  - Status: Accepted
- Date: 2025-01-01

## Context
c

## Decision
d

## Consequences
c

## Alternatives considered
a
CONTENT
assert_exit_nonzero run_validate_adrs "$d"

# ---------------------------------------------------------------------------
# ── Tests: required sections ──────────────────────────────────────────────
# ---------------------------------------------------------------------------

echo ""
echo "=== Required sections ==="

for section in "## Context" "## Decision" "## Consequences" "## Alternatives considered"; do
  TEST_NAME="Missing section '${section}' fails"
  d=$(new_adr_dir)
  f="${d}/0001-test.md"
  # Write full valid content then remove the specific section heading
  cat >"$f" <<CONTENT
# ADR-0001: Test

- Status: Accepted
- Date: 2025-01-01

## Context
text

## Decision
text

## Consequences
text

## Alternatives considered
text
CONTENT
  # Remove the target section line using a temp file
  grep -v "^${section}$" "$f" >"${f}.tmp" && mv "${f}.tmp" "$f"
  assert_exit_nonzero run_validate_adrs "$d"
done

TEST_NAME="Section at wrong heading level ### not counted as required section"
d=$(new_adr_dir)
f="${d}/0001-test.md"
cat >"$f" <<CONTENT
# ADR-0001: Test

- Status: Accepted

### Context
text

## Decision
text

## Consequences
text

## Alternatives considered
text
CONTENT
assert_exit_nonzero run_validate_adrs "$d"

TEST_NAME="All four sections present passes"
d=$(new_adr_dir)
write_valid_adr "$d" "0001" "complete-adr" >/dev/null
assert_exit_zero run_validate_adrs "$d"

# ---------------------------------------------------------------------------
# ── Tests: sequential numbering ───────────────────────────────────────────
# ---------------------------------------------------------------------------

echo ""
echo "=== Sequential numbering ==="

TEST_NAME="Sequential ADRs 0001 through 0003 pass"
d=$(new_adr_dir)
write_valid_adr "$d" "0001" "first" >/dev/null
write_valid_adr "$d" "0002" "second" >/dev/null
write_valid_adr "$d" "0003" "third" >/dev/null
assert_exit_zero run_validate_adrs "$d"

TEST_NAME="Gap in numbering 0001, 0003 (missing 0002) fails"
d=$(new_adr_dir)
write_valid_adr "$d" "0001" "first" >/dev/null
write_valid_adr "$d" "0003" "third" >/dev/null
assert_exit_nonzero run_validate_adrs "$d"

TEST_NAME="Starting at 0002 instead of 0001 fails"
d=$(new_adr_dir)
write_valid_adr "$d" "0002" "should-start-at-one" >/dev/null
assert_exit_nonzero run_validate_adrs "$d"

TEST_NAME="Single ADR numbered 0001 passes"
d=$(new_adr_dir)
write_valid_adr "$d" "0001" "only-one" >/dev/null
assert_exit_zero run_validate_adrs "$d"

TEST_NAME="Large sequential set 0001 through 0006 passes"
d=$(new_adr_dir)
write_valid_adr "$d" "0001" "first" >/dev/null
write_valid_adr "$d" "0002" "second" >/dev/null
write_valid_adr "$d" "0003" "third" >/dev/null
write_valid_adr "$d" "0004" "fourth" >/dev/null
write_valid_adr "$d" "0005" "fifth" >/dev/null
write_valid_adr "$d" "0006" "sixth" >/dev/null
assert_exit_zero run_validate_adrs "$d"

TEST_NAME="Duplicate number 0001 (two files) fails"
d=$(new_adr_dir)
write_valid_adr "$d" "0001" "first" >/dev/null
write_valid_adr "$d" "0001" "duplicate" >/dev/null
assert_exit_nonzero run_validate_adrs "$d"

# ---------------------------------------------------------------------------
# ── Tests: special files excluded ─────────────────────────────────────────
# ---------------------------------------------------------------------------

echo ""
echo "=== Special file exclusions ==="

TEST_NAME="_template.md is excluded from ADR validation"
d=$(new_adr_dir)
write_valid_adr "$d" "0001" "real-adr" >/dev/null
cat >"${d}/_template.md" <<CONTENT
# ADR-NNNN: Short title

- Status: Proposed
- Date: YYYY-MM-DD

## Context
placeholder

## Decision
placeholder

## Consequences
placeholder

## Alternatives considered
placeholder
CONTENT
assert_exit_zero run_validate_adrs "$d"

TEST_NAME="README.md is excluded from ADR validation"
d=$(new_adr_dir)
write_valid_adr "$d" "0001" "real-adr" >/dev/null
cat >"${d}/README.md" <<CONTENT
# Index

- [ADR-0001](0001-real-adr.md)
CONTENT
assert_exit_zero run_validate_adrs "$d"

TEST_NAME="Empty ADR directory exits 0 with informational message"
d=$(new_adr_dir)
assert_exit_zero run_validate_adrs "$d"

TEST_NAME="Only _template.md and README.md present exits 0"
d=$(new_adr_dir)
printf '# template\n' >"${d}/_template.md"
printf '# Index\n'    >"${d}/README.md"
assert_exit_zero run_validate_adrs "$d"

# ---------------------------------------------------------------------------
# ── Tests: README index validation ────────────────────────────────────────
# ---------------------------------------------------------------------------

echo ""
echo "=== README index validation ==="

TEST_NAME="All ADRs listed in README passes"
d=$(new_adr_dir)
write_valid_adr "$d" "0001" "first-adr" >/dev/null
write_valid_adr "$d" "0002" "second-adr" >/dev/null
cat >"${d}/README.md" <<CONTENT
# ADR Index

- [ADR-0001](0001-first-adr.md)
- [ADR-0002](0002-second-adr.md)
CONTENT
assert_exit_zero run_validate_readme "$d"

TEST_NAME="ADR missing from README fails"
d=$(new_adr_dir)
write_valid_adr "$d" "0001" "first-adr" >/dev/null
write_valid_adr "$d" "0002" "second-adr" >/dev/null
cat >"${d}/README.md" <<CONTENT
# ADR Index

- [ADR-0001](0001-first-adr.md)
CONTENT
assert_exit_nonzero run_validate_readme "$d"

TEST_NAME="Missing README.md fails"
d=$(new_adr_dir)
write_valid_adr "$d" "0001" "first-adr" >/dev/null
assert_exit_nonzero run_validate_readme "$d"

TEST_NAME="_template.md not required in README index"
d=$(new_adr_dir)
write_valid_adr "$d" "0001" "first-adr" >/dev/null
printf '# template\n' >"${d}/_template.md"
cat >"${d}/README.md" <<CONTENT
# ADR Index

- [ADR-0001](0001-first-adr.md)
CONTENT
assert_exit_zero run_validate_readme "$d"

TEST_NAME="README with filename in markdown link passes"
d=$(new_adr_dir)
write_valid_adr "$d" "0001" "first" >/dev/null
cat >"${d}/README.md" <<CONTENT
# Index
[ADR-0001: First](0001-first.md)
CONTENT
assert_exit_zero run_validate_readme "$d"

TEST_NAME="Empty README fails when ADRs exist"
d=$(new_adr_dir)
write_valid_adr "$d" "0001" "first-adr" >/dev/null
printf '' >"${d}/README.md"
assert_exit_nonzero run_validate_readme "$d"

# ---------------------------------------------------------------------------
# ── Tests: real repo ADR files pass validation ────────────────────────────
# ---------------------------------------------------------------------------

echo ""
echo "=== Real repo ADR files ==="

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ADR_DIR="${REPO_ROOT}/docs/adr"

if [ -d "$ADR_DIR" ]; then
  TEST_NAME="Real docs/adr/ files pass structure validation"
  assert_exit_zero run_validate_adrs "$ADR_DIR"

  TEST_NAME="Real docs/adr/README.md lists all ADRs"
  assert_exit_zero run_validate_readme "$ADR_DIR"
else
  echo "  SKIP: docs/adr/ not found at ${ADR_DIR}"
fi

# ---------------------------------------------------------------------------
# ── Tests: allowed-tags.txt content ───────────────────────────────────────
# ---------------------------------------------------------------------------

echo ""
echo "=== allowed-tags.txt content ==="

TAGS_FILE="${REPO_ROOT}/data/allowed-tags.txt"

TEST_NAME="allowed-tags.txt exists"
if [ -f "$TAGS_FILE" ]; then pass; else fail "file not found: $TAGS_FILE"; fi

TEST_NAME="allowed-tags.txt contains 'adr' tag (added in this PR)"
if grep -Fxq "adr" "$TAGS_FILE" 2>/dev/null; then pass; else fail "tag 'adr' missing"; fi

TEST_NAME="allowed-tags.txt is sorted alphabetically"
prev=""
sorted=true
while IFS= read -r line; do
  if [ -n "$prev" ] && [[ "$line" < "$prev" ]]; then
    sorted=false
    break
  fi
  prev="$line"
done < "$TAGS_FILE"
if $sorted; then pass; else fail "file is not sorted alphabetically"; fi

TEST_NAME="allowed-tags.txt has no blank lines"
if grep -q '^$' "$TAGS_FILE" 2>/dev/null; then
  fail "file contains blank lines"
else
  pass
fi

TEST_NAME="allowed-tags.txt has no uppercase characters"
if grep -q '[A-Z]' "$TAGS_FILE" 2>/dev/null; then
  fail "file contains uppercase characters"
else
  pass
fi

TEST_NAME="allowed-tags.txt has no duplicate entries"
total=$(wc -l < "$TAGS_FILE")
unique=$(sort -u "$TAGS_FILE" | wc -l)
if [ "$total" -eq "$unique" ]; then pass; else fail "file has duplicate entries"; fi

TEST_NAME="allowed-tags.txt tags are lowercase kebab-case only"
if grep -vE '^[a-z][a-z0-9-]*$' "$TAGS_FILE" 2>/dev/null | grep -q .; then
  fail "file contains tags that are not lowercase kebab-case"
else
  pass
fi

# ---------------------------------------------------------------------------
# ── Tests: blog post push-pull-context.md ─────────────────────────────────
# ---------------------------------------------------------------------------

echo ""
echo "=== Blog post front matter (push-pull-context.md) ==="

POST_FILE="${REPO_ROOT}/content/blog/push-pull-context.md"

TEST_NAME="push-pull-context.md exists"
if [ -f "$POST_FILE" ]; then pass; else fail "file not found: $POST_FILE"; fi

if [ -f "$POST_FILE" ]; then
  TEST_NAME="Post has 'title' front matter field"
  if grep -q '^title:' "$POST_FILE"; then pass; else fail "missing title"; fi

  TEST_NAME="Post has 'date' front matter field"
  if grep -q '^date:' "$POST_FILE"; then pass; else fail "missing date"; fi

  TEST_NAME="Post has 'tags' front matter field"
  if grep -q '^tags:' "$POST_FILE"; then pass; else fail "missing tags"; fi

  TEST_NAME="Post has 'description' front matter field"
  if grep -q '^description:' "$POST_FILE"; then pass; else fail "missing description"; fi

  TEST_NAME="Post does not contain em-dashes (—)"
  if grep -q '—' "$POST_FILE"; then
    fail "post contains em-dash character"
  else
    pass
  fi

  TEST_NAME="Post does not contain semicolons in prose lines"
  # Only check lines that are not inside fenced code blocks
  in_code=false
  semis_found=false
  while IFS= read -r line; do
    if [[ "$line" =~ ^'```' ]]; then
      $in_code && in_code=false || in_code=true
      continue
    fi
    if ! $in_code && [[ "$line" == *";"* ]]; then
      semis_found=true
      break
    fi
  done < "$POST_FILE"
  if $semis_found; then
    fail "post contains semicolons outside code blocks"
  else
    pass
  fi

  TEST_NAME="Post tags all exist in allowed-tags.txt"
  if [ -f "$TAGS_FILE" ]; then
    tags_line=$(grep '^tags:' "$POST_FILE")
    tag_fail=false
    # Use command substitution (not process substitution) to avoid /dev/fd dependency.
    extracted_tags=$(echo "$tags_line" | grep -oE '"[^"]+"' | tr -d '"')
    while IFS= read -r tag; do
      tag=$(echo "$tag" | tr -d '[]",' | xargs 2>/dev/null || echo "$tag")
      [ -z "$tag" ] && continue
      if ! grep -Fxq "$tag" "$TAGS_FILE"; then
        fail "tag '${tag}' not in allowed-tags.txt"
        tag_fail=true
      fi
    done <<< "$extracted_tags"
    if ! $tag_fail; then pass; fi
  else
    echo "  SKIP: allowed-tags.txt not found"
  fi

  TEST_NAME="Post front matter is delimited by --- markers"
  first_line=$(head -n 1 "$POST_FILE")
  if [ "$first_line" = "---" ]; then pass; else fail "front matter must start with ---"; fi
fi

# ---------------------------------------------------------------------------
# ── Tests: ADR file content spot-checks ───────────────────────────────────
# ---------------------------------------------------------------------------

echo ""
echo "=== ADR content spot-checks ==="

check_adr_file() {
  local path="$1" number="$2" expected_status="$3"

  TEST_NAME="${path##*/}: first line is # ADR-${number}: ..."
  if head -n 1 "$path" | grep -Eq "^# ADR-${number}: "; then pass; else fail; fi

  TEST_NAME="${path##*/}: status is '${expected_status}'"
  if grep -Eq "^- Status: ${expected_status}$" "$path"; then pass; else fail; fi

  TEST_NAME="${path##*/}: has all four required sections"
  local missing=false
  for section in "## Context" "## Decision" "## Consequences" "## Alternatives considered"; do
    if ! grep -Fxq "$section" "$path"; then
      fail "missing ${section}"
      missing=true
    fi
  done
  $missing || pass
}

if [ -d "${REPO_ROOT}/docs/adr" ]; then
  check_adr_file "${REPO_ROOT}/docs/adr/0001-hugo-static-site.md"        "0001" "Accepted"
  check_adr_file "${REPO_ROOT}/docs/adr/0002-github-pages-deployment.md" "0002" "Accepted"
  check_adr_file "${REPO_ROOT}/docs/adr/0003-llm-auto-translation.md"    "0003" "Accepted"
  check_adr_file "${REPO_ROOT}/docs/adr/0004-vale-custom-prose-rules.md" "0004" "Accepted"
  check_adr_file "${REPO_ROOT}/docs/adr/0005-tag-allowlist.md"           "0005" "Accepted"
  check_adr_file "${REPO_ROOT}/docs/adr/0006-push-pull-context-split.md" "0006" "Accepted"

  TEST_NAME="ADR README.md index exists"
  if [ -f "${REPO_ROOT}/docs/adr/README.md" ]; then pass; else fail; fi

  TEST_NAME="ADR _template.md exists"
  if [ -f "${REPO_ROOT}/docs/adr/_template.md" ]; then pass; else fail; fi

  TEST_NAME="_template.md has all four required section headings"
  tmpl="${REPO_ROOT}/docs/adr/_template.md"
  tmpl_ok=true
  for section in "## Context" "## Decision" "## Consequences" "## Alternatives considered"; do
    if ! grep -Fxq "$section" "$tmpl" 2>/dev/null; then
      fail "_template.md missing ${section}"
      tmpl_ok=false
    fi
  done
  $tmpl_ok && pass
else
  echo "  SKIP: docs/adr/ not found"
fi

# ---------------------------------------------------------------------------
# ── Tests: CLAUDE.md structure ────────────────────────────────────────────
# ---------------------------------------------------------------------------

echo ""
echo "=== CLAUDE.md structure ==="

CLAUDE_FILE="${REPO_ROOT}/CLAUDE.md"

TEST_NAME="CLAUDE.md exists"
if [ -f "$CLAUDE_FILE" ]; then pass; else fail; fi

if [ -f "$CLAUDE_FILE" ]; then
  TEST_NAME="CLAUDE.md line count is under 100 (push context should be lean)"
  line_count=$(wc -l < "$CLAUDE_FILE")
  if [ "$line_count" -lt 100 ]; then
    pass
  else
    fail "CLAUDE.md has ${line_count} lines, expected under 100"
  fi

  TEST_NAME="CLAUDE.md references docs/adr/ as pull context location"
  if grep -q 'docs/adr/' "$CLAUDE_FILE"; then pass; else fail "missing docs/adr/ reference"; fi

  TEST_NAME="CLAUDE.md references docs/specs/ as pull context location"
  if grep -q 'docs/specs/' "$CLAUDE_FILE"; then pass; else fail "missing docs/specs/ reference"; fi

  TEST_NAME="CLAUDE.md contains adr: commit prefix"
  if grep -q 'adr:' "$CLAUDE_FILE"; then pass; else fail "missing adr: prefix"; fi
fi

# ---------------------------------------------------------------------------
# ── Summary ───────────────────────────────────────────────────────────────
# ---------------------------------------------------------------------------

echo ""
echo "Results: ${PASS} passed, ${FAIL} failed"
echo ""

[ "$FAIL" -eq 0 ]