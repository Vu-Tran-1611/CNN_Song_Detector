"use client";

import { useCallback, useEffect, useReducer, useRef, useState, useSyncExternalStore } from "react";

import { DebugPanel } from "@/components/DebugPanel";
import { InfoSheet } from "@/components/InfoSheet";
import { ClearIcon, InfoIcon } from "@/components/icons";
import { DevicePanel } from "@/components/device/DevicePanel";
import { LcdDisplay } from "@/components/device/LcdDisplay";
import { ListenButton } from "@/components/device/ListenButton";
import { NowPlayingScreen } from "@/components/device/NowPlayingScreen";
import { RecentStrip } from "@/components/device/RecentStrip";
import { RoundButton } from "@/components/device/RoundButton";
import { SongShelf } from "@/components/songs/SongShelf";
import { useCountUp } from "@/hooks/useCountUp";
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
import { statusOf } from "@/lib/types";

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
  const infoRef = useRef<HTMLDialogElement>(null);

  const recent = useSyncExternalStore(recentStore.subscribe, recentStore.getSnapshot, recentStore.getServerSnapshot);

  const debug = useSyncExternalStore(
    subscribeToNothing,
    () => new URLSearchParams(window.location.search).has("debug"),
    () => false,
  );

  const recorder = useMicRecorder({
    onInterrupted: (error) => dispatch({ type: "FAILED", error }),
  });

  const analyze = useCallback(async (recording: Recording) => {
    const slowTimer = setTimeout(() => dispatch({ type: "ANALYSIS_SLOW" }), SLOW_ANALYSIS_MS);
    try {
      const prediction = await predict(recording.blob);
      dispatch({ type: "PREDICTED", prediction });
      recentStore.add(prediction);
      if (statusOf(prediction) === "recognized") navigator.vibrate?.([25, 40, 25]);
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

  useEffect(() => {
    if (state.status !== "listening") return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (shouldAutoStop(state, t)) void stop();
    }, 100);
    return () => clearInterval(id);
  }, [state, stop]);

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

  const shown = useCountUp(state.status === "result" && state.prediction.song ? state.prediction.probability : null);
  const lcdMain = shown === null ? view.main : (shown * 100).toFixed(1).padStart(view.main.length, "!");

  return (
    <div className="grid gap-10 lg:grid-cols-[26rem_minmax(0,1fr)] lg:items-start lg:gap-14">
      <DevicePanel led={view.led} ledPulse={view.ledPulse}>
        <div className="flex flex-col gap-3">
          <LcdDisplay topLine={view.top} main={lcdMain} unit={view.unit} footLeft="CNN" footRight="10 SONGS" srStatus={view.sr} />
          <NowPlayingScreen screen={view.screen} />
        </div>

        <div className="flex flex-col items-center gap-4 py-2">
          <div className="flex w-full items-center justify-between gap-2">
            <RoundButton label="Info" icon={<InfoIcon className="size-5" />} onClick={() => infoRef.current?.showModal()} />
            <ListenButton
              mode={view.button}
              progress={progress}
              onPress={press}
              getLevel={recorder.getLevel}
              ariaLabel={view.button === "listen" ? "Listen: identify the song that's playing" : view.hint}
            />
            <RoundButton
              label="Clear"
              icon={<ClearIcon className="size-5" />}
              onClick={recentStore.clear}
              disabled={recent.length === 0}
            />
          </div>
          <p className="min-h-[2.75rem] max-w-[18rem] text-center text-base font-medium leading-snug text-panel-ink">{view.hint}</p>
        </div>

        <RecentStrip items={recent} />
      </DevicePanel>

      <div className="flex min-w-0 flex-col gap-12">
        <SongShelf highlight={view.highlight} />
        {debug && (
          <DebugPanel recording={recordingOf(state)} prediction={state.status === "result" ? state.prediction : undefined} />
        )}
      </div>

      <InfoSheet ref={infoRef} />
    </div>
  );
}
