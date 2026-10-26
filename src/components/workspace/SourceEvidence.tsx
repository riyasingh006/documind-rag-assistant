import { useState } from "react";
import {
  ChevronDown,
  FileText,
  Quote,
  ShieldCheck,
} from "lucide-react";
import type { Source } from "@/lib/types";
import { cn } from "@/lib/cn";
import { scorePercent } from "@/lib/format";

interface SourceEvidenceProps {
  source: Source;
  compact?: boolean;
  defaultOpen?: boolean;
}

export function SourceEvidence({
  source,
  compact = false,
  defaultOpen = false,
}: SourceEvidenceProps) {
  const [open, setOpen] = useState(defaultOpen);
  const score = scorePercent(source.score);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border bg-surface transition",
        source.cited ? "border-brand-100" : "border-ink-100",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="focus-ring flex w-full items-start gap-2.5 p-2.5 text-left transition hover:bg-ink-50/50"
      >
        <span
          className={cn(
            "flex shrink-0 items-center justify-center rounded-lg font-semibold",
            compact ? "h-6 w-6 text-[8px]" : "h-7 w-7 text-[9px]",
            source.cited
              ? "bg-brand-50 text-brand-300"
              : "bg-ink-50 text-ink-500",
          )}
        >
          {source.id}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <FileText
              className="h-3 w-3 shrink-0 text-ink-300"
              aria-hidden="true"
            />
            <span
              className={cn(
                "truncate font-medium text-ink-800",
                compact ? "text-[10px]" : "text-[11px]",
              )}
              title={source.filename}
            >
              {source.filename}
            </span>
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9px] text-ink-400">
            <span>{source.file_type.toUpperCase()}</span>
            {source.page !== null && <span>Page {source.page}</span>}
            <span title={source.chunk_id}>Chunk {source.chunk_index + 1}</span>
            <span className="inline-flex items-center gap-1">
              <span
                className={cn(
                  "h-1 w-1 rounded-full",
                  source.cited ? "bg-emerald-500" : "bg-ink-300",
                )}
              />
              {source.cited ? "Cited" : "Retrieved"}
            </span>
          </span>
          <span className="mt-1.5 flex items-center gap-2">
            <span className="h-1 flex-1 overflow-hidden rounded-full bg-ink-100">
              <span
                className="block h-full rounded-full bg-gradient-to-r from-brand-400 to-sky-500"
                style={{ width: `${Math.max(4, score)}%` }}
              />
            </span>
            <span className="w-7 text-right text-[8.5px] font-medium tabular-nums text-ink-400">
              {score}%
            </span>
          </span>
        </span>

        <ChevronDown
          className={cn(
            "mt-1 h-3 w-3 shrink-0 text-ink-300 transition",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="border-t border-ink-50 bg-ink-50/30 px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1 text-[8.5px] font-semibold uppercase tracking-[0.1em] text-ink-400">
              <Quote className="h-2.5 w-2.5" aria-hidden="true" />
              Source excerpt
            </span>
            {source.cited && (
              <span className="inline-flex items-center gap-1 text-[8.5px] font-medium text-emerald-700">
                <ShieldCheck className="h-2.5 w-2.5" aria-hidden="true" />
                Used in answer
              </span>
            )}
          </div>
          <p
            className={cn(
              "mt-1.5 whitespace-pre-wrap text-ink-600",
              compact
                ? "max-h-44 overflow-y-auto text-[10px] leading-[1.65]"
                : "max-h-56 overflow-y-auto text-[11px] leading-[1.7]",
            )}
          >
            {source.excerpt}
          </p>
        </div>
      )}
    </div>
  );
}
