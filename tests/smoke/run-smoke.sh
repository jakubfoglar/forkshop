#!/usr/bin/env bash
# tests/smoke/run-smoke.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SMOKE_DIR="/tmp/forkshop-smoke-$(date +%s)"

cleanup() {
  if [[ -n "${KEEP_SMOKE:-}" ]]; then
    echo "Smoke dir kept at $SMOKE_DIR (KEEP_SMOKE set)."
  else
    rm -rf "$SMOKE_DIR"
  fi
}
trap cleanup EXIT

echo "==> Packing engine and CLI"
pushd "$REPO_ROOT/packages/engine" > /dev/null
ENGINE_TARBALL_NAME="$(pnpm pack --pack-destination /tmp 2>&1 | tail -1)"
popd > /dev/null

pushd "$REPO_ROOT/packages/cli" > /dev/null
CLI_TARBALL_NAME="$(pnpm pack --pack-destination /tmp 2>&1 | tail -1)"
popd > /dev/null

echo "==> Creating smoke project at $SMOKE_DIR"
mkdir -p "$SMOKE_DIR"
pushd "$SMOKE_DIR" > /dev/null
pnpm create next-app . --typescript --tailwind --app --no-eslint --no-import-alias --use-pnpm

echo "==> Installing engine tarball (so @forkshop/engine resolves)"
pnpm add "$ENGINE_TARBALL_NAME"

echo "==> Installing CLI tarball"
pnpm add -D "$CLI_TARBALL_NAME"

echo "==> Running forkshop init"
npx forkshop init

echo "==> Asserting expected files exist"
while IFS= read -r f; do
  [[ -z "$f" ]] && continue
  if [[ ! -e "$f" ]]; then
    echo "FAIL: $f missing"
    exit 1
  fi
done < "$REPO_ROOT/tests/smoke/expected-files.txt"

echo "==> Asserting @forkshop/engine in package.json"
node -e "const p=require('./package.json');if(!p.dependencies?.['@forkshop/engine']){console.error('FAIL: @forkshop/engine not in dependencies');process.exit(1);}"

echo "==> Installing all deps (engine + others)"
pnpm install

echo "==> Building the project"
pnpm build

popd > /dev/null
echo "==> SMOKE PASSED"
