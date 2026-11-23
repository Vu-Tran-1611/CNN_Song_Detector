export type Song = {
  id: number;
  title: string;
  artist: string;
};

export type PredictionStatus = "recognized" | "not_sure" | "unknown" | "no_music";

export type NoMusicReason = "silence" | "noise" | "tone" | "speech";

export type Prediction = {
  status?: PredictionStatus;
  recognized: boolean;
  song: Song | null;
  probability: number;
  threshold: number;
  reason?: NoMusicReason | null;
};

export function statusOf(prediction: Prediction): PredictionStatus {
  if (prediction.status) return prediction.status;
  if (!prediction.song) return "unknown";
  return prediction.recognized ? "recognized" : "not_sure";
}

export type ApiErrorBody = {
  error: { code: string; message: string };
};
