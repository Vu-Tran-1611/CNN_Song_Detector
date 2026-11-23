"use client";

import { useEffect, useMemo } from "react";

import type { Recording } from "@/lib/detectorState";
import type { Prediction } from "@/lib/types";

/** Shown only with ?debug=1: the last recording, the mic settings, and the raw backend response. */
export function DebugPanel({ recording, prediction }: { recording?: Recording; prediction?: Prediction }) {
  const url = useMemo(() => (recording ? URL.createObjectURL(recording.blob) : null), [recording]);
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url]);

  const s = recording?.micSettings;
  const rows: [string, string][] = recording
    ? [
        ["Duration", `${recording.durationSeconds.toFixed(2)} s`],
        ["Sample rate", `${recording.sampleRate} Hz`],
        ["Size", `${(recording.blob.size / 1024).toFixed(0)} KB`],
        ["Echo cancellation", String(s?.echoCancellation ?? "not reported")],
        ["Noise suppression", String(s?.noiseSuppression ?? "not reported")],
        ["Auto gain control", String(s?.autoGainControl ?? "not reported")],
        ["Mic channels", `${s?.channelCount ?? "not reported"} (saved as mono)`],
      ]
    : [];

  return (
    <section className="rounded-3xl p-5 text-sm shadow-[var(--shadow-soft-inset)]" aria-label="Debug">
      <h2 className="mb-3 font-bold text-ink">Debug: last recording</h2>
      {!recording || !url ? (
        <p className="text-ink-muted">Record something to check it here.</p>
      ) : (
        <div className="flex flex-col gap-3">
          <audio controls src={url} className="w-full" />
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
            {rows.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-ink-muted">{label}</dt>
                <dd className="font-medium text-ink">{value}</dd>
              </div>
            ))}
          </dl>
          <a href={url} download="recording.wav" className="font-semibold text-accent-deep underline">
            Download recording.wav
          </a>
          {prediction && (
            <div>
              <h3 className="mb-1 font-semibold text-ink">Backend response</h3>
              <pre className="overflow-x-auto rounded-xl bg-white/60 p-3 text-xs text-ink">
                {JSON.stringify(prediction, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
