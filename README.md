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

## Installation

### 1. Clone and Build

```bash
git clone https://github.com/cymantic/claude-dj.git ~/.claude-spotify
cd ~/.claude-spotify
npm install
npm run build
```

### 2. Create Spotify Developer App

> **Note:** If someone shared their Client ID with you, you can skip to step 3 and use theirs.
> Each person still authenticates with their own Spotify account.

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
cd ~/.claude-spotify

# Save the client ID
echo "SPOTIFY_CLIENT_ID=your_client_id_here" > .env

# Run one-time auth (opens browser for Spotify login)
npx ts-node src/auth.ts
```

After authorizing, tokens are saved locally and auto-refresh.

### 4. Configure Claude Code (Global)

Add to your **global** MCP config so it works in any project:

**macOS/Linux:** `~/.claude/mcp.json`

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

Or with full path (if `~` doesn't expand):

```json
{
  "mcpServers": {
    "spotify": {
      "command": "node",
      "args": ["/Users/YOUR_USERNAME/.claude-spotify/dist/index.js"]
    }
  }
}
```

**Alternative: Per-project config**

Add `.mcp.json` to any project where you want Spotify:

```json
{
  "mcpServers": {
    "spotify": {
      "command": "node",
      "args": ["/Users/YOUR_USERNAME/.claude-spotify/dist/index.js"]
    }
  }
}
```

### 5. Install Companion Skill (Recommended)

```bash
mkdir -p ~/.claude/skills
cp ~/.claude-spotify/skills/spotify-dj.md ~/.claude/skills/
```

### 6. Restart Claude Code

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

## Sharing & Client IDs

**Can I share my Client ID?**

Yes! PKCE authentication doesn't use a client secret, so sharing the Client ID is safe. Each person:
- Uses the same Client ID
- Authenticates with their own Spotify account
- Gets their own tokens (stored locally)

**Should I create my own Client ID?**

Create your own if you want:
- Separate rate limits
- Your own app name in Spotify's "Connected Apps"
- Full control over the app settings

For personal/team use, sharing one Client ID is fine.

## Troubleshooting

**"No active Spotify device"**
- Open Spotify desktop app and play any song briefly, then pause
- This activates the device for API control

**"Not authenticated"**
- Run `cd ~/.claude-spotify && npx ts-node src/auth.ts`

**"Token refresh failed"**
- Delete `~/.claude-spotify/tokens.json` and re-run auth script

**Build errors**
- Ensure Node 18+: `node --version`
- Try `rm -rf node_modules && npm install`

**MCP server not loading**
- Check path in `~/.claude/mcp.json` is correct
- Ensure `dist/` exists: `ls ~/.claude-spotify/dist/index.js`
- Rebuild if needed: `cd ~/.claude-spotify && npm run build`

## Project Structure

```
~/.claude-spotify/
├── .env                 # SPOTIFY_CLIENT_ID (create this, gitignored)
├── tokens.json          # OAuth tokens (auto-created, gitignored)
├── tracklist.json       # Learned preferences (auto-created, gitignored)
├── src/
│   ├── index.ts         # MCP server entry
│   ├── spotify.ts       # Web API calls
│   ├── auth.ts          # One-time auth script
│   ├── tracklist.ts     # Learning/preferences
│   ├── snippet.ts       # Auto-fade timer
│   └── types.ts         # TypeScript types
├── dist/                # Compiled JS (run npm run build)
├── skills/
│   └── spotify-dj.md    # Claude skill for mood detection
└── hooks/
    └── post-bash.sh     # Optional auto-trigger hook
```

## Quick Setup (TL;DR)

```bash
# Clone
git clone https://github.com/cymantic/claude-dj.git ~/.claude-spotify
cd ~/.claude-spotify

# Build
npm install && npm run build

# Auth (get client ID from developer.spotify.com or use shared one)
echo "SPOTIFY_CLIENT_ID=xxx" > .env
npx ts-node src/auth.ts

# Global MCP config
cat >> ~/.claude/mcp.json << 'EOF'
{
  "mcpServers": {
    "spotify": {
      "command": "node",
      "args": ["/Users/YOUR_USERNAME/.claude-spotify/dist/index.js"]
    }
  }
}
EOF

# Skill
cp skills/spotify-dj.md ~/.claude/skills/

# Restart Claude Code
```

## License

MIT
