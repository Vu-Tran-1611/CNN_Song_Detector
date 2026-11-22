"""Model, preprocessing and inference code, shared with research/song_detector.ipynb."""

from .audio import load_audio
from .features import waveform_to_mel
from .inference import Prediction, predict, split_into_clips
from .model import SongCNN, load_checkpoint

__all__ = [
    "Prediction",
    "SongCNN",
    "load_audio",
    "load_checkpoint",
    "predict",
    "split_into_clips",
    "waveform_to_mel",
]
