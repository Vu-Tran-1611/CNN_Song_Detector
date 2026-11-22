# Backend

The model, preprocessing and inference code, moved out of `research/song_detector.ipynb`. A FastAPI service that wraps it comes next (step 3 of the roadmap).

## Layout

```
backend/
├── app/ml/
│   ├── constants.py   # sample rate, clip length, mel settings (must match training)
│   ├── audio.py       # decode WAV → mono → 22,050 Hz
│   ├── features.py    # waveform → normalized log-mel spectrogram
│   ├── model.py       # SongCNN + load_checkpoint()
│   └── inference.py   # 5-second chunks → classify each → average probabilities
├── models/song_cnn_model.pth   # trained weights (the notebook saves here too)
├── scripts/check_parity.py     # compares app.ml with the notebook on your local audio
└── tests/                      # unit tests, no audio files needed
```

## Setup

```bash
cd backend
python3.12 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
```

## Tests

```bash
.venv/bin/python -m pytest
```

## Parity check (local only)

This needs the audio in `research/` and the notebook's Python environment:

```bash
.venv/bin/python scripts/check_parity.py --notebook-python /path/to/notebook/env/bin/python
```

It runs the notebook's own cells, then checks that `app.ml` gives the same waveforms, spectrograms, chunk votes and probabilities, and the same 178/188 (94.68%) test accuracy. The reference it saves in `.parity/` contains decoded song audio, so it is git-ignored.

## Notes

- WAV is decoded with `soundfile`, not `torchaudio.load`, which now needs `torchcodec` and ffmpeg. The browser will send WAV.
- The last partial chunk is padded with silence, the same as the notebook. A recording slightly over 10 seconds therefore gets a third chunk that is mostly silence. This will be handled in step 3.
