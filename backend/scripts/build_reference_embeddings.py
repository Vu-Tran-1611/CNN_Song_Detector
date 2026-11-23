"""Build models/reference_embeddings.pt: the model's 128-dim fingerprints of every training clip.

The backend uses them to measure how familiar a new recording is (mean distance
to the k nearest training fingerprints). Needs research/preprocessed_mels/train.

Usage, from backend/:
    .venv/bin/python scripts/build_reference_embeddings.py
"""

import sys
from pathlib import Path

import torch

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from app.ml import load_checkpoint  # noqa: E402
from app.ml.familiarity import K_NEIGHBOURS, embed  # noqa: E402

TRAIN_DIR = BACKEND_DIR.parent / "research" / "preprocessed_mels" / "train"
OUT = BACKEND_DIR / "models" / "reference_embeddings.pt"


def main() -> None:
    model, _ = load_checkpoint(BACKEND_DIR / "models" / "song_cnn_model.pth")
    paths = sorted(TRAIN_DIR.glob("*.pt"))
    if not paths:
        sys.exit(f"No training spectrograms in {TRAIN_DIR}")

    batches = []
    for start in range(0, len(paths), 256):
        mels = torch.stack([torch.load(p, map_location="cpu", weights_only=True)["mel"] for p in paths[start : start + 256]])
        batches.append(embed(model, mels))
    reference = torch.cat(batches)

    torch.save({"embeddings": reference.half(), "k": K_NEIGHBOURS}, OUT)
    print(f"Saved {len(reference)} fingerprints ({OUT.stat().st_size / 1e6:.1f} MB) to {OUT}")


if __name__ == "__main__":
    main()
