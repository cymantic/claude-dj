import { readFileSync, writeFileSync, existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import type { TrackList, Track, ContextData, CurrentTrack } from "./types.js";

const TRACKLIST_PATH = join(homedir(), ".claude-spotify", "tracklist.json");

function getEmptyTrackList(): TrackList {
  return { contexts: {}, currentTrack: null };
}

export function loadTrackList(): TrackList {
  if (!existsSync(TRACKLIST_PATH)) {
    return getEmptyTrackList();
  }
  try {
    const data = readFileSync(TRACKLIST_PATH, "utf-8");
    return JSON.parse(data) as TrackList;
  } catch {
    return getEmptyTrackList();
  }
}

export function saveTrackList(trackList: TrackList): void {
  writeFileSync(TRACKLIST_PATH, JSON.stringify(trackList, null, 2));
}

export function getContextData(trackList: TrackList, context: string): ContextData {
  if (!trackList.contexts[context]) {
    trackList.contexts[context] = { good: [], blocked: [] };
  }
  return trackList.contexts[context];
}

export function selectTrackForContext(trackList: TrackList, context: string): Track | null {
  const contextData = getContextData(trackList, context);
  if (contextData.good.length === 0) {
    return null;
  }
  // 50/50 chance to use known track vs search fresh
  if (Math.random() < 0.5) {
    return null;
  }
  // Weight by playCount
  const totalWeight = contextData.good.reduce((sum, t) => sum + t.playCount, 0);
  let random = Math.random() * totalWeight;
  for (const track of contextData.good) {
    random -= track.playCount;
    if (random <= 0) {
      return track;
    }
  }
  return contextData.good[0];
}

export function recordPlay(trackList: TrackList, context: string, track: string, artist: string, uri: string): void {
  const contextData = getContextData(trackList, context);

  // Check if already in good list
  const existing = contextData.good.find((t) => t.uri === uri);
  if (existing) {
    existing.playCount++;
  } else {
    contextData.good.push({ track, artist, uri, playCount: 1 });
  }

  // Update currentTrack
  trackList.currentTrack = {
    track,
    artist,
    uri,
    context,
    playedAt: new Date().toISOString(),
  };

  saveTrackList(trackList);
}

export function blockCurrentTrack(trackList: TrackList, reason: string): CurrentTrack | null {
  const current = trackList.currentTrack;
  if (!current) {
    return null;
  }

  const contextData = getContextData(trackList, current.context);

  // Remove from good list
  contextData.good = contextData.good.filter((t) => t.uri !== current.uri);

  // Add to blocked list if not already there
  if (!contextData.blocked.find((t) => t.uri === current.uri)) {
    contextData.blocked.push({
      track: current.track,
      artist: current.artist,
      uri: current.uri,
      reason,
    });
  }

  trackList.currentTrack = null;
  saveTrackList(trackList);

  return current;
}

export function promoteCurrentTrack(
  trackList: TrackList,
  context: string,
  boost: number
): { track: string; artist: string; newPlayCount: number } | null {
  const current = trackList.currentTrack;
  if (!current) {
    return null;
  }

  const contextData = getContextData(trackList, context);
  let targetTrack = contextData.good.find((t) => t.uri === current.uri);

  if (!targetTrack) {
    // Add to this context if not already there
    targetTrack = {
      track: current.track,
      artist: current.artist,
      uri: current.uri,
      playCount: 0,
      promoted: true,
    };
    contextData.good.push(targetTrack);
  }

  targetTrack.playCount += boost;
  targetTrack.promoted = true;

  saveTrackList(trackList);

  return {
    track: targetTrack.track,
    artist: targetTrack.artist,
    newPlayCount: targetTrack.playCount,
  };
}

export function getMoods(trackList: TrackList): Record<string, number> {
  const moods: Record<string, number> = {};
  for (const [context, data] of Object.entries(trackList.contexts)) {
    moods[context] = data.good.length;
  }
  return moods;
}
