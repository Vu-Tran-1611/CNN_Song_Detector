// What the device shows for each detector state. Pure, so it's easy to test.

import {
  MAX_RECORDING_SECONDS,
  MIN_RECORDING_SECONDS,
  canStop,
  elapsedSeconds,
  type DetectorErrorCode,
  type DetectorState,
} from "./detectorState";

export type LedTone = "off" | "green" | "amber" | "red";
export type ButtonMode = "listen" | "starting" | "locked" | "stop";
export type ShelfHighlight = { songId: number; kind: "recognized" | "guess" } | null;

/** The second screen under the LCD: which song it is. */
export type SongScreen = {
  label: string; // small caption, e.g. "NOW PLAYING"
  title: string;
  subtitle?: string;
  tone: "empty" | "busy" | "recognized" | "guess" | "error";
};

export type DetectorView = {
  top: string; // LCD text line (14-segment, uppercase)
  main: string; // LCD big digits (7-segment)
  unit?: string;
  led: LedTone;
  ledPulse?: boolean;
  button: ButtonMode;
  hint: string;
  sr: string; // plain-language status for screen readers
  highlight: ShelfHighlight;
  screen: SongScreen;
};

const ERROR_LCD: Record<DetectorErrorCode, string> = {
  "mic-denied": "MIC BLOCKED",
  "no-mic": "NO MIC",
  unsupported: "NOT SUPPORTED",
  interrupted: "STOPPED",
  "no-server": "NO SERVER",
  "too-short": "TOO SHORT",
  "too-long": "TOO LONG",
  "too-large": "TOO LARGE",
  "bad-audio": "BAD AUDIO",
  unknown: "ERROR",
};

const pad2 = (n: number) => String(Math.max(0, Math.floor(n))).padStart(2, "0");
const percent = (p: number) => (p * 100).toFixed(1);

export function describe(state: DetectorState, now: number): DetectorView {
  switch (state.status) {
    case "idle":
      return {
        top: "READY",
        main: "--.-",
        unit: "%",
        led: "off",
        button: "listen",
        hint: "Tap to identify a song",
        sr: "Ready. Press Listen to identify a song.",
        highlight: null,
        screen: { label: "NOW PLAYING", title: "No song yet", subtitle: "Play a song and tap Listen", tone: "empty" },
      };

    case "requesting":
      return {
        top: "ALLOW MIC",
        main: "--.-",
        unit: "%",
        led: "amber",
        button: "starting",
        hint: "Allow the microphone to start listening",
        sr: "Waiting for microphone permission.",
        highlight: null,
        screen: { label: "NOW PLAYING", title: "Waiting for the mic…", tone: "busy" },
      };

    case "listening": {
      const elapsed = elapsedSeconds(state, now);
      const locked = !canStop(state, now);
      return {
        top: "LISTENING",
        main: `00:${pad2(Math.ceil(MAX_RECORDING_SECONDS - elapsed))}`,
        led: "green",
        ledPulse: true,
        button: locked ? "locked" : "stop",
        hint: locked
          ? `Listening… you can stop in ${Math.ceil(MIN_RECORDING_SECONDS - elapsed)}s`
          : "Tap stop, or keep listening",
        sr: locked ? "Listening." : "Listening. You can stop now.",
        highlight: null,
        screen: { label: "NOW PLAYING", title: "Listening…", subtitle: "Keep the music playing", tone: "busy" },
      };
    }

    case "analyzing":
      return {
        top: state.slow ? "WAKING UP" : "ANALYZING",
        main: "--.-",
        unit: "%",
        led: "amber",
        ledPulse: true,
        button: "starting",
        hint: state.slow ? "The server is waking up, this can take a moment…" : "Identifying the song…",
        sr: "Identifying the song.",
        highlight: null,
        screen: { label: "NOW PLAYING", title: "Identifying…", tone: "busy" },
      };

    case "result": {
      const { recognized, song, probability } = state.prediction;
      return recognized
        ? {
            top: "RECOGNIZED",
            main: percent(probability),
            unit: "%",
            led: "green",
            button: "listen",
            hint: "Tap to listen again",
            sr: `Recognized ${song.title} by ${song.artist}, ${percent(probability)} percent sure.`,
            highlight: { songId: song.id, kind: "recognized" },
            screen: { label: "NOW PLAYING", title: song.title, subtitle: song.artist, tone: "recognized" },
          }
        : {
            top: "NOT SURE",
            main: percent(probability),
            unit: "%",
            led: "amber",
            button: "listen",
            hint: "Not sure. Try closer to the speaker.",
            sr: `Not sure. Maybe ${song.title} by ${song.artist}, ${percent(probability)} percent.`,
            highlight: { songId: song.id, kind: "guess" },
            screen: { label: "BEST GUESS", title: `Maybe ${song.title}?`, subtitle: song.artist, tone: "guess" },
          };
    }

    case "error":
      return {
        top: ERROR_LCD[state.error.code],
        main: "Err",
        led: "red",
        button: "listen",
        hint: state.error.message,
        sr: `Error: ${state.error.message}`,
        highlight: null,
        screen: { label: "NOW PLAYING", title: "No song", subtitle: "Tap Listen to try again", tone: "error" },
      };
  }
}
