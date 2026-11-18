#!/usr/bin/env bash
set -euo pipefail
export LC_ALL=C

if output=$(git push --porcelain origin HEAD:refs/heads/main 2>&1); then
  printf '%s\n' "$output"
  echo 'pushed=true' >> "$GITHUB_OUTPUT"
  exit 0
fi

printf '%s\n' "$output" >&2
case "$output" in
  *'[rejected] (fetch first)'*|*'[rejected] (non-fast-forward)'*)
    collected_from=$(git rev-parse 'HEAD^')
    current_main=$(git ls-remote --exit-code origin refs/heads/main | cut -f1)
    if [[ "$current_main" != "$collected_from" ]]; then
      echo "::notice title=Data publication superseded::Main advanced from $collected_from to $current_main during collection. The newer main push triggers its own refresh."
      exit 0
    fi
    ;;
esac
exit 1
