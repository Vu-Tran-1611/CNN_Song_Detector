"""The song classifier CNN and a helper to load the trained weights."""

from pathlib import Path
from typing import Dict, Tuple, Union

import torch
import torch.nn as nn

from .constants import NUM_CLASSES


class SongCNN(nn.Module):
    """Same layers, in the same order, as `songCNN` in the notebook.

    The saved weights are keyed by layer position (features.0.weight, ...),
    so this structure must not change unless the model is retrained.
    """

    def __init__(self, num_classes: int = NUM_CLASSES):
        super().__init__()
        self.features = nn.Sequential(
            nn.Conv2d(1, 16, kernel_size=3, stride=1, padding=1),
            nn.BatchNorm2d(16),
            nn.ReLU(),
            nn.MaxPool2d(kernel_size=2, stride=2),
            nn.Conv2d(16, 32, kernel_size=3, stride=1, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(),
            nn.MaxPool2d(kernel_size=2, stride=2),
            nn.Conv2d(32, 64, kernel_size=3, stride=1, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(),
            nn.MaxPool2d(kernel_size=2, stride=2),
            nn.Conv2d(64, 128, kernel_size=3, stride=1, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(),
        )
        self.global_pool = nn.AdaptiveAvgPool2d((1, 1))
        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Dropout(0.7),
            nn.Linear(128, num_classes),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.features(x)
        x = self.global_pool(x)
        return self.classifier(x)


def load_checkpoint(
    path: Union[str, Path], device: Union[str, torch.device] = "cpu"
) -> Tuple[SongCNN, Dict[int, str]]:
    """Load the trained model (in eval mode) and its label -> song name mapping.

    weights_only=True only allows tensors and plain Python containers, so a
    tampered checkpoint can't run arbitrary code when loaded.
    """
    checkpoint = torch.load(path, map_location=device, weights_only=True)
    label_to_song = {int(label): song for label, song in checkpoint["label_to_song"].items()}

    model = SongCNN(num_classes=len(label_to_song))
    model.load_state_dict(checkpoint["model_state_dict"], strict=True)
    model.to(device)
    model.eval()
    return model, label_to_song
