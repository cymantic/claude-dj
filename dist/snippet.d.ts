import type { ActiveSnippet } from "./types.js";
export declare function getActiveSnippet(): ActiveSnippet | null;
export declare function cancelSnippet(): void;
export declare function startSnippet(uri: string, context: string, durationSeconds: number): void;
export declare function isSnippetActive(): boolean;
