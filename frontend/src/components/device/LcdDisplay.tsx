type LcdDisplayProps = {
  topLine: string; // 14-segment text, e.g. "LISTENING"
  main: string; // 7-segment digits, e.g. "00:07" or "98.4"
  unit?: string; // small suffix after the digits, e.g. "%"
  footLeft?: string;
  footRight?: string;
  /** Plain-language status for screen readers (the LCD fonts are decorative). */
  srStatus: string;
};

/** Unlit segments shown faintly behind the digits, like a real LCD. */
function ghostOf(text: string, segment: string) {
  return text.replace(/[^.:]/g, segment);
}

export function LcdDisplay({ topLine, main, unit, footLeft, footRight, srStatus }: LcdDisplayProps) {
  return (
    <div className="rounded-[20px] bg-lcd px-4 pb-3 pt-4 text-lcd-ink shadow-[var(--shadow-lcd)] sm:px-5">
      <p className="sr-only" role="status" aria-live="polite">
        {srStatus}
      </p>

      <div aria-hidden="true">
        <div className="relative truncate text-center font-lcd14 text-[13px] tracking-wider sm:text-sm">
          {topLine}
        </div>

        <div className="relative mt-3 flex items-end justify-center gap-1.5">
          <div className="relative font-lcd7 text-[clamp(2.75rem,13vw,3.75rem)] leading-none">
            <span className="absolute inset-0 text-lcd-ink/[0.07]">{ghostOf(main, "8")}</span>
            <span className="relative">{main}</span>
          </div>
          {unit && <span className="pb-1 font-lcd14 text-lg">{unit}</span>}
        </div>

        <div className="mt-2 flex justify-between px-1 font-lcd14 text-[10px] tracking-wider opacity-70">
          <span>{footLeft}</span>
          <span>{footRight}</span>
        </div>
      </div>
    </div>
  );
}
