"use client";

import { useEffect, useRef } from "react";

import { MicIcon, StopIcon } from "@/components/icons";

export type ListenButtonMode =
  | "listen" // idle: tap to start
  | "starting" // waiting for mic permission
  | "locked" // listening, stop not allowed yet (< 5 s)
  | "stop"; // listening, tap to stop

type ListenButtonProps = {
  mode: ListenButtonMode;
  progress: number; // 0..1 of the max recording time
  onPress: () => void;
  getLevel: () => number; // live mic loudness 0..1
  ariaLabel: string;
};

export function ListenButton({ mode, progress, onPress, getLevel, ariaLabel }: ListenButtonProps) {
  const levelRef = useRef<HTMLDivElement>(null);
  const listening = mode === "locked" || mode === "stop";

  // Animate the level ring outside React (no re-render every frame).
  useEffect(() => {
    const element = levelRef.current;
    if (!listening || !element) return;
    let frame = 0;
    let smoothed = 0;
    const tick = () => {
      smoothed = smoothed * 0.75 + getLevel() * 0.25;
      element.style.setProperty("--level", smoothed.toFixed(3));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      element.style.setProperty("--level", "0");
    };
  }, [listening, getLevel]);

  const label = mode === "listen" ? "Listen" : mode === "starting" ? "Wait" : "Stop";
  const disabled = mode === "starting" || mode === "locked";

  return (
    <div className="relative grid size-[clamp(10rem,48vw,12.5rem)] place-items-center">
      {/* Mic level: a soft orange glow that grows with the sound */}
      <div
        ref={levelRef}
        aria-hidden="true"
        className="absolute inset-0 rounded-full bg-accent/25 blur-md transition-transform duration-75"
        style={{ transform: "scale(calc(0.9 + var(--level, 0) * 0.35))", opacity: listening ? 1 : 0 }}
      />

      {/* Progress ring: fills up over the 10 s recording */}
      <div
        aria-hidden="true"
        className="absolute inset-0 rounded-full"
        style={{
          background: listening
            ? `conic-gradient(var(--color-accent) ${progress * 360}deg, rgba(255,255,255,0.12) 0deg)`
            : "linear-gradient(145deg, #ff8a52, var(--color-accent) 55%, var(--color-accent-deep))",
        }}
      />

      <button
        type="button"
        onClick={onPress}
        aria-disabled={disabled}
        aria-label={ariaLabel}
        className={[
          "relative grid size-[86%] place-items-center rounded-full panel-texture text-panel-ink",
          "shadow-[var(--shadow-knob)] transition-[box-shadow,transform] duration-150",
          "active:scale-[0.98] active:shadow-[var(--shadow-knob-pressed)]",
          mode === "listen" ? "animate-idle-pulse" : "",
          disabled ? "cursor-not-allowed" : "cursor-pointer",
        ].join(" ")}
      >
        <span className={`flex flex-col items-center gap-1.5 ${disabled ? "opacity-60" : ""}`}>
          {listening ? <StopIcon className="size-9" /> : <MicIcon className="size-11" />}
          <span className="text-xl font-bold uppercase tracking-[0.18em]">{label}</span>
        </span>
      </button>
    </div>
  );
}
