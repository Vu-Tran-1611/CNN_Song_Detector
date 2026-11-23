"""Server settings. Every value can be overridden with an environment variable
prefixed SONG_, e.g. SONG_CONFIDENCE_THRESHOLD=0.7 or
SONG_CORS_ORIGINS='["https://my-app.vercel.app"]'.
"""

from functools import lru_cache
from pathlib import Path
from typing import List, Optional

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[1]

CONFIDENCE_THRESHOLD = 0.80
FAMILIARITY_THRESHOLD = 0.10


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="SONG_", protected_namespaces=())

    confidence_threshold: float = CONFIDENCE_THRESHOLD

    min_duration_seconds: float = 5.0
    max_duration_seconds: float = 25.0
    max_upload_bytes: int = 5 * 1024 * 1024

    model_path: Path = BACKEND_DIR / "models" / "song_cnn_model.pth"
    songs_path: Path = BACKEND_DIR / "models" / "songs.json"
    reference_path: Path = BACKEND_DIR / "models" / "reference_embeddings.pt"

    screening_enabled: bool = True
    familiarity_threshold: Optional[float] = FAMILIARITY_THRESHOLD

    cors_origins: List[str] = ["http://localhost:3000"]
    cors_origin_regex: Optional[str] = None


@lru_cache
def get_settings() -> Settings:
    return Settings()
