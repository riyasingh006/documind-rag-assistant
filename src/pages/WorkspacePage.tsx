import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowUp,
  BookOpenCheck,
  FileText,
  Layers,
  Loader2,
  PanelRight,
  Paperclip,
  Plus,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { ScopeSelector } from "@/components/workspace/ScopeSelector";
import { UploadDropzone } from "@/components/workspace/UploadDropzone";
import {
  AnswerMessage,
  ErrorAnswer,
  PendingAnswer,
  UserMessage,
  type ChatEntry,
} from "@/components/workspace/ChatAnswer";
import { EvidencePanel } from "@/components/workspace/EvidencePanel";
import { useWorkspace } from "@/context/WorkspaceContext";
import { useSettings } from "@/hooks/useSettings";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { relativeTime } from "@/lib/format";
import { ollamaGuidance } from "@/lib/llm";

const CHAT_KEY = "documind:conversation:v1";

function entryId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong while answering your question.";
}

function loadConversation(): ChatEntry[] {
  try {
    const raw = window.sessionStorage.getItem(CHAT_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (entry): entry is ChatEntry =>
          Boolean(entry) &&
          typeof entry === "object" &&
          typeof (entry as ChatEntry).id === "string" &&
          typeof (entry as ChatEntry).question === "string" &&
          Boolean((entry as ChatEntry).response || (entry as ChatEntry).error),
      )
      .map((entry) => ({ ...entry, pending: false }));
  } catch {
    return [];
  }
}

const suggestions = [
  "Summarize the key points across these documents.",
  "What are the most important findings?",
  "Which limitations or open questions are mentioned?",
];

