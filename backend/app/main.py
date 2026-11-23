"""FastAPI app: startup, CORS and error handling.

Run locally from backend/:
    .venv/bin/uvicorn app.main:app --reload
Then open http://localhost:8000/docs
"""

import logging
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import router
from app.config import Settings, get_settings
from app.services.predictor import (
    AudioTooLongError,
    AudioTooShortError,
    FileTooLargeError,
    InvalidAudioError,
    PredictionError,
    SongPredictor,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

ERROR_STATUS = {
    InvalidAudioError: 400,
    FileTooLargeError: 413,
    AudioTooShortError: 422,
    AudioTooLongError: 422,
}


def error_response(status: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(status_code=status, content={"error": {"code": code, "message": message}})


def create_app(settings: Optional[Settings] = None) -> FastAPI:
    settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        predictor = SongPredictor.from_settings(settings)
        predictor.warm_up()
        app.state.predictor = predictor
        yield

    app = FastAPI(title="CNN Song Detector API", version="0.1.0", lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["GET", "POST"],
        allow_headers=["*"],
    )

    @app.exception_handler(PredictionError)
    async def handle_prediction_error(request: Request, exc: PredictionError):
        return error_response(ERROR_STATUS.get(type(exc), 400), exc.code, exc.message)

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(request: Request, exc: RequestValidationError):
        return error_response(422, "invalid_request", "Send the recording as a form field named 'audio'.")

    app.include_router(router)
    return app


app = create_app()
