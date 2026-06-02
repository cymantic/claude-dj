# Ambient Music Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add snippet-based playback with auto-fade, mood promotion, and hooks for automatic music triggers.

**Architecture:** Extend existing MCP server with snippet timer module, add companion skill for Claude, create bash hooks for git/test events.

**Tech Stack:** TypeScript, @modelcontextprotocol/sdk, Node.js timers, bash hooks

---

## File Structure

```
~/.claude-spotify/
├── tracklist.json              # Extended with activeSnippet
├── hooks/
│   └── post-bash.sh            # NEW: Hook script for git/test events
└── server/
    └── src/
        ├── index.ts            # MODIFY: Add play_snippet, promote_track, get_moods
        ├── spotify.ts          # MODIFY: Add fadeOut function
        ├── snippet.ts          # NEW: Timer management for snippets
        ├── tracklist.ts        # MODIFY: Add promoteCurrentTrack, getMoods
        └── types.ts            # MODIFY: Add promoted field, ActiveSnippet

~/.claude/skills/
└── spotify-dj.md               # NEW: Companion skill

~/.claude-spotify/.claude/
└── settings.json               # NEW: Hook configuration
```

---

### Task 1: Update Type Definitions

**Files:**
- Modify: `~/.claude-spotify/server/src/types.ts`

- [ ] **Step 1: Add promoted field and ActiveSnippet interface**

Edit `~/.claude-spotify/server/src/types.ts` to add:

```typescript
export interface Track {
  track: string;
  artist: string;
  uri: string;
  playCount: number;
  promoted?: boolean;
}

export interface BlockedTrack {
  track: string;
  artist: string;
  uri: string;
  reason: string;
}

export interface ContextData {
  good: Track[];
  blocked: BlockedTrack[];
}

export interface CurrentTrack {
  track: string;
  artist: string;
  uri: string;
  context: string;
  playedAt: string;
}

export interface ActiveSnippet {
  uri: string;
  context: string;
  startedAt: string;
  duration: number;
}

export interface TrackList {
  contexts: Record<string, ContextData>;
  currentTrack: CurrentTrack | null;
  activeSnippet?: ActiveSnippet | null;
}

export interface SpotifyStatus {
  track: string;
  artist: string;
  uri: string;
  state: "playing" | "paused" | "stopped";
  volume: number;
}
```

- [ ] **Step 2: Commit**

```bash
cd ~/.claude-spotify/server && git add src/types.ts && git commit -m "feat: add promoted field and ActiveSnippet type"
```

---

### Task 2: Add fadeOut to Spotify Module

**Files:**
- Modify: `~/.claude-spotify/server/src/spotify.ts`

- [ ] **Step 1: Add sleep helper and fadeOut function**

Add to end of `~/.claude-spotify/server/src/spotify.ts`:

```typescript
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fadeOut(durationMs: number = 3000): Promise<number> {
  const status = getStatus();
  const startVolume = status.volume;
  const steps = 10;
  const stepMs = durationMs / steps;
  const volumeStep = startVolume / steps;

  for (let i = 1; i <= steps; i++) {
    await sleep(stepMs);
    setVolume(Math.round(startVolume - volumeStep * i));
  }
  pause();
  setVolume(startVolume); // Restore for next play
  return startVolume;
}
```

- [ ] **Step 2: Build to verify**

```bash
cd ~/.claude-spotify/server && npm run build
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd ~/.claude-spotify/server && git add src/spotify.ts && git commit -m "feat: add fadeOut function for snippet auto-stop"
```

---

### Task 3: Create Snippet Timer Module

**Files:**
- Create: `~/.claude-spotify/server/src/snippet.ts`

- [ ] **Step 1: Create snippet.ts**

Create `~/.claude-spotify/server/src/snippet.ts`:

