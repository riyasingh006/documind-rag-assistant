import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  AlertTriangle,
  Bot,
  Check,
  Copy,
  Info,
  RotateCcw,
  Sparkles,
  UserRound,
} from "lucide-react";
import type { QueryResponse } from "@/lib/types";
import { cn } from "@/lib/cn";
import { SourceEvidence } from "./SourceEvidence";

export interface ChatEntry {
  id: string;
  question: string;
  response?: QueryResponse;
  error?: string;
  pending?: boolean;
}

function providerName(provider: string): string {
  if (provider === "ollama") return "Ollama";
  if (provider === "openai") return "External LLM";
  if (provider === "extractive") return "Extractive fallback";
  return provider;
}

function ModeBadge({ response }: { response: QueryResponse }) {
  const isLlm = response.generation.mode === "llm";
  const isNone = response.generation.mode === "none";
  const isGreeting = response.reason === "greeting";
  return (
    <span
      title={
        response.generation.fallback_reason ??
        `Generated with ${response.generation.model}`
      }
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[8.5px] font-medium",
        isLlm
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : isNone
            ? "border-ink-200 bg-ink-50 text-ink-500"
            : "border-amber-200 bg-amber-50 text-amber-700",
      )}
    >
      <span
        className={cn(
          "h-1 w-1 rounded-full",
          isLlm
            ? "bg-emerald-500"
            : isNone
              ? "bg-ink-400"
              : "bg-amber-500",
        )}
      />
      {isGreeting
        ? "Conversation"
        : isLlm
          ? providerName(response.generation.provider)
          : isNone
            ? "No generation"
            : "Extractive mode"}
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setFailed(false);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setFailed(true);
      window.setTimeout(() => setFailed(false), 2500);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="focus-ring inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[9px] font-medium text-ink-400 transition hover:bg-ink-50 hover:text-ink-700"
      aria-label={copied ? "Answer copied" : "Copy answer"}
    >
      {copied ? (
        <Check className="h-3 w-3 text-emerald-600" aria-hidden="true" />
      ) : (
        <Copy className="h-3 w-3" aria-hidden="true" />
      )}
      {failed ? "Copy failed" : copied ? "Copied" : "Copy"}
    </button>
  );
}

export function UserMessage({ question }: { question: string }) {
  return (
    <div className="flex justify-end gap-2.5">
      <div className="max-w-[88%] rounded-2xl rounded-br-md bg-gradient-to-br from-violet-600 to-fuchsia-600 px-4 py-2.5 text-[13px] leading-6 text-white shadow-[0_12px_28px_-14px_rgba(168,85,247,0.8)] sm:max-w-[75%]">
        <p className="whitespace-pre-wrap break-words">{question}</p>
      </div>
      <span className="mt-1 hidden h-7 w-7 shrink-0 items-center justify-center rounded-full border border-ink-100 bg-surface text-ink-400 sm:flex">
        <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
    </div>
  );
}

export function PendingAnswer() {
  return (
    <div className="flex gap-2.5 sm:gap-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-[0_10px_22px_-10px_rgba(168,85,247,0.9)]">
        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold text-ink-800">DocuMind</span>
          <span className="text-[9px] text-ink-300">Working…</span>
        </div>
        <div className="mt-2 rounded-2xl rounded-tl-md border border-ink-100 bg-surface p-4 shadow-[0_1px_2px_rgba(16,21,40,0.03)]">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-5 w-5 items-center justify-center">
              <span className="absolute h-5 w-5 animate-ping rounded-full bg-brand-300/40" />
              <span className="h-2 w-2 rounded-full bg-brand-500" />
            </span>
            <p className="text-[11.5px] font-medium text-ink-700">
              Searching your documents and composing a grounded answer…
            </p>
          </div>
          <div className="mt-3 space-y-2">
            <span className="block h-2 w-[88%] animate-pulse rounded-full bg-ink-100" />
            <span className="block h-2 w-[72%] animate-pulse rounded-full bg-ink-100 animation-delay-100" />
            <span className="block h-2 w-[54%] animate-pulse rounded-full bg-ink-100 animation-delay-200" />
          </div>
          <p className="mt-3 text-[9px] text-ink-400">
            Retrieval is local. Generation may take longer with a local model.
          </p>
        </div>
      </div>
    </div>
  );
}

