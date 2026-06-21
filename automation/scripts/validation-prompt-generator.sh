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

# ── Args ──────────────────────────────────────────────────────
if [ $# -lt 1 ]; then
  echo "Usage: $0 <applications/YYYY-MM-DD>"
  exit 1
fi

BATCH_DIR="$1"
JOBS_FILE="$BATCH_DIR/jobs.json"
CVS_DIR="$BATCH_DIR/cvs"
VALIDATE_DIR="$BATCH_DIR/validation-prompts"

# ── Validate inputs ───────────────────────────────────────────
if [ ! -f "$JOBS_FILE" ]; then
  echo "Error: $JOBS_FILE not found"
  exit 1
fi

GENERIC_CV_DIR="$(dirname "$0")/../../generic-cv"
GENERIC_CV=$(find "$GENERIC_CV_DIR" -maxdepth 1 -name "*.html" | head -1)
CV_BASENAME=$(basename "$GENERIC_CV" .html)

mkdir -p "$VALIDATE_DIR"

# ── Helpers ───────────────────────────────────────────────────
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

  # Skip if CV doesn't exist yet
  if [ ! -f "$cv_file" ]; then
    echo "⚠ Skipping (no CV file): $company_val"
    skipped=$((skipped + 1))
    return
  fi

  # Skip if CV is still the empty placeholder
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

# ── Process each job ─────────────────────────────────────────
skipped=0
count=0
company_val="" title_val="" url_val="" description_val=""

# Process substitution keeps loop execution out of a subshell
while read -r line || [ -n "$line" ]; do

  if [[ "$line" == "===JOB===" ]]; then
    process_job
    company_val="" title_val="" url_val="" description_val=""
    continue
  fi

  if [[ "$line" =~ ^\"(company|title|url|description)\"[[:space:]]*:[[:space:]]*\"(.*) ]]; then
    key="${BASH_REMATCH[1]}"
    val="${BASH_REMATCH[2]}"
    
    val="${val%\"*}"
    val="${val//\\n/$'\n'}"

    case "$key" in
      company)     company_val="$val" ;;
      title)       title_val="$val" ;;
      url)         url_val="$val" ;;
      description) description_val="$val" ;;
    esac
  fi
done < <(tr -d '\n\r' < "$JOBS_FILE" | sed -E 's/\{\s*\"/\n===JOB===\n\"/g; s/,\s*\"/\n\"/g')

# Flush the final job block from the memory buffer
process_job

echo ""
echo "Done — $count validation prompts generated, $skipped skipped"
echo "  validation prompts : $VALIDATE_DIR"