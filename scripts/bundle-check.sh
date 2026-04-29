#!/usr/bin/env bash
# Bundle size gate: fail CI if gzip JS bundle exceeds 250 KB.
# Usage: npm run build && bash scripts/bundle-check.sh
# Per PERF-01: ≤250 KB gzipped JS (D-21).

set -euo pipefail

DIST_DIR="${1:-dist}"
BUDGET_BYTES=$((250 * 1024))  # 256000

if [ ! -d "$DIST_DIR/assets" ]; then
  echo "ERROR: $DIST_DIR/assets not found. Run npm run build first."
  exit 1
fi

JS_FILES=("$DIST_DIR"/assets/*.js)
if [ ${#JS_FILES[@]} -eq 0 ]; then
  echo "ERROR: No JS files found in $DIST_DIR/assets/"
  exit 1
fi

GZIP_BYTES=$(gzip -c "${JS_FILES[@]}" | wc -c)
GZIP_KB=$(echo "scale=2; $GZIP_BYTES / 1024" | bc)
BUDGET_KB=$(echo "scale=2; $BUDGET_BYTES / 1024" | bc)

echo "Bundle size: ${GZIP_KB} KB gzipped (budget: ${BUDGET_KB} KB)"

if [ "$GZIP_BYTES" -gt "$BUDGET_BYTES" ]; then
  echo "FAIL: Bundle ${GZIP_KB} KB exceeds ${BUDGET_KB} KB limit."
  echo "      Open dist/stats.html to identify large chunks."
  exit 1
else
  HEADROOM=$(echo "scale=2; ($BUDGET_BYTES - $GZIP_BYTES) / 1024" | bc)
  echo "PASS: ${HEADROOM} KB headroom remaining."
  exit 0
fi
