import { describe, expect, it } from "vitest";

import { addRecent, parseRecent, type RecentDetection } from "./recent";
import type { Prediction } from "./types";

const prediction = (id: number, recognized = true): Prediction => ({
  recognized,
  song: { id, title: `Song ${id}`, artist: "Artist" },
  probability: 0.9,
  threshold: 0.8,
});

describe("addRecent", () => {
  it("puts the newest first and keeps at most 3", () => {
    let list: RecentDetection[] = [];
    for (const id of [1, 2, 3, 4]) list = addRecent(list, prediction(id));
    expect(list.map((item) => item.songId)).toEqual([4, 3, 2]);
  });

  it("remembers whether it was only a guess", () => {
    expect(addRecent([], prediction(5, false))[0]).toEqual({ songId: 5, title: "Song 5", probability: 0.9, recognized: false });
  });
});

describe("parseRecent", () => {
  it("reads valid saved data", () => {
    const saved = [{ songId: 1, title: "A", probability: 0.9, recognized: true }];
    expect(parseRecent(JSON.stringify(saved))).toEqual(saved);
  });

  it("ignores missing, broken or unexpected data", () => {
    expect(parseRecent(null)).toEqual([]);
    expect(parseRecent("not json")).toEqual([]);
    expect(parseRecent(JSON.stringify({ songId: 1 }))).toEqual([]);
    expect(parseRecent(JSON.stringify([{ songId: "1" }, { songId: 2, title: "B", probability: 0.5, recognized: false }]))).toEqual([
      { songId: 2, title: "B", probability: 0.5, recognized: false },
    ]);
  });
});
