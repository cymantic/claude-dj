#!/bin/bash
set -euo pipefail

# Post-bash hook for automatic music triggers
# Receives tool output - sanitize before use

RESULT="${1:-}"

# Sanitize input - remove non-printable characters
RESULT=$(printf '%s' "$RESULT" | tr -cd '[:print:]\n')

# Validate MCP server exists
MCP_SERVER="$HOME/.claude-spotify/server/dist/index.js"
if [[ ! -f "$MCP_SERVER" ]]; then
  exit 0
fi

# Check for git commit/push success (use printf, not echo)
if printf '%s\n' "$RESULT" | grep -qE "git (commit|push)" && \
   ! printf '%s\n' "$RESULT" | grep -qiE "error|failed|rejected|fatal"; then
  node "$MCP_SERVER" <<'EOF' 2>/dev/null &
{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"play_snippet","arguments":{"query":"Push It Salt-N-Pepa","context":"git_push","duration_seconds":20}}}
EOF
  exit 0
fi

# Check for test success patterns
if printf '%s\n' "$RESULT" | grep -qiE "passed|PASSED|✓|tests? (ok|passed)|All tests passed" && \
   ! printf '%s\n' "$RESULT" | grep -qiE "failed|FAILED|✗|error"; then
  node "$MCP_SERVER" <<'EOF' 2>/dev/null &
{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"play_snippet","arguments":{"query":"We Are The Champions Queen","context":"victory","duration_seconds":25}}}
EOF
  exit 0
fi

# Check for build success
if printf '%s\n' "$RESULT" | grep -qiE "build (succeeded|successful|complete)" && \
   ! printf '%s\n' "$RESULT" | grep -qiE "error|failed"; then
  node "$MCP_SERVER" <<'EOF' 2>/dev/null &
{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"play_snippet","arguments":{"query":"celebration victory music","context":"victory","duration_seconds":20}}}
EOF
  exit 0
fi
