#!/usr/bin/env bash
# A throwaway copy of this repo for the demo session to read.
# Usage: demo/setup.sh [dir]   (default: a fresh temp dir; prints its path)
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"
dir="${1:-$(mktemp -d -t subagents-plus-demo)}"
mkdir -p "$dir"
git -C "$here" archive HEAD | tar -x -C "$dir"
echo "$dir"
