type LcdDisplayProps = {
  topLine: string;
  main: string;
  unit?: string;
  footLeft?: string;
  footRight?: string;
  srStatus: string;
};

const MARQUEE_FROM = 18;

function ghostOf(text: string, segment: string) {
  return text.replace(/[^.:]/g, segment);
}

function TopLine({ text }: { text: string }) {
  if (text.length < MARQUEE_FROM) {
    return <div className="truncate text-center">{text}</div>;
  }
  return (
    <div className="overflow-hidden">
      <div
        key={text}
        className="flex w-max motion-safe:animate-marquee motion-reduce:w-full"
        style={{ animationDuration: `${Math.max(6, text.length * 0.32)}s` }}
      >
        <span className="whitespace-nowrap pr-16 motion-reduce:truncate motion-reduce:pr-0">{text}</span>
        <span className="whitespace-nowrap pr-16 motion-reduce:hidden">{text}</span>
      </div>
    </div>
  );
}

export function LcdDisplay({ topLine, main, unit, footLeft, footRight, srStatus }: LcdDisplayProps) {
  return (
    <div className="rounded-[20px] bg-lcd px-4 pb-3 pt-4 text-lcd-ink shadow-[var(--shadow-lcd)] sm:px-5">
      <p className="sr-only" role="status" aria-live="polite">
        {srStatus}
      </p>

      <div aria-hidden="true">
        <div key={topLine} className="font-lcd14 text-[13px] tracking-wider motion-safe:animate-fade-in sm:text-sm">
          <TopLine text={topLine} />
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
