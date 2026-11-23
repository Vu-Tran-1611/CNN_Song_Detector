---
title: Song Detector API
sdk: docker
app_port: 7860
pinned: false
short_description: FastAPI + PyTorch CNN that identifies songs from audio
---

# Song Detector API

The backend of [Song Detector](https://song-detector-cnn.vercel.app): a FastAPI service that runs a PyTorch CNN on mel spectrograms to identify which of 10 songs is playing in a 10–20 second recording.

- `GET /api/health`
- `GET /api/songs`
- `POST /api/predict` (form field `audio`, WAV)

Interactive docs: `/docs`. Source code and details: https://github.com/Vu-Tran-1611/CNN_Song_Detector

This Space is deployed automatically from the `backend/` folder of that repository by GitHub Actions.
