"use client";

import { useCallback, useEffect, useReducer, useRef, useState, useSyncExternalStore } from "react";

import { DebugPanel } from "@/components/DebugPanel";
import { DevicePanel } from "@/components/device/DevicePanel";
import { LcdDisplay } from "@/components/device/LcdDisplay";
import { ListenButton, type ListenButtonMode } from "@/components/device/ListenButton";
import { RecentStrip } from "@/components/device/RecentStrip";
import type { LedTone } from "@/components/device/StatusLed";
import { SongShelf } from "@/components/songs/SongShelf";
import { RecorderError, useMicRecorder } from "@/hooks/useMicRecorder";
import {
  MAX_RECORDING_SECONDS,
  MIN_RECORDING_SECONDS,
  type DetectorError,
  type DetectorState,
  canStop,
  detectorReducer,
  elapsedSeconds,
  initialDetectorState,
  shouldAutoStop,
} from "@/lib/detectorState";

const ERROR_LCD: Record<DetectorError["code"], string> = {
  "mic-denied": "MIC BLOCKED",
  "no-mic": "NO MIC",
  unsupported: "NOT SUPPORTED",
  interrupted: "STOPPED",
  unknown: "ERROR",
};

function pad2(n: number) {
  return String(Math.max(0, Math.floor(n))).padStart(2, "0");
}

/** What the LCD, LED, button and hint show for each state. */
function describe(state: DetectorState, now: number) {
  const elapsed = elapsedSeconds(state, now);
  switch (state.status) {
    case "idle":
      return {
        top: "READY",
        main: "--.-",
        unit: "%",
        led: "off" as LedTone,
        button: "listen" as ListenButtonMode,
        hint: "Tap to identify a song",
        sr: "Ready. Press Listen to identify a song.",
      };
    case "requesting":
      return {
        top: "ALLOW MIC",
        main: "--.-",
        unit: "%",
        led: "amber" as LedTone,
        button: "starting" as ListenButtonMode,
        hint: "Allow the microphone to start listening",
        sr: "Waiting for microphone permission.",
      };
    case "listening": {
      const remaining = Math.ceil(MAX_RECORDING_SECONDS - elapsed);
      const locked = !canStop(state, now);
      const unlockIn = Math.ceil(MIN_RECORDING_SECONDS - elapsed);
      return {
        top: "LISTENING",
        main: `00:${pad2(remaining)}`,
        unit: undefined,
        led: "green" as LedTone,
        ledPulse: true,
        button: (locked ? "locked" : "stop") as ListenButtonMode,
        hint: locked ? `Listening… you can stop in ${unlockIn}s` : "Tap stop, or keep listening",
        sr: locked ? "Listening." : "Listening. You can stop now.",
      };
    }
    case "recorded":
      return {
        top: "RECORDED",
        main: `00:${pad2(Math.round(state.recording.durationSeconds))}`,
        unit: undefined,
        led: "off" as LedTone,
        button: "listen" as ListenButtonMode,
        hint: "Recorded. Tap to listen again",
        sr: `Recorded ${state.recording.durationSeconds.toFixed(1)} seconds.`,
      };
    case "error":
      return {
        top: ERROR_LCD[state.error.code],
        main: "Err",
        unit: undefined,
        led: "red" as LedTone,
        button: "listen" as ListenButtonMode,
        hint: state.error.message,
        sr: `Error: ${state.error.message}`,
      };
  }
}

const subscribeToNothing = () => () => {};

export function Detector() {
  const [state, dispatch] = useReducer(detectorReducer, initialDetectorState);
  const [now, setNow] = useState(0);
  const stopping = useRef(false);
  const lastRecording = state.status === "recorded" ? state.recording : null;

  // ?debug=1 shows the debug panel (read on the client only).
  const debug = useSyncExternalStore(
    subscribeToNothing,
    () => new URLSearchParams(window.location.search).has("debug"),
    () => false,
  );

  const recorder = useMicRecorder({
    onInterrupted: (error) => dispatch({ type: "FAILED", error }),
  });

  const stop = useCallback(async () => {
    if (stopping.current) return;
    stopping.current = true;
    try {
      dispatch({ type: "STOPPED", recording: await recorder.stop() });
    } catch (error) {
      dispatch({ type: "FAILED", error: error instanceof RecorderError ? error.detail : { code: "unknown", message: "Recording failed." } });
    } finally {
      stopping.current = false;
    }
  }, [recorder]);

  const press = useCallback(async () => {
    if (state.status === "listening") {
      if (canStop(state, Date.now())) await stop();
      return;
    }
    if (state.status === "requesting") return;

    dispatch({ type: "START" });
    try {
      await recorder.start();
      const startedAt = Date.now();
      setNow(startedAt);
      dispatch({ type: "MIC_READY", startedAt });
    } catch (error) {
      dispatch({ type: "FAILED", error: error instanceof RecorderError ? error.detail : { code: "unknown", message: "Couldn't start the microphone." } });
    }
  }, [state, recorder, stop]);

  // Tick the countdown while listening, and stop automatically at 10 s.
  useEffect(() => {
    if (state.status !== "listening") return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (shouldAutoStop(state, t)) void stop();
    }, 100);
    return () => clearInterval(id);
  }, [state, stop]);

  // Phones stop the mic when the page goes to the background.
  useEffect(() => {
    if (state.status !== "listening") return;
    const onHide = () => {
      if (document.visibilityState !== "hidden") return;
      recorder.cancel();
      dispatch({ type: "FAILED", error: { code: "interrupted", message: "Recording stopped because the app went to the background. Tap to try again." } });
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [state.status, recorder]);

  const view = describe(state, now);
  const progress = Math.min(1, elapsedSeconds(state, now) / MAX_RECORDING_SECONDS);

  return (
    <div className="grid gap-10 lg:grid-cols-[26rem_minmax(0,1fr)] lg:items-start lg:gap-14">
      <DevicePanel led={view.led} ledPulse={view.ledPulse}>
        <LcdDisplay topLine={view.top} main={view.main} unit={view.unit} footLeft="CNN" footRight="10 SONGS" srStatus={view.sr} />

        <div className="flex flex-col items-center gap-4 py-2">
          <ListenButton
            mode={view.button}
            progress={progress}
            onPress={press}
            getLevel={recorder.getLevel}
            ariaLabel={view.button === "listen" ? "Listen: identify the song that's playing" : view.hint}
          />
          <p className="min-h-[2.75rem] max-w-[18rem] text-center text-base font-medium leading-snug text-panel-ink">{view.hint}</p>
        </div>

        <RecentStrip items={[]} />
      </DevicePanel>

      <div className="flex min-w-0 flex-col gap-8">
        <SongShelf />
        {debug && <DebugPanel recording={lastRecording} />}
      </div>
    </div>
  );
}
