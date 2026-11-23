"""Quick signal checks that run before the model: is there music in this recording at all?

The CNN always picks one of its 10 songs, even for silence, a beep or someone talking.
These checks catch those cases from simple measurements of the waveform. Thresholds
come from comparing real music (studio tracks and mic recordings of the 10 songs)
with silence, noise, tones, sweeps and speech.
"""

from dataclasses import dataclass
from typing import Optional

import numpy as np
import torch
import torchaudio

from .constants import HOP_LENGTH, N_FFT, N_MELS, SAMPLE_RATE

SILENCE_DB = -60.0
MIN_ACTIVE_RATIO = 0.5
TONE_SHARE = 0.85
NOISE_FLATNESS = 0.3
SPEECH_PAUSE_RATIO = 0.06
SPEECH_JUMPINESS = 5.5
STEADY_FLUX = 0.05

_power_mel = torchaudio.transforms.MelSpectrogram(
    sample_rate=SAMPLE_RATE, n_fft=N_FFT, hop_length=HOP_LENGTH, n_mels=N_MELS, power=2.0
)


@dataclass(frozen=True)
class AudioScreen:
    rms_db: float
    active_ratio: float
    tone_share: float
    flatness: float
    pause_ratio: float
    jumpiness: float
    flux: float
    reason: Optional[str]


def _frame_db(samples: np.ndarray) -> np.ndarray:
    n = len(samples) // HOP_LENGTH
    frames = samples[: n * HOP_LENGTH].reshape(n, HOP_LENGTH)
    return 10 * np.log10((frames**2).mean(axis=1) + 1e-12)


def screen_audio(waveform: torch.Tensor) -> AudioScreen:
    """Measure a (1, n_samples) waveform at SAMPLE_RATE and say why it is not music, if it isn't.

    reason is "silence", "noise", "tone", "speech" or None (looks like music).
    """
    samples = waveform[0].numpy().astype(np.float64)
    rms_db = float(10 * np.log10((samples**2).mean() + 1e-12))
    frame_db = _frame_db(samples)
    active = frame_db > SILENCE_DB
    active_ratio = float(active.mean()) if len(frame_db) else 0.0

    if rms_db < SILENCE_DB or active_ratio < MIN_ACTIVE_RATIO:
        return AudioScreen(rms_db, active_ratio, 0.0, 0.0, 0.0, 0.0, 0.0, "silence")

    spectrum = torch.stft(
        waveform[0], N_FFT, HOP_LENGTH, window=torch.hann_window(N_FFT), return_complex=True
    ).abs() ** 2
    geometric = torch.exp(torch.log(spectrum + 1e-10).mean(dim=0))
    arithmetic = spectrum.mean(dim=0) + 1e-10
    flatness_per_frame = (geometric / arithmetic).numpy()

    mel = _power_mel(waveform)[0]
    share = mel / (mel.sum(dim=0, keepdim=True) + 1e-10)
    tone_share_per_frame = share.topk(3, dim=0).values.sum(dim=0).numpy()
    flux_per_frame = (share[:, 1:] - share[:, :-1]).abs().sum(dim=0).numpy()

    frames = min(len(active), len(flatness_per_frame), len(tone_share_per_frame))
    mask = active[:frames]
    flatness = float(np.median(flatness_per_frame[:frames][mask]))
    tone_share = float(np.median(tone_share_per_frame[:frames][mask]))
    flux = float(np.median(flux_per_frame[: frames - 1][mask[1:]])) if frames > 1 and mask[1:].any() else 0.0

    loud = np.percentile(frame_db, 95)
    pause_ratio = float((frame_db < loud - 25).mean())
    jumpiness = float(np.std(np.diff(frame_db))) if len(frame_db) > 1 else 0.0

    reason = None
    if flatness > NOISE_FLATNESS:
        reason = "noise"
    elif tone_share > TONE_SHARE or flux < STEADY_FLUX:
        reason = "tone"
    elif pause_ratio > SPEECH_PAUSE_RATIO and jumpiness > SPEECH_JUMPINESS:
        reason = "speech"
    return AudioScreen(rms_db, active_ratio, tone_share, flatness, pause_ratio, jumpiness, flux, reason)
