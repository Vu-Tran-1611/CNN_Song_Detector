// The only module that talks to the backend.

import type { ApiErrorBody, Prediction, Song } from "./types";

// Empty in development: requests go to /api/... on the Next.js server, which
// forwards them to the backend (see next.config.ts).
const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

const DEFAULT_TIMEOUT_MS = 15_000;
// A free Hugging Face Space may need time to wake up on the first request.
const PREDICT_TIMEOUT_MS = 60_000;

export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init: RequestInit = {}, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: init.signal ?? AbortSignal.timeout(timeoutMs),
    });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "TimeoutError") {
      throw new ApiError("timeout", "The server took too long to answer.");
    }
    if (cause instanceof DOMException && cause.name === "AbortError") throw cause;
    throw new ApiError("network", "Can't reach the server.");
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(
      body?.error?.code ?? "http_error",
      body?.error?.message ?? `Server error (${response.status}).`,
      response.status,
    );
  }
  return (await response.json()) as T;
}

export async function getSongs(signal?: AbortSignal): Promise<Song[]> {
  const body = await request<{ songs: Song[] }>("/api/songs", { signal });
  return body.songs;
}

export async function predict(wav: Blob): Promise<Prediction> {
  const form = new FormData();
  form.append("audio", wav, "recording.wav");
  return request<Prediction>("/api/predict", { method: "POST", body: form }, PREDICT_TIMEOUT_MS);
}