export function ErrorAnswer({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex gap-2.5 sm:gap-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-500 text-white">
        <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <span className="text-[10px] font-semibold text-ink-800">DocuMind</span>
        <div className="mt-2 rounded-2xl rounded-tl-md border border-red-100 bg-red-50/60 p-4">
          <p className="text-[11.5px] leading-5 text-red-700">{message}</p>
          <button
            type="button"
            onClick={onRetry}
            className="focus-ring mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-surface px-2.5 py-1.5 text-[10px] font-medium text-red-700 transition hover:bg-red-50"
          >
            <RotateCcw className="h-3 w-3" aria-hidden="true" />
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}

export function AnswerMessage({
  response,
  onRetry,
}: {
  response: QueryResponse;
  onRetry: () => void;
}) {
  const cited = response.sources.filter((source) => source.cited).length;
  const isGreeting = response.reason === "greeting";
  const candidates = response.retrieval.candidates_considered ?? 0;
  const topScore = response.retrieval.top_score ?? null;
  const effectiveThreshold = response.retrieval.effective_threshold ?? 0;
  const floor = response.retrieval.min_similarity_floor ?? 0.15;
  const floorPercent = Math.round(floor * 100);
  const topScorePercent =
    topScore !== null ? Math.round(topScore * 1000) / 10 : null;

  return (
    <div className="flex gap-2.5 sm:gap-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-[0_10px_22px_-10px_rgba(168,85,247,0.9)]">
        <Bot className="h-3.5 w-3.5" aria-hidden="true" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold text-ink-800">
              DocuMind
            </span>
            <ModeBadge response={response} />
          </div>
          <CopyButton text={response.answer} />
        </div>

        {!response.answerable ? (
          <div className="mt-2 rounded-2xl rounded-tl-md border border-amber-200 bg-amber-50/70 p-4">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-100 text-amber-700">
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <h3 className="text-[11.5px] font-semibold text-amber-900">
                Not enough evidence found
              </h3>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-[12px] leading-6 text-amber-900/90">
              {response.answer}
            </p>
            <p className="mt-2 border-t border-amber-200/70 pt-2 text-[10px] leading-5 text-amber-800/80">
              {response.reason === "no_documents"
                ? "No documents are indexed in the current scope. Upload a file or widen the document selection."
                : candidates === 0
                  ? `No passage cleared the ${floorPercent}% absolute similarity floor${
                      topScorePercent !== null
                        ? ` (top match ${topScorePercent}%)`
                        : ""
                    }. Try rephrasing with terms from the document, check the selected scope, or upload the right file.`
                  : "The retrieved passages did not contain enough evidence for a grounded answer. Try rephrasing the question or widening the document scope."}
            </p>
            <button
              type="button"
              onClick={onRetry}
              className="focus-ring mt-2 inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-surface px-2.5 py-1.5 text-[10px] font-medium text-amber-800 transition hover:bg-amber-50"
            >
              <RotateCcw className="h-3 w-3" aria-hidden="true" />
              Retry question
            </button>
          </div>
        ) : (
          <div className="mt-2 rounded-2xl rounded-tl-md border border-ink-100 bg-surface p-3.5 shadow-[0_1px_2px_rgba(16,21,40,0.03)] sm:p-4">
            <div className="prose-documind max-w-none text-[12.5px] leading-6 sm:text-[13px] sm:leading-6">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  a: ({ children, ...props }) => (
                    <a
                      {...props}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-brand-300 underline decoration-brand-200 underline-offset-2 hover:text-brand-300"
                    >
                      {children}
                    </a>
                  ),
                }}
              >
                {response.answer}
              </ReactMarkdown>
            </div>

            {isGreeting && (
              <div className="mt-3 flex items-start gap-1.5 rounded-lg bg-ink-50/80 px-2.5 py-2 text-[9.5px] leading-4 text-ink-500">
                <Info
                  className="mt-0.5 h-3 w-3 shrink-0 text-ink-400"
                  aria-hidden="true"
                />
                <span>
                  Greeting detected. Document retrieval was skipped because no
                  evidence was needed.
                </span>
              </div>
            )}

            {response.generation.mode === "extractive" && (
              <div
                className="mt-3 flex items-start gap-1.5 rounded-lg bg-ink-50/80 px-2.5 py-2 text-[9.5px] leading-4 text-ink-500"
                title={response.generation.fallback_reason ?? undefined}
              >
                <Info
                  className="mt-0.5 h-3 w-3 shrink-0 text-ink-400"
                  aria-hidden="true"
                />
                <span>
                  Extractive answer: this response was not generated by an LLM.
                  {response.generation.fallback_reason
                    ? ` ${response.generation.fallback_reason}`
                    : ""}{" "}
                  It quotes the strongest matching passage.{" "}
                  <span className="text-ink-400">
                    Start Ollama or configure a provider for synthesized
                    answers.
                  </span>
                </span>
              </div>
            )}
          </div>
        )}

        {response.sources.length > 0 && (
          <div className="mt-3">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <p className="inline-flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-ink-400">
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                Sources
              </p>
              <p className="text-[9px] text-ink-400">
                {response.sources.length} retrieved
                {cited > 0 ? ` · ${cited} cited` : ""}
              </p>
            </div>
            <div className="space-y-1.5">
              {response.sources.map((source, index) => (
                <SourceEvidence
                  key={`${source.document_id}-${source.chunk_index}`}
                  source={source}
                  defaultOpen={index === 0}
                />
              ))}
            </div>
          </div>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[8.5px] text-ink-400">
          {isGreeting ? (
            <span>Greeting · no retrieval needed</span>
          ) : (
            <>
              <span>
                Searched {response.retrieval.documents_searched} document
                {response.retrieval.documents_searched === 1 ? "" : "s"}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {response.retrieval.chunks_retrieved} passage
                {response.retrieval.chunks_retrieved === 1 ? "" : "s"}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {response.retrieval.latency_ms + response.generation.latency_ms} ms
              </span>
              <span aria-hidden="true">·</span>
              <span
                title={`Relative cutoff: ${Math.round(
                  response.retrieval.threshold * 100,
                )}% of the best match. Effective raw cutoff ${Math.round(
                  effectiveThreshold * 1000,
                ) / 10}%; absolute floor ${floorPercent}%.`}
              >
                cutoff {Math.round(response.retrieval.threshold * 100)}% of top
              </span>
              {topScorePercent !== null && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>top match {topScorePercent}%</span>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
