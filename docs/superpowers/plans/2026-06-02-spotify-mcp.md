# Spotify MCP Server Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an MCP server that controls Spotify via AppleScript with contextual music learning.

**Architecture:** Single TypeScript MCP server using stdio transport. AppleScript controls local Spotify app via execFile (not exec, for safety). JSON file stores learned track preferences by context.

**Tech Stack:** TypeScript, @modelcontextprotocol/sdk, Node.js child_process.execFileSync for osascript

---

## File Structure

```
~/.claude-spotify/
├── tracklist.json              # Persisted track data (created at runtime)
└── server/
    ├── package.json            # Dependencies and scripts
    ├── tsconfig.json           # TypeScript config
    └── src/
        ├── index.ts            # MCP server entry point, tool handlers
        ├── spotify.ts          # AppleScript execution layer
        ├── tracklist.ts        # JSON file read/write, track selection logic
        └── types.ts            # Shared type definitions
```

---

### Task 1: Project Setup

**Files:**
- Create: `~/.claude-spotify/server/package.json`
- Create: `~/.claude-spotify/server/tsconfig.json`

- [ ] **Step 1: Create server directory**

```bash
mkdir -p ~/.claude-spotify/server/src
```

- [ ] **Step 2: Create package.json**

Create `~/.claude-spotify/server/package.json`:

```json
{
  "name": "spotify-mcp-server",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}
```

- [ ] **Step 3: Create tsconfig.json**

