"""Predict a song from a full recording: chunk it, classify each chunk, average."""

from dataclasses import dataclass
from typing import List

import torch
import torch.nn.functional as F

from .constants import CLIP_SAMPLES
from .features import waveform_to_mel


@dataclass
class Prediction:
    label: int  # index of the most likely song
    confidence: float  # its averaged probability, 0..1
    probabilities: List[float]  # averaged probability for every song
    chunk_predictions: List[int]  # winning label of each 5-second chunk


def split_into_clips(waveform: torch.Tensor) -> List[torch.Tensor]:
    """Cut a (1, n_samples) waveform into CLIP_SAMPLES-long clips.

    Same as the notebook's predict_song: the last partial clip is kept and
    padded with zeros (silence) up to CLIP_SAMPLES.
    """
    total_samples = waveform.shape[1]
    clips = []
    for start in range(0, total_samples, CLIP_SAMPLES):
        clip = waveform[:, start : start + CLIP_SAMPLES]
        if clip.shape[1] < CLIP_SAMPLES:
            clip = F.pad(clip, (0, CLIP_SAMPLES - clip.shape[1]))
        clips.append(clip)
    return clips


@torch.inference_mode()
def predict(model: torch.nn.Module, waveform: torch.Tensor, device="cpu") -> Prediction:
    """Run the model on every 5-second chunk and average the softmax probabilities."""
    clips = split_into_clips(waveform)
    if not clips:
        raise ValueError("The recording is empty.")

    # One spectrogram per clip (as in training), then a single batched forward pass.
    mels = torch.stack([waveform_to_mel(clip) for clip in clips]).to(device)  # (N, 1, 128, T)
    probabilities = F.softmax(model(mels), dim=1).cpu()  # (N, num_classes)

    average = probabilities.mean(dim=0)  # (num_classes,)
    label = int(torch.argmax(average))
    return Prediction(
        label=label,
        confidence=float(average[label]),
        probabilities=average.tolist(),
        chunk_predictions=probabilities.argmax(dim=1).tolist(),
    )
