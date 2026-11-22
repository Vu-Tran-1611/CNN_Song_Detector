# CNN Song Detector

A small PyTorch project that listens to a short audio clip (e.g. 10 seconds from the microphone) and predicts which of 10 known songs is playing, using a CNN trained on mel spectrograms.

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

## Pipeline (`song_detector.ipynb`)

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

## Files

- `song_detector.ipynb` – the full pipeline: preprocessing, training, evaluation, live prediction
- `song_cnn_model.pth` – trained weights plus the label↔song mappings

Not included in the repo (see `.gitignore`):
- `original/`, `recording/` – the song audio is copyrighted and can't be shared. Add your own MP3s, named `Song_Title-Artist.mp3`.
- `preprocessed_mels/` – about 560 MB, and the notebook regenerates it.

## Setup

```bash
pip install torch torchaudio numpy pandas sounddevice soundfile jupyter
```

Put 10 songs in both `original/` and `recording/`, start Jupyter from the repo folder (`BASE_DIR` is the current working directory), and run the notebook from top to bottom.
