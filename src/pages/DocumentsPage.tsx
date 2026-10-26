import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  FileText,
  FileType2,
  HardDrive,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { UploadDropzone } from "@/components/workspace/UploadDropzone";
import { useWorkspace } from "@/context/WorkspaceContext";
import { cn } from "@/lib/cn";
import {
  formatBytes,
  formatDate,
  relativeTime,
} from "@/lib/format";
import type { DocumentRecord } from "@/lib/types";

type TypeFilter = "all" | "pdf" | "txt";

function fileIconClass(type: DocumentRecord["file_type"]): string {
  return type === "pdf"
    ? "bg-red-50 text-red-500"
    : "bg-sky-50 text-sky-500";
}

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof FileText;
}) {
  return (
    <div className="rounded-xl border border-ink-100 bg-surface p-3.5 shadow-[0_1px_2px_rgba(16,21,40,0.03)]">
      <div className="flex items-center justify-between">
        <p className="text-[8.5px] font-semibold uppercase tracking-[0.12em] text-ink-400">
          {label}
        </p>
        <Icon className="h-3.5 w-3.5 text-ink-300" aria-hidden="true" />
      </div>
      <p className="mt-2 text-xl font-semibold tracking-[-0.03em] text-ink-950">
        {value}
      </p>
      <p className="mt-0.5 truncate text-[9px] text-ink-400">{detail}</p>
    </div>
  );
}

function DocumentRow({
  document,
  onDelete,
}: {
  document: DocumentRecord;
  onDelete: (document: DocumentRecord) => void;
}) {
  return (
    <tr className="group transition hover:bg-ink-50/40">
      <td className="px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
              fileIconClass(document.file_type),
            )}
          >
            <FileType2 className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p
              className="max-w-[340px] truncate text-[11.5px] font-medium text-ink-900"
              title={document.filename}
            >
              {document.filename}
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 text-[8.5px] text-ink-400">
              <span className="inline-flex items-center gap-1 text-emerald-600">
                <CheckCircle2 className="h-2.5 w-2.5" aria-hidden="true" />
                Indexed
              </span>
              {document.pages !== null && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>
                    {document.pages} page{document.pages === 1 ? "" : "s"}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>
      </td>
      <td className="px-3 py-3">
        <span className="rounded border border-ink-100 bg-surface px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-ink-500">
          {document.file_type}
        </span>
      </td>
      <td className="whitespace-nowrap px-3 py-3 text-[10px] tabular-nums text-ink-500">
        {formatBytes(document.size_bytes)}
      </td>
      <td className="whitespace-nowrap px-3 py-3 text-[10px] tabular-nums text-ink-500">
        {document.chunk_count}
      </td>
      <td className="whitespace-nowrap px-3 py-3 text-[10px] text-ink-500">
        <span title={formatDate(document.created_at)}>
          {relativeTime(document.created_at)}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <button
          type="button"
          onClick={() => onDelete(document)}
          className="focus-ring inline-flex h-7 w-7 items-center justify-center rounded-md text-ink-300 opacity-0 transition hover:bg-red-50 hover:text-red-600 focus-visible:opacity-100 group-hover:opacity-100"
          aria-label={`Delete ${document.filename}`}
          title="Delete document"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </td>
    </tr>
  );
}

