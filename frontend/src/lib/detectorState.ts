// The listening flow as a state machine. Each state is its own type, so the
// UI can never be in two states at once (e.g. "listening" and "recorded").
// Step 5 replaces "recorded" with analyzing -> result / not sure.

export const MIN_RECORDING_SECONDS = 5; // the model needs one full 5 s chunk
export const MAX_RECORDING_SECONDS = 10;

export type Recording = {
  blob: Blob;
  durationSeconds: number;
  sampleRate: number;
  micSettings: MediaTrackSettings;
};

export type DetectorErrorCode = "mic-denied" | "no-mic" | "unsupported" | "interrupted" | "unknown";

export type DetectorError = {
  code: DetectorErrorCode;
  message: string;
};

export type DetectorState =
  | { status: "idle" }
  | { status: "requesting" } // waiting for mic permission
  | { status: "listening"; startedAt: number }
  | { status: "recorded"; recording: Recording }
  | { status: "error"; error: DetectorError };

export type DetectorAction =
  | { type: "START" }
  | { type: "MIC_READY"; startedAt: number }
  | { type: "STOPPED"; recording: Recording }
  | { type: "FAILED"; error: DetectorError }
  | { type: "RESET" };

export const initialDetectorState: DetectorState = { status: "idle" };

export function detectorReducer(state: DetectorState, action: DetectorAction): DetectorState {
  switch (action.type) {
    case "START":
      return state.status === "listening" || state.status === "requesting" ? state : { status: "requesting" };
    case "MIC_READY":
      return state.status === "requesting" ? { status: "listening", startedAt: action.startedAt } : state;
    case "STOPPED":
      return state.status === "listening" ? { status: "recorded", recording: action.recording } : state;
    case "FAILED":
      return { status: "error", error: action.error };
    case "RESET":
      return initialDetectorState;
  }
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
