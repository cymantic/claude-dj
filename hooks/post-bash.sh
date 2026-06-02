#!/bin/bash
set -euo pipefail

# PostToolUse hook — receives JSON via stdin from Claude Code
# Schema: { "tool_name": "Bash", "tool_input": { "command": "..." }, "tool_response": { "output": "..." } }

INPUT=$(cat)

MCP_SERVER="$HOME/.claude-spotify/dist/index.js"
if [[ ! -f "$MCP_SERVER" ]]; then
  exit 0
fi

COMMAND=$(printf '%s' "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('command',''))" 2>/dev/null || true)
OUTPUT=$(printf '%s' "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); r=d.get('tool_response',{}); print(r.get('output','') if isinstance(r,dict) else '')" 2>/dev/null || true)

# Sanitize a string for embedding in JSON
json_escape() {
  printf '%s' "$1" | python3 -c "import sys,json; print(json.dumps(sys.stdin.read()))"
}

# Extract the most meaningful line from git output as a hint
git_hint() {
  # Prefer commit message line e.g. "[main abc1234] feat: my commit"
  local msg
  msg=$(printf '%s' "$OUTPUT" | grep -oE '\[.*\] .+' | head -1 || true)
  if [[ -z "$msg" ]]; then
    # Fall back to first non-empty output line
    msg=$(printf '%s' "$OUTPUT" | grep -m1 '.' || true)
  fi
  printf '%s' "$msg"
}

# git push/commit — play on success
if printf '%s' "$COMMAND" | grep -qE "git (push|commit)" && \
   ! printf '%s' "$OUTPUT" | grep -qiE "error|failed|rejected|fatal"; then
  HINT=$(git_hint)
  HINT_JSON=$(json_escape "$HINT")
  node "$MCP_SERVER" <<EOF 2>/dev/null &
{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"play_for_context","arguments":{"context":"git_push","hint":$HINT_JSON,"duration_seconds":20}}}
EOF
  exit 0
fi

# Test suite passed
if printf '%s' "$OUTPUT" | grep -qiE "passed|✓|tests? (ok|passed)|All tests passed" && \
   ! printf '%s' "$OUTPUT" | grep -qiE "failed|✗|error"; then
  HINT=$(printf '%s' "$OUTPUT" | grep -m1 '.' || true)
  HINT_JSON=$(json_escape "$HINT")
  node "$MCP_SERVER" <<EOF 2>/dev/null &
{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"play_for_context","arguments":{"context":"victory","hint":$HINT_JSON,"duration_seconds":25}}}
EOF
  exit 0
fi

# Build success
if printf '%s' "$OUTPUT" | grep -qiE "build (succeeded|successful|complete)" && \
   ! printf '%s' "$OUTPUT" | grep -qiE "error|failed"; then
  node "$MCP_SERVER" <<EOF 2>/dev/null &
{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"play_for_context","arguments":{"context":"victory","hint":"build succeeded","duration_seconds":20}}}
EOF
  exit 0
fi
