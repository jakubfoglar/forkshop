#!/usr/bin/env bash
# Forkshop live-AI hook. Forwards Read/Edit/Write/MultiEdit tool results to the
# Forkshop dev server. Fire-and-forget; never blocks Claude or fails if Forkshop
# isn't running. Override FORKSHOP_DEV_URL if your dev server isn't on
# http://localhost:3000.
set -uo pipefail
command -v jq >/dev/null 2>&1 || exit 0

input="$(cat)"
tool="$(printf '%s' "$input" | jq -r '.tool_name // empty')"
case "$tool" in
  Edit|Write|MultiEdit|Read) ;;
  *) exit 0 ;;
esac

file_path="$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty')"
case "$file_path" in
  *.ts|*.tsx|*.mdx|*.css) ;;
  *) exit 0 ;;
esac

session_id="$(printf '%s' "$input" | jq -r '.session_id // "default"')"
url="${FORKSHOP_DEV_URL:-http://localhost:3000}/api/forkshop/agent-activity"

action="edit"
case "$tool" in
  Read)  action="read" ;;
  Write) action="create" ;;
esac

payload="$(jq -n \
  --arg agent "claude-code" \
  --arg label "Claude" \
  --arg sid "$session_id" \
  --arg fp "$file_path" \
  --arg act "$action" \
  '{agent: $agent, agentLabel: $label, sessionId: $sid, file: $fp, action: $act, ts: (now * 1000 | floor)}')"

curl -sS -X POST "$url" \
  -H 'content-type: application/json' \
  -d "$payload" \
  --max-time 1 >/dev/null 2>&1 &
disown -a 2>/dev/null || true
exit 0
