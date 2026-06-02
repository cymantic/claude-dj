# Spotify MCP Server for Claude Code

A Model Context Protocol server that lets Claude control Spotify with contextual music - plays snippets based on mood/events (victory, focus, git push) and learns your preferences over time.

## Features

- **Contextual music**: Plays appropriate music based on context (victory, chill, focus, etc.)
- **Learning system**: Remembers tracks you like per context, avoids ones you block
- **Snippets**: Plays short clips (15-30s) that auto-fade, perfect for coding celebrations
- **No focus stealing**: Uses Spotify Web API so Spotify stays in background

## Prerequisites

- Node.js 18+
- Spotify Premium account (required for playback control)
- Spotify app running on your computer

## Quick Start

### 1. Clone and Build

```bash
git clone <this-repo> ~/Dev/claude-spotify
cd ~/Dev/claude-spotify
npm install
npm run build
```

### 2. Create Spotify Developer App

1. Go to https://developer.spotify.com/dashboard
2. Click **Create app**
3. Fill in:
   - App name: `Claude DJ` (or anything)
   - App description: anything
   - Redirect URI: `http://127.0.0.1:8888/callback`
4. Click **Save**
5. Click **Settings** and copy the **Client ID**

### 3. Authenticate

```bash
# Save your client ID (in repo root, gitignored)
echo "SPOTIFY_CLIENT_ID=your_client_id_here" > .env

# Run one-time auth (opens browser)
npx ts-node src/auth.ts
```

This opens your browser for Spotify login. After authorizing, tokens are saved to `tokens.json` (gitignored) and auto-refresh.

### 4. Add to Claude Code

The `.mcp.json` is already in the repo. Update the path to match your system:

```json
{
  "mcpServers": {
    "spotify": {
      "command": "node",
      "args": ["/Users/YOUR_USERNAME/Dev/claude-spotify/dist/index.js"]
    }
  }
}
```

Or copy `.mcp.json` to any project where you want Spotify integration.

### 5. Restart Claude Code

Restart Claude Code to load the MCP server. Test with: "play me something uplifting"

## MCP Tools

| Tool | Description |
|------|-------------|
| `play_song` | Search and play a song with context for learning |
| `play_snippet` | Play a short clip that auto-fades (default 20s) |
| `pause` | Pause playback |
| `resume` | Resume playback |
| `set_volume` | Set volume (0-100) |
| `get_status` | Get current playback status |
| `thumbs_down` | Block current track for its context |
| `promote_track` | Boost current track for a context |
| `cancel_snippet` | Cancel auto-fade, let song keep playing |
| `get_moods` | List known contexts and track counts |

## Optional: Companion Skill

Copy the skill to enable automatic mood detection:

```bash
mkdir -p ~/.claude/skills
cp skills/spotify-dj.md ~/.claude/skills/
```

## Optional: Auto-trigger Hooks

The `hooks/` directory contains a post-bash hook that auto-plays music on git push, test pass, etc. Configure in your Claude Code settings if desired.

## Troubleshooting

**"No active Spotify device"**
- Open Spotify desktop app and play any song briefly, then pause
- This activates the device for API control

**"Not authenticated"**
- Run `npx ts-node src/auth.ts` from the repo root

**"Token refresh failed"**
- Your refresh token may have expired (rare)
- Delete `tokens.json` and re-run auth script

**Build errors**
- Ensure Node 18+: `node --version`
- Try `rm -rf node_modules && npm install`

## Project Structure

```
claude-spotify/
├── .env                 # SPOTIFY_CLIENT_ID (create this, gitignored)
├── .mcp.json            # MCP server config for Claude Code
├── tokens.json          # OAuth tokens (auto-created, gitignored)
├── tracklist.json       # Learned preferences (auto-created, gitignored)
├── src/
│   ├── index.ts         # MCP server entry
│   ├── spotify.ts       # Web API calls
│   ├── auth.ts          # One-time auth script
│   ├── tracklist.ts     # Learning/preferences
│   ├── snippet.ts       # Auto-fade timer
│   └── types.ts         # TypeScript types
├── dist/                # Compiled JS (gitignored)
├── skills/
│   └── spotify-dj.md    # Claude skill for mood detection
└── hooks/
    └── post-bash.sh     # Optional auto-trigger hook
```

## Moving to Another Computer

1. Clone the repo
2. `npm install && npm run build`
3. Create `.env` with your `SPOTIFY_CLIENT_ID` (same one from developer.spotify.com)
4. Run `npx ts-node src/auth.ts` to authenticate
5. Update `.mcp.json` with the correct path for your system
6. Restart Claude Code

Your Spotify app credentials work across machines - you just need to re-authenticate once per machine.

## License

MIT
