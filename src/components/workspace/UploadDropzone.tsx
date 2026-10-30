import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  FileText,
  Loader2,
  UploadCloud,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useWorkspace } from "@/context/WorkspaceContext";
import { useSettings } from "@/hooks/useSettings";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatBytes } from "@/lib/format";
import type { DocumentRecord } from "@/lib/types";

type UploadStatus = "queued" | "uploading" | "success" | "error";

interface UploadItem {
  id: string;
  file: File;
  status: UploadStatus;
  message?: string;
}

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function uploadErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Upload failed. Please try again.";
}

interface UploadDropzoneProps {
  compact?: boolean;
  className?: string;
  onUploaded?: (document: DocumentRecord) => void;
}

export function UploadDropzone({
  compact = false,
  className,
  onUploaded,
}: UploadDropzoneProps) {
  const { health, registerDocument } = useWorkspace();
  const { settings } = useSettings();
  const [items, setItems] = useState<UploadItem[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const queue = useRef<UploadItem[]>([]);
  const processing = useRef(false);
  const mounted = useRef(true);
  const dragDepth = useRef(0);

  const allowed = health?.limits.allowed_extensions ?? ["pdf", "txt"];
  const maxMb = health?.limits.max_upload_mb ?? 20;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  async function drain() {
    if (processing.current) return;
    processing.current = true;
    try {
      while (queue.current.length > 0) {
        const next = queue.current.shift();
        if (!next) break;

        setItems((current) =>
          current.map((item) =>
            item.id === next.id
              ? { ...item, status: "uploading", message: undefined }
              : item,
          ),
        );

        try {
          const document = await api.uploadDocument(next.file, {
            chunkSize: settings.chunkSize,
            chunkOverlap: settings.chunkOverlap,
          });
          registerDocument(document);
          onUploaded?.(document);
          if (!mounted.current) return;
          setItems((current) =>
            current.map((item) =>
              item.id === next.id
                ? {
                    ...item,
                    status: "success",
                    message: `${document.chunk_count} chunk${document.chunk_count === 1 ? "" : "s"} indexed`,
                  }
                : item,
            ),
          );
        } catch (error) {
          if (!mounted.current) return;
          setItems((current) =>
            current.map((item) =>
              item.id === next.id
                ? {
                    ...item,
                    status: "error",
                    message: uploadErrorMessage(error),
                  }
                : item,
            ),
          );
        }
      }
    } finally {
      processing.current = false;
    }
  }

  function enqueue(files: FileList | File[]) {
    const incoming = Array.from(files);
    if (incoming.length === 0) return;

    const queued: UploadItem[] = incoming.map((file) => {
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
      let message: string | undefined;
      let status: UploadStatus = "queued";

      if (!allowed.includes(extension)) {
        status = "error";
        message = `Unsupported file type. Use ${allowed
          .map((item) => item.toUpperCase())
          .join(" or ")}.`;
      } else if (file.size === 0) {
        status = "error";
        message = "This file is empty.";
      } else if (file.size > maxMb * 1024 * 1024) {
        status = "error";
        message = `File is larger than the ${maxMb} MB limit.`;
      }

      return { id: newId(), file, status, message };
    });

    setItems((current) => [...current, ...queued]);
    queue.current.push(
      ...queued.filter((item) => item.status === "queued"),
    );
    void drain();
  }

  function handleInput(event: React.ChangeEvent<HTMLInputElement>) {
    if (event.target.files) enqueue(event.target.files);
    event.target.value = "";
  }

  function handleDragEnter(event: React.DragEvent) {
    event.preventDefault();
    dragDepth.current += 1;
    setDragActive(true);
  }

  function handleDragLeave(event: React.DragEvent) {
    event.preventDefault();
    dragDepth.current -= 1;
    if (dragDepth.current <= 0) {
      dragDepth.current = 0;
      setDragActive(false);
    }
  }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    dragDepth.current = 0;
    setDragActive(false);
    if (event.dataTransfer.files) enqueue(event.dataTransfer.files);
  }

  const pendingCount = items.filter(
    (item) => item.status === "queued" || item.status === "uploading",
  ).length;
  const finishedCount = items.filter(
    (item) => item.status === "success" || item.status === "error",
  ).length;

  return (
    <div className={cn("w-full", className)}>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.txt,application/pdf,text/plain"
        multiple
        className="sr-only"
        onChange={handleInput}
        aria-label="Choose documents to upload"
      />

      <div
        onDragEnter={handleDragEnter}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative overflow-hidden rounded-2xl border-2 border-dashed transition duration-200",
          dragActive
            ? "border-brand-400 bg-brand-50/70"
            : "border-ink-200 bg-surface/60 hover:border-ink-300",
          compact ? "p-4" : "p-6 sm:p-8",
        )}
      >
        {dragActive && (
          <div className="pointer-events-none absolute inset-0 bg-grid opacity-40" />
        )}

        {compact ? (
          <div className="relative flex flex-wrap items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-300">
              <UploadCloud className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-ink-900">
                Add more documents
              </p>
              <p className="mt-0.5 text-[11px] text-ink-400">
                PDF or TXT · up to {maxMb} MB each · Gemini embeddings
              </p>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => inputRef.current?.click()}
            >
              Choose files
            </Button>
          </div>
        ) : (
          <div className="relative flex flex-col items-center text-center">
            <div
              className={cn(
                "flex h-14 w-14 items-center justify-center rounded-2xl border transition",
                dragActive
                  ? "border-brand-200 bg-surface text-brand-300 shadow-soft"
                  : "border-ink-100 bg-surface text-brand-500 shadow-soft",
              )}
            >
              <UploadCloud className="h-6 w-6" aria-hidden="true" />
            </div>
            <h3 className="mt-4 text-[15px] font-semibold tracking-[-0.01em] text-ink-950">
              {dragActive ? "Drop files to upload" : "Upload your documents"}
            </h3>
            <p className="mt-1.5 max-w-sm text-xs leading-5 text-ink-500">
              Drag and drop PDF or TXT files here, or choose them from your
              computer. Each file is validated and chunked; Gemini generates its retrieval embeddings.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <Button
                size="sm"
                icon={<UploadCloud className="h-3.5 w-3.5" />}
                onClick={() => inputRef.current?.click()}
              >
                Choose files
              </Button>
              <span className="text-[10px] text-ink-400">
                {allowed.map((item) => item.toUpperCase()).join(" / ")} ·{" "}
                {maxMb} MB max
              </span>
            </div>
          </div>
        )}
      </div>

      {items.length > 0 && (
        <div className="mt-3 overflow-hidden rounded-xl border border-ink-100 bg-surface">
          <div className="flex items-center justify-between border-b border-ink-100 px-3 py-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-400">
              {pendingCount > 0
                ? `Uploading ${pendingCount} file${pendingCount === 1 ? "" : "s"}`
                : "Upload results"}
            </span>
            {finishedCount > 0 && pendingCount === 0 && (
              <button
                type="button"
                onClick={() => setItems([])}
                className="focus-ring rounded text-[10px] font-medium text-ink-400 hover:text-ink-700"
              >
                Clear
              </button>
            )}
          </div>
          <ul className="max-h-52 divide-y divide-ink-50 overflow-y-auto">
            {items.map((item) => (
              <li key={item.id} className="flex items-start gap-2.5 px-3 py-2.5">
                <span
                  className={cn(
                    "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
                    item.status === "success"
                      ? "bg-emerald-50 text-emerald-600"
                      : item.status === "error"
                        ? "bg-red-50 text-red-600"
                        : "bg-ink-50 text-ink-400",
                  )}
                >
                  {item.status === "success" ? (
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : item.status === "error" ? (
                    <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : item.status === "uploading" ? (
                    <Loader2
                      className="h-3.5 w-3.5 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11.5px] font-medium text-ink-800">
                    {item.file.name}
                  </span>
                  <span
                    className={cn(
                      "mt-0.5 block text-[10px] leading-4",
                      item.status === "error"
                        ? "text-red-600"
                        : item.status === "success"
                          ? "text-emerald-700"
                          : "text-ink-400",
                    )}
                  >
                    {item.status === "uploading"
                      ? "Extracting, chunking, and embedding…"
                      : item.status === "queued"
                        ? "Waiting to upload…"
                        : (item.message ?? formatBytes(item.file.size))}
                  </span>
                  {item.status === "uploading" && (
                    <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-ink-100">
                      <span className="block h-full w-1/2 animate-shimmer rounded-full bg-brand-400" />
                    </span>
                  )}
                </span>
                {(item.status === "error" || item.status === "success") && (
                  <button
                    type="button"
                    onClick={() =>
                      setItems((current) =>
                        current.filter((entry) => entry.id !== item.id),
                      )
                    }
                    className="focus-ring -mr-1 mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-ink-300 hover:bg-ink-50 hover:text-ink-600"
                    aria-label={`Dismiss ${item.file.name}`}
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
