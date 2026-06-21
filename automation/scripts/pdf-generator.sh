#!/usr/bin/env bash

# ============================================================
# Tailor Prompt Generator (Cross-Platform Version)
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

# 1. Check if the target directory parameter was provided
if [ -z "$1" ]; then
    echo "Error: Target directory path is missing."
    echo "Usage: $0 ../../applications/YYYY-MM-DD"
    exit 1
fi

TARGET_DIR="$1"
CVS_DIR="$TARGET_DIR/cvs"

if [ ! -d "$CVS_DIR" ]; then
    echo "Error: Directory '$CVS_DIR' does not exist."
    exit 1
fi

# 2. Detect OS and set up the browser & absolute paths dynamically
OS_TYPE="$(uname -s)"
echo "Detected OS: $OS_TYPE"

if [[ "$OS_TYPE" == *"NT"* || "$OS_TYPE" == *"Msys"* || "$OS_TYPE" == *"MINGW"* ]]; then
    # --- WINDOWS ENVIRONMENT ---
    if [ -f "/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" ]; then
        BROWSER="/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
    elif [ -f "/c/Program Files/Google/Chrome/Application/chrome.exe" ]; then
        BROWSER="/c/Program Files/Google/Chrome/Application/chrome.exe"
    else
        echo "Error: Neither Google Chrome nor Microsoft Edge was found on Windows."
        exit 1
    fi
    # Windows requires the -W path translation flag
    BASE_DIR="$(pwd -W)"

elif [[ "$OS_TYPE" == "Darwin" ]]; then
    # --- MACOS ENVIRONMENT ---
    if [ -d "/Applications/Google Chrome.app" ]; then
        BROWSER="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    elif [ -d "/Applications/Microsoft Edge.app" ]; then
        BROWSER="/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"
    else
        echo "Error: Neither Google Chrome nor Microsoft Edge was found in /Applications."
        exit 1
    fi
    BASE_DIR="$(pwd)"

else
    # --- LINUX ENVIRONMENT ---
    if command -v google-chrome &> /dev/null; then
        BROWSER="google-chrome"
    elif command -v microsoft-edge &> /dev/null; then
        BROWSER="microsoft-edge"
    elif command -v chromium-browser &> /dev/null; then
        BROWSER="chromium-browser"
    else
        echo "Error: No suitable Chromium-based browser found in system PATH."
        exit 1
    fi
    BASE_DIR="$(pwd)"
fi

echo "Using browser binary: $BROWSER"
echo "Processing HTML files in: $CVS_DIR"
echo "------------------------------------------------------------"

# 3. Loop through all HTML files in the cvs directory
shopt -s nullglob
html_files=("$CVS_DIR"/*.html)

if [ ${#html_files[@]} -eq 0 ]; then
    echo "No HTML files found in $CVS_DIR"
    exit 0
fi

for html_file in "${html_files[@]}"; do
    base_path="${html_file%.html}"
    output_pdf="${base_path}.pdf"

    # Map the correct paths dynamically based on OS platform findings
    ABS_INPUT="${BASE_DIR}/${html_file}"
    ABS_OUTPUT="${BASE_DIR}/${output_pdf}"

    echo "Converting: $(basename "$html_file") -> $(basename "$output_pdf")"

    # 4. Run the headless browser print command
    "$BROWSER" --headless=new --no-pdf-header-footer --print-to-pdf="$ABS_OUTPUT" "file://$ABS_INPUT" 2>/dev/null

    if [ $? -eq 0 ]; then
        echo "  ↳ Success"
    else
        echo "  ↳ [ERROR] Failed to generate PDF for $(basename "$html_file")"
    fi
done

echo "------------------------------------------------------------"
echo "Finished processing all files."