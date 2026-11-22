"""Decode audio into the mono, 22,050 Hz waveform the model expects."""

import io
from pathlib import Path
from typing import BinaryIO, Union

import soundfile as sf
import torch
import torchaudio

from .constants import SAMPLE_RATE

AudioSource = Union[str, Path, bytes, BinaryIO]


def load_audio(source: AudioSource) -> torch.Tensor:
    """Read an audio file (path, raw bytes or file object) into a (1, n_samples) tensor.

    Same steps as the notebook's load_audio: average channels to mono, then
    resample to SAMPLE_RATE. Decoding uses soundfile (libsndfile) instead of
    torchaudio.load, so WAV needs no ffmpeg.
    """
    if isinstance(source, bytes):
        source = io.BytesIO(source)
    if isinstance(source, Path):
        source = str(source)

    data, sr = sf.read(source, dtype="float32", always_2d=True)  # (n_samples, channels)
    waveform = torch.from_numpy(data.T.copy())  # (channels, n_samples)
    return to_model_format(waveform, sr)


def to_model_format(waveform: torch.Tensor, sample_rate: int) -> torch.Tensor:
    """Convert a (channels, n_samples) waveform to mono at SAMPLE_RATE."""
    if waveform.shape[0] > 1:
        waveform = torch.mean(waveform, dim=0, keepdim=True)
    if sample_rate != SAMPLE_RATE:
        waveform = torchaudio.transforms.Resample(orig_freq=sample_rate, new_freq=SAMPLE_RATE)(waveform)
    return waveform  # (1, n_samples)
