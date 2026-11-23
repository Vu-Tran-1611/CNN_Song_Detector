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
      {/* Idle: a soft white ripple that says "tap me" */}
      {mode === "listen" && (
        <div aria-hidden="true" className="absolute inset-[7%] rounded-full motion-safe:animate-idle-pulse" />
      )}

      {/* Mic level: a soft light glow that grows with the sound */}
      <div
        ref={levelRef}
        aria-hidden="true"
        className="absolute inset-0 rounded-full bg-white/15 blur-md transition-transform duration-75"
        style={{ transform: "scale(calc(0.9 + var(--level, 0) * 0.35))", opacity: listening ? 1 : 0 }}
      />

      {/* Ring: a muted rim in the panel's own colors; while listening it fills up over the 10 s */}
      <div
        aria-hidden="true"
        className="absolute inset-0 rounded-full shadow-[inset_2px_2px_5px_rgba(0,0,0,0.35),inset_-2px_-2px_5px_rgba(255,255,255,0.08)]"
        style={{
          background: listening
            ? `conic-gradient(var(--color-accent) ${progress * 360}deg, rgba(255,255,255,0.1) 0deg)`
            : "linear-gradient(145deg, #6c7693, #4d5670 55%, #3d4459)",
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
