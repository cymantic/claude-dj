import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { SpotifyStatus } from "./types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, "..");
const TOKENS_PATH = join(PROJECT_ROOT, "tokens.json");
const ENV_PATH = join(PROJECT_ROOT, ".env");

interface SavedTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  clientId: string;
}

let cachedTokens: SavedTokens | null = null;

function loadEnv(): void {
  if (existsSync(ENV_PATH)) {
    const content = readFileSync(ENV_PATH, "utf-8");
    for (const line of content.split("\n")) {
      const [key, ...valueParts] = line.split("=");
      if (key && valueParts.length > 0) {
        const value = valueParts.join("=").trim();
        if (!process.env[key.trim()]) {
          process.env[key.trim()] = value;
        }
      }
    }
  }
}

function loadTokens(): SavedTokens {
  if (cachedTokens && cachedTokens.expiresAt > Date.now() + 60000) {
    return cachedTokens;
  }

  if (!existsSync(TOKENS_PATH)) {
    throw new Error(
      "Not authenticated. Run: cd ~/.claude-spotify/server && npx ts-node src/auth.ts"
    );
  }

  const data = readFileSync(TOKENS_PATH, "utf-8");
  cachedTokens = JSON.parse(data) as SavedTokens;
  return cachedTokens;
}

function saveTokens(tokens: SavedTokens): void {
  writeFileSync(TOKENS_PATH, JSON.stringify(tokens, null, 2));
  cachedTokens = tokens;
}

async function refreshAccessToken(): Promise<string> {
  loadEnv();
  const tokens = loadTokens();

  // If token is still valid, use it
  if (tokens.expiresAt > Date.now() + 60000) {
    return tokens.accessToken;
  }

  const clientId = tokens.clientId || process.env.SPOTIFY_CLIENT_ID;
  if (!clientId) {
    throw new Error("No client ID found in tokens or environment");
  }

  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: tokens.refreshToken,
    client_id: clientId,
  });

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${error}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  };

  const newTokens: SavedTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || tokens.refreshToken,
    expiresAt: Date.now() + data.expires_in * 1000,
    clientId,
  };

  saveTokens(newTokens);
  return newTokens.accessToken;
}

async function spotifyApi(
  endpoint: string,
  method: string = "GET",
  body?: object
): Promise<Response> {
  const accessToken = await refreshAccessToken();

  const response = await fetch(`https://api.spotify.com/v1${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  return response;
}

export async function searchAndPlay(query: string): Promise<void> {
  // Search for track
  const searchResponse = await spotifyApi(
    `/search?q=${encodeURIComponent(query)}&type=track&limit=1`
  );

  if (!searchResponse.ok) {
    throw new Error(`Search failed: ${searchResponse.status}`);
  }

  const searchData = (await searchResponse.json()) as {
    tracks: { items: Array<{ uri: string }> };
  };

  if (!searchData.tracks?.items?.length) {
    throw new Error(`No tracks found for: ${query}`);
  }

  const trackUri = searchData.tracks.items[0].uri;
  await playTrackByUri(trackUri);
}

export async function playTrackByUri(uri: string): Promise<void> {
  // Validate URI format
  if (!uri.startsWith("spotify:track:")) {
    throw new Error(`Invalid track URI: ${uri}`);
  }

  const response = await spotifyApi("/me/player/play", "PUT", {
    uris: [uri],
  });

  // 204 = success, 404 = no active device
  if (response.status === 404) {
    throw new Error(
      "No active Spotify device. Open Spotify and start playing something first."
    );
  }

  if (!response.ok && response.status !== 204) {
    const error = await response.text();
    throw new Error(`Play failed: ${error}`);
  }
}

export async function setVolume(level: number): Promise<number> {
  const clamped = Math.max(0, Math.min(100, Math.round(level)));

  const response = await spotifyApi(
    `/me/player/volume?volume_percent=${clamped}`,
    "PUT"
  );

  if (!response.ok && response.status !== 204) {
    throw new Error(`Volume set failed: ${response.status}`);
  }

  return clamped;
}

export async function pause(): Promise<void> {
  const response = await spotifyApi("/me/player/pause", "PUT");

  if (!response.ok && response.status !== 204) {
    // Ignore "already paused" errors
    if (response.status !== 403) {
      throw new Error(`Pause failed: ${response.status}`);
    }
  }
}

export async function resume(): Promise<void> {
  const response = await spotifyApi("/me/player/play", "PUT");

  if (response.status === 404) {
    throw new Error("No active Spotify device");
  }

  if (!response.ok && response.status !== 204) {
    throw new Error(`Resume failed: ${response.status}`);
  }
}

export async function getStatus(): Promise<SpotifyStatus> {
  const response = await spotifyApi("/me/player/currently-playing");

  if (response.status === 204 || response.status === 404) {
    return {
      track: "Nothing playing",
      artist: "",
      uri: "",
      state: "stopped",
      volume: 0,
    };
  }

  if (!response.ok) {
    throw new Error(`Status failed: ${response.status}`);
  }

  const data = (await response.json()) as {
    item?: {
      name: string;
      artists: Array<{ name: string }>;
      uri: string;
    };
    is_playing: boolean;
    device?: { volume_percent: number };
  };

  return {
    track: data.item?.name || "Unknown",
    artist: data.item?.artists?.map((a) => a.name).join(", ") || "Unknown",
    uri: data.item?.uri || "",
    state: data.is_playing ? "playing" : "paused",
    volume: data.device?.volume_percent || 50,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fadeOut(durationMs: number = 3000): Promise<number> {
  const status = await getStatus();
  const startVolume = status.volume;
  const steps = 10;
  const stepMs = durationMs / steps;
  const volumeStep = startVolume / steps;

  for (let i = 1; i <= steps; i++) {
    await sleep(stepMs);
    await setVolume(Math.round(startVolume - volumeStep * i));
  }
  await pause();
  await setVolume(startVolume); // Restore for next play
  return startVolume;
}
