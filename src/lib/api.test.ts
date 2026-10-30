import { describe, expect, it } from "vitest";
import { resolveApiBase } from "./api";

describe("resolveApiBase", () => {
  it("prefers VITE_API_URL and trims trailing slashes", () => {
    expect(resolveApiBase("https://api.example.com/api/", "localhost")).toBe(
      "https://api.example.com/api",
    );
  });

  it("uses the same-origin proxy path on localhost", () => {
    expect(resolveApiBase(undefined, "localhost")).toBe("/api");
    expect(resolveApiBase("", "127.0.0.1")).toBe("/api");
  });

  it("falls back to the deployed backend on other hosts", () => {
    expect(resolveApiBase(undefined, "documind-rag-assistant.onrender.com")).toBe(
      "https://documind-rag-assistant-api.onrender.com/api",
    );
  });
});
