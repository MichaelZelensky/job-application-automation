#!/usr/bin/env bash

# ============================================================
# Validation Prompt Generator
# ============================================================
# Reads jobs.json + filled cvs/*.html and generates:
#   validation-prompts/company-name.txt
#
# Skips jobs where the CV is still a placeholder (not yet filled).
#
# Usage:
#   ./validation-prompt-generator.sh ../../applications/2026-06-19
# ============================================================

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <applications/YYYY-MM-DD>"
  exit 1
fi

BATCH_DIR="$1"
JOBS_FILE="$BATCH_DIR/jobs.ndjson"
CVS_DIR="$BATCH_DIR/cvs"
VALIDATE_DIR="$BATCH_DIR/validation-prompts"

if [ ! -f "$JOBS_FILE" ]; then
  echo "Error: $JOBS_FILE not found"
  exit 1
fi

GENERIC_CV_DIR="$(dirname "$0")/../../generic-cv"
GENERIC_CV=$(find "$GENERIC_CV_DIR" -maxdepth 1 -name "*.html" | head -1)
CV_BASENAME=$(basename "$GENERIC_CV" .html)

mkdir -p "$VALIDATE_DIR"

slugify() {
  echo "$1" \
    | tr '[:upper:]' '[:lower:]' \
    | sed 's/[^a-z0-9]/-/g' \
    | sed 's/--*/-/g' \
    | sed 's/^-//;s/-$//'
}

is_placeholder() {
  # Returns 0 (true) if the file still contains the placeholder comment
  grep -q "Paste GPT-generated HTML here" "$1" 2>/dev/null
}

process_job() {
  if [ -z "${company_val:-}" ] && [ -z "${title_val:-}" ]; then
    return
  fi

  if [ -z "$company_val" ] || [ "$company_val" = "null" ]; then
    company_val="unknown"
  fi

  local slug
  slug=$(slugify "$company_val")
  local cv_file="$CVS_DIR/${CV_BASENAME} - ${slug}.html"

  if [ ! -f "$cv_file" ]; then
    echo "⚠ Skipping (no CV file): $company_val"
    skipped=$((skipped + 1))
    return
  fi

  if is_placeholder "$cv_file"; then
    echo "⚠ Skipping (placeholder): $company_val"
    skipped=$((skipped + 1))
    return
  fi

  local cv_html
  cv_html=$(cat "$cv_file")
  local validate_file="$VALIDATE_DIR/${slug}.txt"

  cat > "$validate_file" <<EOF
TASK:
Here's a candidate CV and the role description.
Is this a strong candidate? Be brief — one paragraph max.
Flag any obvious gaps or mismatches.

---

JOB TITLE:
${title_val:-}

COMPANY:
$company_val

JOB DESCRIPTION:
${description_val:-}

---

CANDIDATE CV:
$cv_html
EOF

  echo "✓ $company_val → $slug"
  count=$((count + 1))
}

skipped=0
count=0

while IFS= read -r job || [ -n "$job" ]; do
  [ -z "$job" ] && continue
  company_val=$(printf '%s' "$job" | sed -n 's/.*"company"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
  title_val=$(printf '%s' "$job" | sed -n 's/.*"title"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
  description_val=$(printf '%s' "$job" | sed -n 's/.*"description"[[:space:]]*:[[:space:]]*"\(.*\)".*/\1/p')
  process_job
done < "$JOBS_FILE"

echo ""
echo "Done — $count validation prompts generated, $skipped skipped"
echo "  validation prompts : $VALIDATE_DIR"