Create `~/.claude-spotify/server/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 4: Install dependencies**

```bash
cd ~/.claude-spotify/server && npm install
```

- [ ] **Step 5: Commit**

```bash
cd ~/.claude-spotify/server && git init && git add package.json tsconfig.json package-lock.json && git commit -m "chore: initialize spotify mcp server project"
```

---

### Task 2: Type Definitions

**Files:**
- Create: `~/.claude-spotify/server/src/types.ts`

- [ ] **Step 1: Create types.ts**

Create `~/.claude-spotify/server/src/types.ts`:

```typescript
export interface Track {
  track: string;
  artist: string;
  uri: string;
  playCount: number;
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

export interface TrackList {
  contexts: Record<string, ContextData>;
  currentTrack: CurrentTrack | null;
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
cd ~/.claude-spotify/server && git add src/types.ts && git commit -m "feat: add type definitions"
```

---

### Task 3: Spotify AppleScript Layer

**Files:**
- Create: `~/.claude-spotify/server/src/spotify.ts`

- [ ] **Step 1: Create spotify.ts with execFileSync helper**

Create `~/.claude-spotify/server/src/spotify.ts`:

```typescript
import { execFileSync } from "child_process";
import type { SpotifyStatus } from "./types.js";

function execAppleScript(script: string): string {
  try {
    return execFileSync("osascript", ["-e", script], { encoding: "utf-8" }).trim();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("not running")) {
      throw new Error("Spotify is not running. Please open Spotify and try again.");
    }
    throw error;
  }
}

export function searchAndPlay(query: string): void {
  const encodedQuery = encodeURIComponent(query);
  execAppleScript(`tell application "Spotify" to play track "spotify:search:${encodedQuery}"`);
}

export function playTrackByUri(uri: string): void {
  execAppleScript(`tell application "Spotify" to play track "${uri}"`);
}

export function setVolume(level: number): number {
  const clamped = Math.max(0, Math.min(100, Math.round(level)));
  execAppleScript(`tell application "Spotify" to set sound volume to ${clamped}`);
  return clamped;
}

export function getStatus(): SpotifyStatus {
  const script = `tell application "Spotify"
set trackName to name of current track
set trackArtist to artist of current track
set trackURI to spotify url of current track
set playerState to player state as string
set vol to sound volume
return trackName & "|||" & trackArtist & "|||" & trackURI & "|||" & playerState & "|||" & vol
end tell`;

  const result = execAppleScript(script);
  const [track, artist, uri, state, volume] = result.split("|||");

  return {
    track,
    artist,
    uri,
    state: state === "playing" ? "playing" : state === "paused" ? "paused" : "stopped",
    volume: parseInt(volume, 10),
  };
}
```

- [ ] **Step 2: Test AppleScript functions manually**

```bash
cd ~/.claude-spotify/server && npx tsc && node -e "
import { getStatus } from './dist/spotify.js';
console.log(getStatus());
"
```

Expected: Object with current track info printed.

- [ ] **Step 3: Commit**

```bash
cd ~/.claude-spotify/server && git add src/spotify.ts && git commit -m "feat: add spotify applescript control layer"
```

---

### Task 4: Tracklist Persistence Layer

**Files:**
- Create: `~/.claude-spotify/server/src/tracklist.ts`

- [ ] **Step 1: Create tracklist.ts**

Create `~/.claude-spotify/server/src/tracklist.ts`:

```typescript
import { readFileSync, writeFileSync, existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import type { TrackList, Track, ContextData, CurrentTrack } from "./types.js";

const TRACKLIST_PATH = join(homedir(), ".claude-spotify", "tracklist.json");

function getEmptyTrackList(): TrackList {
  return { contexts: {}, currentTrack: null };
}

export function loadTrackList(): TrackList {
  if (!existsSync(TRACKLIST_PATH)) {
    return getEmptyTrackList();
  }
  try {
    const data = readFileSync(TRACKLIST_PATH, "utf-8");
    return JSON.parse(data) as TrackList;
  } catch {
    return getEmptyTrackList();
  }
}

export function saveTrackList(trackList: TrackList): void {
  writeFileSync(TRACKLIST_PATH, JSON.stringify(trackList, null, 2));
}

export function getContextData(trackList: TrackList, context: string): ContextData {
  if (!trackList.contexts[context]) {
    trackList.contexts[context] = { good: [], blocked: [] };
  }
  return trackList.contexts[context];
}

export function selectTrackForContext(trackList: TrackList, context: string): Track | null {
  const contextData = getContextData(trackList, context);
  if (contextData.good.length === 0) {
    return null;
  }
  // 50/50 chance to use known track vs search fresh
  if (Math.random() < 0.5) {
    return null;
  }
  // Weight by playCount
  const totalWeight = contextData.good.reduce((sum, t) => sum + t.playCount, 0);
  let random = Math.random() * totalWeight;
  for (const track of contextData.good) {
    random -= track.playCount;
    if (random <= 0) {
      return track;
    }
  }
  return contextData.good[0];
}

export function recordPlay(trackList: TrackList, context: string, track: string, artist: string, uri: string): void {
  const contextData = getContextData(trackList, context);

  // Check if already in good list
  const existing = contextData.good.find((t) => t.uri === uri);
  if (existing) {
    existing.playCount++;
  } else {
    contextData.good.push({ track, artist, uri, playCount: 1 });
  }

  // Update currentTrack
  trackList.currentTrack = {
    track,
    artist,
    uri,
    context,
    playedAt: new Date().toISOString(),
  };

  saveTrackList(trackList);
}

export function blockCurrentTrack(trackList: TrackList, reason: string): CurrentTrack | null {
  const current = trackList.currentTrack;
  if (!current) {
    return null;
  }

  const contextData = getContextData(trackList, current.context);

  // Remove from good list
  contextData.good = contextData.good.filter((t) => t.uri !== current.uri);

  // Add to blocked list if not already there
  if (!contextData.blocked.find((t) => t.uri === current.uri)) {
    contextData.blocked.push({
      track: current.track,
      artist: current.artist,
      uri: current.uri,
      reason,
    });
  }

  trackList.currentTrack = null;
  saveTrackList(trackList);

  return current;
}
```

- [ ] **Step 2: Commit**

```bash
cd ~/.claude-spotify/server && git add src/tracklist.ts && git commit -m "feat: add tracklist persistence layer"
```

---

### Task 5: MCP Server with Tools

**Files:**
- Create: `~/.claude-spotify/server/src/index.ts`

- [ ] **Step 1: Create index.ts with MCP server**

Create `~/.claude-spotify/server/src/index.ts`:

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as spotify from "./spotify.js";
import * as tracklist from "./tracklist.js";

const server = new McpServer({
  name: "spotify",
  version: "1.0.0",
});

server.tool(
  "play_song",
  "Search and play a song on Spotify with context for learning preferences",
  {
    query: z.string().describe("Song name, artist, or search query"),
    context: z.string().describe("Context like 'victory', 'focus', 'git_push' - used to learn preferences"),
  },
  async ({ query, context }) => {
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
      // Wait a moment for Spotify to start playing
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const status = spotify.getStatus();
      track = status.track;
      artist = status.artist;
      uri = status.uri;
      source = "fresh search";
    }

    tracklist.recordPlay(trackList, context, track, artist, uri);

    return {
      content: [
        {
          type: "text" as const,
          text: `Now playing: "${track}" by ${artist} (${source})`,
        },
      ],
    };
  }
);

server.tool(
  "thumbs_down",
  "Mark the current track as bad for its context - won't play again for this context",
  {
    reason: z.string().optional().describe("Why this track doesn't fit"),
  },
  async ({ reason }) => {
    const trackList = tracklist.loadTrackList();
    const blocked = tracklist.blockCurrentTrack(trackList, reason ?? "thumbs down");

    if (!blocked) {
      return {
        content: [
          {
            type: "text" as const,
            text: "No track currently playing to block.",
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `Blocked "${blocked.track}" by ${blocked.artist} for context "${blocked.context}". Won't play again for this context.`,
        },
      ],
    };
  }
);

