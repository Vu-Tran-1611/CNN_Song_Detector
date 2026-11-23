# Backend

A FastAPI service that takes a 5–25 second WAV recording (the app sends 10–20 s), runs the trained CNN on it, and returns the predicted song with its probability. The model, preprocessing and inference code came from `research/song_detector.ipynb`, and a parity check confirms it gives the same results.

## Layout

```
backend/
├── app/
│   ├── main.py              # create_app(): loads the model at startup, CORS, error handlers
│   ├── config.py            # settings + CONFIDENCE_THRESHOLD (overridable with SONG_* env vars)
│   ├── schemas.py           # JSON response models
│   ├── api/routes.py        # /api/health, /api/songs, /api/predict
│   ├── api/deps.py          # get_predictor() dependency
│   ├── services/predictor.py# SongPredictor: decode → check duration → predict → threshold
│   └── ml/
│       ├── constants.py     # sample rate, clip length, mel settings (must match training)
│       ├── audio.py         # decode WAV → mono → 22,050 Hz
│       ├── features.py      # waveform → normalized log-mel spectrogram
│       ├── model.py         # SongCNN + load_checkpoint()
│       └── inference.py     # 5-second chunks → classify each → average probabilities
├── models/
│   ├── song_cnn_model.pth   # trained weights (the notebook saves here too)
│   └── songs.json           # display names (title, artist) for each label
├── scripts/check_parity.py  # compares app.ml with the notebook on your local audio
└── tests/                   # unit + API tests, no audio files needed
```

## Setup

```bash
cd backend
python3.12 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
```

## Run the server

```bash
.venv/bin/uvicorn app.main:app --reload --port 8765
```

Open http://localhost:8765/docs to try the API in the browser. (Any free port works; 8765 avoids the common 8000.)

```bash
curl -F "audio=@../research/live_recording.wav" http://localhost:8765/api/predict
```

## API

| Method | Path | Returns |
|---|---|---|
| `GET` | `/api/health` | `{"status": "ok", "model_loaded": true}` |
| `GET` | `/api/songs` | `{"songs": [{"id", "title", "artist"}, ...]}` |
| `POST` | `/api/predict` | form field `audio` (WAV, 5–25 s) → prediction |

```json
{ "recognized": true, "song": { "id": 0, "title": "Attention", "artist": "Charlie Puth" }, "probability": 0.9841, "threshold": 0.8 }
```

When `probability` is below `threshold`, `recognized` is `false` and `song` is the best guess.

Errors always look like `{"error": {"code": "...", "message": "..."}}`:

| Code | Status | When |
|---|---|---|
| `invalid_audio` | 400 | the file can't be decoded |
| `file_too_large` | 413 | over 5 MB |
| `too_short` / `too_long` | 422 | under 5 s / over 25 s |
| `invalid_request` | 422 | no form field named `audio` |

Recordings are processed in memory and never stored. Only metadata is logged (song, probability, chunk votes, duration, time).

## Settings

Defaults live in `app/config.py`. Override any of them with an environment variable:

| Variable | Default |
|---|---|
| `SONG_CONFIDENCE_THRESHOLD` | `0.80` |
| `SONG_MIN_DURATION_SECONDS` / `SONG_MAX_DURATION_SECONDS` | `5` / `25` |
| `SONG_MAX_UPLOAD_BYTES` | `5242880` (5 MB) |
| `SONG_CORS_ORIGINS` | `["http://localhost:3000"]` (JSON list) |
| `SONG_CORS_ORIGIN_REGEX` | none (e.g. `https://cnn-song-detector(-[a-z0-9-]+)?\.vercel\.app` for Vercel previews) |

## How a recording is split

The model sees 5-second chunks. The API turns on `overlap_last`: leftover audio at the end is replaced by the recording's final 5 seconds, overlapping the previous chunk, so no chunk contains added silence (7 s → [0–5 s] and [2–7 s]). The notebook pads the leftover with silence instead. That is still the default in `app.ml`, so the parity check compares like with like.

## Tests

```bash
.venv/bin/python -m pytest
```

## Parity check (local only)

This needs the audio in `research/` and the notebook's Python environment:

```bash
.venv/bin/python scripts/check_parity.py --notebook-python /path/to/notebook/env/bin/python
```

It runs the notebook's own cells, then checks that `app.ml` gives the same waveforms, spectrograms, chunk votes and probabilities, and the same 178/188 (94.68%) test accuracy. The reference it saves in `.parity/` contains decoded song audio, so it is git-ignored. Without `--notebook-python` it reuses the saved reference.

WAV is decoded with `soundfile`, not `torchaudio.load`, which now needs `torchcodec` and ffmpeg.

## Docker

```bash
docker build -t song-detector-backend .
docker run --rm -p 8000:8000 song-detector-backend
```

The image uses CPU-only PyTorch (same versions as training) and listens on `$PORT` (default 8000), which is how Railway and most hosts pass the port.

## Deployment

The backend runs on Railway at https://cnnsongdetector-production.up.railway.app (docs at `/docs`). The service uses Root Directory `/backend` and config file `/backend/railway.json` (Dockerfile build, health check on `/api/health`). With "Wait for CI" on, Railway deploys each push to `main` only after the GitHub Actions tests pass.

On Railway, set `SONG_CORS_ORIGINS` to the frontend's address and, optionally, `SONG_CORS_ORIGIN_REGEX` for Vercel preview deployments.
