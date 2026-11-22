"""The API's JSON contract: what the frontend sends and receives."""

from typing import List, Literal

from pydantic import BaseModel, Field


class SongOut(BaseModel):
    id: int
    title: str
    artist: str


class PredictionOut(BaseModel):
    recognized: bool = Field(description="True when probability >= threshold")
    song: SongOut = Field(description="The recognized song, or the best guess when not recognized")
    probability: float = Field(ge=0, le=1)
    threshold: float = Field(ge=0, le=1)


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
