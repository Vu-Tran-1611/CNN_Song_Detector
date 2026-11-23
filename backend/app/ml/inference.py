"""Predict a song from a full recording: chunk it, classify each chunk, average."""

from dataclasses import dataclass
from typing import List

import torch
import torch.nn.functional as F

from .constants import CLIP_SAMPLES
from .features import waveform_to_mel


@dataclass
class Prediction:
    label: int
    confidence: float
    probabilities: List[float]
    chunk_predictions: List[int]


def split_into_clips(waveform: torch.Tensor, overlap_last: bool = False) -> List[torch.Tensor]:
    """Cut a (1, n_samples) waveform into CLIP_SAMPLES-long clips.

    overlap_last=False (default) is the notebook's predict_song behaviour:
    the last partial clip is kept and padded with zeros (silence).

    overlap_last=True: when the recording is at least one clip long, the
    last partial clip is replaced by the final CLIP_SAMPLES of the recording,
    overlapping the previous clip, so no clip contains added silence.
    Example: 7 s -> [0-5 s] and [2-7 s]. Recordings shorter than one clip
    are still padded.
    """
    total_samples = waveform.shape[1]
    clips = []
    for start in range(0, total_samples, CLIP_SAMPLES):
        clip = waveform[:, start : start + CLIP_SAMPLES]
        if clip.shape[1] < CLIP_SAMPLES:
            if overlap_last and total_samples >= CLIP_SAMPLES:
                clip = waveform[:, total_samples - CLIP_SAMPLES :]
            else:
                clip = F.pad(clip, (0, CLIP_SAMPLES - clip.shape[1]))
        clips.append(clip)
    return clips


@torch.inference_mode()
def predict(
    model: torch.nn.Module, waveform: torch.Tensor, device="cpu", overlap_last: bool = False
) -> Prediction:
    """Run the model on every 5-second chunk and average the softmax probabilities."""
    clips = split_into_clips(waveform, overlap_last=overlap_last)
    if not clips:
        raise ValueError("The recording is empty.")

    mels = torch.stack([waveform_to_mel(clip) for clip in clips]).to(device)
    probabilities = F.softmax(model(mels), dim=1).cpu()

    average = probabilities.mean(dim=0)
    label = int(torch.argmax(average))
    return Prediction(
        label=label,
        confidence=float(average[label]),
        probabilities=average.tolist(),
        chunk_predictions=probabilities.argmax(dim=1).tolist(),
    )
