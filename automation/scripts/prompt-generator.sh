#!/usr/bin/env bash

# ============================================================
# Tailor Prompt Generator
# ============================================================
# Reads jobs.json, combines each job description with the
# generic CV, and generates:
#   1. tailor-prompts/company-name.txt  — AI prompt to tailor CV
#   2. cvs/Agent Smith CV-company-name.html — empty placeholder
#
# Also copies generic-cv/html-assets/ into cvs/html-assets/ once.
#
# Usage:
#   ./prompt-generator.sh ../../applications/2026-06-19
# ============================================================

set -euo pipefail

# ── Args ──────────────────────────────────────────────────────
if [ $# -lt 1 ]; then
  echo "Usage: $0 <applications/YYYY-MM-DD>"
  exit 1
fi

BATCH_DIR="$1"
JOBS_FILE="$BATCH_DIR/jobs.ndjson"
GENERIC_CV_DIR="$(dirname "$0")/../../generic-cv"
GENERIC_CV=$(find "$GENERIC_CV_DIR" -maxdepth 1 -name "*.html" | head -1)
ASSETS_SRC="$GENERIC_CV_DIR/html-assets"

if [ -z "$GENERIC_CV" ]; then
  echo "Error: no .html file found in $GENERIC_CV_DIR"
  exit 1
fi

CV_BASENAME=$(basename "$GENERIC_CV" .html)

TAILOR_DIR="$BATCH_DIR/tailor-prompts"
CVS_DIR="$BATCH_DIR/cvs"
ASSETS_DST="$CVS_DIR/html-assets"

if [ ! -f "$JOBS_FILE" ]; then
  echo "Error: $JOBS_FILE not found"
  exit 1
fi

mkdir -p "$TAILOR_DIR"
mkdir -p "$CVS_DIR"

if [ -d "$ASSETS_SRC" ] && [ ! -d "$ASSETS_DST" ]; then
  cp -r "$ASSETS_SRC" "$ASSETS_DST"
  echo "Copied html-assets → $ASSETS_DST"
fi

slugify() {
  echo "$1" \
    | tr '[:upper:]' '[:lower:]' \
    | sed 's/[^a-z0-9]/-/g' \
    | sed 's/--*/-/g' \
    | sed 's/^-//;s/-$//'
}

cv_html=$(cat "$GENERIC_CV")

process_job() {
  if [ -z "${company_val:-}" ] && [ -z "${title_val:-}" ]; then
    return
  fi

  if [ -z "$company_val" ] || [ "$company_val" = "null" ]; then
    company_val="unknown"
  fi

  local slug
  slug=$(slugify "$company_val")

  local tailor_file="$TAILOR_DIR/${slug}.txt"
  local cv_out_file="$CVS_DIR/${CV_BASENAME} - ${slug}.html"

  cat > "$tailor_file" <<EOF
TASK:
Tailor the CV below for the job description.
Produce complete updated HTML — do not truncate or summarise.
Keep the same HTML structure and styles as the original.

---

JOB TITLE:
${title_val:-}

COMPANY:
$company_val

JOB DESCRIPTION:
${description_val:-}

---

BASE CV (HTML):
$cv_html
EOF

  if [ ! -f "$cv_out_file" ]; then
    cat > "$cv_out_file" <<EOF
<!-- Placeholder: ${CV_BASENAME} — $company_val -->
<!-- Paste GPT-generated HTML here (from tailor-prompts/${slug}.txt) -->
EOF
  fi

  echo "✓ $company_val  →  $slug"
  count=$((count + 1))
}

count=0
company_val="" title_val="" url_val="" description_val=""

while IFS= read -r job || [ -n "$job" ]; do
  [ -z "$job" ] && continue

  company_val=$(printf '%s' "$job" | sed -n 's/.*"company"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
  title_val=$(printf '%s' "$job" | sed -n 's/.*"title"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
  description_val=$(printf '%s' "$job" | sed -n 's/.*"description"[[:space:]]*:[[:space:]]*"\(.*\)".*/\1/p')

  process_job

done < "$JOBS_FILE"

echo ""
echo "Done — processed $count jobs"
echo "  tailor prompts : $TAILOR_DIR"
echo "  CV shells      : $CVS_DIR"