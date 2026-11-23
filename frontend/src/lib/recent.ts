import type { Prediction } from "./types";

export const MAX_RECENT = 3;
const STORAGE_KEY = "song-detector:recent:v1";

export type RecentDetection = {
  songId: number;
  title: string;
  probability: number;
  recognized: boolean;
};

const EMPTY: RecentDetection[] = [];

export function addRecent(list: RecentDetection[], prediction: Prediction): RecentDetection[] {
  const item: RecentDetection = {
    songId: prediction.song.id,
    title: prediction.song.title,
    probability: prediction.probability,
    recognized: prediction.recognized,
  };
  return [item, ...list].slice(0, MAX_RECENT);
}

function isRecent(value: unknown): value is RecentDetection {
  const v = value as RecentDetection;
  return (
    typeof v === "object" &&
    v !== null &&
    typeof v.songId === "number" &&
    typeof v.title === "string" &&
    typeof v.probability === "number" &&
    typeof v.recognized === "boolean"
  );
}

export function parseRecent(raw: string | null): RecentDetection[] {
  if (!raw) return EMPTY;
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter(isRecent).slice(0, MAX_RECENT) : EMPTY;
  } catch {
    return EMPTY;
  }
}

let cache: RecentDetection[] | null = null;
const listeners = new Set<() => void>();

function read(): RecentDetection[] {
  try {
    return parseRecent(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return EMPTY;
  }
}

export const recentStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot(): RecentDetection[] {
    cache ??= read();
    return cache;
  },
  getServerSnapshot(): RecentDetection[] {
    return EMPTY;
  },
  add(prediction: Prediction) {
    cache = addRecent(recentStore.getSnapshot(), prediction);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
    } catch {}
    listeners.forEach((listener) => listener());
  },
  clear() {
    cache = EMPTY;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {}
    listeners.forEach((listener) => listener());
  },
};
