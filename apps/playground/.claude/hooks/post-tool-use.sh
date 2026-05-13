#!/usr/bin/env bash
# Forkshop live-AI hook. Notifies a running Forkshop dev server of file edits.
# Best-effort; never blocks the tool call.
# Override FORKSHOP_DEV_URL if your dev server isn't on http://localhost:3000.
set -uo pipefail

if ! command -v jq >/dev/null 2>&1; then
  exit 0
fi

input="$(cat)"
tool="$(printf '%s' "$input" | jq -r '.tool_name // empty')"
case "$tool" in
  Edit|Write|MultiEdit) ;;
  *) exit 0 ;;
esac

file_path="$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty')"
case "$file_path" in
  *.ts|*.tsx|*.mdx) ;;
  *) exit 0 ;;
esac

url="${FORKSHOP_DEV_URL:-http://localhost:3000}/api/forkshop/agent-activity"

send_one() {
  local payload="$1"
  curl -sS -X POST "$url" \
    -H 'content-type: application/json' \
    -d "$payload" \
    --max-time 1 \
    >/dev/null 2>&1 &
}

case "$tool" in
  Edit)
    old_string="$(printf '%s' "$input" | jq -r '.tool_input.old_string // ""')"
    new_string="$(printf '%s' "$input" | jq -r '.tool_input.new_string // ""')"
    payload="$(jq -n \
      --arg fp "$file_path" \
      --arg os "$old_string" \
      --arg ns "$new_string" \
      '{filePath: $fp, oldString: $os, newString: $ns}')"
    send_one "$payload"
    ;;
  Write)
    payload="$(jq -n --arg fp "$file_path" '{filePath: $fp}')"
    send_one "$payload"
    ;;
  MultiEdit)
    while IFS= read -r line; do
      [ -z "$line" ] && continue
      send_one "$line"
    done < <(printf '%s' "$input" | jq -c \
      --arg fp "$file_path" \
      '.tool_input.edits[] | {filePath: $fp, oldString: .old_string, newString: .new_string}')
    ;;
esac

disown -a 2>/dev/null || true
exit 0
