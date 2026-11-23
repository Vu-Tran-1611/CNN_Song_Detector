import {
  MAX_RECORDING_SECONDS,
  MIN_RECORDING_SECONDS,
  canStop,
  elapsedSeconds,
  type DetectorErrorCode,
  type DetectorState,
} from "./detectorState";
import { statusOf, type NoMusicReason } from "./types";

export type LedTone = "off" | "green" | "amber" | "red";
export type ButtonMode = "listen" | "starting" | "locked" | "stop";
export type ShelfHighlight = { songId: number; kind: "recognized" | "guess" } | null;

export type SongScreen = {
  label: string;
  title: string;
  subtitle?: string;
  tone: "empty" | "busy" | "recognized" | "guess" | "error";
  songId?: number;
};

export type DetectorView = {
  top: string;
  main: string;
  unit?: string;
  led: LedTone;
  ledPulse?: boolean;
  button: ButtonMode;
  hint: string;
  sr: string;
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

const NO_MUSIC_MESSAGE: Record<NoMusicReason, string> = {
  silence: "It's too quiet. Play a song closer to the mic.",
  noise: "Only noise was heard. Try somewhere quieter.",
  tone: "That's a steady tone, not a song.",
  speech: "That sounds like talking, not music.",
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
      const { song, probability, reason } = state.prediction;
      const status = statusOf(state.prediction);
      if (status === "no_music" || !song) {
        const message =
          status === "no_music"
            ? NO_MUSIC_MESSAGE[reason ?? "silence"]
            : "I only know the 10 songs on the shelf.";
        return {
          top: status === "no_music" ? "NO MUSIC" : "UNKNOWN SONG",
          main: "--.-",
          unit: "%",
          led: "amber",
          button: "listen",
          hint: status === "no_music" ? message : "Play one of the 10 songs and try again.",
          sr: status === "no_music" ? `No music detected. ${message}` : `Not one of my 10 songs. ${message}`,
          highlight: null,
          screen:
            status === "no_music"
              ? { label: "NOW PLAYING", title: "No music detected", subtitle: message, tone: "guess" }
              : { label: "NOT IN MY LIST", title: "Not one of my 10 songs", subtitle: message, tone: "guess" },
        };
      }
      return status === "recognized"
        ? {
            top: "RECOGNIZED",
            main: percent(probability),
            unit: "%",
            led: "green",
            button: "listen",
            hint: "Tap to listen again",
            sr: `Recognized ${song.title} by ${song.artist}, ${percent(probability)} percent sure.`,
            highlight: { songId: song.id, kind: "recognized" },
            screen: { label: "NOW PLAYING", title: song.title, subtitle: song.artist, tone: "recognized", songId: song.id },
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
            screen: { label: "BEST GUESS", title: `Maybe ${song.title}?`, subtitle: song.artist, tone: "guess", songId: song.id },
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
