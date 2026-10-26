import { describe, expect, it } from "vitest";

import {
  formatBytes,
  formatDate,
  relativeTime,
  scorePercent,
  truncate,
} from "./format";

describe("formatBytes", () => {
  it("formats byte sizes with sensible precision", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(-10)).toBe("0 B");
    expect(formatBytes(Number.NaN)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(10 * 1024 * 1024)).toBe("10 MB");
  });
});

describe("formatDate", () => {
  it("formats valid ISO dates and rejects invalid input", () => {
    expect(formatDate("2026-10-25T12:00:00Z")).toContain("2026");
    expect(formatDate("not-a-date")).toBe("Unknown date");
  });
});

describe("relativeTime", () => {
  it("returns a relative string for recent timestamps", () => {
    const value = relativeTime(new Date(Date.now() - 5_000).toISOString());
    expect(value).toMatch(/second/);
    expect(relativeTime("not-a-date")).toBe("recently");
  });
});

describe("scorePercent", () => {
  it("rounds and clamps similarity scores", () => {
    expect(scorePercent(0.756)).toBe(76);
    expect(scorePercent(-1)).toBe(0);
    expect(scorePercent(2)).toBe(100);
  });
});

describe("truncate", () => {
  it("only appends an ellipsis when text exceeds the limit", () => {
    expect(truncate("short", 10)).toBe("short");
    expect(truncate("a longer sentence", 8)).toBe("a longer…");
  });
});
