import type { SpotifyStatus } from "./types.js";
export declare function searchAndPlay(query: string): void;
export declare function playTrackByUri(uri: string): void;
export declare function setVolume(level: number): number;
export declare function pause(): void;
export declare function resume(): void;
export declare function getStatus(): SpotifyStatus;
export declare function fadeOut(durationMs?: number): Promise<number>;
