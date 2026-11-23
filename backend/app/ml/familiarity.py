"""How familiar is a recording to the model?

Each 5-second chunk is turned into the model's 128-dim fingerprint (the output of
global average pooling). Familiarity is the mean cosine distance to the K nearest
fingerprints of the training clips: small for audio like the training data, large
for audio the model has never seen anything like.
"""

from pathlib import Path
from typing import Union

import torch
import torch.nn.functional as F

K_NEIGHBOURS = 10


@torch.inference_mode()
def embed(model: torch.nn.Module, mels: torch.Tensor) -> torch.Tensor:
    """(N, 1, 128, T) spectrograms -> (N, 128) L2-normalized fingerprints."""
    features = model.global_pool(model.features(mels)).flatten(1)
    return F.normalize(features, dim=1)


class FamiliarityIndex:
    def __init__(self, reference: torch.Tensor, k: int = K_NEIGHBOURS):
        self.reference = F.normalize(reference.float(), dim=1)
        self.k = min(k, len(self.reference))

    @classmethod
    def load(cls, path: Union[str, Path]) -> "FamiliarityIndex":
        data = torch.load(path, map_location="cpu", weights_only=True)
        return cls(data["embeddings"], int(data.get("k", K_NEIGHBOURS)))

    @torch.inference_mode()
    def distance(self, fingerprints: torch.Tensor) -> float:
        """Mean over chunks of the mean cosine distance to the K nearest training fingerprints."""
        similarities = F.normalize(fingerprints.float(), dim=1) @ self.reference.T
        nearest = similarities.topk(self.k, dim=1).values.mean(dim=1)
        return float((1 - nearest).mean())
