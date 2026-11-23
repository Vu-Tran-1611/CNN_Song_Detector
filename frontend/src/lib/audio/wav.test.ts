import { describe, expect, it } from "vitest";

import { concatChunks, encodeWavBuffer } from "./wav";

const text = (view: DataView, offset: number, length: number) =>
  String.fromCharCode(...Array.from({ length }, (_, i) => view.getUint8(offset + i)));

describe("encodeWavBuffer", () => {
  it("writes a 16-bit mono PCM header", () => {
    const view = new DataView(encodeWavBuffer(new Float32Array(48000), 48000));
    expect(text(view, 0, 4)).toBe("RIFF");
    expect(text(view, 8, 4)).toBe("WAVE");
    expect(view.getUint16(20, true)).toBe(1);
    expect(view.getUint16(22, true)).toBe(1);
    expect(view.getUint32(24, true)).toBe(48000);
    expect(view.getUint16(34, true)).toBe(16);
    expect(view.getUint32(40, true)).toBe(96000);
    expect(view.byteLength).toBe(44 + 96000);
  });

  it("converts and clamps sample values", () => {
    const view = new DataView(encodeWavBuffer(new Float32Array([0, 1, -1, 2, -2, 0.5]), 22050));
    const sample = (i: number) => view.getInt16(44 + i * 2, true);
    expect([sample(0), sample(1), sample(2), sample(3), sample(4)]).toEqual([0, 32767, -32768, 32767, -32768]);
    expect(sample(5)).toBe(Math.trunc(0.5 * 32767));
  });
});

describe("concatChunks", () => {
  it("joins chunks in order", () => {
    expect(Array.from(concatChunks([new Float32Array([1, 2]), new Float32Array([3])]))).toEqual([1, 2, 3]);
  });
});
