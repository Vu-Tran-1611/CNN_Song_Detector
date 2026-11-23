import type { ReactNode } from "react";

import { BroadcastIcon } from "@/components/icons";

import { StatusLed, type LedTone } from "./StatusLed";

/** The blue-grey "radio" body that holds the display and controls. */
export function DevicePanel({ led, ledPulse, children }: { led: LedTone; ledPulse?: boolean; children: ReactNode }) {
  return (
    <section
      aria-label="Song detector"
      className="mx-auto flex w-full max-w-[26rem] flex-col gap-5 rounded-[2rem] panel-texture p-5 text-panel-ink shadow-[var(--shadow-panel)] sm:p-6 lg:mx-0"
    >
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Song Detector</h1>
        <div className="flex items-center gap-3 text-panel-muted">
          <StatusLed tone={led} pulse={ledPulse} />
          <BroadcastIcon className="size-7" />
        </div>
      </header>
      {children}
    </section>
  );
}
