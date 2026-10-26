import type {
  DocumentRecord,
  HealthResponse,
  QueryRequest,
  QueryResponse,
} from "./types";

const configuredBase = import.meta.env.VITE_API_URL as string | undefined;
export const API_BASE = (configuredBase ?? "http://127.0.0.1:8000/api").replace(
  /\/+$/,
  "",
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
      "Unable to reach the DocuMind backend. Make sure the API server is running on port 8000.",
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
