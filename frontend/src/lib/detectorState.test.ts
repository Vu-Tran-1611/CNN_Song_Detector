import { describe, expect, it } from "vitest";

import {
  canStop,
  detectorReducer,
  initialDetectorState,
  shouldAutoStop,
  type DetectorState,
  type Recording,
} from "./detectorState";

const recording: Recording = { blob: new Blob(), durationSeconds: 10, sampleRate: 48000, micSettings: {} };
const listening = (startedAt = 0): DetectorState => ({ status: "listening", startedAt });

describe("detectorReducer", () => {
  it("follows idle -> requesting -> listening -> recorded", () => {
    let state = detectorReducer(initialDetectorState, { type: "START" });
    expect(state.status).toBe("requesting");
    state = detectorReducer(state, { type: "MIC_READY", startedAt: 1000 });
    expect(state).toEqual({ status: "listening", startedAt: 1000 });
    state = detectorReducer(state, { type: "STOPPED", recording });
    expect(state).toEqual({ status: "recorded", recording });
  });

  it("ignores actions that don't fit the current state", () => {
    expect(detectorReducer(initialDetectorState, { type: "MIC_READY", startedAt: 1 })).toBe(initialDetectorState);
    expect(detectorReducer(initialDetectorState, { type: "STOPPED", recording })).toBe(initialDetectorState);
    const state = listening();
    expect(detectorReducer(state, { type: "START" })).toBe(state);
  });

  it("can fail from any state and start again", () => {
    const error = { code: "mic-denied" as const, message: "blocked" };
    const failed = detectorReducer(listening(), { type: "FAILED", error });
    expect(failed).toEqual({ status: "error", error });
    expect(detectorReducer(failed, { type: "START" }).status).toBe("requesting");
  });
});

describe("stop rules", () => {
  it("locks stop for the first 5 seconds", () => {
    expect(canStop(listening(0), 4_999)).toBe(false);
    expect(canStop(listening(0), 5_000)).toBe(true);
    expect(canStop(initialDetectorState, 99_999)).toBe(false);
  });

  it("stops automatically at 10 seconds", () => {
    expect(shouldAutoStop(listening(0), 9_999)).toBe(false);
    expect(shouldAutoStop(listening(0), 10_000)).toBe(true);
  });
});
