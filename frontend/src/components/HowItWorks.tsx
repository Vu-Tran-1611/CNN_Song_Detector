const STEPS = [
  {
    title: "Listen",
    text: "Tap Listen while a song plays. The app records 10–20 seconds from your mic, with the browser's voice filters turned off so the music isn't altered.",
  },
  {
    title: "Analyze",
    text: "First it checks there is music at all: silence, noise, steady tones and talking are turned away. Then the recording is cut into 5-second pieces; each becomes a mel spectrogram, a picture of the sound, and a CNN (convolutional neural network) reads each picture.",
  },
  {
    title: "Result",
    text: "The pieces' answers are averaged. At 80% or more you get the song; below that, a best guess. If the sound is nothing like the songs it learned, it says so instead of guessing.",
  },
];

const FACTS = [
  { value: "10", label: "songs it knows" },
  { value: "94.7%", label: "test accuracy" },
  { value: "5 s", label: "per analyzed piece" },
  { value: "80%", label: "to be sure" },
];

export function HowItWorks({ headingId, headingLevel = 2 }: { headingId: string; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <div className="flex flex-col gap-6">
      <Heading id={headingId} className="text-2xl font-bold text-ink sm:text-3xl">
        How it works
      </Heading>

      <ol className="grid gap-4 sm:grid-cols-3">
        {STEPS.map((step, i) => (
          <li key={step.title} className="flex gap-3 sm:flex-col">
            <span className="grid size-9 shrink-0 place-items-center rounded-full font-lcd7 text-base text-accent-deep shadow-[var(--shadow-soft-sm)]">
              {i + 1}
            </span>
            <div>
              <p className="text-lg font-semibold text-ink">{step.title}</p>
              <p className="mt-0.5 text-base leading-relaxed text-ink-muted">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {FACTS.map((fact) => (
          <div key={fact.label} className="rounded-2xl px-3 py-3 text-center shadow-[var(--shadow-soft-inset)]">
            <dt className="sr-only">{fact.label}</dt>
            <dd className="text-2xl font-bold text-ink">{fact.value}</dd>
            <dd aria-hidden="true" className="text-sm text-ink-muted">
              {fact.label}
            </dd>
          </div>
        ))}
      </dl>

      <p className="text-base text-ink-muted">
        Your recordings are analyzed in memory and never stored. The last three results are kept only in this browser.
      </p>
    </div>
  );
}