function DocumentCard({
  document,
  onDelete,
}: {
  document: DocumentRecord;
  onDelete: (document: DocumentRecord) => void;
}) {
  return (
    <div className="rounded-xl border border-ink-100 bg-surface p-3">
      <div className="flex items-start gap-2.5">
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
            fileIconClass(document.file_type),
          )}
        >
          <FileType2 className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11.5px] font-medium text-ink-900">
            {document.filename}
          </p>
          <p className="mt-0.5 text-[8.5px] text-ink-400">
            {document.file_type.toUpperCase()} · {formatBytes(document.size_bytes)}{" "}
            · {document.chunk_count} chunks
            {document.pages !== null
              ? ` · ${document.pages} page${document.pages === 1 ? "" : "s"}`
              : ""}
          </p>
          <p className="mt-1.5 flex items-center gap-1.5 text-[8.5px] text-ink-400">
            <span className="inline-flex items-center gap-1 text-emerald-600">
              <CheckCircle2 className="h-2.5 w-2.5" aria-hidden="true" />
              Indexed
            </span>
            <span aria-hidden="true">·</span>
            {relativeTime(document.created_at)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onDelete(document)}
          className="focus-ring flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-ink-300 transition hover:bg-red-50 hover:text-red-600"
          aria-label={`Delete ${document.filename}`}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export function DocumentsPage() {
  const {
    documents,
    documentsLoading,
    documentsError,
    health,
    healthError,
    refreshDocuments,
    deleteDocument,
  } = useWorkspace();

  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] =
    useState<DocumentRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Document library · DocuMind AI";
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const sorted = useMemo(
    () =>
      [...documents].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
    [documents],
  );

  const filtered = sorted.filter((document) => {
    const matchesQuery = document.filename
      .toLowerCase()
      .includes(query.trim().toLowerCase());
    const matchesType =
      typeFilter === "all" || document.file_type === typeFilter;
    return matchesQuery && matchesType;
  });

  const totalBytes = documents.reduce(
    (sum, document) => sum + document.size_bytes,
    0,
  );
  const totalChunks = documents.reduce(
    (sum, document) => sum + document.chunk_count,
    0,
  );
  const pdfCount = documents.filter(
    (document) => document.file_type === "pdf",
  ).length;
  const txtCount = documents.length - pdfCount;

  function announceUpload(document: DocumentRecord) {
    setNotice(
      `${document.filename} uploaded · ${document.chunk_count} chunk${
        document.chunk_count === 1 ? "" : "s"
      } indexed.`,
    );
  }

  async function confirmDelete() {
    if (!documentToDelete || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    const filename = documentToDelete.filename;
    try {
      await deleteDocument(documentToDelete.id);
      setDocumentToDelete(null);
      setNotice(`${filename} was deleted.`);
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : "The document could not be deleted.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="min-h-[calc(100dvh-56px)] lg:min-h-dvh">
      <div className="mx-auto w-full max-w-[1120px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-brand-300">
              Library
            </p>
            <div className="mt-1 flex items-center gap-2">
              <h1 className="text-[22px] font-semibold tracking-[-0.03em] text-ink-950 sm:text-2xl">
                Your documents
              </h1>
              <span className="rounded-full border border-ink-100 bg-surface px-2 py-0.5 text-[9px] font-semibold text-ink-500">
                {documents.length}
              </span>
            </div>
            <p className="mt-1 max-w-lg text-[11px] leading-5 text-ink-500">
              Upload, inspect, and remove the files that ground your answers.
              Deleting a document removes its chunks and vectors.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void refreshDocuments()}
              disabled={documentsLoading}
              className="focus-ring flex h-9 w-9 items-center justify-center rounded-lg border border-ink-200 bg-surface text-ink-500 transition hover:border-ink-300 hover:bg-ink-50/50 hover:text-ink-800 disabled:opacity-50"
              aria-label="Refresh document list"
              title="Refresh document list"
            >
              <RefreshCw
                className={cn(
                  "h-3.5 w-3.5",
                  documentsLoading && "animate-spin",
                )}
                aria-hidden="true"
              />
            </button>
            <Button
              size="sm"
              icon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => setUploadOpen(true)}
            >
              Upload
            </Button>
          </div>
        </div>

        {(documentsError || healthError) && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-100 bg-red-50/60 px-3 py-2 text-[10px] text-red-700">
            <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
            <p className="min-w-0 flex-1">
              {documentsError ??
                healthError ??
                "The library could not be refreshed."}
            </p>
            <button
              type="button"
              onClick={() => void refreshDocuments()}
              className="focus-ring shrink-0 rounded font-medium underline decoration-red-300 underline-offset-2 hover:text-red-900"
            >
              Retry
            </button>
          </div>
        )}

        <div className="mt-5 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          <StatCard
            label="Documents"
            value={String(documents.length)}
            detail={`${pdfCount} PDF · ${txtCount} TXT`}
            icon={FileText}
          />
          <StatCard
            label="Chunks indexed"
            value={String(totalChunks)}
            detail="Searchable passages"
            icon={Layers}
          />
          <StatCard
            label="Library size"
            value={formatBytes(totalBytes)}
            detail="Across all uploads"
            icon={HardDrive}
          />
          <StatCard
            label="Embedding index"
            value={health?.embedding.ready ? "Ready" : "Unavailable"}
            detail={
              health?.embedding.ready
                ? `${health.embedding.model.split("/").pop()} · ${health.embedding.dimension}d`
                : healthError
                  ? "Backend offline"
                  : "Not initialized"
            }
            icon={CheckCircle2}
          />
        </div>

        {documentsLoading && documents.length === 0 ? (
          <div className="mt-5 flex items-center justify-center rounded-2xl border border-ink-100 bg-surface py-16">
            <div className="text-center">
              <Loader2
                className="mx-auto h-5 w-5 animate-spin text-brand-500"
                aria-hidden="true"
              />
              <p className="mt-2.5 text-[10.5px] text-ink-400">
                Loading your document library…
              </p>
            </div>
          </div>
        ) : documents.length === 0 ? (
          <div className="mt-5">
            <UploadDropzone onUploaded={announceUpload} />
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-ink-100 bg-surface/60 px-3 py-2.5">
              <Check
                className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600"
                aria-hidden="true"
              />
              <p className="text-[9px] leading-4 text-ink-400">
                Files stay in the local backend data directory. Chunk size and
                overlap come from your saved retrieval settings and apply to new
                uploads.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
                <Search
                  className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-300"
                  aria-hidden="true"
                />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search documents by name…"
                  aria-label="Search documents by name"
                  className="h-9 w-full rounded-lg border border-ink-200 bg-surface pl-8 pr-3 text-[10.5px] text-ink-800 placeholder:text-ink-300 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/10"
                />
              </div>
              <div
                className="flex items-center gap-0.5 rounded-lg border border-ink-200 bg-surface p-0.5"
                role="group"
                aria-label="Filter by file type"
              >
                {(
                  [
                    ["all", `All ${documents.length}`],
                    ["pdf", `PDF ${pdfCount}`],
                    ["txt", `TXT ${txtCount}`],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTypeFilter(value)}
                    aria-pressed={typeFilter === value}
                    className={cn(
                      "focus-ring rounded-md px-2 py-1.5 text-[9.5px] font-medium transition",
                      typeFilter === value
                        ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-[0_8px_20px_-12px_rgba(168,85,247,0.8)]"
                        : "text-ink-500 hover:bg-ink-50 hover:text-ink-800",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="ml-auto text-[9px] text-ink-400">
                {filtered.length} of {documents.length} shown
              </p>
            </div>

            <div className="mt-3 hidden overflow-hidden rounded-2xl border border-ink-100 bg-surface shadow-[0_1px_2px_rgba(16,21,40,0.03)] md:block">
              <table className="w-full border-collapse">
                <caption className="sr-only">
                  Uploaded documents with size, chunk count, and date
                </caption>
                <thead>
                  <tr className="border-b border-ink-100 bg-ink-50/50 text-left">
                    <th className="px-4 py-2 text-[8.5px] font-semibold uppercase tracking-[0.1em] text-ink-400">
                      Document
                    </th>
                    <th className="px-3 py-2 text-[8.5px] font-semibold uppercase tracking-[0.1em] text-ink-400">
                      Type
                    </th>
                    <th className="px-3 py-2 text-[8.5px] font-semibold uppercase tracking-[0.1em] text-ink-400">
                      Size
                    </th>
                    <th className="px-3 py-2 text-[8.5px] font-semibold uppercase tracking-[0.1em] text-ink-400">
                      Chunks
                    </th>
                    <th className="px-3 py-2 text-[8.5px] font-semibold uppercase tracking-[0.1em] text-ink-400">
                      Added
                    </th>
                    <th className="px-4 py-2 text-right text-[8.5px] font-semibold uppercase tracking-[0.1em] text-ink-400">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-50">
                  {filtered.map((document) => (
                    <DocumentRow
                      key={document.id}
                      document={document}
                      onDelete={(item) => {
                        setDeleteError(null);
                        setDocumentToDelete(item);
                      }}
                    />
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="px-4 py-12 text-center">
                  <Search
                    className="mx-auto h-5 w-5 text-ink-200"
                    aria-hidden="true"
                  />
                  <p className="mt-2 text-[10.5px] font-medium text-ink-500">
                    No documents match this filter.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setTypeFilter("all");
                    }}
                    className="focus-ring mt-1 rounded text-[9.5px] font-medium text-brand-300 hover:text-brand-300"
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </div>

            <div className="mt-3 space-y-2 md:hidden">
              {filtered.map((document) => (
                <DocumentCard
                  key={document.id}
                  document={document}
                  onDelete={(item) => {
                    setDeleteError(null);
                    setDocumentToDelete(item);
                  }}
                />
              ))}
              {filtered.length === 0 && (
                <div className="rounded-xl border border-ink-100 bg-surface px-4 py-10 text-center">
                  <p className="text-[10.5px] font-medium text-ink-500">
                    No documents match this filter.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setTypeFilter("all");
                    }}
                    className="focus-ring mt-1 rounded text-[9.5px] font-medium text-brand-300"
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </div>

            <div className="mt-3">
              <UploadDropzone compact onUploaded={announceUpload} />
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-ink-100 bg-surface/60 px-3 py-2.5">
              <p className="text-[9px] leading-4 text-ink-400">
                Need to change how new uploads are chunked? Adjust the defaults
                in Settings.
              </p>
              <Link
                to="/settings"
                className="focus-ring shrink-0 rounded text-[9.5px] font-medium text-brand-300 hover:text-brand-300"
              >
                Open settings
              </Link>
            </div>
          </>
        )}
      </div>

      <Dialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title="Add documents"
        description="Upload PDF or TXT files. Chunking uses your saved Settings defaults."
        className="max-w-2xl"
        footer={
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setUploadOpen(false)}
          >
            Done
          </Button>
        }
      >
        <UploadDropzone compact onUploaded={announceUpload} />
      </Dialog>

      <Dialog
        open={Boolean(documentToDelete)}
        onClose={() => {
          if (!deleting) setDocumentToDelete(null);
        }}
        title="Delete document?"
        description={
          documentToDelete
            ? `${documentToDelete.filename} and its ${documentToDelete.chunk_count} indexed chunk${documentToDelete.chunk_count === 1 ? "" : "s"} will be permanently removed.`
            : undefined
        }
        footer={
          <>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setDocumentToDelete(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant="danger"
              icon={<Trash2 className="h-3.5 w-3.5" />}
              loading={deleting}
              onClick={() => void confirmDelete()}
            >
              Delete document
            </Button>
          </>
        }
      >
        <div className="rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2.5">
          <p className="text-[10px] leading-5 text-amber-800">
            This cannot be undone. The uploaded file, extracted text, chunks, and
            vectors are all deleted.
          </p>
        </div>
        {deleteError && (
          <p className="mt-2 flex items-start gap-1.5 text-[10px] text-red-600">
            <AlertCircle
              className="mt-0.5 h-3 w-3 shrink-0"
              aria-hidden="true"
            />
            {deleteError}
          </p>
        )}
      </Dialog>

      {notice && (
        <div
          role="status"
          className="fixed bottom-4 right-4 z-[75] flex items-center gap-2 rounded-xl border border-emerald-200 bg-surface px-3.5 py-2.5 text-[10px] font-medium text-emerald-800 shadow-lift animate-fade-up"
        >
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
          {notice}
        </div>
      )}
    </div>
  );
}
