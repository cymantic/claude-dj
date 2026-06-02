# Spotify MCP Server Design

## Overview

An MCP server that lets Claude control Spotify playback with contextual music selection. The server learns which tracks work for which contexts (e.g., "victory", "git_push") through passive feedback.

## Architecture

```
~/.claude-spotify/
├── tracklist.json      # Learned tracks by context
└── server/
    ├── package.json
    ├── tsconfig.json
    └── src/
        └── index.ts    # Single-file MCP server
```

**Control method:** AppleScript via `osascript` - works with the local Spotify desktop app, no OAuth or API keys required.

## MCP Tools

### `play_song`
- **Input:** `query` (string), `context` (string)
- **Behavior:**
  - 50/50 chance between playing a known-good track for the context OR searching for the query
  - If no known-good tracks for context, always searches
  - Logs the played track with its context to tracklist.json
- **Returns:** track name, artist, source (known/fresh)

### `thumbs_down`
- **Input:** `reason` (optional string)
- **Behavior:**
  - Marks the current track as blocked for its context
  - Removes from good list, adds to blocked list
- **Returns:** confirmation message

### `set_volume`
- **Input:** `level` (number 0-100)
- **Behavior:** Sets Spotify volume via AppleScript
- **Returns:** new volume level

### `get_status`
- **Input:** none
- **Behavior:** Returns current playback state
- **Returns:** track name, artist, playing/paused, volume

## Data Model

**tracklist.json:**
```json
{
  "contexts": {
    "victory": {
      "good": [
        {
          "track": "We Are the Champions",
          "artist": "Queen",
          "uri": "spotify:track:xxx",
          "playCount": 3
        }
      ],
      "blocked": [
        {
          "track": "Eye of the Tiger",
          "artist": "Survivor",
          "uri": "spotify:track:yyy",
          "reason": "too cliche"
        }
      ]
    }
  },
  "currentTrack": {
    "track": "We Are the Champions",
    "artist": "Queen",
    "uri": "spotify:track:xxx",
    "context": "victory",
    "playedAt": "2026-06-02T15:45:00Z"
  }
}
```

**Design notes:**
- `currentTrack` enables `thumbs_down` to know what to block
- `playCount` allows weighting random selection toward favorites
- `blocked` prevents repeating bad matches for a context
- URIs stored to replay exact tracks without re-searching

## AppleScript Commands

```applescript
# Search and play
tell application "Spotify" to play track "spotify:search:Query%20Here"

# Get current track info
tell application "Spotify"
  set trackName to name of current track
  set trackArtist to artist of current track
  set trackURI to spotify url of current track
end tell

# Volume control (0-100)
tell application "Spotify" to set sound volume to 50

# Get playback state
tell application "Spotify" to player state
```

## Error Handling

- **Spotify not running:** Return friendly error suggesting user open Spotify
- **No search results:** Return message indicating no results, don't crash
- **Track already blocked:** Search fresh (v1 behavior)

## Learning Behavior

1. Claude calls `play_song("Push It", "git_push")`
2. Server checks for known-good tracks for "git_push" context
3. If known tracks exist: 50% chance to play a random known track, 50% chance to search fresh
4. If no known tracks: search for the query
5. Track is logged with context in `currentTrack`
6. If user says "bad song" or similar, Claude calls `thumbs_down`
7. Track moves from implicit good → blocked list
8. Tracks that aren't thumbs-downed accumulate playCount and become favorites

## Installation

The MCP server will be configured in Claude Code's settings to run as a stdio server:

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

## Success Criteria

- Running `play_song("We Are the Champions", "victory")` plays the song
- Volume can be adjusted mid-song
- `thumbs_down` blocks a track from future plays for that context
- Track list persists across sessions
