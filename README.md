# CNN Song Detector

A small PyTorch project that listens to a short audio clip (10–20 seconds from the microphone) and predicts which of 10 known songs is playing, using a CNN trained on mel spectrograms.

The project is being turned into a web app: a Next.js frontend with a Shazam-style "tap to listen" button, and a FastAPI backend that runs the model.

## Repository layout

```
CNN_Song_Detector/
├── research/    # Jupyter notebook: data prep, training, evaluation, live mic test
│   └── song_detector.ipynb
├── backend/     # FastAPI service + model code + trained weights
└── frontend/    # Next.js web app (mobile-first, soft-UI radio design)
```

## Roadmap

1. Restructure the repo into `research/`, `backend/`, `frontend/`
2. Extract the ML code (audio loading, mel spectrogram, CNN) into `backend/` and check that its results match the notebook
3. FastAPI service: `POST /api/predict`, `GET /api/health`, `GET /api/songs`, plus a "not sure" confidence threshold
4. Next.js app with microphone recording (raw audio → WAV, browser voice processing turned off)
5. Connect frontend and backend: listen → analyze → result
6. UI design and polish
7. Deploy: backend (Docker) on Hugging Face Spaces, frontend on Vercel

## Deployment

| Part | Where | How |
|---|---|---|
| Frontend (Next.js) | Vercel | Deploys automatically from `frontend/` on every push to `main` |
| Backend (FastAPI + PyTorch) | Hugging Face Spaces (Docker, free CPU) | GitHub Actions (`.github/workflows/ci.yml`) runs all tests, then uploads `backend/` to the Space |

Pull requests run the same tests without deploying.

## Songs (labels)

| Label | Song |
|---|---|
| 0 | Attention – Charlie Puth |
| 1 | Blinding Lights – The Weeknd |
| 2 | I Was Never There – The Weeknd |
| 3 | Mystery of Love – Sufjan Stevens |
| 4 | Positions – Ariana Grande |
| 5 | Should Have Known Better – Sufjan Stevens |
| 6 | Stereo Love – Edward Maya |
| 7 | The Hills – The Weeknd |
| 8 | Timeless – The Weeknd |
| 9 | We Don't Talk Any More – Charlie Puth |

## Pipeline (`research/song_detector.ipynb`)

1. **Data sources** – two versions of every song:
   - `original/` – the studio MP3s
   - `recording/` – the same songs played on a speaker and recorded with a microphone, so the model learns real room/mic conditions
2. **Loading** – audio is converted to mono and resampled to 22,050 Hz.
3. **Clipping** – each song is cut into non-overlapping 5-second clips.
4. **Train/test split** – 80/20 per song, done separately for original and mic clips (seed 42).
5. **Augmentation (train only)** – each clip gets 7 variants: original, weak noise, strong noise, pitch ±2 semitones, volume ±6 dB.
6. **Features** – 128-band log-mel spectrogram (n_fft 2048, hop 512, top_db 80), normalized per frequency band. Cached as `.pt` files in `preprocessed_mels/`.
7. **Model** – 4 conv blocks (16→32→64→128 channels, BatchNorm + ReLU, max-pool on the first 3), global average pooling, dropout 0.7, linear layer to 10 classes.
8. **Training** – Adam (lr 1e-3, weight decay 1e-4), cross-entropy, batch 32, 10 epochs. Runs on Apple MPS / CUDA / CPU.
9. **Result** – **94.68 %** accuracy on the held-out test clips (178 / 188).
10. **Inference** – a recording is split into 5-second chunks, each chunk is classified, and the softmax probabilities are averaged to give the final song plus a confidence score. `predict_live()` records from the microphone (`sounddevice`) and predicts right away.

Not included in the repo (see `.gitignore`):
- `research/original/`, `research/recording/` – the song audio is copyrighted and can't be shared. Add your own MP3s, named `Song_Title-Artist.mp3`.
- `research/preprocessed_mels/` – about 560 MB, and the notebook regenerates it.

## Running the notebook

```bash
pip install torch torchaudio numpy pandas sounddevice soundfile jupyter
cd research
jupyter notebook song_detector.ipynb
```

`BASE_DIR` is the current working directory, so start Jupyter from inside `research/`. Put 10 songs in both `research/original/` and `research/recording/`, then run the notebook from top to bottom.
