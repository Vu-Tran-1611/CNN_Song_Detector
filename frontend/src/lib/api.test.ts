import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError, getSongs, predict } from "./api";

function respond(status: number, body: string, contentType = "application/json") {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(body, { status, headers: { "content-type": contentType } })));
}

async function apiError(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof ApiError) return error;
  }
  throw new Error("expected an ApiError");
}

afterEach(() => vi.unstubAllGlobals());

describe("api", () => {
  it("returns the songs list", async () => {
    respond(200, JSON.stringify({ songs: [{ id: 0, title: "Attention", artist: "Charlie Puth" }] }));
    expect(await getSongs()).toEqual([{ id: 0, title: "Attention", artist: "Charlie Puth" }]);
  });

  it("passes the backend's error code and message through", async () => {
    respond(422, JSON.stringify({ error: { code: "too_short", message: "Recording must be at least 5 seconds." } }));
    const error = await apiError(predict(new Blob()));
    expect([error.code, error.message, error.status]).toEqual(["too_short", "Recording must be at least 5 seconds.", 422]);
  });

  it("treats a 5xx without our JSON error as 'can't reach the server'", async () => {
    respond(500, "Internal Server Error", "text/plain"); // dev proxy with the backend down
    expect((await apiError(getSongs())).code).toBe("network");
    respond(503, "<html>Space is sleeping</html>", "text/html"); // host waking up
    expect((await apiError(getSongs())).code).toBe("network");
  });

  it("treats a failed fetch as 'can't reach the server'", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))));
    expect((await apiError(getSongs())).code).toBe("network");
  });
});
