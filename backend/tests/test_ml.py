"""Unit tests for app.ml. They use synthetic audio, so no song files are needed."""

import io
import math
from pathlib import Path

import numpy as np
import pytest
import soundfile as sf
import torch

from app.ml import load_audio, load_checkpoint, predict, split_into_clips, waveform_to_mel
from app.ml.constants import CLIP_SAMPLES, N_MELS, NUM_CLASSES, SAMPLE_RATE

MODEL_PATH = Path(__file__).resolve().parents[1] / "models" / "song_cnn_model.pth"


def tone(seconds: float, sample_rate: int = SAMPLE_RATE, freq: float = 440.0, channels: int = 1) -> np.ndarray:
    t = np.arange(int(seconds * sample_rate)) / sample_rate
    wave = (0.3 * np.sin(2 * math.pi * freq * t)).astype(np.float32)
    return np.stack([wave] * channels, axis=1)  # (n_samples, channels)


def wav_bytes(samples: np.ndarray, sample_rate: int) -> bytes:
    buffer = io.BytesIO()
    sf.write(buffer, samples, sample_rate, format="WAV", subtype="PCM_16")
    return buffer.getvalue()


@pytest.fixture(scope="module")
def checkpoint():
    return load_checkpoint(MODEL_PATH)


def test_checkpoint_loads_with_ten_songs(checkpoint):
    model, label_to_song = checkpoint
    assert not model.training
    assert sorted(label_to_song) == list(range(NUM_CLASSES))
    assert label_to_song[0] == "Attention-Charlie_Puth"


def test_load_audio_makes_mono_at_model_rate():
    waveform = load_audio(wav_bytes(tone(2.0, sample_rate=44100, channels=2), 44100))
    assert waveform.shape[0] == 1
    assert abs(waveform.shape[1] - 2 * SAMPLE_RATE) <= 1


def test_mel_shape_for_one_clip():
    clip = torch.from_numpy(tone(5.0).T.copy())
    assert waveform_to_mel(clip).shape == (1, N_MELS, 216)


@pytest.mark.parametrize(
    "seconds, expected_clips",
    [(10.0, 2), (12.0, 3), (3.0, 1), (5.0, 1)],
)
def test_split_into_clips(seconds, expected_clips):
    waveform = torch.ones(1, int(seconds * SAMPLE_RATE))
    clips = split_into_clips(waveform)
    assert len(clips) == expected_clips
    assert all(clip.shape == (1, CLIP_SAMPLES) for clip in clips)


def test_last_partial_clip_is_zero_padded():
    clips = split_into_clips(torch.ones(1, 3 * SAMPLE_RATE))
    assert clips[0][0, : 3 * SAMPLE_RATE].eq(1).all()
    assert clips[0][0, 3 * SAMPLE_RATE :].eq(0).all()


def test_predict_returns_valid_probabilities(checkpoint):
    model, _ = checkpoint
    prediction = predict(model, torch.from_numpy(tone(10.0).T.copy()))
    assert len(prediction.probabilities) == NUM_CLASSES
    assert sum(prediction.probabilities) == pytest.approx(1.0, abs=1e-5)
    assert len(prediction.chunk_predictions) == 2
    assert prediction.confidence == max(prediction.probabilities)


def test_predict_rejects_empty_audio(checkpoint):
    model, _ = checkpoint
    with pytest.raises(ValueError):
        predict(model, torch.zeros(1, 0))


# --- overlap_last=True (used by the API) -------------------------------------
def ramp(seconds: float) -> torch.Tensor:
    return torch.arange(int(seconds * SAMPLE_RATE), dtype=torch.float32).unsqueeze(0)


def test_overlap_last_uses_final_five_seconds_without_padding():
    waveform = ramp(7.0)
    clips = split_into_clips(waveform, overlap_last=True)
    assert len(clips) == 2
    assert torch.equal(clips[0], waveform[:, :CLIP_SAMPLES])
    assert torch.equal(clips[1], waveform[:, -CLIP_SAMPLES:])  # [2 s - 7 s]


@pytest.mark.parametrize("seconds, expected_clips", [(10.0, 2), (12.0, 3), (5.0, 1)])
def test_overlap_last_clip_counts(seconds, expected_clips):
    waveform = ramp(seconds)
    clips = split_into_clips(waveform, overlap_last=True)
    assert len(clips) == expected_clips
    assert torch.equal(clips[-1], waveform[:, -CLIP_SAMPLES:])


def test_overlap_last_still_pads_short_recordings():
    clips = split_into_clips(torch.ones(1, 3 * SAMPLE_RATE), overlap_last=True)
    assert len(clips) == 1
    assert clips[0][0, 3 * SAMPLE_RATE :].eq(0).all()
