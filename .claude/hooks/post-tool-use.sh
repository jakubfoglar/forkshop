#!/usr/bin/env bash
# Forkshop live-AI hook. Notifies a running Forkshop dev server of file edits.
# Best-effort; never blocks the tool call.
# Override FORKSHOP_DEV_URL if your dev server isn't on http://localhost:3000.
set -uo pipefail

# DEBUG: log every invocation so we can prove the hook is firing.
echo "$(date '+%H:%M:%S') HOOK fired" >> /tmp/forkshop-hook.log

if ! command -v jq >/dev/null 2>&1; then
  echo "$(date '+%H:%M:%S')   no-jq" >> /tmp/forkshop-hook.log
  exit 0
fi

input="$(cat)"
tool="$(printf '%s' "$input" | jq -r '.tool_name // empty')"
echo "$(date '+%H:%M:%S')   tool=$tool" >> /tmp/forkshop-hook.log
case "$tool" in
  Edit|Write|MultiEdit) ;;
  *) exit 0 ;;
esac

file_path="$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty')"
echo "$(date '+%H:%M:%S')   file=$file_path" >> /tmp/forkshop-hook.log
case "$file_path" in
  *.ts|*.tsx|*.mdx) ;;
  *) echo "$(date '+%H:%M:%S')   skipped (extension)" >> /tmp/forkshop-hook.log; exit 0 ;;
esac
echo "$(date '+%H:%M:%S')   POSTing to ${FORKSHOP_DEV_URL:-http://localhost:3000}" >> /tmp/forkshop-hook.log

url="${FORKSHOP_DEV_URL:-http://localhost:3000}/api/forkshop/agent-activity"

send_one() {
  local payload="$1"
  # DEBUG: synchronous curl with status logging.
  local status
  status=$(curl -sS -X POST "$url" \
    -H 'content-type: application/json' \
    -d "$payload" \
    --max-time 2 \
    -o /dev/null \
    -w "%{http_code}" 2>>/tmp/forkshop-hook.log)
  echo "$(date '+%H:%M:%S')   curl status=$status exit=$?" >> /tmp/forkshop-hook.log
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