```typescript
import * as spotify from "./spotify.js";
import * as tracklist from "./tracklist.js";
import type { ActiveSnippet } from "./types.js";

let activeTimer: NodeJS.Timeout | null = null;
let activeSnippetData: ActiveSnippet | null = null;

export function getActiveSnippet(): ActiveSnippet | null {
  return activeSnippetData;
}

export function cancelSnippet(): void {
  if (activeTimer) {
    clearTimeout(activeTimer);
    activeTimer = null;
  }
  activeSnippetData = null;

  // Clear from tracklist
  const trackList = tracklist.loadTrackList();
  trackList.activeSnippet = null;
  tracklist.saveTrackList(trackList);
}

export function startSnippet(
  uri: string,
  context: string,
  durationSeconds: number
): void {
  // Cancel any existing snippet
  cancelSnippet();

  activeSnippetData = {
    uri,
    context,
    startedAt: new Date().toISOString(),
    duration: durationSeconds,
  };

  // Save to tracklist
  const trackList = tracklist.loadTrackList();
  trackList.activeSnippet = activeSnippetData;
  tracklist.saveTrackList(trackList);

  // Set timer for fade (duration - 3 seconds for fade)
  const fadeStartMs = Math.max(0, (durationSeconds - 3) * 1000);

  activeTimer = setTimeout(async () => {
    await spotify.fadeOut(3000);
    activeSnippetData = null;
    activeTimer = null;

    // Clear from tracklist
    const tl = tracklist.loadTrackList();
    tl.activeSnippet = null;
    tracklist.saveTrackList(tl);
  }, fadeStartMs);
}

export function isSnippetActive(): boolean {
  return activeSnippetData !== null;
}
```

- [ ] **Step 2: Build to verify**

```bash
cd ~/.claude-spotify/server && npm run build
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd ~/.claude-spotify/server && git add src/snippet.ts && git commit -m "feat: add snippet timer module"
```

---

### Task 4: Add Tracklist Functions

**Files:**
- Modify: `~/.claude-spotify/server/src/tracklist.ts`

- [ ] **Step 1: Add promoteCurrentTrack function**

Add to end of `~/.claude-spotify/server/src/tracklist.ts`:

```typescript
export function promoteCurrentTrack(
  trackList: TrackList,
  context: string,
  boost: number
): { track: string; artist: string; newPlayCount: number } | null {
  const current = trackList.currentTrack;
  if (!current) {
    return null;
  }

  const contextData = getContextData(trackList, context);
  let targetTrack = contextData.good.find((t) => t.uri === current.uri);

  if (!targetTrack) {
    // Add to this context if not already there
    targetTrack = {
      track: current.track,
      artist: current.artist,
      uri: current.uri,
      playCount: 0,
      promoted: true,
    };
    contextData.good.push(targetTrack);
  }

  targetTrack.playCount += boost;
  targetTrack.promoted = true;

  saveTrackList(trackList);

  return {
    track: targetTrack.track,
    artist: targetTrack.artist,
    newPlayCount: targetTrack.playCount,
  };
}

export function getMoods(trackList: TrackList): Record<string, number> {
  const moods: Record<string, number> = {};
  for (const [context, data] of Object.entries(trackList.contexts)) {
    moods[context] = data.good.length;
  }
  return moods;
}
```

- [ ] **Step 2: Update imports in tracklist.ts**

At the top of the file, update the import to include Track:

```typescript
import type { TrackList, Track, ContextData, CurrentTrack } from "./types.js";
```

- [ ] **Step 3: Build to verify**

```bash
cd ~/.claude-spotify/server && npm run build
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
cd ~/.claude-spotify/server && git add src/tracklist.ts && git commit -m "feat: add promoteCurrentTrack and getMoods functions"
```

---

### Task 5: Add New MCP Tools

**Files:**
- Modify: `~/.claude-spotify/server/src/index.ts`

- [ ] **Step 1: Add snippet import**

Add at top of `~/.claude-spotify/server/src/index.ts` after other imports:

```typescript
import * as snippet from "./snippet.js";
```

- [ ] **Step 2: Modify pause tool to cancel snippet**

Replace the existing pause tool with:

```typescript
server.tool(
  "pause",
  "Pause Spotify playback",
  {},
  async () => {
    snippet.cancelSnippet();
    spotify.pause();
    return {
      content: [
        {
          type: "text" as const,
          text: "Paused",
        },
      ],
    };
  }
);
```