export function WorkspacePage() {
  const {
    health,
    healthError,
    documents,
    documentsError,
    documentsLoading,
    refreshHealth,
    refreshDocuments,
  } = useWorkspace();
  const { settings } = useSettings();

  const [entries, setEntries] = useState<ChatEntry[]>(loadConversation);
  const [selectedIds, setSelectedIds] = useState<string[] | null>(null);
  const [input, setInput] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [showEvidence, setShowEvidence] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);

  const inFlight = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scopeDocuments =
    selectedIds === null
      ? documents
      : documents.filter((document) => selectedIds.includes(document.id));
  const scopeLabel =
    documents.length === 0
      ? "No documents"
      : selectedIds === null
        ? `All documents (${documents.length})`
        : selectedIds.length === 0
          ? "No documents selected"
          : `${scopeDocuments.length} of ${documents.length} documents`;
  const canAsk =
    documents.length > 0 &&
    scopeDocuments.length > 0 &&
    !isAsking &&
    !healthError;
  const latestAnswered =
    [...entries].reverse().find((entry) => entry.response) ?? null;

  useEffect(() => {
    document.title = "Ask your documents · DocuMind AI";
  }, []);

  useEffect(() => {
    if (selectedIds === null) return;
    const valid = selectedIds.filter((id) =>
      documents.some((document) => document.id === id),
    );
    if (valid.length !== selectedIds.length) {
      setSelectedIds(valid.length === documents.length ? null : valid);
    }
  }, [documents, selectedIds]);

  useEffect(() => {
    try {
      const settled = entries.filter((entry) => !entry.pending);
      if (settled.length === 0) {
        window.sessionStorage.removeItem(CHAT_KEY);
      } else {
        window.sessionStorage.setItem(CHAT_KEY, JSON.stringify(settled));
      }
    } catch {
      // Session storage can be full or unavailable; chat still works.
    }
  }, [entries]);

  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 144)}px`;
  }, [input]);

  useEffect(() => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    bottomRef.current?.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "end",
    });
  }, [entries]);

  useEffect(() => {
    if (!canAsk && entries.length > 0) return;
    const timer = window.setTimeout(() => textareaRef.current?.focus(), 120);
    return () => window.clearTimeout(timer);
  }, [canAsk, entries.length]);

  async function executeQuery(id: string, question: string) {
    if (inFlight.current) return;
    inFlight.current = true;
    setIsAsking(true);
    try {
      const response = await api.askQuestion({
        question,
        document_ids: selectedIds,
        top_k: settings.topK,
        threshold: settings.threshold,
      });
      setEntries((current) =>
        current.map((entry) =>
          entry.id === id
            ? { ...entry, pending: false, response, error: undefined }
            : entry,
        ),
      );
    } catch (error) {
      setEntries((current) =>
        current.map((entry) =>
          entry.id === id
            ? {
                ...entry,
                pending: false,
                error: errorMessage(error),
                response: undefined,
              }
            : entry,
        ),
      );
    } finally {
      inFlight.current = false;
      setIsAsking(false);
    }
  }

  function submitQuestion(question: string) {
    const trimmed = question.trim();
    if (!trimmed || !canAsk || trimmed.length > 2000) return;

    const id = entryId();
    setEntries((current) => [
      ...current,
      { id, question: trimmed, pending: true },
    ]);
    setInput("");
    void executeQuery(id, trimmed);
  }

  function retryEntry(entry: ChatEntry) {
    if (isAsking) return;
    setEntries((current) =>
      current.map((item) =>
        item.id === entry.id
          ? {
              ...item,
              pending: true,
              response: undefined,
              error: undefined,
            }
          : item,
      ),
    );
    void executeQuery(entry.id, entry.question);
  }

  function newConversation() {
    setEntries([]);
    setInput("");
    try {
      window.sessionStorage.removeItem(CHAT_KEY);
    } catch {
      // ignore
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      if (event.nativeEvent.isComposing) return;
      event.preventDefault();
      if (canAsk && input.trim()) submitQuestion(input);
    }
  }

  const showLoadingLibrary = documentsLoading && documents.length === 0;

  return (
    <div className="flex h-[calc(100dvh-56px)] flex-col lg:h-dvh">
      <header className="shrink-0 border-b border-ink-100 bg-surface/65 backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-2 px-4 py-2.5 sm:h-[60px] sm:flex-nowrap sm:px-5 sm:py-0 lg:px-6">
          <div className="mr-auto min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-[13.5px] font-semibold tracking-[-0.01em] text-ink-950 sm:text-sm">
                Ask your documents
              </h1>
              {health?.embedding.ready && (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/80 bg-emerald-50 px-1.5 py-0.5 text-[8px] font-medium text-emerald-700">
                  <span className="h-1 w-1 rounded-full bg-emerald-500" />
                  Local
                </span>
              )}
            </div>
            <p className="hidden truncate text-[9.5px] text-ink-400 sm:block">
              Grounded answers with source citations
            </p>
          </div>

          <ScopeSelector
            documents={documents}
            selectedIds={selectedIds}
            onChange={setSelectedIds}
            className="order-last w-full sm:order-none sm:w-auto"
          />

          <div className="flex items-center gap-1.5">
            {entries.length > 0 && (
              <button
                type="button"
                onClick={newConversation}
                className="focus-ring flex h-9 w-9 items-center justify-center rounded-lg border border-ink-200 bg-surface text-ink-500 transition hover:border-ink-300 hover:bg-ink-50/50 hover:text-ink-800"
                aria-label="Start a new conversation"
                title="New conversation"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
            <Button
              size="sm"
              variant="secondary"
              icon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => setUploadOpen(true)}
              className="px-2.5 sm:px-3.5"
            >
              Upload
            </Button>
            {!showEvidence && (
              <button
                type="button"
                onClick={() => setShowEvidence(true)}
                className="focus-ring hidden h-9 w-9 items-center justify-center rounded-lg border border-ink-200 bg-surface text-ink-500 transition hover:border-ink-300 hover:text-ink-800 xl:flex"
                aria-label="Show evidence panel"
                title="Show evidence panel"
              >
                <PanelRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </header>

      {(healthError || documentsError) && (
        <div className="flex items-center gap-2 border-b border-red-100 bg-red-50/70 px-4 py-1.5 text-[10px] text-red-700">
          <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
          <p className="min-w-0 flex-1 truncate">
            {healthError ??
              documentsError ??
              "The document library could not be loaded."}
          </p>
          <button
            type="button"
            onClick={() => {
              void refreshHealth();
              void refreshDocuments();
            }}
            className="focus-ring inline-flex shrink-0 items-center gap-1 rounded font-medium underline decoration-red-300 underline-offset-2 hover:text-red-900"
          >
            <RefreshCw className="h-2.5 w-2.5" aria-hidden="true" />
            Retry
          </button>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <section className="flex min-w-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto">
            {entries.length === 0 ? (
              <div className="mx-auto flex min-h-full w-full max-w-[720px] flex-col justify-center px-4 py-8 sm:px-6">
                {showLoadingLibrary ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Loader2
                      className="h-5 w-5 animate-spin text-brand-500"
                      aria-hidden="true"
                    />
                    <p className="mt-3 text-[11px] text-ink-400">
                      Connecting to your document library…
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col items-start">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-ink-100 bg-surface/80 px-2.5 py-1 text-[9px] font-medium text-ink-500 shadow-[0_1px_2px_rgba(16,21,40,0.04)]">
                        <ShieldCheck
                          className="h-3 w-3 text-brand-500"
                          aria-hidden="true"
                        />
                        Private by default · runs on your machine
                      </span>
                      <h2 className="mt-4 max-w-lg text-[25px] font-semibold leading-[1.12] tracking-[-0.035em] text-ink-950 sm:text-[32px]">
                        Ask your documents{" "}
                        <span className="text-gradient">anything.</span>
                      </h2>
                      <p className="mt-2.5 max-w-md text-[11.5px] leading-5 text-ink-500 sm:text-xs sm:leading-5">
                        Upload PDFs or text files, then ask questions. Every
                        answer is grounded in retrieved passages and shows the
                        exact sources used.
                      </p>
                    </div>

                    {documents.length === 0 ? (
                      <div className="mt-6">
                        <UploadDropzone />
                        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                          {[
                            {
                              icon: UploadCloud,
                              title: "1. Upload",
                              text: "Add PDF or TXT files, up to 20 MB each.",
                            },
                            {
                              icon: Layers,
                              title: "2. Index",
                              text: "Text is chunked and embedded locally.",
                            },
                            {
                              icon: BookOpenCheck,
                              title: "3. Ask",
                              text: "Get answers with cited source passages.",
                            },
                          ].map((step) => (
                            <div
                              key={step.title}
                              className="rounded-xl border border-ink-100 bg-surface/60 p-3"
                            >
                              <step.icon
                                className="h-3.5 w-3.5 text-brand-500"
                                aria-hidden="true"
                              />
                              <p className="mt-1.5 text-[10px] font-semibold text-ink-800">
                                {step.title}
                              </p>
                              <p className="mt-0.5 text-[9px] leading-4 text-ink-400">
                                {step.text}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-6 space-y-3">
                        <div className="rounded-xl border border-ink-100 bg-surface/70 p-3.5">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-2">
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-300">
                                <FileText
                                  className="h-3.5 w-3.5"
                                  aria-hidden="true"
                                />
                              </span>
                              <div className="min-w-0">
                                <p className="text-[10.5px] font-semibold text-ink-800">
                                  {documents.length} document
                                  {documents.length === 1 ? "" : "s"} ready
                                </p>
                                <p className="truncate text-[9px] text-ink-400">
                                  {documents
                                    .slice(0, 2)
                                    .map((document) => document.filename)
                                    .join(", ")}
                                  {documents.length > 2
                                    ? ` +${documents.length - 2} more`
                                    : ""}
                                </p>
                              </div>
                            </div>
                            <Link
                              to="/workspace/documents"
                              className="focus-ring shrink-0 rounded text-[9px] font-medium text-brand-300 hover:text-brand-300"
                            >
                              Manage
                            </Link>
                          </div>
                          <div className="mt-2.5 flex items-center gap-3 border-t border-ink-50 pt-2 text-[8.5px] text-ink-400">
                            <span className="inline-flex items-center gap-1">
                              <Layers className="h-2.5 w-2.5" />
                              {documents.reduce(
                                (sum, document) => sum + document.chunk_count,
                                0,
                              )}{" "}
                              chunks indexed
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>
                              Latest upload{" "}
                              {relativeTime(documents[0]?.created_at ?? "")}
                            </span>
                          </div>
                        </div>

                        <div>
                          <p className="mb-1.5 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-ink-400">
                            <Sparkles className="h-3 w-3" aria-hidden="true" />
                            Try asking
                          </p>
                          <div className="space-y-1.5">
                            {suggestions.map((suggestion) => (
                              <button
                                key={suggestion}
                                type="button"
                                onClick={() => submitQuestion(suggestion)}
                                disabled={!canAsk}
                                className="focus-ring group flex w-full items-center gap-2 rounded-xl border border-ink-100 bg-surface/60 px-3 py-2.5 text-left text-[10.5px] text-ink-600 transition hover:border-brand-200 hover:bg-surface-raised hover:text-ink-900 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-ink-50 text-ink-400 transition group-hover:bg-brand-50 group-hover:text-brand-300">
                                  <ArrowUp
                                    className="h-3 w-3 rotate-45"
                                    aria-hidden="true"
                                  />
                                </span>
                                <span className="flex-1">{suggestion}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {health?.llm.active_provider === "extractive" && (
                          <div className="flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50/50 px-3 py-2.5">
                            <Sparkles
                              className="mt-0.5 h-3 w-3 shrink-0 text-amber-600"
                              aria-hidden="true"
                            />
                            <p className="text-[9px] leading-4 text-amber-800/90">
                              Extractive mode is active.{" "}
                              {ollamaGuidance(health?.llm)}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="mx-auto w-full max-w-[860px] space-y-6 px-4 py-5 sm:px-6 sm:py-6">
                <div className="flex items-center justify-between gap-2 border-b border-ink-50 pb-2">
                  <p className="text-[9px] font-medium text-ink-400">
                    Conversation · search scope:{" "}
                    <span className="text-ink-600">{scopeLabel}</span>
                  </p>
                  {health?.llm.active_provider === "extractive" && (
                    <span
                      className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[8px] font-medium text-amber-700"
                      title={health.llm.detail ?? undefined}
                    >
                      Extractive
                    </span>
                  )}
                </div>

                {entries.map((entry) => (
                  <div key={entry.id} className="space-y-4">
                    <UserMessage question={entry.question} />
                    {entry.pending ? (
                      <PendingAnswer />
                    ) : entry.error ? (
                      <ErrorAnswer
                        message={entry.error}
                        onRetry={() => retryEntry(entry)}
                      />
                    ) : entry.response ? (
                      <AnswerMessage
                        response={entry.response}
                        onRetry={() => retryEntry(entry)}
                      />
                    ) : null}
                  </div>
                ))}
                <div ref={bottomRef} className="h-1" />
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-ink-100 bg-surface/70 px-3 py-2.5 backdrop-blur-xl sm:px-6 sm:py-3">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                submitQuestion(input);
              }}
              className="mx-auto w-full max-w-[860px]"
            >
              {documents.length > 0 && scopeDocuments.length === 0 && (
                <p className="mb-1.5 flex items-center gap-1 text-[9px] font-medium text-red-600">
                  <AlertCircle className="h-2.5 w-2.5" aria-hidden="true" />
                  Select at least one document to search.
                </p>
              )}
              <div
                className={cn(
                  "rounded-2xl border bg-surface p-1.5 shadow-[0_1px_2px_rgba(16,21,40,0.04),0_12px_30px_-24px_rgba(16,21,40,0.3)] transition",
                  documents.length === 0
                    ? "border-ink-100 opacity-80"
                    : "border-ink-200/90 focus-within:border-brand-300 focus-within:shadow-[0_0_0_3px_rgba(110,93,240,0.08)]",
                )}
              >
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  maxLength={2000}
                  disabled={documents.length === 0}
                  placeholder={
                    documents.length === 0
                      ? "Upload a document to begin…"
                      : healthError
                        ? "Backend offline — start the API server to ask questions…"
                        : "Ask a question about your documents…"
                  }
                  aria-label="Ask a question about your documents"
                  className="min-h-[34px] w-full resize-none bg-transparent px-2.5 py-2 text-[12.5px] leading-5 text-ink-900 placeholder:text-ink-300 focus:outline-none disabled:cursor-not-allowed"
                />
                <div className="flex items-center justify-between gap-2 px-0.5">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setUploadOpen(true)}
                      className="focus-ring flex h-7 w-7 items-center justify-center rounded-lg text-ink-400 transition hover:bg-ink-50 hover:text-ink-700"
                      aria-label="Upload more documents"
                      title="Upload documents"
                    >
                      <Paperclip className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                    <span className="hidden truncate text-[8.5px] text-ink-300 sm:inline">
                      Enter to send · Shift + Enter for a new line
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {input.length > 1800 && (
                      <span className="text-[8.5px] tabular-nums text-ink-400">
                        {input.length}/2000
                      </span>
                    )}
                    <button
                      type="submit"
                      disabled={!canAsk || input.trim().length === 0}
                      aria-label="Send question"
                      className="focus-ring flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_6px_14px_-8px_rgba(85,70,224,0.9)] transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-ink-200 disabled:text-ink-400 disabled:shadow-none"
                    >
                      {isAsking ? (
                        <Loader2
                          className="h-3.5 w-3.5 animate-spin"
                          aria-hidden="true"
                        />
                      ) : (
                        <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
              <p className="mt-1.5 text-center text-[8px] leading-4 text-ink-400">
                DocuMind can make mistakes. Verify important information against
                the cited sources.
              </p>
            </form>
          </div>
        </section>

        {showEvidence && (
          <EvidencePanel
            entry={latestAnswered}
            scopeLabel={scopeLabel}
            onClose={() => setShowEvidence(false)}
          />
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
        <UploadDropzone compact />
      </Dialog>
    </div>
  );
}
