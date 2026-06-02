# Claude DJ

A Spotify MCP server for Claude Code that plays music based on what's happening in your coding session — snippets on git pushes, victory tracks when tests pass, lyric detection, and smart song selection via Claude AI or your own curated pools.

## Features

- **Auto-triggers**: Plays a snippet on git push/commit, test pass, or build success
- **Lyric detection**: Say "don't stop me now" or "living on a prayer" mid-conversation and it plays the song
- **Smart selection**: Use Claude AI to pick songs based on your actual commit message, or configure your own pools per mood
- **Snippets**: 15–30s auto-fading clips so music never overstays its welcome — say "keep it going" to let a song ride
- **Learning**: Thumbs down a track and it never plays for that context again
- **No focus stealing**: Uses Spotify Web API — Spotify stays in the background

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

> **Note:** If someone shared their Client ID with you, skip to step 3.
> Each person authenticates with their own Spotify account.

1. Go to https://developer.spotify.com/dashboard
2. Click **Create app**
3. Fill in:
   - App name: `Claude DJ` (or anything)
   - Redirect URI: `http://127.0.0.1:8888/callback`
4. Click **Save**, then **Settings**, and copy the **Client ID**

### 3. Authenticate

```bash
cd ~/.claude-spotify
echo "SPOTIFY_CLIENT_ID=your_client_id_here" > .env
npx ts-node src/auth.ts   # opens browser for Spotify login
```

Tokens are saved locally and auto-refresh.

### 4. Configure Claude Code (Global)

Add to your **global** MCP config so it works in every project:

**macOS/Linux:** `~/.claude/mcp.json`

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

This teaches Claude when to play music, how to detect song lyrics in conversation, and how to respond to "keep it going", "bad song", etc.

### 6. Wire up the Global Hook (Recommended)

Add this to `~/.claude/settings.json` so the auto-trigger fires in every project:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Bash",
        "hooks": [{ "type": "command", "command": "~/.claude-spotify/hooks/post-bash.sh" }]
      }
    ]
  }
}
```

### 7. Restart Claude Code

Test with: *"play me something uplifting"* or just do a `git push`.

---

## Song Selection: Pool Mode vs Claude Mode

By default Claude DJ picks randomly from built-in song pools per context. To customise, copy the example config:

```bash
cp ~/.claude-spotify/claude-dj.config.json.example ~/.claude-spotify/claude-dj.config.json
```

### Pool Mode (default)

Edit `claude-dj.config.json` to set your own lists:

```json
{
  "suggestionMode": "pool",
  "pools": {
    "git_push": [
      "Push It Salt-N-Pepa",
      "Don't Stop Me Now Queen",
      "Song 2 Blur"
    ],
    "victory": [
      "We Are The Champions Queen",
      "Celebration Kool and the Gang"
    ],
    "chill": ["Weightless Marconi Union"],
    "focus": ["Experience Ludovico Einaudi"]
  }
}
```

### Claude Mode

Set `"suggestionMode": "claude"` and add your Anthropic API key to `.env`:

```bash
echo "ANTHROPIC_API_KEY=sk-ant-..." >> .env
```

Claude DJ will then call Claude Haiku with the actual context (e.g. your commit message) and pick a thematically fitting song. Falls back to pool if the API is unavailable.

---

## MCP Tools

| Tool | Description |
|------|-------------|
| `play_for_context` | Play a snippet for a mood/event — uses pool or Claude AI to pick the song |
| `play_song` | Search and play a specific song (explicit request, always fresh search) |
| `play_snippet` | Play a short clip that auto-fades (default 20s) |
| `pause` | Pause playback |
| `resume` | Resume playback |
| `set_volume` | Set volume (0–100) |
| `get_status` | Get current playback status |
| `thumbs_down` | Block current track for its context — won't play again |
| `promote_track` | Boost current track for a context |
| `cancel_snippet` | Cancel auto-fade, let the song keep playing |
| `get_moods` | List known contexts and track counts |

---

## Sharing & Client IDs

PKCE authentication doesn't use a client secret, so sharing your Client ID is safe. Each person authenticates with their own Spotify account and gets their own tokens stored locally. For personal or team use, one shared Client ID is fine.

---

## Troubleshooting

**"No active Spotify device"**
Open Spotify, play any song briefly, then pause — this activates the device for API control.

**"Not authenticated"**
Run `cd ~/.claude-spotify && npx ts-node src/auth.ts`

**"Token refresh failed"**
Delete `~/.claude-spotify/tokens.json` and re-run the auth script.

**Songs not changing / playing wrong track**
Restart Claude Code — the MCP server process must reload to pick up rebuilt code.

**Build errors**
Ensure Node 18+: `node --version`. Try `rm -rf node_modules && npm install`.

**MCP server not loading**
Check path in `~/.claude/mcp.json`. Ensure `dist/` exists: `ls ~/.claude-spotify/dist/index.js`.

---

## Project Structure

```
~/.claude-spotify/
├── .env                          # SPOTIFY_CLIENT_ID + ANTHROPIC_API_KEY (gitignored)
├── tokens.json                   # OAuth tokens (auto-created, gitignored)
├── tracklist.json                # Learned preferences (auto-created, gitignored)
├── claude-dj.config.json         # Your config: mode + custom pools (gitignored)
├── claude-dj.config.json.example # Copy this to get started
├── src/
│   ├── index.ts                  # MCP server entry + all tools
│   ├── config.ts                 # Config loading + song pools
│   ├── suggest.ts                # Claude AI song suggestion
│   ├── spotify.ts                # Spotify Web API calls
│   ├── auth.ts                   # One-time auth script
│   ├── tracklist.ts              # Learning/preferences
│   ├── snippet.ts                # Auto-fade timer
│   └── types.ts                  # TypeScript types
├── dist/                         # Compiled JS (run npm run build)
├── skills/
│   └── spotify-dj.md             # Claude skill: mood detection + lyric triggers
└── hooks/
    └── post-bash.sh              # PostToolUse hook: auto-trigger on git/test/build
```

## License

MIT
