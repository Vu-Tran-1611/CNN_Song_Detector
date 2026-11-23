"""The API's JSON contract: what the frontend sends and receives."""

from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class SongOut(BaseModel):
    id: int
    title: str
    artist: str


class PredictionOut(BaseModel):
    status: Literal["recognized", "not_sure", "unknown", "no_music"] = Field(
        description="recognized: confident; not_sure: best guess below the threshold; "
        "unknown: music, but not like any of the 10 songs; no_music: silence, noise, a tone or speech"
    )
    recognized: bool = Field(description="True when status is 'recognized'")
    song: Optional[SongOut] = Field(description="The recognized song or best guess; null for unknown / no_music")
    probability: float = Field(ge=0, le=1)
    threshold: float = Field(ge=0, le=1)
    reason: Optional[Literal["silence", "noise", "tone", "speech"]] = Field(
        default=None, description="Why the audio is not music (only for no_music)"
    )


class SongsOut(BaseModel):
    songs: List[SongOut]


class HealthOut(BaseModel):
    status: Literal["ok"] = "ok"
    model_loaded: bool


class ErrorDetail(BaseModel):
    code: str
    message: str


class ErrorOut(BaseModel):
    error: ErrorDetail
