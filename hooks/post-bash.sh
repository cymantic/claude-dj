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

# Pick a random item from a pool using $RANDOM
pick_random() {
  local arr=("$@")
  local idx=$(( RANDOM % ${#arr[@]} ))
  echo "${arr[$idx]}"
}

# git push/commit — play on success
if printf '%s' "$COMMAND" | grep -qE "git (push|commit)" && \
   ! printf '%s' "$OUTPUT" | grep -qiE "error|failed|rejected|fatal"; then
  GIT_PUSH_POOL=(
    "Push It Salt-N-Pepa"
    "Eye of the Tiger Survivor"
    "Shipping Up To Boston Dropkick Murphys"
    "Here Comes The Hotstepper Ini Kamoze"
    "Jump Kris Kross"
    "Can't Stop Won't Stop Young Gunz"
    "Mr Brightside The Killers"
    "Bittersweet Symphony The Verve"
    "Song 2 Blur"
    "Lose Yourself Eminem"
  )
  QUERY=$(pick_random "${GIT_PUSH_POOL[@]}")
  node "$MCP_SERVER" <<EOF 2>/dev/null &
{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"play_snippet","arguments":{"query":"$QUERY","context":"git_push","duration_seconds":20}}}
EOF
  exit 0
fi

# Test suite passed
if printf '%s' "$OUTPUT" | grep -qiE "passed|✓|tests? (ok|passed)|All tests passed" && \
   ! printf '%s' "$OUTPUT" | grep -qiE "failed|✗|error"; then
  VICTORY_POOL=(
    "We Are The Champions Queen"
    "Celebration Kool and the Gang"
    "Don't Stop Me Now Queen"
    "Thunder Imagine Dragons"
    "Gonna Fly Now Rocky theme"
    "Jump Van Halen"
    "Beautiful Day U2"
    "Here I Go Again Whitesnake"
    "Born to Run Bruce Springsteen"
    "Living on a Prayer Bon Jovi"
  )
  QUERY=$(pick_random "${VICTORY_POOL[@]}")
  node "$MCP_SERVER" <<EOF 2>/dev/null &
{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"play_snippet","arguments":{"query":"$QUERY","context":"victory","duration_seconds":25}}}
EOF
  exit 0
fi

# Build success
if printf '%s' "$OUTPUT" | grep -qiE "build (succeeded|successful|complete)" && \
   ! printf '%s' "$OUTPUT" | grep -qiE "error|failed"; then
  BUILD_POOL=(
    "Celebration Kool and the Gang"
    "Good as Hell Lizzo"
    "Can't Hold Us Macklemore"
    "Happy Pharrell Williams"
    "Walking on Sunshine Katrina and the Waves"
  )
  QUERY=$(pick_random "${BUILD_POOL[@]}")
  node "$MCP_SERVER" <<EOF 2>/dev/null &
{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"play_snippet","arguments":{"query":"$QUERY","context":"victory","duration_seconds":20}}}
EOF
  exit 0
fi
