// Mirrors the backend's JSON (backend/app/schemas.py).

export type Song = {
  id: number;
  title: string;
  artist: string;
};

export type Prediction = {
  recognized: boolean; // probability >= threshold
  song: Song; // the recognized song, or the best guess
  probability: number; // 0..1
  threshold: number; // 0..1
};

export type ApiErrorBody = {
  error: { code: string; message: string };
};
