import type { HealthResponse } from "./types";

type LLMHealth = HealthResponse["llm"];

export function llmStatusLabel(llm: LLMHealth | null): string {
  if (!llm) return "Unknown";
  switch (llm.status) {
    case "ready":
      return llm.active_provider === "ollama"
        ? "Ollama generating"
        : "LLM generating";
    case "model_missing":
      return "Ollama model missing";
    case "unavailable":
      return "Ollama unavailable";
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
  if (llm.status === "ready") return "good";
  if (llm.status === "unavailable" || llm.status === "not_configured") {
    return "bad";
  }
  if (llm.status === "model_missing") return "warn";
  if (llm.status === "fallback" || llm.status === "extractive") return "warn";
  return llm.available ? "good" : "warn";
}

export function ollamaGuidance(llm: LLMHealth | null): string {
  if (!llm) return "Start the backend to inspect Ollama status.";
  if (llm.status === "model_missing") {
    return llm.detail ?? "The configured Ollama model is not installed.";
  }
  if (llm.status === "unavailable") {
    return llm.detail ?? "Ollama is not reachable.";
  }
  return (
    llm.detail ??
    "Start Ollama or configure a provider to enable synthesized answers."
  );
}
