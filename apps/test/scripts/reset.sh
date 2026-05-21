#!/usr/bin/env bash
# Wipe Forkshop scaffold artifacts from apps/test/ so the next
# `cd apps/test && claude` + "set up Forkshop" runs against a clean slate.
set -euo pipefail

cd "$(dirname "$0")/.."

rm -rf .next forkshop.json app/forkshop app/api/forkshop
rm -f .claude/skills/forkshop-*.md
rm -f .claude/hooks/forkshop-*.sh
rm -f .claude/settings.json
rm -f forkshop-engine-*.tgz

# Engine bundles the Raveo font as a binary; init drops it into the
# host's public/. Wipe so fresh inits don't trip on the conflict check.
rm -rf public/fonts/forkshop

# Trim public/fonts/ if it's now empty (user might have other font dirs).
rmdir public/fonts 2>/dev/null || true

# Trim empty .claude/ subdirs (leave .claude/ itself in case the user
# has unrelated config in it, but clean up our created subdirs).
rmdir .claude/hooks 2>/dev/null || true
rmdir .claude/skills 2>/dev/null || true
rmdir .claude 2>/dev/null || true

echo "✓ apps/test/ reset to pre-init state"
