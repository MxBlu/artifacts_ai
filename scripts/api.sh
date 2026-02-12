#!/usr/bin/env bash
set -euo pipefail

if [[ ! -f auth_headers.txt ]]; then
  echo "auth_headers.txt not found in repo root" >&2
  exit 1
fi

if [[ $# -lt 1 ]]; then
  echo "Usage: scripts/api.sh <path> [METHOD] [JSON_BODY]" >&2
  echo "Example: scripts/api.sh /my/details" >&2
  echo "Example: scripts/api.sh /my/characters GET" >&2
  echo "Example: scripts/api.sh /my/<name>/action/move POST '{\"x\":0,\"y\":0}'" >&2
  exit 1
fi

path="$1"
method="${2:-GET}"
body="${3:-}"

base_url="https://api.artifactsmmo.com"
url="${base_url}${path}"

if [[ -n "$body" ]]; then
  curl -sS -X "$method" -H @auth_headers.txt -H "Content-Type: application/json" -d "$body" "$url"
else
  curl -sS -X "$method" -H @auth_headers.txt "$url"
fi
