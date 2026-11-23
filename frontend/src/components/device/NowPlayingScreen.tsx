import type { SongScreen } from "@/lib/detectorView";

const TITLE_CLASS: Record<SongScreen["tone"], string> = {
  empty: "text-panel-muted",
  busy: "text-panel-ink",
  recognized: "text-[#ff8a52] [text-shadow:0_0_12px_rgba(255,120,60,0.55)]",
  guess: "text-led-amber/85",
  error: "text-led-red",
};

function Bars() {
  return (
    <span aria-hidden="true" className="flex h-4 items-end gap-[3px]">
      {[0, 150, 300, 450].map((delay) => (
        <span
          key={delay}
          className="w-[3px] rounded-full bg-accent motion-safe:animate-eq"
          style={{ animationDelay: `${delay}ms`, height: "40%" }}
        />
      ))}
    </span>
  );
}

export function NowPlayingScreen({ screen }: { screen: SongScreen }) {
  return (
    <div className="rounded-[18px] bg-[#1c202c] px-4 py-3 shadow-[var(--shadow-knob-pressed)]">
      <div className="flex items-center justify-between gap-3">
        <span className="font-lcd14 text-[10px] tracking-[0.2em] text-panel-muted/80">{screen.label}</span>
        {screen.tone === "busy" && <Bars />}
      </div>
      <div key={`${screen.tone}:${screen.title}`} className="motion-safe:animate-fade-in">
        <p className={`mt-1.5 truncate text-xl font-bold leading-tight ${TITLE_CLASS[screen.tone]}`}>{screen.title}</p>
        <p className="mt-0.5 min-h-5 truncate text-sm text-panel-muted">{screen.subtitle ?? ""}</p>
      </div>
    </div>
  );
}
