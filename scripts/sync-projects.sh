#!/usr/bin/env bash

set -euo pipefail

if [[ $# -ne 3 ]]; then
  echo "Usage: $0 <sources-root> <portal-root> <project-ids>" >&2
  exit 64
fi

project_ids="$3"
if [[ -z "$project_ids" || "$project_ids" == *,* ]]; then
  echo "Exactly one project id is required." >&2
  exit 64
fi
if [[ "$project_ids" != "taiwan-food-safety" ]]; then
  echo "Unknown project id: $project_ids" >&2
  exit 65
fi

sources_root="$(cd "$1" && pwd)"
portal_root="$(cd "$2" && pwd)"

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

source_root() {
  local id="$1"
  if [[ ! -d "$sources_root/$id" ]]; then
    echo "Selected source checkout is missing: $sources_root/$id" >&2
    exit 66
  fi
  (cd "$sources_root/$id" && pwd)
}

sync_aidata() {
  local source
  source="$(source_root aidata)"
  require_file "$source/index.html"
  mkdir -p "$portal_root/aidata/assets"
  cp "$source/index.html" "$portal_root/aidata/index.html"
  rsync -a --delete "$source/assets/" "$portal_root/aidata/assets/"
}

sync_tptrees() {
  local source
  source="$(source_root tptrees)"
  for path in \
    index.html lifecycle/index.html species/index.html daily/index.html \
    data/tree-records.js data/tree-data-manifest.json data/site-release-manifest.json \
    favicon.svg favicon.ico app/analytics.js app/heroicons.js app/motion.css app/motion.js \
    app/vendor/gsap.min.js app/vendor/ScrollTrigger.min.js public/social-preview.png
  do
    require_file "$source/$path"
  done
  mkdir -p "$portal_root/tptrees"
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
    "$source/" "$portal_root/tptrees/"
}

sync_sporttech() {
  local source
  source="$(source_root sporttech)"
  require_file "$source/index.html"
  require_file "$source/assets/favicon.svg"
  require_file "$source/assets/sporttech-budget-hero-small.jpg"
  mkdir -p "$portal_root/sporttech/assets"
  cp "$source/index.html" "$portal_root/sporttech/index.html"
  rsync -a --delete "$source/assets/" "$portal_root/sporttech/assets/"
}

sync_48directory() {
  local source
  source="$(source_root 48DIRECTORY)"
  require_file "$source/index.html"
  require_file "$source/favicon.svg"
  require_file "$source/assets/klp48-members/devi.jpg"
  mkdir -p "$portal_root/48DIRECTORY/assets"
  cp "$source/index.html" "$portal_root/48DIRECTORY/index.html"
  cp "$source/favicon.svg" "$portal_root/48DIRECTORY/favicon.svg"
  rsync -a --delete "$source/assets/" "$portal_root/48DIRECTORY/assets/"
}

sync_small_parties() {
  local source
  source="$(source_root small-parties)"
  require_file "$source/index.html"
  require_file "$source/favicon.ico"
  require_file "$source/favicon.svg"
  require_file "$source/assets/hero-social-discourse.png"
  require_text "$source/index.html" "gsap@3/dist/gsap.min.js" "Small Parties source"
  require_text "$source/index.html" "ScrollTrigger.min.js" "Small Parties source"
  require_text "$source/index.html" "ScrollToPlugin.min.js" "Small Parties source"
  require_text "$source/index.html" "G-T2WMCYX21T" "Small Parties source"
  require_text "$source/index.html" "assets/social-thumbnail.png" "Small Parties source"
  mkdir -p "$portal_root/small-parties/assets"
  cp "$source/index.html" "$portal_root/small-parties/index.html"
  cp "$source/favicon.ico" "$portal_root/small-parties/favicon.ico"
  cp "$source/favicon.svg" "$portal_root/small-parties/favicon.svg"
  rsync -a --delete "$source/assets/" "$portal_root/small-parties/assets/"
}

sync_taiwan_food_safety() {
  local source
  source="$(source_root taiwan-food-safety)/out"
  require_file "$source/index.html"
  require_file "$source/favicon.ico"
  require_file "$source/opengraph-image.png"
  mkdir -p "$portal_root/taiwan-food-safety"
  rsync -a --delete "$source/" "$portal_root/taiwan-food-safety/"
}

sync_mae() {
  local source
  source="$(source_root mae)"
  require_file "$source/index.html"
  require_file "$source/assets/placeholder-card.svg"
  require_text "$source/index.html" "assets/placeholder-card.svg" "MAE source"
  mkdir -p "$portal_root/mae/assets"
  cp "$source/index.html" "$portal_root/mae/index.html"
  rsync -a --delete "$source/assets/" "$portal_root/mae/assets/"
}

sync_ccp_stability_spending() {
  local source
  source="$(source_root ccp-stability-spending)"
  require_file "$source/index.html"
  require_file "$source/styles.css"
  require_file "$source/script.js"
  require_file "$source/assets/fonts/SNPro-Variable.ttf"
  require_file "$source/public/favicon.ico"
  require_file "$source/public/social-share.png"
  require_text "$source/index.html" "中共如何使用維穩費？" "CCP Stability Spending source"
  mkdir -p "$portal_root/ccp-stability-spending"
  rsync -a --delete \
    --include "/index.html" \
    --include "/styles.css" \
    --include "/script.js" \
    --include "/assets/***" \
    --include "/public/***" \
    --exclude "*" \
    "$source/" "$portal_root/ccp-stability-spending/"
}

require_file "$portal_root/index.html"
require_file "$portal_root/CNAME"
require_file "$portal_root/.nojekyll"

sync_taiwan_food_safety

echo "Synced selected projects into the portal repository: $project_ids"
