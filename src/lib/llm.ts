import type { HealthResponse } from "./types";

type LLMHealth = HealthResponse["llm"];

export function llmStatusLabel(llm: LLMHealth | null): string {
  if (!llm) return "Unknown";
  switch (llm.status) {
    case "configured":
      return "Gemini configured";
    case "temporarily_unavailable":
      return "Gemini temporarily unavailable";
    case "fallback":
    case "extractive":
      return "Extractive fallback";
    case "not_configured":
      return "Not configured";
    default:
      return llm.active_provider === "extractive"
        ? "Extractive fallback"
        : llm.active_provider;
  }
}

export function llmStatusTone(
  llm: LLMHealth | null,
): "default" | "good" | "warn" | "bad" {
  if (!llm) return "default";
  if (llm.status === "configured") return "good";
  if (llm.status === "temporarily_unavailable" || llm.status === "fallback") {
    return "warn";
  }
  if (llm.status === "not_configured") return "bad";
  return llm.status === "extractive" ? "warn" : "default";
}

export function llmGuidance(llm: LLMHealth | null): string {
  if (!llm) return "Start the backend to inspect Gemini status.";
  if (llm.status === "not_configured") {
    return llm.detail ?? "Add DOCUMIND_GEMINI_API_KEY to the backend environment.";
  }
  if (llm.status === "temporarily_unavailable") {
    return llm.detail ?? "Gemini is temporarily unavailable; the answer used the labelled extractive fallback.";
  }
  if (llm.status === "configured") {
    return llm.detail ?? "Gemini connectivity is checked when an answer is generated.";
  }
  if (llm.status === "extractive") {
    return llm.detail ?? "Answers use the configured extractive mode.";
  }
  return llm.detail ?? "Gemini is not configured; answers use the labelled extractive fallback.";
}
