"use client";

import { useCallback, useEffect, useReducer, useRef, useState, useSyncExternalStore } from "react";

import { DebugPanel } from "@/components/DebugPanel";
import { DevicePanel } from "@/components/device/DevicePanel";
import { LcdDisplay } from "@/components/device/LcdDisplay";
import { ListenButton } from "@/components/device/ListenButton";
import { NowPlayingScreen } from "@/components/device/NowPlayingScreen";
import { RecentStrip } from "@/components/device/RecentStrip";
import { SongShelf } from "@/components/songs/SongShelf";
import { RecorderError, useMicRecorder } from "@/hooks/useMicRecorder";
import { ApiError, predict } from "@/lib/api";
import {
  MAX_RECORDING_SECONDS,
  SLOW_ANALYSIS_MS,
  type DetectorError,
  type Recording,
  canStop,
  detectorReducer,
  elapsedSeconds,
  errorFromApi,
  initialDetectorState,
  recordingOf,
  shouldAutoStop,
} from "@/lib/detectorState";
import { describe } from "@/lib/detectorView";
import { recentStore } from "@/lib/recent";

const subscribeToNothing = () => () => {};

function toDetectorError(error: unknown, fallback: string): DetectorError {
  if (error instanceof RecorderError) return error.detail;
  if (error instanceof ApiError) return errorFromApi(error.code, error.message);
  return { code: "unknown", message: fallback };
}

export function Detector() {
  const [state, dispatch] = useReducer(detectorReducer, initialDetectorState);
  const [now, setNow] = useState(0);
  const stopping = useRef(false);

  const recent = useSyncExternalStore(recentStore.subscribe, recentStore.getSnapshot, recentStore.getServerSnapshot);

  // ?debug=1 shows the debug panel (read on the client only).
  const debug = useSyncExternalStore(
    subscribeToNothing,
    () => new URLSearchParams(window.location.search).has("debug"),
    () => false,
  );

  const recorder = useMicRecorder({
    onInterrupted: (error) => dispatch({ type: "FAILED", error }),
  });

  /** Send the recording to the backend and show the answer. */
  const analyze = useCallback(async (recording: Recording) => {
    const slowTimer = setTimeout(() => dispatch({ type: "ANALYSIS_SLOW" }), SLOW_ANALYSIS_MS);
    try {
      const prediction = await predict(recording.blob);
      dispatch({ type: "PREDICTED", prediction });
      recentStore.add(prediction);
    } catch (error) {
      dispatch({ type: "FAILED", error: toDetectorError(error, "Something went wrong. Try again.") });
    } finally {
      clearTimeout(slowTimer);
    }
  }, []);

  const stop = useCallback(async () => {
    if (stopping.current) return;
    stopping.current = true;
    try {
      const recording = await recorder.stop();
      dispatch({ type: "STOPPED", recording });
      await analyze(recording);
    } catch (error) {
      dispatch({ type: "FAILED", error: toDetectorError(error, "Recording failed.") });
    } finally {
      stopping.current = false;
    }
  }, [recorder, analyze]);

  const press = useCallback(async () => {
    if (state.status === "listening") {
      if (canStop(state, Date.now())) await stop();
      return;
    }
    if (state.status === "requesting" || state.status === "analyzing") return;

    dispatch({ type: "START" });
    try {
      await recorder.start();
      const startedAt = Date.now();
      setNow(startedAt);
      dispatch({ type: "MIC_READY", startedAt });
    } catch (error) {
      dispatch({ type: "FAILED", error: toDetectorError(error, "Couldn't start the microphone.") });
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
      dispatch({
        type: "FAILED",
        error: { code: "interrupted", message: "Recording stopped because the app went to the background. Tap to try again." },
      });
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [state.status, recorder]);

  const view = describe(state, now);
  const progress = Math.min(1, elapsedSeconds(state, now) / MAX_RECORDING_SECONDS);

  return (
    <div className="grid gap-10 lg:grid-cols-[26rem_minmax(0,1fr)] lg:items-start lg:gap-14">
      <DevicePanel led={view.led} ledPulse={view.ledPulse}>
        <div className="flex flex-col gap-3">
          <LcdDisplay topLine={view.top} main={view.main} unit={view.unit} footLeft="CNN" footRight="10 SONGS" srStatus={view.sr} />
          <NowPlayingScreen screen={view.screen} />
        </div>

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

        <RecentStrip items={recent} />
      </DevicePanel>

      <div className="flex min-w-0 flex-col gap-8">
        <SongShelf highlight={view.highlight} />
        {debug && (
          <DebugPanel recording={recordingOf(state)} prediction={state.status === "result" ? state.prediction : undefined} />
        )}
      </div>
    </div>
  );
}
