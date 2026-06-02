import * as spotify from "./spotify.js";
import * as tracklist from "./tracklist.js";
import type { ActiveSnippet } from "./types.js";

let activeTimer: NodeJS.Timeout | null = null;
let activeSnippetData: ActiveSnippet | null = null;

export function getActiveSnippet(): ActiveSnippet | null {
  return activeSnippetData;
}

export function cancelSnippet(): void {
  if (activeTimer) {
    clearTimeout(activeTimer);
    activeTimer = null;
  }
  activeSnippetData = null;

  // Clear from tracklist
  const trackList = tracklist.loadTrackList();
  trackList.activeSnippet = null;
  tracklist.saveTrackList(trackList);
}

export function startSnippet(
  uri: string,
  context: string,
  durationSeconds: number
): void {
  // Cancel any existing snippet
  cancelSnippet();

  activeSnippetData = {
    uri,
    context,
    startedAt: new Date().toISOString(),
    duration: durationSeconds,
  };

  // Save to tracklist
  const trackList = tracklist.loadTrackList();
  trackList.activeSnippet = activeSnippetData;
  tracklist.saveTrackList(trackList);

  // Set timer for fade (duration - 3 seconds for fade)
  const fadeStartMs = Math.max(0, (durationSeconds - 3) * 1000);

  activeTimer = setTimeout(async () => {
    await spotify.fadeOut(3000);
    activeSnippetData = null;
    activeTimer = null;

    // Clear from tracklist
    const tl = tracklist.loadTrackList();
    tl.activeSnippet = null;
    tracklist.saveTrackList(tl);
  }, fadeStartMs);
}

export function isSnippetActive(): boolean {
  return activeSnippetData !== null;
}
