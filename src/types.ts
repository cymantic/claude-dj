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
