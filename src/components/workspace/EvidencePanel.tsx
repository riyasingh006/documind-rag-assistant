import {
  BookOpenCheck,
  FileSearch,
  Layers,
  PanelRightClose,
  ShieldCheck,
} from "lucide-react";
import type { ChatEntry } from "./ChatAnswer";
import { SourceEvidence } from "./SourceEvidence";
import { cn } from "@/lib/cn";

interface EvidencePanelProps {
  entry: ChatEntry | null;
  scopeLabel: string;
  onClose: () => void;
}

export function EvidencePanel({ entry, scopeLabel, onClose }: EvidencePanelProps) {
  const response = entry?.response;
  const cited = response?.sources.filter((source) => source.cited).length ?? 0;
  const greeting = response?.reason === "greeting";
  const candidates = response?.retrieval.candidates_considered ?? 0;
  const candidatesPassed = response?.retrieval.candidates_passed ?? 0;
  const topScore = response?.retrieval.top_score ?? null;
  const effectiveThreshold = response?.retrieval.effective_threshold ?? 0;
  const floor = response?.retrieval.min_similarity_floor ?? 0.15;
  const topScorePercent =
    topScore !== null ? Math.round(topScore * 1000) / 10 : null;

  return (
    <aside className="hidden w-[340px] shrink-0 flex-col border-l border-ink-100 bg-surface/55 xl:flex">
      <div className="flex h-[60px] shrink-0 items-center justify-between border-b border-ink-100 px-4">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-50 text-brand-300">
            <BookOpenCheck className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-[11px] font-semibold text-ink-900">Evidence</p>
            <p className="text-[8.5px] text-ink-400">
              Retrieved source inspector
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {response && response.sources.length > 0 && (
            <span className="rounded-full bg-ink-100 px-1.5 py-0.5 text-[8.5px] font-semibold text-ink-500">
              {response.sources.length}
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="focus-ring flex h-7 w-7 items-center justify-center rounded-md text-ink-300 transition hover:bg-ink-50 hover:text-ink-600"
            aria-label="Hide evidence panel"
            title="Hide evidence panel"
          >
            <PanelRightClose className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3.5">
        {!response ? (
          <div className="flex h-full min-h-[320px] flex-col items-center justify-center px-5 text-center">
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-ink-100 bg-surface text-ink-300 shadow-soft">
              <FileSearch className="h-6 w-6" aria-hidden="true" />
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border border-ink-100 bg-surface">
                <ShieldCheck className="h-2.5 w-2.5 text-brand-500" />
              </span>
            </div>
            <p className="mt-4 text-[11.5px] font-semibold text-ink-800">
              Sources appear here
            </p>
            <p className="mt-1.5 max-w-[210px] text-[10px] leading-5 text-ink-400">
              Ask a question to inspect the exact passages behind the answer,
              with relevance scores and citation status.
            </p>
            <div className="mt-5 w-full rounded-xl border border-ink-100 bg-surface p-3 text-left">
              <p className="text-[8.5px] font-semibold uppercase tracking-[0.12em] text-ink-400">
                Current scope
              </p>
              <p className="mt-1 truncate text-[10px] font-medium text-ink-700">
                {scopeLabel}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-xl border border-ink-100 bg-surface p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[8.5px] font-semibold uppercase tracking-[0.12em] text-ink-400">
                  Latest answer
                </span>
                <span
                  className={cn(
                    "rounded-full border px-1.5 py-0.5 text-[8px] font-medium",
                    greeting
                      ? "border-ink-200 bg-ink-50 text-ink-500"
                      : response.answerable
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-amber-200 bg-amber-50 text-amber-700",
                  )}
                >
                  {greeting
                    ? "Conversation"
                    : response.answerable
                      ? "Grounded"
                      : "Insufficient evidence"}
                </span>
              </div>
              {entry?.question && (
                <p className="mt-2 line-clamp-3 text-[10.5px] leading-5 text-ink-600">
                  “{entry.question}”
                </p>
              )}
              {greeting ? (
                <p className="mt-2.5 border-t border-ink-50 pt-2.5 text-[9px] leading-4 text-ink-400">
                  Greeting detected. No document retrieval was performed.
                </p>
              ) : (
                <dl className="mt-2.5 grid grid-cols-2 gap-2 border-t border-ink-50 pt-2.5">
                  <div>
                    <dt className="text-[8px] uppercase tracking-wide text-ink-300">
                      Candidates
                    </dt>
                    <dd className="text-[10px] font-semibold text-ink-700">
                      {candidates}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[8px] uppercase tracking-wide text-ink-300">
                      Passed cutoff
                    </dt>
                    <dd className="text-[10px] font-semibold text-ink-700">
                      {candidatesPassed}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[8px] uppercase tracking-wide text-ink-300">
                      In prompt
                    </dt>
                    <dd className="text-[10px] font-semibold text-ink-700">
                      {response.sources.length}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[8px] uppercase tracking-wide text-ink-300">
                      Cited
                    </dt>
                    <dd className="text-[10px] font-semibold text-ink-700">
                      {cited}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[8px] uppercase tracking-wide text-ink-300">
                      Top match
                    </dt>
                    <dd className="text-[10px] font-semibold text-ink-700">
                      {topScorePercent !== null ? `${topScorePercent}%` : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt
                      className="text-[8px] uppercase tracking-wide text-ink-300"
                      title={`Effective raw cutoff ${Math.round(
                        effectiveThreshold * 1000,
                      ) / 10}%; absolute floor ${Math.round(floor * 100)}%.`}
                    >
                      Rel. cutoff
                    </dt>
                    <dd
                      className="text-[10px] font-semibold text-ink-700"
                      title={`Effective raw cutoff ${Math.round(
                        effectiveThreshold * 1000,
                      ) / 10}%; absolute floor ${Math.round(floor * 100)}%.`}
                    >
                      {Math.round(response.retrieval.threshold * 100)}%
                    </dd>
                  </div>
                </dl>
              )}
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <p className="inline-flex items-center gap-1 text-[8.5px] font-semibold uppercase tracking-[0.12em] text-ink-400">
                  <Layers className="h-2.5 w-2.5" aria-hidden="true" />
                  Retrieved passages
                </p>
                <span className="text-[8px] text-ink-300">Click to inspect</span>
              </div>
              {response.sources.length === 0 ? (
                <div className="rounded-xl border border-dashed border-ink-200 bg-surface/60 p-4 text-center">
                  <p className="text-[10px] text-ink-400">
                    {greeting
                      ? "No retrieval was needed for this greeting."
                      : candidates === 0
                        ? `No passage cleared the ${Math.round(
                            floor * 100,
                          )}% absolute similarity floor${
                            topScorePercent !== null
                              ? ` (top match ${topScorePercent}%)`
                              : ""
                          }.`
                        : "No passages were available for the answer prompt."}
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {response.sources.map((source) => (
                    <SourceEvidence
                      key={`${source.document_id}-${source.chunk_index}`}
                      source={source}
                      compact
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-start gap-1.5 rounded-lg border border-ink-100 bg-surface/70 p-2.5">
              <ShieldCheck
                className="mt-0.5 h-3 w-3 shrink-0 text-brand-500"
                aria-hidden="true"
              />
              <p className="text-[8.5px] leading-4 text-ink-400">
                Sources are retrieved from your files and shown alongside every
                answer. Verify excerpts before relying on them.
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
