import { MAX_RECENT, type RecentDetection } from "@/lib/recent";

export function RecentStrip({ items }: { items: RecentDetection[] }) {
  const slots = Array.from({ length: MAX_RECENT }, (_, i) => items[i]);

  return (
    <section aria-label="Recent detections" className="rounded-[18px] bg-panel-deep/70 p-1.5 shadow-[var(--shadow-knob-pressed)]">
      <ul className="grid grid-cols-3 divide-x divide-white/10">
        {slots.map((item, i) => (
          <li key={i} className="flex min-w-0 flex-col items-center gap-1 px-2 py-2.5 text-center">
            <span className={`font-lcd7 text-lg leading-none ${item && !item.recognized ? "text-accent/60" : "text-accent"}`}>
              {item ? (item.probability * 100).toFixed(1) : "--.-"}
            </span>
            <span className="w-full truncate text-xs text-panel-muted">
              {item ? (item.recognized ? item.title : `Maybe ${item.title}`) : "No song yet"}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