server.tool(
  "set_volume",
  "Set Spotify volume level",
  {
    level: z.number().min(0).max(100).describe("Volume level from 0 to 100"),
  },
  async ({ level }) => {
    const newLevel = spotify.setVolume(level);
    return {
      content: [
        {
          type: "text" as const,
          text: `Volume set to ${newLevel}`,
        },
      ],
    };
  }
);

server.tool(
  "get_status",
  "Get current Spotify playback status",
  {},
  async () => {
    const status = spotify.getStatus();
    return {
      content: [
        {
          type: "text" as const,
          text: `Now playing: "${status.track}" by ${status.artist}\nStatus: ${status.state}\nVolume: ${status.volume}`,
        },
      ],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
```

- [ ] **Step 2: Build the project**

```bash
cd ~/.claude-spotify/server && npm run build
```

Expected: No errors, `dist/` folder created with compiled JS.

- [ ] **Step 3: Test the server starts**

```bash
cd ~/.claude-spotify/server && echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"capabilities":{}}}' | timeout 2 node dist/index.js || true
```

Expected: JSON response with server capabilities (or timeout, which is fine for stdio).

- [ ] **Step 4: Commit**

```bash
cd ~/.claude-spotify/server && git add src/index.ts && git commit -m "feat: add mcp server with all tools"
```

---

### Task 6: Configure Claude Code MCP

**Files:**
- Modify: `~/.claude/settings.json` (or create if doesn't exist)

- [ ] **Step 1: Check current Claude settings**

```bash
cat ~/.claude/settings.json 2>/dev/null || echo "{}"
```

- [ ] **Step 2: Add MCP server configuration**

Add to `~/.claude/settings.json` (merge with existing if present):

```json
{
  "mcpServers": {
    "spotify": {
      "command": "node",
      "args": ["/Users/tgmcmillen/.claude-spotify/server/dist/index.js"]
    }
  }
}
```

- [ ] **Step 3: Commit the MCP server code**

```bash
cd ~/.claude-spotify/server && git add -A && git commit -m "chore: final build" --allow-empty
```

---

### Task 7: End-to-End Test

- [ ] **Step 1: Restart Claude Code**

Exit and restart Claude Code to pick up the new MCP server.

- [ ] **Step 2: Test play_song**

In Claude Code, ask: "Play We Are the Champions for victory"

Expected: Spotify plays "We Are the Champions", Claude confirms playback.

- [ ] **Step 3: Test get_status**

Ask Claude: "What's playing?"

Expected: Claude reports current track info.

- [ ] **Step 4: Test set_volume**

Ask Claude: "Turn it down to 50"

Expected: Volume changes to 50.

- [ ] **Step 5: Test thumbs_down**

Ask Claude: "Bad song" (while a track is playing)

Expected: Track is blocked for its context.

- [ ] **Step 6: Celebrate**

If all tests pass, you should be hearing "We Are the Champions"!
