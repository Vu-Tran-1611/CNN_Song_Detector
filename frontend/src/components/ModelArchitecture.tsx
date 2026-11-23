// "Inside the model": the CNN from backend/app/ml/model.py, layer by layer.
// Shapes and parameter counts were measured from the trained model (channels × frequency × time).

type Stage = {
  name: string;
  detail: string;
  shape: string;
  // for the little tensor drawing: height ~ frequency bins, layers ~ channels
  freq: number;
  depth: number;
};

const STAGES: Stage[] = [
  { name: "Input", detail: "Mel spectrogram", shape: "1 × 128 × 216", freq: 128, depth: 1 },
  { name: "Block 1", detail: "Conv 3×3 · BN · ReLU · MaxPool", shape: "16 × 64 × 108", freq: 64, depth: 2 },
  { name: "Block 2", detail: "Conv 3×3 · BN · ReLU · MaxPool", shape: "32 × 32 × 54", freq: 32, depth: 3 },
  { name: "Block 3", detail: "Conv 3×3 · BN · ReLU · MaxPool", shape: "64 × 16 × 27", freq: 16, depth: 4 },
  { name: "Block 4", detail: "Conv 3×3 · BN · ReLU", shape: "128 × 16 × 27", freq: 16, depth: 5 },
  { name: "Global avg pool", detail: "Average over frequency & time", shape: "128", freq: 2, depth: 5 },
  { name: "Classifier", detail: "Dropout 0.7 · Linear · Softmax", shape: "10 probabilities", freq: 2, depth: 1 },
];

const LAYERS: { layer: string; shape: string; params: string; pool?: boolean }[] = [
  { layer: "Input: mel spectrogram (128 mel bands × 216 frames)", shape: "1 × 128 × 216", params: "–" },
  { layer: "Conv2d 1 → 16, kernel 3×3, padding 1", shape: "16 × 128 × 216", params: "160" },
  { layer: "BatchNorm2d + ReLU", shape: "16 × 128 × 216", params: "32" },
  { layer: "MaxPool2d 2×2", shape: "16 × 64 × 108", params: "0", pool: true },
  { layer: "Conv2d 16 → 32, kernel 3×3, padding 1", shape: "32 × 64 × 108", params: "4,640" },
  { layer: "BatchNorm2d + ReLU", shape: "32 × 64 × 108", params: "64" },
  { layer: "MaxPool2d 2×2", shape: "32 × 32 × 54", params: "0", pool: true },
  { layer: "Conv2d 32 → 64, kernel 3×3, padding 1", shape: "64 × 32 × 54", params: "18,496" },
  { layer: "BatchNorm2d + ReLU", shape: "64 × 32 × 54", params: "128" },
  { layer: "MaxPool2d 2×2", shape: "64 × 16 × 27", params: "0", pool: true },
  { layer: "Conv2d 64 → 128, kernel 3×3, padding 1", shape: "128 × 16 × 27", params: "73,856" },
  { layer: "BatchNorm2d + ReLU", shape: "128 × 16 × 27", params: "256" },
  { layer: "AdaptiveAvgPool2d (global average pooling)", shape: "128 × 1 × 1", params: "0", pool: true },
  { layer: "Flatten + Dropout (p = 0.7)", shape: "128", params: "0" },
  { layer: "Linear 128 → 10", shape: "10", params: "1,290" },
  { layer: "Softmax", shape: "10 probabilities", params: "0" },
];

const SUMMARY = [
  { value: "4", label: "convolution layers" },
  { value: "3", label: "max-pooling layers" },
  { value: "1", label: "global average pooling" },
  { value: "98,922", label: "trainable parameters" },
];

const TRAINING = [
  ["Data", "10 songs, each as the studio track and as a mic re-recording played through a speaker"],
  ["Clips", "5-second pieces, split 80 / 20 per song into training and test"],
  ["Augmentation", "Each training clip ×7: original, light and strong noise, pitch ±2 semitones, volume ±6 dB"],
  ["Dataset", "4,970 training spectrograms, 188 test spectrograms"],
  ["Optimizer", "Adam, learning rate 0.001, weight decay 0.0001, batch size 32, 10 epochs"],
  ["Loss", "Cross-entropy"],
  ["Result", "94.68% test accuracy (178 of 188 clips)"],
];

