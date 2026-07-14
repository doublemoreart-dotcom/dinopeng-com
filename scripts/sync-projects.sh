#!/usr/bin/env bash

set -euo pipefail

if [[ $# -ne 3 ]]; then
  echo "Usage: $0 <aidata-source> <tptrees-source> <portal-root>" >&2
  exit 64
fi

aidata_source="$(cd "$1" && pwd)"
tptrees_source="$(cd "$2" && pwd)"
portal_root="$(cd "$3" && pwd)"

require_file() {
  if [[ ! -f "$1" ]]; then
    echo "Required source file is missing: $1" >&2
    exit 66
  fi
}

require_file "$aidata_source/index.html"
require_file "$tptrees_source/index.html"
require_file "$tptrees_source/lifecycle/index.html"
require_file "$portal_root/index.html"
require_file "$portal_root/CNAME"

mkdir -p "$portal_root/aidata/assets" "$portal_root/tptrees/lifecycle"

cp "$aidata_source/index.html" "$portal_root/aidata/index.html"
rsync -a --delete "$aidata_source/assets/" "$portal_root/aidata/assets/"

cp "$tptrees_source/index.html" "$portal_root/tptrees/index.html"
rsync -a --delete "$tptrees_source/lifecycle/" "$portal_root/tptrees/lifecycle/"

echo "Synced AI Data and TP Trees into the portal repository."
