# Claude Spotify MCP Server

An MCP (Model Context Protocol) server that lets Claude Code control Spotify with contextual, learning music playback.

## Features

- **Contextual playlists** - Music learns your preferences by context (victory, chill, focus, git_push)
- **Snippet playback** - Short 15-30 second clips that auto-fade, perfect for milestone moments
- **Learning system** - Tracks that aren't thumbs-downed become favorites over time
- **Mood detection** - Claude recognizes conversational patterns and plays appropriate music
- **Auto-triggers** - Hooks can auto-play music on git commit, test pass, etc.

## Requirements

- macOS (uses AppleScript to control Spotify)
- Spotify desktop app installed and running
- Node.js 18+
- Claude Code

## Quick Start

### 1. Clone and Install

```bash
git clone <this-repo> ~/.claude-spotify
cd ~/.claude-spotify
npm install
npm run build
```

### 2. Configure Claude Code

Add to your project's `.mcp.json`:

```json
{
  "mcpServers": {
    "spotify": {
      "command": "node",
      "args": ["~/.claude-spotify/dist/index.js"]
    }
  }
}
```

Or for global access, create `~/.mcp.json` with the same content.

### 3. Restart Claude Code

Restart Claude Code to pick up the new MCP server. Approve the "spotify" server when prompted.

### 4. Test It

Say to Claude: "Play We Are the Champions for victory"

## MCP Tools

| Tool | Description |
|------|-------------|
| `play_song(query, context)` | Search and play full song |
| `play_snippet(query, context, duration_seconds)` | Play short clip with auto-fade |
| `pause()` | Pause playback |
| `resume()` | Resume playback |
| `cancel_snippet()` | Cancel auto-fade, let song continue |
| `set_volume(level)` | Set volume 0-100 |
| `get_status()` | Current track info |
| `thumbs_down(reason)` | Block track for its context |
| `promote_track(context, boost)` | Boost track for a mood |
| `get_moods()` | List known contexts |

## Companion Skill (Optional)

Copy `spotify-dj.md` to `~/.claude/skills/` to give Claude guidance on when and how to use the music tools contextually.

## Auto-Trigger Hooks (Optional)

To auto-play music on git commits and test passes:

1. Copy `hooks/post-bash.sh` to `~/.claude-spotify/hooks/`
2. Make it executable: `chmod +x ~/.claude-spotify/hooks/post-bash.sh`
3. Add to your project's `.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude-spotify/hooks/post-bash.sh \"$TOOL_OUTPUT\"",
            "async": true
          }
        ]
      }
    ]
  }
}
```

## Data Storage

Track preferences are stored in `~/.claude-spotify/tracklist.json`:

```json
{
  "contexts": {
    "victory": {
      "good": [{"track": "We Are The Champions", "artist": "Queen", "playCount": 5}],
      "blocked": []
    }
  }
}
```

## Security

This project has been security reviewed. Key protections:

- **Input validation** - All MCP tool parameters validated with Zod schemas (length limits, character restrictions)
- **AppleScript injection prevention** - Spotify URIs validated against strict regex, query strings sanitized
- **Shell injection prevention** - Uses `execFileSync` with array arguments, hook scripts use heredocs instead of interpolation
- **Sanitized hook input** - Hook scripts strip non-printable characters before processing
- **Local-only** - No network calls, API keys, or OAuth - just controls local Spotify app
- **Scoped storage** - All data in `~/.claude-spotify/`, file permissions are user-only

### Limitations

- macOS only (AppleScript)
- Requires Spotify desktop app running
- No rate limiting (relies on Claude's usage patterns)

## License

MIT
