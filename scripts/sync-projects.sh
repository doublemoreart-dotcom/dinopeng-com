#!/usr/bin/env bash

set -euo pipefail

if [[ $# -ne 4 ]]; then
  echo "Usage: $0 <aidata-source> <tptrees-source> <sporttech-source> <portal-root>" >&2
  exit 64
fi

aidata_source="$(cd "$1" && pwd)"
tptrees_source="$(cd "$2" && pwd)"
sporttech_source="$(cd "$3" && pwd)"
portal_root="$(cd "$4" && pwd)"

require_file() {
  if [[ ! -f "$1" ]]; then
    echo "Required source file is missing: $1" >&2
    exit 66
  fi
}

require_file "$aidata_source/index.html"
require_file "$tptrees_source/index.html"
require_file "$tptrees_source/lifecycle/index.html"
require_file "$sporttech_source/index.html"
require_file "$sporttech_source/assets/favicon.svg"
require_file "$sporttech_source/assets/sporttech-budget-hero-small.jpg"
require_file "$portal_root/index.html"
require_file "$portal_root/CNAME"

mkdir -p "$portal_root/aidata/assets" "$portal_root/tptrees/lifecycle" "$portal_root/sporttech/assets"

cp "$aidata_source/index.html" "$portal_root/aidata/index.html"
rsync -a --delete "$aidata_source/assets/" "$portal_root/aidata/assets/"

cp "$tptrees_source/index.html" "$portal_root/tptrees/index.html"
rsync -a --delete "$tptrees_source/lifecycle/" "$portal_root/tptrees/lifecycle/"

cp "$sporttech_source/index.html" "$portal_root/sporttech/index.html"
rsync -a --delete "$sporttech_source/assets/" "$portal_root/sporttech/assets/"

echo "Synced AI Data, TP Trees, and SportTech into the portal repository."
