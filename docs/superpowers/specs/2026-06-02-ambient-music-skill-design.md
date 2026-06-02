# Ambient Music Skill Design

## Overview

Extend the Spotify MCP server with a companion skill and hooks to create ambient, contextual music that flows with the conversation. Music plays automatically at milestone moments (git push, tests pass) and responds to conversational mood cues ("let's go!", "winding down"). Short snippets (15-30s) auto-fade unless the user wants more.

## Architecture

Three components working together:

1. **Enhanced MCP Server** - Handles playback mechanics, timers, auto-fade
2. **Companion Skill** - Teaches Claude mood detection and behavioral rules
3. **Claude Code Hooks** - Auto-trigger music on git/test/build events

## Enhanced MCP Server

### New Tools

**`play_snippet`**
- Input: `query` (string), `context` (string), `duration_seconds` (number, default 20)
- Behavior:
  - Plays track via search or known-good selection (existing logic)
  - Starts background timer for auto-fade
  - Fades volume to 0 over last 3 seconds, then pauses
  - If pause/stop/new-play called before timer, cancel timer
- Returns: track name, artist, duration

**`promote_track`**
- Input: `context` (string), `boost` (number, default 5)
- Behavior:
  - Increases current track's playCount by boost amount
  - Marks track as `promoted: true`
  - "This is perfect for chill" → promote_track("chill", 10)
- Returns: confirmation with new playCount

**`get_moods`**
- Input: none
- Behavior: Returns list of known contexts with track counts
- Returns: `{ "chill": 3, "victory": 2, "focus": 0 }`

### Timer Implementation

```typescript
interface ActiveSnippet {
  uri: string;
  context: string;
  startedAt: string;
  duration: number;
  timerId: NodeJS.Timeout;
}

let activeSnippet: ActiveSnippet | null = null;

// On play_snippet:
// 1. Cancel existing timer if any
// 2. Play track
// 3. Set new timer for (duration - 3) seconds
// 4. Timer callback: fade volume over 3s, then pause

// On pause/stop/new-play:
// 1. Clear activeSnippet.timerId
// 2. Set activeSnippet = null
```

### Volume Fade

```typescript
async function fadeOut(durationMs: number = 3000) {
  const status = getStatus();
  const startVolume = status.volume;
  const steps = 10;
  const stepMs = durationMs / steps;
  const volumeStep = startVolume / steps;

  for (let i = 1; i <= steps; i++) {
    await sleep(stepMs);
    setVolume(Math.round(startVolume - (volumeStep * i)));
  }
  pause();
  setVolume(startVolume); // Restore for next play
}
```

## Companion Skill

**Location:** `~/.claude/skills/spotify-dj.md`

### Mood Detection Patterns

| Mood | Trigger phrases/situations |
|------|---------------------------|
| `victory` | "it works!", "tests pass", "shipped", "done!", "nailed it", "finally!", "success" |
| `chill` | "winding down", "relaxed", "easy", "end of day", "taking a break", "peaceful" |
| `focus` | "let me think", "deep work", "concentrate", "heads down", "need to focus" |
| `uplifting` | "let's go", "pumped", "energy", "motivated", "fired up", "excited" |
| `frustration` | "ugh", "stuck", "broken", "why won't this", "annoying" → play uplifting to shift mood |
| `git_push` | git commit/push success → "Push It" vibes |

### Behavioral Rules

1. **Snippet by default** - Play 15-30 second snippets, not full songs, unless user asks for more
2. **Stop on request** - "stop", "quiet", "pause", "enough" → immediate stop
3. **Thumbs down flow** - "bad song", "not this", "wrong vibe" → thumbs_down + try another track
4. **Keep playing flow** - "keep playing", "love this", "don't stop" → cancel timer, full playback
5. **Promote flow** - "this is perfect for [mood]", "add this to [mood]" → promote_track
6. **Don't stack** - If music is playing, let it finish or wait for explicit stop before new track
7. **Just play** - Don't ask "would you like music?" - just play it at the right moment

