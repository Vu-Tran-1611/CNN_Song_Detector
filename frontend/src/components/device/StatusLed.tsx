import type { LedTone } from "@/lib/detectorView";

export type { LedTone };

const TONE_CLASS: Record<LedTone, string> = {
  off: "bg-[#2c3348] shadow-[inset_1px_1px_3px_rgba(0,0,0,0.6)]",
  green: "bg-led-green shadow-[0_0_10px_2px_rgba(94,227,106,0.7)]",
  amber: "bg-led-amber shadow-[0_0_10px_2px_rgba(255,181,71,0.7)]",
  red: "bg-led-red shadow-[0_0_10px_2px_rgba(255,90,79,0.7)]",
};

export function StatusLed({ tone, pulse = false }: { tone: LedTone; pulse?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block size-3 rounded-full transition-colors ${TONE_CLASS[tone]} ${pulse ? "animate-led-pulse" : ""}`}
    />
  );
}