const WHY = [
  ["3×3 convolutions", "Each layer looks at small patches of the spectrogram: short notes, beats and harmonics. Stacked, they see bigger musical patterns."],
  ["Max pooling", "Halves the frequency and time size after blocks 1–3, so deeper layers see a wider stretch of the song with less computation."],
  ["Batch normalization", "Keeps each layer's values in a steady range, which makes training faster and more stable."],
  ["Global average pooling", "Turns each of the 128 feature maps into one number. Far fewer parameters than a big dense layer, so it overfits less."],
  ["Dropout 0.7", "Randomly hides 70% of the features during training, forcing the model not to rely on any single cue."],
];

function TensorGlyph({ freq, depth }: { freq: number; depth: number }) {
  const height = 8 + (freq / 128) * 40; // px, shrinks as pooling halves the frequency axis
  return (
    <div aria-hidden="true" className="relative h-14 w-14">
      {Array.from({ length: depth }, (_, i) => (
        <span
          key={i}
          className="absolute rounded-[4px] border border-panel-deep/40 bg-panel/80"
          style={{ width: 24, height, left: 6 + i * 5, bottom: 4 + i * 3, opacity: 0.45 + (i / depth) * 0.55 }}
        />
      ))}
    </div>
  );
}

export function ModelArchitecture() {
  return (
    <section aria-labelledby="model-title" className="flex flex-col gap-8">
      <div className="max-w-3xl">
        <h2 id="model-title" className="text-xl font-bold text-ink sm:text-2xl">
          Inside the model
        </h2>
        <p className="mt-2 leading-relaxed text-ink-muted">
          A small convolutional neural network (CNN) built with PyTorch. It reads one 5-second mel spectrogram, a picture of the
          sound with 128 frequency bands and 216 time steps, and gives a probability for each of the 10 songs.
        </p>
      </div>

      {/* Flow of the network */}
      <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
        {STAGES.map((stage, i) => (
          <li key={stage.name} className="relative flex items-center gap-3 rounded-2xl p-3 shadow-[var(--shadow-soft-sm)] lg:flex-col lg:items-start lg:p-4">
            <TensorGlyph freq={stage.freq} depth={stage.depth} />
            <div className="min-w-0">
              <p className="font-semibold text-ink">{stage.name}</p>
              <p className="text-xs leading-snug text-ink-muted">{stage.detail}</p>
              <p className="mt-1 font-mono text-xs font-semibold text-accent-deep">{stage.shape}</p>
            </div>
            {i < STAGES.length - 1 && (
              <span aria-hidden="true" className="absolute -right-2.5 top-1/2 hidden -translate-y-1/2 text-ink-muted lg:block">
                ›
              </span>
            )}
          </li>
        ))}
      </ol>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {SUMMARY.map((item) => (
          <div key={item.label} className="rounded-2xl px-3 py-3 text-center shadow-[var(--shadow-soft-inset)]">
            <dt className="sr-only">{item.label}</dt>
            <dd className="text-xl font-bold text-ink">{item.value}</dd>
            <dd aria-hidden="true" className="text-xs text-ink-muted">
              {item.label}
            </dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        {/* Layer-by-layer table */}
        <div className="min-w-0">
          <h3 className="mb-3 font-bold text-ink">Layer by layer</h3>
          <div className="overflow-x-auto rounded-2xl shadow-[var(--shadow-soft-inset)]">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <caption className="sr-only">CNN layers with output shapes (channels × frequency × time) and parameter counts</caption>
              <thead className="text-xs uppercase tracking-wide text-ink-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Layer</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Output shape</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Parameters</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {LAYERS.map((row) => (
                  <tr key={row.layer + row.shape} className={row.pool ? "text-ink-muted" : "text-ink"}>
                    <td className="px-4 py-2">{row.layer}</td>
                    <td className="whitespace-nowrap px-4 py-2 font-mono text-xs">{row.shape}</td>
                    <td className="px-4 py-2 text-right font-mono text-xs">{row.params}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-semibold text-ink">
                  <td className="px-4 py-3" colSpan={2}>
                    Total trainable parameters
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs">98,922</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-8">
          <div>
            <h3 className="mb-3 font-bold text-ink">Why these layers</h3>
            <dl className="flex flex-col gap-3 text-sm">
              {WHY.map(([term, text]) => (
                <div key={term}>
                  <dt className="font-semibold text-ink">{term}</dt>
                  <dd className="leading-relaxed text-ink-muted">{text}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div>
            <h3 className="mb-3 font-bold text-ink">How it was trained</h3>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              {TRAINING.map(([term, text]) => (
                <div key={term} className="contents">
                  <dt className="font-semibold text-ink">{term}</dt>
                  <dd className="leading-relaxed text-ink-muted">{text}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
