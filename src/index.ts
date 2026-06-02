import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as spotify from "./spotify.js";
import * as tracklist from "./tracklist.js";
import * as snippet from "./snippet.js";

// Validated schemas to prevent injection and abuse
const QuerySchema = z.string()
  .min(1, "Query cannot be empty")
  .max(200, "Query too long")
  .describe("Song name, artist, or search query");

const ContextSchema = z.string()
  .min(1, "Context cannot be empty")
  .max(50, "Context too long")
  .regex(/^[a-zA-Z0-9_\-]+$/, "Context must be alphanumeric with _ or -")
  .describe("Context like 'victory', 'focus', 'git_push' - used to learn preferences");

const ReasonSchema = z.string()
  .max(200, "Reason too long")
  .optional()
  .describe("Why this track doesn't fit");

const server = new McpServer({
  name: "spotify",
  version: "1.0.0",
});

server.tool(
  "play_song",
  "Search and play a song on Spotify with context for learning preferences",
  {
    query: QuerySchema,
    context: ContextSchema,
  },
  async ({ query, context }) => {
    const trackList = tracklist.loadTrackList();

    // Always search by query — play_song is an explicit request, not ambient
    await spotify.searchAndPlay(query);
    const status = await spotify.getStatus();
    const track = status.track;
    const artist = status.artist;
    const uri = status.uri;

    tracklist.recordPlay(trackList, context, track, artist, uri);

    return {
      content: [
        {
          type: "text" as const,
          text: `Now playing: "${track}" by ${artist}`,
        },
      ],
    };
  }
);

server.tool(
  "play_snippet",
  "Play a short music snippet that auto-fades after duration",
  {
    query: QuerySchema,
    context: ContextSchema,
    duration_seconds: z.number().min(5).max(120).default(20).describe("How long to play before fade (default 20)"),
  },
  async ({ query, context, duration_seconds }) => {
    const duration = duration_seconds ?? 20;
    const trackList = tracklist.loadTrackList();

    await spotify.searchAndPlay(query);
    const status = await spotify.getStatus();
    const track = status.track;
    const artist = status.artist;
    const uri = status.uri;

    tracklist.recordPlay(trackList, context, track, artist, uri);
    snippet.startSnippet(uri, context, duration);

    return {
      content: [
        {
          type: "text" as const,
          text: `Playing snippet: "${track}" by ${artist} - will fade in ${duration}s`,
        },
      ],
    };
  }
);

server.tool(
  "thumbs_down",
  "Mark the current track as bad for its context - won't play again for this context",
  {
    reason: ReasonSchema,
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
  "promote_track",
  "Boost the current track for a mood/context - makes it more likely to play",
  {
    context: ContextSchema,
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

server.tool(
  "set_volume",
  "Set Spotify volume level",
  {
    level: z.number().min(0).max(100).describe("Volume level from 0 to 100"),
  },
  async ({ level }) => {
    const newLevel = await spotify.setVolume(level);
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
  "pause",
  "Pause Spotify playback",
  {},
  async () => {
    snippet.cancelSnippet();
    await spotify.pause();
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

server.tool(
  "resume",
  "Resume Spotify playback",
  {},
  async () => {
    await spotify.resume();
    return {
      content: [
        {
          type: "text" as const,
          text: "Resumed",
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
    const status = await spotify.getStatus();
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

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
