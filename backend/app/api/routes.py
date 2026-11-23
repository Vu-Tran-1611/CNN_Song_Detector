"""HTTP endpoints. They only handle the request/response; the logic lives in SongPredictor."""

from fastapi import APIRouter, Depends, File, UploadFile

from app.api.deps import get_predictor
from app.schemas import ErrorOut, HealthOut, PredictionOut, SongOut, SongsOut
from app.services.predictor import FileTooLargeError, Song, SongPredictor

router = APIRouter(prefix="/api")


def song_out(song: Song) -> SongOut:
    return SongOut(id=song.id, title=song.title, artist=song.artist)


@router.get("/health", response_model=HealthOut)
def health(predictor: SongPredictor = Depends(get_predictor)) -> HealthOut:
    return HealthOut(model_loaded=predictor is not None)


@router.get("/songs", response_model=SongsOut)
def songs(predictor: SongPredictor = Depends(get_predictor)) -> SongsOut:
    return SongsOut(songs=[song_out(s) for s in predictor.songs])


@router.post(
    "/predict",
    response_model=PredictionOut,
    responses={400: {"model": ErrorOut}, 413: {"model": ErrorOut}, 422: {"model": ErrorOut}},
)
def predict_song(
    audio: UploadFile = File(description="WAV recording, 5-25 seconds"),
    predictor: SongPredictor = Depends(get_predictor),
) -> PredictionOut:
    data = audio.file.read(predictor.max_upload_bytes + 1)
    if len(data) > predictor.max_upload_bytes:
        raise FileTooLargeError(f"File must be at most {predictor.max_upload_bytes // (1024 * 1024)} MB.")

    result = predictor.predict_audio(data)
    return PredictionOut(
        recognized=result.recognized,
        song=song_out(result.song),
        probability=round(result.probability, 4),
        threshold=result.threshold,
    )
