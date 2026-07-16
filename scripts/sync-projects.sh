#!/usr/bin/env bash

set -euo pipefail

if [[ $# -ne 6 ]]; then
  echo "Usage: $0 <aidata-source> <tptrees-source> <sporttech-source> <48directory-source> <small-parties-source> <portal-root>" >&2
  exit 64
fi

aidata_source="$(cd "$1" && pwd)"
tptrees_source="$(cd "$2" && pwd)"
sporttech_source="$(cd "$3" && pwd)"
directory_source="$(cd "$4" && pwd)"
small_parties_source="$(cd "$5" && pwd)"
portal_root="$(cd "$6" && pwd)"

require_file() {
  if [[ ! -f "$1" ]]; then
    echo "Required source file is missing: $1" >&2
    exit 66
  fi
}

require_file "$aidata_source/index.html"
require_file "$tptrees_source/index.html"
require_file "$tptrees_source/lifecycle/index.html"
require_file "$tptrees_source/species/index.html"
require_file "$tptrees_source/daily/index.html"
require_file "$tptrees_source/data/tree-records.js"
require_file "$tptrees_source/data/tree-data-manifest.json"
require_file "$tptrees_source/favicon.svg"
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
require_file "$portal_root/index.html"
require_file "$portal_root/CNAME"

mkdir -p "$portal_root/aidata/assets" "$portal_root/tptrees" "$portal_root/sporttech/assets" "$portal_root/48DIRECTORY/assets" "$portal_root/small-parties/assets"

cp "$aidata_source/index.html" "$portal_root/aidata/index.html"
rsync -a --delete "$aidata_source/assets/" "$portal_root/aidata/assets/"

rsync -a --delete \
  --include "/index.html" \
  --include "/favicon.svg" \
  --include "/lifecycle/***" \
  --include "/species/***" \
  --include "/daily/***" \
  --include "/data/***" \
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

echo "Synced AI Data, TP Trees, SportTech, 48 DIRECTORY, and Small Parties into the portal repository."
