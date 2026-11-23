import { describe, expect, it } from "vitest";

import {
  canStop,
  detectorReducer,
  errorFromApi,
  initialDetectorState,
  shouldAutoStop,
  type DetectorState,
  type Recording,
} from "./detectorState";
import type { Prediction } from "./types";

const recording: Recording = { blob: new Blob(), durationSeconds: 10, sampleRate: 48000, micSettings: {} };
const prediction: Prediction = {
  recognized: true,
  song: { id: 0, title: "Attention", artist: "Charlie Puth" },
  probability: 0.9841,
  threshold: 0.8,
};
const listening = (startedAt = 0): DetectorState => ({ status: "listening", startedAt });
const analyzing: DetectorState = { status: "analyzing", recording, slow: false };

describe("detectorReducer", () => {
  it("follows idle -> requesting -> listening -> analyzing -> result", () => {
    let state = detectorReducer(initialDetectorState, { type: "START" });
    expect(state.status).toBe("requesting");
    state = detectorReducer(state, { type: "MIC_READY", startedAt: 1000 });
    expect(state).toEqual({ status: "listening", startedAt: 1000 });
    state = detectorReducer(state, { type: "STOPPED", recording });
    expect(state).toEqual(analyzing);
    state = detectorReducer(state, { type: "PREDICTED", prediction });
    expect(state).toEqual({ status: "result", recording, prediction });
  });

  it("marks a slow analysis, only while analyzing", () => {
    expect(detectorReducer(analyzing, { type: "ANALYSIS_SLOW" })).toEqual({ ...analyzing, slow: true });
    expect(detectorReducer(initialDetectorState, { type: "ANALYSIS_SLOW" })).toBe(initialDetectorState);
  });

  it("ignores actions that don't fit the current state", () => {
    expect(detectorReducer(initialDetectorState, { type: "MIC_READY", startedAt: 1 })).toBe(initialDetectorState);
    expect(detectorReducer(initialDetectorState, { type: "STOPPED", recording })).toBe(initialDetectorState);
    expect(detectorReducer(initialDetectorState, { type: "PREDICTED", prediction })).toBe(initialDetectorState);
    expect(detectorReducer(listening(), { type: "PREDICTED", prediction }).status).toBe("listening");
  });

  it("does not start a new recording while busy", () => {
    for (const busy of [listening(), analyzing, { status: "requesting" } as DetectorState]) {
      expect(detectorReducer(busy, { type: "START" })).toBe(busy);
    }
  });

  it("can listen again after a result or an error", () => {
    const result = detectorReducer(analyzing, { type: "PREDICTED", prediction });
    expect(detectorReducer(result, { type: "START" }).status).toBe("requesting");
    const failed = detectorReducer(listening(), { type: "FAILED", error: { code: "mic-denied", message: "x" } });
    expect(detectorReducer(failed, { type: "START" }).status).toBe("requesting");
  });

  it("keeps the recording when the analysis fails (for the debug panel)", () => {
    const failed = detectorReducer(analyzing, { type: "FAILED", error: { code: "no-server", message: "x" } });
    expect(failed).toEqual({ status: "error", error: { code: "no-server", message: "x" }, recording });
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

describe("errorFromApi", () => {
  it("maps backend codes to detector errors", () => {
    expect(errorFromApi("network", "x").code).toBe("no-server");
    expect(errorFromApi("timeout", "x").code).toBe("no-server");
    expect(errorFromApi("too_short", "Recording must be at least 5 seconds.")).toEqual({
      code: "too-short",
      message: "Recording must be at least 5 seconds.",
    });
    expect(errorFromApi("invalid_audio", "x").code).toBe("bad-audio");
    expect(errorFromApi("something_new", "Odd error")).toEqual({ code: "unknown", message: "Odd error" });
  });
});
