export interface DocumentRecord {
  id: string;
  filename: string;
  file_type: "pdf" | "txt";
  size_bytes: number;
  pages: number | null;
  chunk_count: number;
  character_count: number;
  created_at: string;
}

export interface HealthResponse {
  status: "ok" | "degraded";
  version: string;
  embedding: {
    model: string;
    dimension: number | null;
    ready: boolean;
    error: string | null;
    device: string;
  };
  llm: {
    configured_provider: string;
    active_provider: string;
    model: string;
    available: boolean;
    fallback_enabled: boolean;
    detail: string | null;
    ollama_base_url?: string | null;
    ollama_model?: string | null;
    ollama_connected?: boolean | null;
    model_available?: boolean | null;
    generation_active?: boolean;
    status?:
      | "ready"
      | "model_missing"
      | "unavailable"
      | "fallback"
      | "extractive"
      | "not_configured";
  };
  counts: {
    documents: number;
    chunks: number;
    index_vectors: number;
  };
  limits: {
    max_upload_mb: number;
    allowed_extensions: string[];
  };
  defaults: {
    chunk_size: number;
    chunk_overlap: number;
    top_k: number;
    score_threshold: number;
    min_similarity_floor: number;
  };
}

export interface Source {
  id: number;
  document_id: string;
  filename: string;
  file_type: "pdf" | "txt";
  page: number | null;
  chunk_id: string;
  chunk_index: number;
  score: number;
  excerpt: string;
  cited: boolean;
}

export interface QueryResponse {
  answer: string;
  answerable: boolean;
  reason: "answered" | "insufficient_evidence" | "no_documents" | "greeting";
  sources: Source[];
  retrieval: {
    top_k: number;
    threshold: number;
    chunks_retrieved: number;
    documents_searched: number;
    latency_ms: number;
    candidates_considered?: number;
    candidates_passed?: number;
    top_score?: number | null;
    effective_threshold?: number;
    min_similarity_floor?: number;
  };
  generation: {
    provider: string;
    model: string;
    mode: "llm" | "extractive" | "none";
    latency_ms: number;
    fallback_reason: string | null;
  };
}

export interface QueryRequest {
  question: string;
  document_ids: string[] | null;
  top_k: number;
  threshold: number;
}
