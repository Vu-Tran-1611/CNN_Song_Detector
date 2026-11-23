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
from typing import Dict, List, Literal, Optional

import torch

from app.config import Settings
from app.ml import load_audio, load_checkpoint, predict
from app.ml.familiarity import FamiliarityIndex
from app.ml.screening import screen_audio
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


Status = Literal["recognized", "not_sure", "unknown", "no_music"]


@dataclass(frozen=True)
class PredictionResult:
    status: Status
    song: Optional[Song]
    probability: float
    threshold: float
    reason: Optional[str]
    chunk_predictions: List[int]
    duration_seconds: float
    familiarity: Optional[float] = None

    @property
    def recognized(self) -> bool:
        return self.status == "recognized"


def is_recognized(probability: float, threshold: float) -> bool:
    return probability >= threshold


def decide_status(
    no_music_reason: Optional[str],
    familiarity: Optional[float],
    familiarity_threshold: Optional[float],
    probability: float,
    threshold: float,
) -> Status:
    """Order matters: not music at all, then not like any known song, then the confidence threshold."""
    if no_music_reason is not None:
        return "no_music"
    if familiarity is not None and familiarity_threshold is not None and familiarity > familiarity_threshold:
        return "unknown"
    return "recognized" if is_recognized(probability, threshold) else "not_sure"


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
        screening: bool = True,
        familiarity_index: Optional[FamiliarityIndex] = None,
        familiarity_threshold: Optional[float] = None,
    ):
        self.model = model
        self._songs = songs
        self.threshold = threshold
        self.min_duration_seconds = min_duration_seconds
        self.max_duration_seconds = max_duration_seconds
        self.max_upload_bytes = max_upload_bytes
        self.device = device
        self.screening = screening
        self.familiarity_index = familiarity_index
        self.familiarity_threshold = familiarity_threshold

    @classmethod
    def from_settings(cls, settings: Settings) -> "SongPredictor":
        model, label_to_song = load_checkpoint(settings.model_path)
        index = FamiliarityIndex.load(settings.reference_path) if settings.familiarity_threshold is not None else None
        return cls(
            model=model,
            songs=load_songs(settings.songs_path, label_to_song),
            threshold=settings.confidence_threshold,
            min_duration_seconds=settings.min_duration_seconds,
            max_duration_seconds=settings.max_duration_seconds,
            max_upload_bytes=settings.max_upload_bytes,
            screening=settings.screening_enabled,
            familiarity_index=index,
            familiarity_threshold=settings.familiarity_threshold,
        )

    @property
    def songs(self) -> List[Song]:
        return [self._songs[i] for i in sorted(self._songs)]

    def warm_up(self) -> None:
        """Run one prediction on silence so the first real request isn't slow."""
        silence = torch.zeros(1, CLIP_SAMPLES)
        prediction = predict(self.model, silence, device=self.device)
        screen_audio(silence)
        if self.familiarity_index is not None and prediction.fingerprints is not None:
            self.familiarity_index.distance(prediction.fingerprints)

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

        screen = screen_audio(waveform) if self.screening else None
        prediction = predict(self.model, waveform, device=self.device, overlap_last=True)
        familiarity = (
            self.familiarity_index.distance(prediction.fingerprints)
            if self.familiarity_index is not None and prediction.fingerprints is not None
            else None
        )
        status = decide_status(
            screen.reason if screen else None,
            familiarity,
            self.familiarity_threshold,
            prediction.confidence,
            self.threshold,
        )
        has_song = status in ("recognized", "not_sure")
        result = PredictionResult(
            status=status,
            song=self._songs[prediction.label] if has_song else None,
            probability=prediction.confidence if has_song else 0.0,
            threshold=self.threshold,
            reason=screen.reason if screen and status == "no_music" else None,
            chunk_predictions=prediction.chunk_predictions,
            duration_seconds=duration,
            familiarity=familiarity,
        )

        logger.info(
            "prediction status=%s reason=%s model_guess=%r probability=%.4f familiarity=%s chunks=%s "
            "duration=%.1fs %s time=%.0fms",
            status,
            result.reason,
            self._songs[prediction.label].title,
            prediction.confidence,
            f"{familiarity:.4f}" if familiarity is not None else "off",
            prediction.chunk_predictions,
            duration,
            (
                f"rms={screen.rms_db:.1f}dB tone={screen.tone_share:.2f} flat={screen.flatness:.3f} "
                f"pause={screen.pause_ratio:.3f} jump={screen.jumpiness:.2f} flux={screen.flux:.3f}"
                if screen
                else "screening=off"
            ),
            (time.perf_counter() - started) * 1000,
        )
        return result
