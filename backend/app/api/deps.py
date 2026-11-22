from fastapi import Request

from app.services.predictor import SongPredictor


def get_predictor(request: Request) -> SongPredictor:
    """The predictor loaded at startup. Tests can replace it via app.dependency_overrides."""
    return request.app.state.predictor
