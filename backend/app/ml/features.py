"""Turn a waveform into the normalized log-mel spectrogram the CNN was trained on."""

import torch
import torchaudio

from .constants import HOP_LENGTH, N_FFT, N_MELS, SAMPLE_RATE, TOP_DB

_mel_transform = torchaudio.transforms.MelSpectrogram(
    sample_rate=SAMPLE_RATE,
    n_fft=N_FFT,
    hop_length=HOP_LENGTH,
    n_mels=N_MELS,
    power=2.0,
)
_db_transform = torchaudio.transforms.AmplitudeToDB(stype="power", top_db=TOP_DB)


def waveform_to_mel(waveform: torch.Tensor) -> torch.Tensor:
    """(1, n_samples) waveform -> (1, N_MELS, T) spectrogram, normalized per mel band.

    Call it on one clip at a time, as the notebook does: the top_db limit is
    applied relative to the loudest value of the tensor passed in.
    """
    mel = _mel_transform(waveform)  # (1, 128, T)
    mel_db = _db_transform(mel)  # (1, 128, T)
    mean = mel_db.mean(dim=-1, keepdim=True)
    std = mel_db.std(dim=-1, keepdim=True)
    return (mel_db - mean) / (std + 1e-6)
