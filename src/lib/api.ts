import type {
  DocumentRecord,
  HealthResponse,
  QueryRequest,
  QueryResponse,
} from "./types";

const configuredBase = import.meta.env.VITE_API_URL as string | undefined;

const DEPLOYED_API_BASE = "https://documind-rag-assistant-api.onrender.com/api";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

/**
 * Resolve the API base URL.
 * 1. VITE_API_URL always wins when set at build time.
 * 2. On localhost, use the same-origin "/api" path, which the Vite dev and
 *    preview servers proxy to the local backend on port 8000.
 * 3. Anywhere else, use the deployed backend.
 */
export function resolveApiBase(
  configured: string | undefined,
  hostname: string,
): string {
  const value = configured?.trim();
  if (value) return value.replace(/\/+$/, "");
  if (LOCAL_HOSTS.has(hostname)) return "/api";
  return DEPLOYED_API_BASE;
}

export const API_BASE = resolveApiBase(
  configuredBase,
  typeof window !== "undefined" ? window.location.hostname : "",
);

export class ApiError extends Error {
  status: number;
  detail?: string;

  constructor(message: string, status = 0, detail?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

async function parseError(response: Response): Promise<ApiError> {
  let message = `Request failed (${response.status})`;
  let detail: string | undefined;
  try {
    const data = (await response.json()) as { detail?: unknown };
    if (typeof data.detail === "string") {
      message = data.detail;
      detail = data.detail;
    } else if (Array.isArray(data.detail) && data.detail.length > 0) {
      const first = data.detail[0] as { msg?: string };
      if (first?.msg) {
        message = first.msg;
        detail = first.msg;
      }
    }
  } catch {
    // non-JSON error body
  }
  return new ApiError(message, response.status, detail);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 300_000);

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...init?.headers,
      },
    });

    if (!response.ok) {
      throw await parseError(response);
    }

    if (response.status === 204) {
      return undefined as T;
    }
    try {
      return (await response.json()) as T;
    } catch {
      throw new ApiError(
        "The backend returned an invalid response. Check the API server logs.",
        response.status,
      );
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("The request timed out. Please try again.", 0);
    }
    throw new ApiError(
      `Unable to reach the DocuMind backend at ${API_BASE}. Make sure the API server is running and allows this origin (CORS).`,
      0,
    );
  } finally {
    window.clearTimeout(timeout);
  }
}

export const api = {
  getHealth() {
    return request<HealthResponse>("/health");
  },

  listDocuments() {
    return request<DocumentRecord[]>("/documents");
  },

  uploadDocument(
    file: File,
    options: { chunkSize: number; chunkOverlap: number },
  ) {
    const form = new FormData();
    form.append("file", file);
    form.append("chunk_size", String(options.chunkSize));
    form.append("chunk_overlap", String(options.chunkOverlap));
    return request<DocumentRecord>("/documents", {
      method: "POST",
      body: form,
      headers: {},
    });
  },

  deleteDocument(id: string) {
    return request<void>(`/documents/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },

  askQuestion(payload: QueryRequest) {
    return request<QueryResponse>("/query", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    });
  },
};
