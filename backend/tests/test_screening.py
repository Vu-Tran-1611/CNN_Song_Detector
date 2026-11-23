import math

import numpy as np
import torch

from app.ml.constants import SAMPLE_RATE
from app.ml.familiarity import FamiliarityIndex
from app.ml.screening import screen_audio

RNG = np.random.default_rng(0)


def seconds(n: float) -> np.ndarray:
    return np.arange(int(n * SAMPLE_RATE)) / SAMPLE_RATE


def to_wave(samples: np.ndarray) -> torch.Tensor:
    return torch.from_numpy(samples.astype(np.float32))[None]


def synthetic_song(duration: float = 12.0, bpm: int = 110) -> np.ndarray:
    beat = 60 / bpm
    scale = [0, 2, 4, 5, 7, 9, 11]
    parts = []
    for _ in range(int(duration / beat)):
        f0 = 196 * 2 ** ((scale[RNG.integers(0, 7)] + 12 * RNG.integers(0, 2)) / 12)
        t = seconds(beat)
        melody = sum((0.2 / h) * np.sin(2 * math.pi * f0 * h * t) for h in range(1, 6)) * np.exp(-t * 3)
        bass = 0.15 * np.sin(2 * math.pi * f0 / 4 * t)
        kick = 0.4 * np.sin(2 * math.pi * 60 * t * np.exp(-t * 8)) * np.exp(-t * 12)
        hat = 0.05 * RNG.normal(size=len(t)) * np.exp(-((t - beat / 2) ** 2) / 0.0005)
        parts.append(melody + bass + kick + hat)
    return np.concatenate(parts) + 0.002 * RNG.normal(size=sum(len(p) for p in parts))


def speech_like(duration: float = 12.0) -> np.ndarray:
    out = []
    while sum(len(p) for p in out) < duration * SAMPLE_RATE:
        t = seconds(RNG.uniform(0.12, 0.3))
        f0 = RNG.uniform(110, 220)
        glide = RNG.uniform(-0.4, 0.4)
        phase = 2 * math.pi * f0 * (t + glide * t**2 / (2 * t[-1]))
        syllable = sum((0.3 / h) * np.sin(h * phase) for h in range(1, 8)) * np.sin(math.pi * t / t[-1])
        out.append(syllable)
        out.append(np.zeros(int(RNG.uniform(0.08, 0.35) * SAMPLE_RATE)))
    audio = np.concatenate(out)
    return audio + 0.0005 * RNG.normal(size=len(audio))


def test_silence():
    assert screen_audio(to_wave(np.zeros(10 * SAMPLE_RATE))).reason == "silence"
    assert screen_audio(to_wave(3e-4 * RNG.normal(size=10 * SAMPLE_RATE))).reason == "silence"


def test_white_noise():
    assert screen_audio(to_wave(0.1 * RNG.normal(size=10 * SAMPLE_RATE))).reason == "noise"


def test_steady_tones_and_sweeps():
    t = seconds(10)
    for freq in (60, 440, 3000):
        assert screen_audio(to_wave(0.3 * np.sin(2 * math.pi * freq * t))).reason == "tone"
    sweep = 0.3 * np.sin(2 * math.pi * (100 * t + 245 * t**2))
    assert screen_audio(to_wave(sweep)).reason == "tone"
    chord = 0.2 * sum(np.sin(2 * math.pi * f * t) for f in (261.6, 329.6, 392.0, 523.3))
    assert screen_audio(to_wave(chord)).reason == "tone"


def test_speech_like_audio():
    assert screen_audio(to_wave(speech_like())).reason == "speech"


def test_music_passes():
    result = screen_audio(to_wave(synthetic_song()))
    assert result.reason is None, result


def test_familiarity_distance():
    song = torch.randn(128)
    reference = song + 0.05 * torch.randn(50, 128)
    index = FamiliarityIndex(reference, k=10)
    assert index.distance(song[None]) < 0.01
    assert index.distance(-song[None]) > 1.5
    assert index.distance(torch.randn(3, 128)) > 0.5
