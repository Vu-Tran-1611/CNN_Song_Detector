import type { Song } from "@/lib/types";

const LABEL_COLORS = [
  "#f25c22",
  "#3b82f6",
  "#a855f7",
  "#14b8a6",
  "#ec4899",
  "#eab308",
  "#22c55e",
  "#6366f1",
  "#ef4444",
  "#0ea5e9",
];

const SMALL_WORDS = new Set(["a", "an", "the", "of", "to", "and", "in", "on"]);

function initials(title: string) {
  const words = title.split(/\s+/).filter(Boolean);
  const main = words.filter((word) => !SMALL_WORDS.has(word.toLowerCase()));
  return (main.length > 0 ? main : words)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join("");
}

export type VinylHighlight = "recognized" | "guess" | null;

export function VinylRecord({ song, highlight = null }: { song: Song; highlight?: VinylHighlight }) {
  const color = LABEL_COLORS[song.id % LABEL_COLORS.length];

  return (
    <figure className="flex flex-col items-center gap-3 text-center">
      <div
        className={[
          "@container relative aspect-square w-full rounded-full bg-[#16181d] shadow-[var(--shadow-soft)]",
          highlight === "recognized" ? "ring-4 ring-accent ring-offset-4 ring-offset-canvas motion-safe:animate-spin-record" : "",
          highlight === "guess" ? "outline-2 outline-offset-6 outline-dashed outline-accent/70" : "",
        ].join(" ")}
        style={{
          backgroundImage:
            "repeating-radial-gradient(circle at center, rgba(255,255,255,0.07) 0 1px, transparent 1px 4px)," +
            "conic-gradient(from 30deg, transparent 0 40deg, rgba(255,255,255,0.12) 60deg, transparent 80deg 220deg, rgba(255,255,255,0.08) 240deg, transparent 260deg)",
        }}
        aria-hidden="true"
      >
        <div
          className="absolute inset-[30%] rounded-full shadow-[inset_0_0_0_3px_rgba(0,0,0,0.15)]"
          style={{ backgroundColor: color }}
        >
          <span className="absolute inset-x-0 top-[14%] text-center text-[9cqw] font-bold leading-none tracking-wide text-white">
            {initials(song.title)}
          </span>
          <span className="absolute left-1/2 top-1/2 size-[14%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-canvas" />
        </div>
      </div>
      <figcaption className="w-full min-w-0">
        <p className="truncate font-semibold leading-tight text-ink">{song.title}</p>
        <p className="truncate text-base text-ink-muted">{song.artist}</p>
      </figcaption>
    </figure>
  );
}
