"""Server settings. Every value can be overridden with an environment variable
prefixed SONG_, e.g. SONG_CONFIDENCE_THRESHOLD=0.7 or
SONG_CORS_ORIGINS='["https://my-app.vercel.app"]'.
"""

from functools import lru_cache
from pathlib import Path
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[1]

# Below this averaged probability the answer is "not sure" (with a best guess).
CONFIDENCE_THRESHOLD = 0.80


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="SONG_", protected_namespaces=())

    confidence_threshold: float = CONFIDENCE_THRESHOLD

    # Recording limits. The browser records 5-10 s; 15 s leaves some slack.
    min_duration_seconds: float = 5.0
    max_duration_seconds: float = 15.0
    max_upload_bytes: int = 5 * 1024 * 1024  # a 10 s browser WAV is about 0.44 MB

    model_path: Path = BACKEND_DIR / "models" / "song_cnn_model.pth"
    songs_path: Path = BACKEND_DIR / "models" / "songs.json"

    # Websites allowed to call the API from the browser (Next.js dev server by default).
    cors_origins: List[str] = ["http://localhost:3000"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