- [ ] **Step 3: Add play_snippet tool**

Add after the play_song tool:

```typescript
server.tool(
  "play_snippet",
  "Play a short music snippet that auto-fades after duration",
  {
    query: z.string().describe("Song name, artist, or search query"),
    context: z.string().describe("Context like 'victory', 'chill', 'focus'"),
    duration_seconds: z.number().min(5).max(120).default(20).describe("How long to play before fade (default 20)"),
  },
  async ({ query, context, duration_seconds }) => {
    const duration = duration_seconds ?? 20;
    const trackList = tracklist.loadTrackList();
    const knownTrack = tracklist.selectTrackForContext(trackList, context);

    let track: string;
    let artist: string;
    let uri: string;
    let source: string;

    if (knownTrack) {
      spotify.playTrackByUri(knownTrack.uri);
      track = knownTrack.track;
      artist = knownTrack.artist;
      uri = knownTrack.uri;
      source = "known favorite";
    } else {
      spotify.searchAndPlay(query);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const status = spotify.getStatus();
      track = status.track;
      artist = status.artist;
      uri = status.uri;
      source = "fresh search";
    }

    tracklist.recordPlay(trackList, context, track, artist, uri);
    snippet.startSnippet(uri, context, duration);

    return {
      content: [
        {
          type: "text" as const,
          text: `Playing snippet: "${track}" by ${artist} (${source}) - will fade in ${duration}s`,
        },
      ],
    };
  }
);
```

- [ ] **Step 4: Add promote_track tool**

Add after thumbs_down tool:

```typescript
server.tool(
  "promote_track",
  "Boost the current track for a mood/context - makes it more likely to play",
  {
    context: z.string().describe("The mood context to promote this track for (e.g., 'chill', 'focus')"),
    boost: z.number().min(1).max(20).default(5).describe("How much to boost playCount (default 5)"),
  },
  async ({ context, boost }) => {
    const boostAmount = boost ?? 5;
    const trackList = tracklist.loadTrackList();
    const result = tracklist.promoteCurrentTrack(trackList, context, boostAmount);

    if (!result) {
      return {
        content: [
          {
            type: "text" as const,
            text: "No track currently playing to promote.",
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `Promoted "${result.track}" by ${result.artist} for "${context}" (playCount now ${result.newPlayCount})`,
        },
      ],
    };
  }
);
```

- [ ] **Step 5: Add get_moods tool**

Add after get_status tool:

```typescript
server.tool(
  "get_moods",
  "Get list of known mood contexts and how many tracks each has",
  {},
  async () => {
    const trackList = tracklist.loadTrackList();
    const moods = tracklist.getMoods(trackList);
    const lines = Object.entries(moods)
      .map(([mood, count]) => `${mood}: ${count} tracks`)
      .join("\n");

    return {
      content: [
        {
          type: "text" as const,
          text: lines || "No moods learned yet",
        },
      ],
    };
  }
);
```

- [ ] **Step 6: Add cancel_snippet tool**

Add after pause tool:

```typescript
server.tool(
  "cancel_snippet",
  "Cancel the auto-fade timer and let the current song keep playing",
  {},
  async () => {
    if (!snippet.isSnippetActive()) {
      return {
        content: [
          {
            type: "text" as const,
            text: "No snippet timer active",
          },
        ],
      };
    }

    snippet.cancelSnippet();
    return {
      content: [
        {
          type: "text" as const,
          text: "Snippet timer cancelled - music will keep playing",
        },
      ],
    };
  }
);
```

- [ ] **Step 7: Build the project**

```bash
cd ~/.claude-spotify/server && npm run build
```

Expected: No errors.

- [ ] **Step 8: Commit**

```bash
cd ~/.claude-spotify/server && git add src/index.ts && git commit -m "feat: add play_snippet, promote_track, get_moods, cancel_snippet tools"
```

---

### Task 6: Create Companion Skill

**Files:**
- Create: `~/.claude/skills/spotify-dj.md`

