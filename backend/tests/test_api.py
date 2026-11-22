"""API tests: real model for the endpoints, a stub model for the threshold rules."""

import io
import math
from pathlib import Path

import numpy as np
import pytest
import soundfile as sf
import torch
from fastapi.testclient import TestClient

from app.api.deps import get_predictor
from app.config import CONFIDENCE_THRESHOLD, Settings
from app.main import create_app
from app.ml.constants import NUM_CLASSES, SAMPLE_RATE
from app.services.predictor import Song, SongPredictor, is_recognized


def wav(seconds: float, sample_rate: int = SAMPLE_RATE) -> bytes:
    t = np.arange(int(seconds * sample_rate)) / sample_rate
    samples = (0.3 * np.sin(2 * math.pi * 440 * t)).astype(np.float32)
    buffer = io.BytesIO()
    sf.write(buffer, samples, sample_rate, format="WAV", subtype="PCM_16")
    return buffer.getvalue()


def upload(data: bytes):
    return {"audio": ("recording.wav", data, "audio/wav")}


@pytest.fixture(scope="module")
def client():
    with TestClient(create_app(Settings())) as c:  # `with` runs startup (model loading)
        yield c


# --- endpoints with the real model ------------------------------------------
def test_health(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "model_loaded": True}


def test_songs_use_display_names(client):
    songs = client.get("/api/songs").json()["songs"]
    assert len(songs) == NUM_CLASSES
    assert songs[6] == {"id": 6, "title": "Stereo Love", "artist": "Edward Maya"}
    assert songs[9]["title"] == "We Don't Talk Any More"


def test_predict_returns_contract(client):
    response = client.post("/api/predict", files=upload(wav(10.0)))
    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"recognized", "song", "probability", "threshold"}
    assert set(body["song"]) == {"id", "title", "artist"}
    assert 0 <= body["probability"] <= 1
    assert body["threshold"] == CONFIDENCE_THRESHOLD
    assert body["recognized"] == (body["probability"] >= CONFIDENCE_THRESHOLD)


def test_predict_resamples_other_sample_rates(client):
    assert client.post("/api/predict", files=upload(wav(6.0, sample_rate=48000))).status_code == 200


@pytest.mark.parametrize(
    "data, status, code",
    [
        (b"this is not audio", 400, "invalid_audio"),
        (wav(4.9), 422, "too_short"),
        (wav(15.5), 422, "too_long"),
    ],
)
def test_predict_errors(client, data, status, code):
    response = client.post("/api/predict", files=upload(data))
    assert response.status_code == status
    assert response.json()["error"]["code"] == code


def test_predict_rejects_large_files():
    app = create_app(Settings(max_upload_bytes=100_000))
    with TestClient(app) as c:
        response = c.post("/api/predict", files=upload(wav(6.0)))  # ~265 KB
    assert response.status_code == 413
    assert response.json()["error"]["code"] == "file_too_large"


def test_predict_requires_audio_field(client):
    response = client.post("/api/predict", files={"file": ("x.wav", wav(6.0), "audio/wav")})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "invalid_request"


def test_cors_allows_next_dev_server(client):
    response = client.get("/api/health", headers={"Origin": "http://localhost:3000"})
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"


# --- threshold rules with a stub model ---------------------------------------
class StubModel(torch.nn.Module):
    """Always gives `probability` to `label`, the rest spread over the other songs."""

    def __init__(self, label: int, probability: float):
        super().__init__()
        logits = torch.full((NUM_CLASSES,), math.log((1 - probability) / (NUM_CLASSES - 1)))
        logits[label] = math.log(probability)
        self.logits = logits

    def forward(self, x):
        return self.logits.expand(x.shape[0], -1)


SONGS = {i: Song(id=i, title=f"Song {i}", artist="Artist") for i in range(NUM_CLASSES)}


def stub_predictor(label: int, probability: float) -> SongPredictor:
    return SongPredictor(
        model=StubModel(label, probability),
        songs=SONGS,
        threshold=0.80,
        min_duration_seconds=5.0,
        max_duration_seconds=15.0,
        max_upload_bytes=5 * 1024 * 1024,
    )


def test_is_recognized_boundary():
    assert is_recognized(0.80, 0.80)
    assert not is_recognized(0.7999, 0.80)


def test_confident_prediction_is_recognized():
    result = stub_predictor(label=3, probability=0.95).predict_audio(wav(10.0))
    assert result.recognized and result.song.id == 3
    assert result.probability == pytest.approx(0.95, abs=1e-5)
    assert result.chunk_predictions == [3, 3]


def test_low_confidence_returns_best_guess():
    result = stub_predictor(label=7, probability=0.62).predict_audio(wav(10.0))
    assert not result.recognized
    assert result.song.id == 7  # best guess is still returned


def test_route_uses_injected_predictor():
    app = create_app(Settings())
    app.dependency_overrides[get_predictor] = lambda: stub_predictor(label=1, probability=0.62)
    with TestClient(app) as c:
        body = c.post("/api/predict", files=upload(wav(7.0))).json()
    assert body == {
        "recognized": False,
        "song": {"id": 1, "title": "Song 1", "artist": "Artist"},
        "probability": 0.62,
        "threshold": 0.8,
    }
