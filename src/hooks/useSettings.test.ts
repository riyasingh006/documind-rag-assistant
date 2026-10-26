import { describe, expect, it } from "vitest";

import {
  DEFAULT_SETTINGS,
  sanitizeSettings,
} from "./useSettings";

describe("sanitizeSettings", () => {
  it("returns defaults for missing input", () => {
    expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS);
  });

  it("clamps and rounds values to supported ranges", () => {
    expect(
      sanitizeSettings({
        chunkSize: 50,
        chunkOverlap: 40,
        topK: 99,
        threshold: 2,
      }),
    ).toEqual({
      chunkSize: 100,
      chunkOverlap: 40,
      topK: 10,
      threshold: 1,
    });

    expect(
      sanitizeSettings({
        chunkSize: 5000,
        chunkOverlap: 900,
        topK: -1,
        threshold: -0.5,
      }),
    ).toEqual({
      chunkSize: 2000,
      chunkOverlap: 900,
      topK: 1,
      threshold: 0,
    });
  });

  it("keeps overlap below half of the chunk size", () => {
    expect(
      sanitizeSettings({ chunkSize: 101, chunkOverlap: 100 }),
    ).toMatchObject({
      chunkSize: 101,
      chunkOverlap: 50,
    });
  });

  it("falls back for non-numeric values", () => {
    expect(
      sanitizeSettings({
        chunkSize: Number.NaN,
        chunkOverlap: "bad" as unknown as number,
        topK: Number.POSITIVE_INFINITY,
        threshold: "bad" as unknown as number,
      }),
    ).toEqual(DEFAULT_SETTINGS);
  });

  it("rounds fractional integers", () => {
    const settings = sanitizeSettings({
      chunkSize: 800.6,
      chunkOverlap: 120.4,
      topK: 5.6,
      threshold: 0.2,
    });
    expect(settings.chunkSize).toBe(801);
    expect(settings.chunkOverlap).toBe(120);
    expect(settings.topK).toBe(6);
  });
});
