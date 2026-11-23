// The listening flow as a state machine. Each state is its own type, so the
// UI can never be in two states at once (e.g. "listening" and "result").
//
//   idle → requesting → listening → analyzing → result
//                                            ↘ error   (any state can fail)

import type { Prediction } from "./types";

export const MIN_RECORDING_SECONDS = 5; // the model needs one full 5 s chunk
export const MAX_RECORDING_SECONDS = 10;
export const SLOW_ANALYSIS_MS = 4_000; // after this, tell the user the server is waking up

export type Recording = {
  blob: Blob;
  durationSeconds: number;
  sampleRate: number;
  micSettings: MediaTrackSettings;
};

export type DetectorErrorCode =
  // microphone
  | "mic-denied"
  | "no-mic"
  | "unsupported"
  | "interrupted"
  // backend
  | "no-server"
  | "too-short"
  | "too-long"
  | "too-large"
  | "bad-audio"
  | "unknown";

export type DetectorError = {
  code: DetectorErrorCode;
  message: string;
};

export type DetectorState =
  | { status: "idle" }
  | { status: "requesting" } // waiting for mic permission
  | { status: "listening"; startedAt: number }
  | { status: "analyzing"; recording: Recording; slow: boolean }
  | { status: "result"; recording: Recording; prediction: Prediction }
  | { status: "error"; error: DetectorError; recording?: Recording };

export type DetectorAction =
  | { type: "START" }
  | { type: "MIC_READY"; startedAt: number }
  | { type: "STOPPED"; recording: Recording }
  | { type: "ANALYSIS_SLOW" }
  | { type: "PREDICTED"; prediction: Prediction }
  | { type: "FAILED"; error: DetectorError }
  | { type: "RESET" };

export const initialDetectorState: DetectorState = { status: "idle" };

const BUSY = new Set<DetectorState["status"]>(["requesting", "listening", "analyzing"]);

export function isBusy(state: DetectorState): boolean {
  return BUSY.has(state.status);
}

export function detectorReducer(state: DetectorState, action: DetectorAction): DetectorState {
  switch (action.type) {
    case "START":
      return isBusy(state) ? state : { status: "requesting" };
    case "MIC_READY":
      return state.status === "requesting" ? { status: "listening", startedAt: action.startedAt } : state;
    case "STOPPED":
      return state.status === "listening" ? { status: "analyzing", recording: action.recording, slow: false } : state;
    case "ANALYSIS_SLOW":
      return state.status === "analyzing" ? { ...state, slow: true } : state;
    case "PREDICTED":
      return state.status === "analyzing"
        ? { status: "result", recording: state.recording, prediction: action.prediction }
        : state;
    case "FAILED":
      return {
        status: "error",
        error: action.error,
        recording: state.status === "analyzing" ? state.recording : undefined,
      };
    case "RESET":
      return initialDetectorState;
  }
}

/** The recording behind the current state, if any (for the debug panel). */
export function recordingOf(state: DetectorState): Recording | undefined {
  return "recording" in state ? state.recording : undefined;
}

export function elapsedSeconds(state: DetectorState, now: number): number {
  return state.status === "listening" ? Math.max(0, (now - state.startedAt) / 1000) : 0;
}

/** Stop only unlocks once a full 5 s chunk has been recorded. */
export function canStop(state: DetectorState, now: number): boolean {
  return state.status === "listening" && elapsedSeconds(state, now) >= MIN_RECORDING_SECONDS;
}

export function shouldAutoStop(state: DetectorState, now: number): boolean {
  return state.status === "listening" && elapsedSeconds(state, now) >= MAX_RECORDING_SECONDS;
}

/** Turn a backend/API error code into what the detector shows. */
export function errorFromApi(code: string, message: string): DetectorError {
  switch (code) {
    case "network":
    case "timeout":
      return { code: "no-server", message: "Can't reach the server. Try again in a moment." };
    case "too_short":
      return { code: "too-short", message };
    case "too_long":
      return { code: "too-long", message };
    case "file_too_large":
      return { code: "too-large", message };
    case "invalid_audio":
      return { code: "bad-audio", message: "The recording couldn't be read. Try again." };
    default:
      return { code: "unknown", message };
  }
}
