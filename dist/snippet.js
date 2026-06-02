import * as spotify from "./spotify.js";
import * as tracklist from "./tracklist.js";
let activeTimer = null;
let activeSnippetData = null;
export function getActiveSnippet() {
    return activeSnippetData;
}
export function cancelSnippet() {
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
export function startSnippet(uri, context, durationSeconds) {
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
export function isSnippetActive() {
    return activeSnippetData !== null;
}