- [ ] **Step 1: Create skills directory if needed**

```bash
mkdir -p ~/.claude/skills
```

- [ ] **Step 2: Create spotify-dj.md**

Create `~/.claude/skills/spotify-dj.md`:

```markdown
# Spotify DJ

You have access to Spotify MCP tools for ambient music. Use them naturally to enhance the coding experience.

## Available Tools

- `play_snippet(query, context, duration_seconds)` - Play a short clip that auto-fades
- `play_song(query, context)` - Play full song (no auto-stop)
- `pause()` - Stop playback immediately
- `resume()` - Resume playback
- `cancel_snippet()` - Cancel auto-fade timer, let song continue
- `promote_track(context, boost)` - Boost current track for a mood
- `thumbs_down(reason)` - Block current track for its context
- `get_moods()` - See what mood playlists exist
- `get_status()` - What's currently playing
- `set_volume(level)` - Adjust volume 0-100

## When to Play

Play short snippets (20s) at milestone moments. Just do it - don't ask permission.

| Moment | Context | Example Query |
|--------|---------|---------------|
| Git commit/push succeeds | `git_push` | "Push It Salt-N-Pepa" |
| Tests pass | `victory` | "We Are The Champions Queen" |
| User excited | `victory` or `uplifting` | "Celebration Kool and the Gang" |
| User winding down | `chill` | "chill lofi beats" |
| User needs focus | `focus` | "ambient focus music" |
| User frustrated | `uplifting` | "Don't Stop Me Now Queen" |

## Mood Detection

Recognize these conversational patterns:

**Victory:** "it works!", "done!", "shipped", "nailed it", "finally!", "success", "tests pass"

**Chill:** "winding down", "relaxing", "easy day", "end of day", "taking a break", "peaceful"

**Focus:** "need to concentrate", "deep work", "heads down", "let me think", "focusing"

**Uplifting:** "let's go!", "pumped", "fired up", "motivated", "excited", "energy"

**Frustration → Play uplifting:** "ugh", "stuck", "broken", "why won't this", "annoying"

## User Signals

Listen for these and respond:

| User says | Action |
|-----------|--------|
| "stop", "quiet", "pause", "enough" | `pause()` immediately |
| "bad song", "wrong vibe", "not this" | `thumbs_down()`, then play another |
| "keep playing", "love this", "don't stop" | `cancel_snippet()` to let it continue |
| "perfect for chill", "add to [mood]" | `promote_track(mood, 10)` |
| "louder", "turn it up" | `set_volume(70)` or higher |
| "quieter", "turn it down" | `set_volume(30)` or lower |

## Rules

1. **Snippets by default** - Use `play_snippet` for 15-30 second clips unless user wants more
2. **Don't stack** - If music is playing, let it finish or be explicitly stopped
3. **Just play** - Don't ask "would you like music?" - just play at the right moment
4. **Match the energy** - Victory moments get upbeat tracks, focus time gets ambient
5. **Learn preferences** - Tracks that aren't thumbs-downed become favorites over time
```

- [ ] **Step 3: Commit**

```bash
cd ~/.claude/skills && git init 2>/dev/null || true && git add spotify-dj.md && git commit -m "feat: add spotify-dj companion skill" 2>/dev/null || echo "Skills directory not a git repo, skipping commit"
```

---

### Task 7: Create Hook Script

**Files:**
- Create: `~/.claude-spotify/hooks/post-bash.sh`

- [ ] **Step 1: Create hooks directory**

```bash
mkdir -p ~/.claude-spotify/hooks
```

- [ ] **Step 2: Create post-bash.sh**

Create `~/.claude-spotify/hooks/post-bash.sh`:

