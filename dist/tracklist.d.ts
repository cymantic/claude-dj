import type { TrackList, Track, ContextData, CurrentTrack } from "./types.js";
export declare function loadTrackList(): TrackList;
export declare function saveTrackList(trackList: TrackList): void;
export declare function getContextData(trackList: TrackList, context: string): ContextData;
export declare function selectTrackForContext(trackList: TrackList, context: string): Track | null;
export declare function recordPlay(trackList: TrackList, context: string, track: string, artist: string, uri: string): void;
export declare function blockCurrentTrack(trackList: TrackList, reason: string): CurrentTrack | null;
export declare function promoteCurrentTrack(trackList: TrackList, context: string, boost: number): {
    track: string;
    artist: string;
    newPlayCount: number;
} | null;
export declare function getMoods(trackList: TrackList): Record<string, number>;
