#!/usr/bin/env bash

set -euo pipefail

if [[ $# -ne 7 ]]; then
  echo "Usage: $0 <aidata-source> <tptrees-source> <sporttech-source> <48directory-source> <small-parties-source> <taiwan-food-safety-output> <portal-root>" >&2
  exit 64
fi

aidata_source="$(cd "$1" && pwd)"
tptrees_source="$(cd "$2" && pwd)"
sporttech_source="$(cd "$3" && pwd)"
directory_source="$(cd "$4" && pwd)"
small_parties_source="$(cd "$5" && pwd)"
taiwan_food_safety_source="$(cd "$6" && pwd)"
portal_root="$(cd "$7" && pwd)"

require_file() {
  if [[ ! -f "$1" ]]; then
    echo "Required source file is missing: $1" >&2
    exit 66
  fi
}

require_text() {
  local file="$1"
  local text="$2"
  local label="$3"

  if ! grep -Fq "$text" "$file"; then
    echo "Required content is missing from $label: $text" >&2
    echo "Refusing to sync because the source appears older than the portal copy." >&2
    exit 67
  fi
}

require_file "$aidata_source/index.html"
require_file "$tptrees_source/index.html"
require_file "$tptrees_source/lifecycle/index.html"
require_file "$tptrees_source/species/index.html"
require_file "$tptrees_source/daily/index.html"
require_file "$tptrees_source/data/tree-records.js"
require_file "$tptrees_source/data/tree-data-manifest.json"
require_file "$tptrees_source/data/site-release-manifest.json"
require_file "$tptrees_source/favicon.svg"
require_file "$tptrees_source/favicon.ico"
require_file "$tptrees_source/app/analytics.js"
require_file "$tptrees_source/app/heroicons.js"
require_file "$tptrees_source/app/motion.css"
require_file "$tptrees_source/app/motion.js"
require_file "$tptrees_source/app/vendor/gsap.min.js"
require_file "$tptrees_source/app/vendor/ScrollTrigger.min.js"
require_file "$tptrees_source/public/social-preview.png"
require_file "$sporttech_source/index.html"
require_file "$sporttech_source/assets/favicon.svg"
require_file "$sporttech_source/assets/sporttech-budget-hero-small.jpg"
require_file "$directory_source/index.html"
require_file "$directory_source/favicon.svg"
require_file "$directory_source/assets/klp48-members/devi.jpg"
require_file "$small_parties_source/index.html"
require_file "$small_parties_source/favicon.ico"
require_file "$small_parties_source/favicon.svg"
require_file "$small_parties_source/assets/hero-social-discourse.png"
require_file "$taiwan_food_safety_source/index.html"
require_file "$taiwan_food_safety_source/favicon.ico"
require_file "$taiwan_food_safety_source/opengraph-image.png"
require_file "$portal_root/index.html"
require_file "$portal_root/CNAME"
require_file "$portal_root/.nojekyll"

require_text "$small_parties_source/index.html" "gsap@3/dist/gsap.min.js" "Small Parties source"
require_text "$small_parties_source/index.html" "ScrollTrigger.min.js" "Small Parties source"
require_text "$small_parties_source/index.html" "ScrollToPlugin.min.js" "Small Parties source"
require_text "$small_parties_source/index.html" "G-T2WMCYX21T" "Small Parties source"
require_text "$small_parties_source/index.html" "assets/social-thumbnail.png" "Small Parties source"

mkdir -p "$portal_root/aidata/assets" "$portal_root/tptrees" "$portal_root/sporttech/assets" "$portal_root/48DIRECTORY/assets" "$portal_root/small-parties/assets" "$portal_root/taiwan-food-safety"

cp "$aidata_source/index.html" "$portal_root/aidata/index.html"
rsync -a --delete "$aidata_source/assets/" "$portal_root/aidata/assets/"

rsync -a --delete \
  --include "/index.html" \
  --include "/favicon.svg" \
  --include "/favicon.ico" \
  --include "/app/***" \
  --include "/lifecycle/***" \
  --include "/species/***" \
  --include "/daily/***" \
  --include "/data/***" \
  --include "/public/***" \
  --exclude "*" \
  "$tptrees_source/" "$portal_root/tptrees/"

cp "$sporttech_source/index.html" "$portal_root/sporttech/index.html"
rsync -a --delete "$sporttech_source/assets/" "$portal_root/sporttech/assets/"

cp "$directory_source/index.html" "$portal_root/48DIRECTORY/index.html"
cp "$directory_source/favicon.svg" "$portal_root/48DIRECTORY/favicon.svg"
rsync -a --delete "$directory_source/assets/" "$portal_root/48DIRECTORY/assets/"

cp "$small_parties_source/index.html" "$portal_root/small-parties/index.html"
cp "$small_parties_source/favicon.ico" "$portal_root/small-parties/favicon.ico"
cp "$small_parties_source/favicon.svg" "$portal_root/small-parties/favicon.svg"
rsync -a --delete "$small_parties_source/assets/" "$portal_root/small-parties/assets/"

rsync -a --delete "$taiwan_food_safety_source/" "$portal_root/taiwan-food-safety/"

echo "Synced AI Data, TP Trees, SportTech, 48 DIRECTORY, Small Parties, and Taiwan Food Safety into the portal repository."
