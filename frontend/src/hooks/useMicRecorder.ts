"use client";

import { useCallback, useEffect, useRef } from "react";

import { concatChunks, encodeWav } from "@/lib/audio/wav";
import type { DetectorError, Recording } from "@/lib/detectorState";

// Browser voice processing is tuned for calls and treats music as noise.
// It must be off so the audio matches the recordings the model trained on.
const MIC_CONSTRAINTS: MediaStreamConstraints = {
  audio: {
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
    channelCount: 1,
  },
  video: false,
};

type Session = {
  context: AudioContext;
  stream: MediaStream;
  worklet: AudioWorkletNode;
  analyser: AnalyserNode;
  chunks: Float32Array[];
  levelBuffer: Float32Array<ArrayBuffer>;
};

export class RecorderError extends Error {
  constructor(readonly detail: DetectorError) {
    super(detail.message);
  }
}

function toDetectorError(cause: unknown): DetectorError {
  const name = cause instanceof DOMException ? cause.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return { code: "mic-denied", message: "Microphone access is blocked. Allow it in your browser settings." };
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return { code: "no-mic", message: "No microphone was found." };
  }
  if (name === "NotReadableError") {
    return { code: "no-mic", message: "The microphone is being used by another app." };
  }
  return { code: "unknown", message: "Couldn't start the microphone." };
}

export function isRecordingSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    window.isSecureContext && // the mic needs HTTPS (or localhost)
    !!navigator.mediaDevices?.getUserMedia &&
    typeof AudioWorkletNode !== "undefined"
  );
}

/**
 * Records mono audio from the mic at the device's own sample rate.
 * The backend resamples to 22,050 Hz with torchaudio, as in training.
 */
export function useMicRecorder({ onInterrupted }: { onInterrupted?: (error: DetectorError) => void } = {}) {
  const session = useRef<Session | null>(null);
  const onInterruptedRef = useRef(onInterrupted);
  useEffect(() => {
    onInterruptedRef.current = onInterrupted;
  });

  const cleanup = useCallback(() => {
    const s = session.current;
    session.current = null;
    if (!s) return;
    s.stream.getTracks().forEach((track) => track.stop());
    s.worklet.port.onmessage = null;
    s.context.close().catch(() => {});
  }, []);

  const start = useCallback(async (): Promise<void> => {
    if (!isRecordingSupported()) {
      throw new RecorderError({
        code: "unsupported",
        message: window.isSecureContext
          ? "This browser can't record audio. Try Chrome or Safari."
          : "The microphone only works over HTTPS.",
      });
    }
    cleanup();

    // Create the AudioContext right away, inside the tap: iPhone Safari only
    // allows audio to start from a direct user action.
    const context = new AudioContext();
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia(MIC_CONSTRAINTS);
    } catch (cause) {
      context.close().catch(() => {});
      throw new RecorderError(toDetectorError(cause));
    }

    try {
      await context.resume();
      await context.audioWorklet.addModule("/worklets/recorder-processor.js");

      const source = context.createMediaStreamSource(stream);
      const worklet = new AudioWorkletNode(context, "recorder-processor");
      const analyser = context.createAnalyser();
      analyser.fftSize = 1024;

      // The worklet has to reach the destination to be processed; a muted
      // gain node keeps the mic from playing back through the speakers.
      const mute = context.createGain();
      mute.gain.value = 0;
      source.connect(worklet).connect(mute).connect(context.destination);
      source.connect(analyser);

      const chunks: Float32Array[] = [];
      worklet.port.onmessage = (event) => {
        if (event.data instanceof Float32Array) chunks.push(event.data);
      };

      // Mic unplugged or taken by another app.
      stream.getAudioTracks()[0]?.addEventListener("ended", () => {
        cleanup();
        onInterruptedRef.current?.({ code: "interrupted", message: "The microphone stopped." });
      });

      session.current = {
        context,
        stream,
        worklet,
        analyser,
        chunks,
        levelBuffer: new Float32Array(analyser.fftSize),
      };
    } catch {
      stream.getTracks().forEach((track) => track.stop());
      context.close().catch(() => {});
      throw new RecorderError({ code: "unknown", message: "Couldn't start recording." });
    }
  }, [cleanup]);

  const stop = useCallback(async (): Promise<Recording> => {
    const s = session.current;
    if (!s) throw new RecorderError({ code: "unknown", message: "Recording isn't running." });

    // Ask the worklet for its last partial batch before closing.
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(resolve, 300);
      s.worklet.port.onmessage = (event) => {
        if (event.data instanceof Float32Array) s.chunks.push(event.data);
        if (event.data === "flushed") {
          clearTimeout(timeout);
          resolve();
        }
      };
      s.worklet.port.postMessage("flush");
    });

    const samples = concatChunks(s.chunks);
    const sampleRate = s.context.sampleRate;
    const micSettings = s.stream.getAudioTracks()[0]?.getSettings() ?? {};
    cleanup();

    return {
      blob: encodeWav(samples, sampleRate),
      durationSeconds: samples.length / sampleRate,
      sampleRate,
      micSettings,
    };
  }, [cleanup]);

  /** Current mic loudness, 0..1 (for the level ring). Cheap: call it every frame. */
  const getLevel = useCallback((): number => {
    const s = session.current;
    if (!s) return 0;
    s.analyser.getFloatTimeDomainData(s.levelBuffer);
    let sum = 0;
    for (const v of s.levelBuffer) sum += v * v;
    const rms = Math.sqrt(sum / s.levelBuffer.length);
    return Math.min(1, rms * 4); // music at normal volume ~0.05-0.25 RMS
  }, []);

  // Release the mic if the component goes away mid-recording.
  useEffect(() => cleanup, [cleanup]);

  return { start, stop, cancel: cleanup, getLevel };
}
