import { execFileSync } from "child_process";
// Validate Spotify URI format to prevent AppleScript injection
const SPOTIFY_URI_REGEX = /^spotify:(track|album|playlist|artist|episode|show):[a-zA-Z0-9]+$/;
function validateSpotifyUri(uri) {
    if (!SPOTIFY_URI_REGEX.test(uri)) {
        throw new Error(`Invalid Spotify URI format: ${uri.slice(0, 50)}`);
    }
}
// Sanitize strings for AppleScript - escape quotes and backslashes
function sanitizeForAppleScript(str) {
    return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
function execAppleScript(script) {
    try {
        return execFileSync("osascript", ["-e", script], { encoding: "utf-8" }).trim();
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes("not running")) {
            throw new Error("Spotify is not running. Please open Spotify and try again.");
        }
        throw new Error("Spotify command failed");
    }
}
export function searchAndPlay(query) {
    // Limit query length and sanitize
    const safeQuery = sanitizeForAppleScript(query.slice(0, 200));
    const encodedQuery = encodeURIComponent(safeQuery);
    execAppleScript(`tell application "Spotify" to play track "spotify:search:${encodedQuery}"`);
}
export function playTrackByUri(uri) {
    validateSpotifyUri(uri);
    execAppleScript(`tell application "Spotify" to play track "${uri}"`);
}
export function setVolume(level) {
    const clamped = Math.max(0, Math.min(100, Math.round(level)));
    execAppleScript(`tell application "Spotify" to set sound volume to ${clamped}`);
    return clamped;
}
export function pause() {
    execAppleScript(`tell application "Spotify" to pause`);
}
export function resume() {
    execAppleScript(`tell application "Spotify" to play`);
}
export function getStatus() {
    const script = `tell application "Spotify"
set trackName to name of current track
set trackArtist to artist of current track
set trackURI to spotify url of current track
set playerState to player state as string
set vol to sound volume
return trackName & "|||" & trackArtist & "|||" & trackURI & "|||" & playerState & "|||" & vol
end tell`;
    const result = execAppleScript(script);
    const [track, artist, uri, state, volume] = result.split("|||");
    return {
        track,
        artist,
        uri,
        state: state === "playing" ? "playing" : state === "paused" ? "paused" : "stopped",
        volume: parseInt(volume, 10),
    };
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
export async function fadeOut(durationMs = 3000) {
    const status = getStatus();
    const startVolume = status.volume;
    const steps = 10;
    const stepMs = durationMs / steps;
    const volumeStep = startVolume / steps;
    for (let i = 1; i <= steps; i++) {
        await sleep(stepMs);
        setVolume(Math.round(startVolume - volumeStep * i));
    }
    pause();
    setVolume(startVolume); // Restore for next play
    return startVolume;
}
