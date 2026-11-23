export type Song = {
  id: number;
  title: string;
  artist: string;
};

export type Prediction = {
  recognized: boolean;
  song: Song;
  probability: number;
  threshold: number;
};

export type ApiErrorBody = {
  error: { code: string; message: string };
};