### Skill Content

```markdown
# Spotify DJ

You have access to Spotify MCP tools for ambient music. Use them naturally.

## When to Play

Play short snippets (20s) at milestone moments:
- Git commit/push succeeds → context: "git_push"
- Tests pass → context: "victory"
- User expresses excitement → context: "victory" or "uplifting"
- User winding down → context: "chill"
- User needs focus → context: "focus"

Just play it. Don't ask permission.

## User Signals

- "stop/quiet/pause" → pause immediately
- "bad song/wrong vibe" → thumbs_down, try another
- "keep playing/love this" → let the song continue
- "perfect for chill" → promote_track("chill", 10)

## Mood Mapping

Recognize these patterns:
- Victory: "it works!", "done!", "shipped", "nailed it"
- Chill: "winding down", "relaxing", "easy day"
- Focus: "need to concentrate", "deep work", "heads down"
- Uplifting: "let's go!", "pumped", "fired up"
- Frustration → play uplifting to shift the mood
```

## Claude Code Hooks

### Hook Configuration

Add to `~/.claude-spotify/.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "/Users/tgmcmillen/.claude-spotify/hooks/post-bash.sh \"$TOOL_RESULT\"",
            "async": true
          }
        ]
      }
    ]
  }
}
```

### Hook Script

`~/.claude-spotify/hooks/post-bash.sh`:

```bash
#!/bin/bash
RESULT="$1"

# Check for success patterns
if echo "$RESULT" | grep -q "git commit\|git push" && ! echo "$RESULT" | grep -q "error\|failed"; then
  # Trigger git_push music via MCP
  echo '{"method":"tools/call","params":{"name":"play_snippet","arguments":{"query":"Push It Salt-N-Pepa","context":"git_push","duration_seconds":20}}}' | \
    node ~/.claude-spotify/server/dist/index.js &
fi

if echo "$RESULT" | grep -qE "passed|PASSED|✓.*test|tests? (passed|ok)" && ! echo "$RESULT" | grep -q "failed\|FAILED"; then
  # Trigger victory music
  echo '{"method":"tools/call","params":{"name":"play_snippet","arguments":{"query":"We Are The Champions Queen","context":"victory","duration_seconds":25}}}' | \
    node ~/.claude-spotify/server/dist/index.js &
fi
```

## Data Model Updates

**Extended tracklist.json:**

```json
{
  "contexts": {
    "chill": {
      "good": [
        {
          "track": "Weightless",
          "artist": "Marconi Union",
          "uri": "spotify:track:xxx",
          "playCount": 5,
          "promoted": true
        }
      ],
      "blocked": []
    }
  },
  "currentTrack": {
    "track": "...",
    "artist": "...",
    "uri": "...",
    "context": "chill",
    "playedAt": "2026-06-02T16:00:00Z"
  },
  "activeSnippet": {
    "uri": "spotify:track:xxx",
    "context": "chill",
    "startedAt": "2026-06-02T16:00:00Z",
    "duration": 20
  }
}
```

**New fields:**
- `promoted: boolean` - Track was explicitly boosted by user
- `activeSnippet` - Current snippet timer state (null when not playing snippet)

## File Structure

```
~/.claude-spotify/
├── tracklist.json
├── hooks/
│   └── post-bash.sh
└── server/
    └── src/
        ├── index.ts      # Add play_snippet, promote_track, get_moods
        ├── spotify.ts    # Add fadeOut function
        ├── tracklist.ts  # Add promoted field, activeSnippet
        └── types.ts      # Update interfaces

~/.claude/skills/
└── spotify-dj.md         # Companion skill
```

## Success Criteria

1. `play_snippet("chill music", "chill", 20)` plays for 20s then fades and stops
2. Saying "keep playing" during a snippet cancels the timer
3. Git push triggers "Push It" automatically via hook
4. Tests passing triggers victory music via hook
5. "This is perfect for chill" boosts the track's playCount
6. Claude recognizes "winding down" and plays chill music without being asked
