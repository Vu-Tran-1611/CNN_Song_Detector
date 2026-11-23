import { describe as group, expect, it } from "vitest";

import type { DetectorState, Recording } from "./detectorState";
import { describe } from "./detectorView";
import type { Prediction } from "./types";

const recording: Recording = { blob: new Blob(), durationSeconds: 10, sampleRate: 48000, micSettings: {} };
const song = { id: 9, title: "We Don't Talk Any More", artist: "Charlie Puth" };
const result = (recognized: boolean, probability: number): DetectorState => ({
  status: "result",
  recording,
  prediction: { recognized, song, probability, threshold: 0.8 } satisfies Prediction,
});

group("describe", () => {
  it("shows the countdown and lock while listening", () => {
    const view = describe({ status: "listening", startedAt: 0 }, 2_500);
    expect(view.main).toBe("00:18");
    expect(view.button).toBe("locked");
    expect(view.hint).toContain("8s");
    expect(describe({ status: "listening", startedAt: 0 }, 11_000).button).toBe("stop");
  });

  it("shows analyzing, then a waking-up message when slow", () => {
    expect(describe({ status: "analyzing", recording, slow: false }, 0).top).toBe("ANALYZING");
    const slow = describe({ status: "analyzing", recording, slow: true }, 0);
    expect(slow.top).toBe("WAKING UP");
    expect(slow.button).toBe("starting");
  });

  it("shows a recognized song with its probability and highlights it", () => {
    const view = describe(result(true, 0.9841), 0);
    expect(view.top).toBe("RECOGNIZED");
    expect(view.screen).toEqual({ label: "NOW PLAYING", title: "We Don't Talk Any More", subtitle: "Charlie Puth", tone: "recognized" });
    expect(view.main).toBe("98.4");
    expect(view.unit).toBe("%");
    expect(view.led).toBe("green");
    expect(view.highlight).toEqual({ songId: 9, kind: "recognized" });
  });

  it("shows 'not sure' with the best guess", () => {
    const view = describe(result(false, 0.62), 0);
    expect(view.top).toBe("NOT SURE");
    expect(view.screen).toEqual({ label: "BEST GUESS", title: "Maybe We Don't Talk Any More?", subtitle: "Charlie Puth", tone: "guess" });
    expect(view.main).toBe("62.0");
    expect(view.led).toBe("amber");
    expect(view.highlight).toEqual({ songId: 9, kind: "guess" });
  });

  it("shows errors in red with the message as the hint", () => {
    const view = describe({ status: "error", error: { code: "no-server", message: "Can't reach the server." } }, 0);
    expect(view.top).toBe("NO SERVER");
    expect(view.main).toBe("Err");
    expect(view.led).toBe("red");
    expect(view.hint).toBe("Can't reach the server.");
    expect(view.screen.tone).toBe("error");
  });
});

group("song screen", () => {
  it("is empty before any result and busy while listening or identifying", () => {
    expect(describe({ status: "idle" }, 0).screen.tone).toBe("empty");
    expect(describe({ status: "listening", startedAt: 0 }, 1_000).screen).toMatchObject({ title: "Listening…", tone: "busy" });
    expect(describe({ status: "analyzing", recording, slow: false }, 0).screen).toMatchObject({ title: "Identifying…", tone: "busy" });
  });
});
