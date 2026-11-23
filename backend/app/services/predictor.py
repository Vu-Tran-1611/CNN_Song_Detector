"""SongPredictor: turns uploaded audio bytes into a song prediction.

This layer holds the app's rules (duration limits, confidence threshold,
song names) and knows nothing about HTTP. Problems are raised as
PredictionError subclasses; the API layer turns them into JSON errors.
"""

import json
import logging
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List

import torch

from app.config import Settings
from app.ml import load_audio, load_checkpoint, predict
from app.ml.constants import CLIP_SAMPLES, SAMPLE_RATE

logger = logging.getLogger("song_detector")


class PredictionError(Exception):
    code = "prediction_error"

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


class InvalidAudioError(PredictionError):
    code = "invalid_audio"


class FileTooLargeError(PredictionError):
    code = "file_too_large"


class AudioTooShortError(PredictionError):
    code = "too_short"


class AudioTooLongError(PredictionError):
    code = "too_long"


@dataclass(frozen=True)
class Song:
    id: int
    title: str
    artist: str


@dataclass(frozen=True)
class PredictionResult:
    song: Song
    probability: float
    recognized: bool
    threshold: float
    chunk_predictions: List[int]
    duration_seconds: float


def is_recognized(probability: float, threshold: float) -> bool:
    return probability >= threshold


def load_songs(path: Path, label_to_song: Dict[int, str]) -> Dict[int, Song]:
    """Read display names from songs.json and check they match the model's labels."""
    entries = json.loads(Path(path).read_text(encoding="utf-8"))
    songs = {e["id"]: Song(id=e["id"], title=e["title"], artist=e["artist"]) for e in entries}
    labels = {e["id"]: e["label"] for e in entries}
    if labels != label_to_song:
        raise ValueError(f"{path} does not match the model's labels: {label_to_song}")
    return songs


class SongPredictor:
    def __init__(
        self,
        model: torch.nn.Module,
        songs: Dict[int, Song],
        threshold: float,
        min_duration_seconds: float,
        max_duration_seconds: float,
        max_upload_bytes: int,
        device: str = "cpu",
    ):
        self.model = model
        self._songs = songs
        self.threshold = threshold
        self.min_duration_seconds = min_duration_seconds
        self.max_duration_seconds = max_duration_seconds
        self.max_upload_bytes = max_upload_bytes
        self.device = device

    @classmethod
    def from_settings(cls, settings: Settings) -> "SongPredictor":
        model, label_to_song = load_checkpoint(settings.model_path)
        return cls(
            model=model,
            songs=load_songs(settings.songs_path, label_to_song),
            threshold=settings.confidence_threshold,
            min_duration_seconds=settings.min_duration_seconds,
            max_duration_seconds=settings.max_duration_seconds,
            max_upload_bytes=settings.max_upload_bytes,
        )

    @property
    def songs(self) -> List[Song]:
        return [self._songs[i] for i in sorted(self._songs)]

    def warm_up(self) -> None:
        """Run one prediction on silence so the first real request isn't slow."""
        predict(self.model, torch.zeros(1, CLIP_SAMPLES), device=self.device)

    def predict_audio(self, data: bytes) -> PredictionResult:
        if len(data) > self.max_upload_bytes:
            raise FileTooLargeError(f"File must be at most {self.max_upload_bytes // (1024 * 1024)} MB.")

        started = time.perf_counter()
        try:
            waveform = load_audio(data)
        except Exception as exc:
            raise InvalidAudioError("Could not read the audio. Please send a WAV file.") from exc

        duration = waveform.shape[1] / SAMPLE_RATE
        if duration < self.min_duration_seconds:
            raise AudioTooShortError(f"Recording must be at least {self.min_duration_seconds:g} seconds.")
        if duration > self.max_duration_seconds:
            raise AudioTooLongError(f"Recording must be at most {self.max_duration_seconds:g} seconds.")

        prediction = predict(self.model, waveform, device=self.device, overlap_last=True)
        result = PredictionResult(
            song=self._songs[prediction.label],
            probability=prediction.confidence,
            recognized=is_recognized(prediction.confidence, self.threshold),
            threshold=self.threshold,
            chunk_predictions=prediction.chunk_predictions,
            duration_seconds=duration,
        )

        logger.info(
            "prediction song=%r probability=%.4f recognized=%s chunks=%s duration=%.1fs time=%.0fms",
            result.song.title,
            result.probability,
            result.recognized,
            result.chunk_predictions,
            duration,
            (time.perf_counter() - started) * 1000,
        )
        return result
