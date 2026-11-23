"""Check that backend/app/ml gives the same results as research/song_detector.ipynb.

Local only: it needs your audio files in research/ (they are not in git).

Usage, from backend/ with the backend venv:

    .venv/bin/python scripts/check_parity.py \
        --notebook-python /opt/homebrew/anaconda3/envs/ml-rec/bin/python

How it works:
  1. "reference" phase: runs in the notebook's Python environment, executes the
     notebook's own cells (config, load_audio, waveform_to_mel, songCNN,
     model loading, predict_song) and saves their outputs.
  2. "compare" phase: runs in the backend venv and checks that app.ml gives
     the same waveforms, spectrograms, chunk votes and probabilities, and
     the same accuracy on the cached test spectrograms.
Everything runs on CPU, like the server.
"""

import argparse
import contextlib
import io
import json
import os
import subprocess
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
RESEARCH_DIR = BACKEND_DIR.parent / "research"
NOTEBOOK = RESEARCH_DIR / "song_detector.ipynb"
REFERENCE_FILE = BACKEND_DIR / ".parity" / "reference.pt"

CELL_MARKERS = [
    "import os",
    "import torch",
    "BASE_DIR =",
    "def load_audio",
    "mel_transform =",
    "class songCNN",
    "load = torch.load",
    "def predict_song",
]

MEL_TOLERANCE = 1e-5
PROBABILITY_TOLERANCE = 1e-4
EXPECTED_TEST_CORRECT, EXPECTED_TEST_TOTAL = 178, 188


def audio_files():
    """The live recording (WAV, like the browser will send) plus every mic recording."""
    files = [RESEARCH_DIR / "live_recording.wav"]
    files += sorted((RESEARCH_DIR / "recording").glob("*.mp3"))
    return [f for f in files if f.exists()]


def build_reference():
    import torch

    cells = json.loads(NOTEBOOK.read_text())["cells"]
    sources = ["".join(c["source"]) for c in cells if c["cell_type"] == "code"]

    os.chdir(RESEARCH_DIR)
    ns = {"__name__": "notebook"}
    for marker in CELL_MARKERS:
        source = next(s for s in sources if s.lstrip().startswith(marker) or f"\n{marker}" in s)
        if marker == "class songCNN":
            ns["DEVICE"] = "cpu"
        with contextlib.redirect_stdout(io.StringIO()):
            exec(compile(source, f"<notebook: {marker}>", "exec"), ns)

    model = ns["model"].eval()
    load_audio, waveform_to_mel = ns["load_audio"], ns["waveform_to_mel"]
    clip_samples = ns["CLIP_SAMPLES"]

    reference = {"files": {}, "label_to_song": ns["label_to_song"]}
    for path in audio_files():
        waveform = load_audio(path)
        with contextlib.redirect_stdout(io.StringIO()):
            chunk_preds, song, confidence = ns["predict_song"](model, path)

        mels, probs = [], []
        with torch.no_grad():
            for start in range(0, waveform.shape[1], clip_samples):
                clip = waveform[:, start : start + clip_samples]
                if clip.shape[1] < clip_samples:
                    clip = torch.nn.functional.pad(clip, (0, clip_samples - clip.shape[1]))
                mel = waveform_to_mel(clip)
                mels.append(mel)
                probs.append(torch.softmax(model(mel.unsqueeze(0)), dim=1)[0])

        reference["files"][path.name] = {
            "path": str(path),
            "waveform": waveform,
            "mels": torch.stack(mels),
            "probabilities": torch.stack(probs),
            "chunk_predictions": chunk_preds.flatten().tolist(),
            "song": song,
            "confidence": confidence,
        }
        print(f"  reference: {path.name} -> {song} ({confidence:.4f})")

    REFERENCE_FILE.parent.mkdir(exist_ok=True)
    torch.save(reference, REFERENCE_FILE)


def compare():
    import torch

    sys.path.insert(0, str(BACKEND_DIR))
    from app.ml import load_audio, load_checkpoint, predict, split_into_clips, waveform_to_mel

    reference = torch.load(REFERENCE_FILE, weights_only=True)
    model, label_to_song = load_checkpoint(BACKEND_DIR / "models" / "song_cnn_model.pth")
    failures = []

    def check(ok, message):
        print(("  PASS  " if ok else "  FAIL  ") + message)
        if not ok:
            failures.append(message)

    check(label_to_song == reference["label_to_song"], "label -> song mapping matches")

    for name, ref in reference["files"].items():
        print(f"\n{name}")
        if name.endswith(".wav"):
            waveform = load_audio(ref["path"])
            diff = (waveform - ref["waveform"]).abs().max().item() if waveform.shape == ref["waveform"].shape else float("inf")
            check(diff < 1e-6, f"decoded waveform matches (max diff {diff:.2e})")
        else:
            waveform = ref["waveform"]

        mels = torch.stack([waveform_to_mel(c) for c in split_into_clips(waveform)])
        mel_diff = (mels - ref["mels"]).abs().max().item() if mels.shape == ref["mels"].shape else float("inf")
        check(mel_diff < MEL_TOLERANCE, f"{len(mels)} spectrograms match (max diff {mel_diff:.2e})")

        prediction = predict(model, waveform)
        check(prediction.chunk_predictions == ref["chunk_predictions"], "chunk votes match")
        avg_diff = (torch.tensor(prediction.probabilities) - ref["probabilities"].mean(dim=0)).abs().max().item()
        check(avg_diff < PROBABILITY_TOLERANCE, f"averaged probabilities match (max diff {avg_diff:.2e})")
        song = label_to_song[prediction.label]
        check(
            song == ref["song"] and abs(prediction.confidence - ref["confidence"]) < PROBABILITY_TOLERANCE,
            f"prediction: {song} ({prediction.confidence:.4f}) vs notebook {ref['song']} ({ref['confidence']:.4f})",
        )

    print("\nCached test spectrograms (research/preprocessed_mels/test)")
    test_files = sorted((RESEARCH_DIR / "preprocessed_mels" / "test").glob("*.pt"))
    correct = 0
    with torch.inference_mode():
        for path in test_files:
            data = torch.load(path, map_location="cpu", weights_only=True)
            correct += int(model(data["mel"].unsqueeze(0)).argmax(dim=1).item() == data["label"])
    check(
        (correct, len(test_files)) == (EXPECTED_TEST_CORRECT, EXPECTED_TEST_TOTAL),
        f"test accuracy {correct}/{len(test_files)} = {correct / max(len(test_files), 1):.2%} (notebook: 178/188 = 94.68%)",
    )

    print(f"\n{'ALL CHECKS PASSED' if not failures else f'{len(failures)} CHECK(S) FAILED'}")
    return 0 if not failures else 1


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--notebook-python", help="Python of the notebook's environment (runs phase 1 first)")
    parser.add_argument("--phase", choices=["reference", "compare"], help=argparse.SUPPRESS)
    args = parser.parse_args()

    if args.phase == "reference":
        build_reference()
        return 0

    if args.notebook_python:
        print("Phase 1: running the notebook's code in its own environment...")
        env = {**os.environ, "KMP_DUPLICATE_LIB_OK": "TRUE"}
        subprocess.run([args.notebook_python, __file__, "--phase", "reference"], check=True, env=env)
    elif not REFERENCE_FILE.exists():
        parser.error("no reference yet: pass --notebook-python to create it")

    print("\nPhase 2: comparing with backend app.ml...")
    return compare()


if __name__ == "__main__":
    sys.exit(main())
