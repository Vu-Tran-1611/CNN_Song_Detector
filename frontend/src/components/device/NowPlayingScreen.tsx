import Image from "next/image";

import { linksFor } from "@/lib/covers";
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

function Artwork({ screen }: { screen: SongScreen }) {
  const links = screen.songId === undefined ? undefined : linksFor(screen.songId);
  if (!links) {
    return (
      <div aria-hidden="true" className="grid size-14 shrink-0 place-items-center rounded-xl bg-white/5">
        <span className="grid size-9 place-items-center rounded-full bg-[#101218] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
          <span className="size-2.5 rounded-full bg-white/10" />
        </span>
      </div>
    );
  }
  return (
    <a
      key={links.artwork}
      href={links.appleMusic}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Listen to this song on Apple Music"
      title="Listen on Apple Music"
      className={[
        "relative size-14 shrink-0 overflow-hidden rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.45)] motion-safe:animate-fade-in",
        screen.tone === "guess" ? "opacity-60 grayscale-[40%]" : "",
      ].join(" ")}
    >
      <Image src={links.artwork} alt="" fill unoptimized className="object-cover" />
    </a>
  );
}

export function NowPlayingScreen({ screen }: { screen: SongScreen }) {
  return (
    <div className="flex items-center gap-3.5 rounded-[18px] bg-[#1c202c] px-3.5 py-3 shadow-[var(--shadow-knob-pressed)]">
      <Artwork screen={screen} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <span className="font-lcd14 text-[10px] tracking-[0.2em] text-panel-muted/80">{screen.label}</span>
          {screen.tone === "busy" && <Bars />}
        </div>
        <div key={`${screen.tone}:${screen.title}`} className="motion-safe:animate-fade-in">
          <p className={`mt-1 truncate text-xl font-bold leading-tight ${TITLE_CLASS[screen.tone]}`}>{screen.title}</p>
          <p className="mt-0.5 min-h-5 truncate text-sm text-panel-muted">{screen.subtitle ?? ""}</p>
        </div>
      </div>
    </div>
  );
}