```bash
#!/bin/bash
# Post-bash hook for automatic music triggers
# Receives tool result as $1

RESULT="$1"

# Helper to call MCP tool via node
call_mcp() {
  local method="$1"
  local args="$2"
  echo "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"$method\",\"arguments\":$args}}" | \
    node ~/.claude-spotify/server/dist/index.js 2>/dev/null &
}

# Check for git commit/push success
if echo "$RESULT" | grep -qE "git (commit|push)" && ! echo "$RESULT" | grep -qiE "error|failed|rejected|fatal"; then
  call_mcp "play_snippet" '{"query":"Push It Salt-N-Pepa","context":"git_push","duration_seconds":20}'
  exit 0
fi

# Check for test success patterns
if echo "$RESULT" | grep -qiE "passed|PASSED|✓|tests? (ok|passed)|All tests passed" && ! echo "$RESULT" | grep -qiE "failed|FAILED|✗|error"; then
  call_mcp "play_snippet" '{"query":"We Are The Champions Queen","context":"victory","duration_seconds":25}'
  exit 0
fi

# Check for build success
if echo "$RESULT" | grep -qiE "build (succeeded|successful|complete)" && ! echo "$RESULT" | grep -qiE "error|failed"; then
  call_mcp "play_snippet" '{"query":"celebration victory music","context":"victory","duration_seconds":20}'
  exit 0
fi
```

- [ ] **Step 3: Make executable**

```bash
chmod +x ~/.claude-spotify/hooks/post-bash.sh
```

- [ ] **Step 4: Commit**

```bash
cd ~/.claude-spotify && git add hooks/post-bash.sh && git commit -m "feat: add post-bash hook for automatic music triggers"
```

---

### Task 8: Configure Hooks

**Files:**
- Create: `~/.claude-spotify/.claude/settings.json`

- [ ] **Step 1: Create .claude directory**

```bash
mkdir -p ~/.claude-spotify/.claude
```

- [ ] **Step 2: Create settings.json with hooks**

Create `~/.claude-spotify/.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "/Users/tgmcmillen/.claude-spotify/hooks/post-bash.sh \"$TOOL_OUTPUT\"",
            "async": true
          }
        ]
      }
    ]
  }
}
```

- [ ] **Step 3: Commit**

```bash
cd ~/.claude-spotify && git add .claude/settings.json && git commit -m "feat: add hook configuration for automatic music"
```

---

### Task 9: Build and Test

- [ ] **Step 1: Full rebuild**

```bash
cd ~/.claude-spotify/server && npm run build
```

Expected: No errors.

- [ ] **Step 2: Test play_snippet manually**

```bash
cd ~/.claude-spotify/server && node --input-type=module -e "
import * as spotify from './dist/spotify.js';
import * as snippet from './dist/snippet.js';
import * as tracklist from './dist/tracklist.js';

// Play a snippet
spotify.searchAndPlay('chill lofi');
await new Promise(r => setTimeout(r, 1000));
const status = spotify.getStatus();
console.log('Playing:', status.track, 'by', status.artist);
snippet.startSnippet(status.uri, 'test', 5);
console.log('Snippet started, will fade in 5 seconds...');
await new Promise(r => setTimeout(r, 8000));
console.log('Done');
"
```

Expected: Music plays for ~5 seconds then fades out.

- [ ] **Step 3: Commit all dist files**

```bash
cd ~/.claude-spotify/server && git add -A && git commit -m "chore: build with all new features"
```

---

### Task 10: End-to-End Integration Test

- [ ] **Step 1: Restart Claude Code**

Exit and restart Claude Code to pick up new MCP tools and hooks.

- [ ] **Step 2: Test play_snippet tool**

Ask Claude: "Play something chill for 15 seconds"

Expected: Music plays, auto-fades after ~15 seconds.

- [ ] **Step 3: Test cancel_snippet**

Ask Claude: "Play something uplifting" then quickly say "keep playing"

Expected: Music continues past the snippet duration.

- [ ] **Step 4: Test promote_track**

While music is playing, say: "This is perfect for focus"

Expected: Track promoted for focus context.

- [ ] **Step 5: Test get_moods**

Ask Claude: "What moods do you know?"

Expected: List of contexts with track counts.

- [ ] **Step 6: Test hook (if working in project directory)**

Run a git commit in the claude-spotify project.

Expected: "Push It" plays automatically.

- [ ] **Step 7: Celebrate**

The ambient music system is live!
