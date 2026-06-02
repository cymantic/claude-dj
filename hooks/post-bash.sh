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

# git push/commit — play on success (no error/rejected in output)
if printf '%s' "$COMMAND" | grep -qE "git (push|commit)" && \
   ! printf '%s' "$OUTPUT" | grep -qiE "error|failed|rejected|fatal"; then
  node "$MCP_SERVER" <<'EOF' 2>/dev/null &
{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"play_snippet","arguments":{"query":"Push It Salt-N-Pepa","context":"git_push","duration_seconds":20}}}
EOF
  exit 0
fi

# Test suite passed
if printf '%s' "$OUTPUT" | grep -qiE "passed|✓|tests? (ok|passed)|All tests passed" && \
   ! printf '%s' "$OUTPUT" | grep -qiE "failed|✗|error"; then
  node "$MCP_SERVER" <<'EOF' 2>/dev/null &
{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"play_snippet","arguments":{"query":"We Are The Champions Queen","context":"victory","duration_seconds":25}}}
EOF
  exit 0
fi

# Build success
if printf '%s' "$OUTPUT" | grep -qiE "build (succeeded|successful|complete)" && \
   ! printf '%s' "$OUTPUT" | grep -qiE "error|failed"; then
  node "$MCP_SERVER" <<'EOF' 2>/dev/null &
{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"play_snippet","arguments":{"query":"celebration victory music","context":"victory","duration_seconds":20}}}
EOF
  exit 0
fi
