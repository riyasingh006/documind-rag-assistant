import {
  ArrowUpRight,
  Check,
  ChevronRight,
  FileText,
  Files,
  LayoutGrid,
  LockKeyhole,
  Search,
  Settings2,
  Sparkles,
  Wand2,
} from "lucide-react";
import { LogoMark } from "@/components/ui/Logo";
import { cn } from "@/lib/cn";

function Citation({
  index,
  name,
  page,
  score,
  className,
}: {
  index: number;
  name: string;
  page: string;
  score: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2.5 rounded-lg border border-ink-100 bg-surface px-2.5 py-2",
        className,
      )}
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-brand-50 text-[10px] font-bold text-brand-300">
        {index}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[10.5px] font-semibold text-ink-800">
          {name}
        </span>
        <span className="block text-[9.5px] text-ink-400">
          {page} · {score} match
        </span>
      </span>
      <ChevronRight className="h-3 w-3 shrink-0 text-ink-300" aria-hidden="true" />
    </div>
  );
}

export function HeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[600px] lg:max-w-none">
      <div
        className="absolute -inset-8 -z-10 animate-glow rounded-[44px] bg-[radial-gradient(ellipse_at_35%_20%,rgba(168,85,247,0.28),transparent_60%),radial-gradient(ellipse_at_80%_80%,rgba(236,72,153,0.2),transparent_55%)] blur-3xl"
        aria-hidden="true"
      />

      <div
        aria-hidden="true"
        className="absolute -right-3 -top-3 hidden h-24 w-24 rounded-2xl border border-brand-100/80 bg-gradient-to-br from-surface-raised/90 to-brand-50/70 shadow-soft backdrop-blur-sm xl:block"
      >
        <div className="flex h-full flex-col items-center justify-center gap-1.5 text-brand-300">
          <Wand2 className="h-5 w-5" />
          <span className="text-[8.5px] font-semibold uppercase tracking-[0.12em]">
            Semantic
          </span>
          <span className="h-1 w-8 overflow-hidden rounded-full bg-brand-100">
            <span className="block h-full w-2/3 rounded-full bg-brand-500" />
          </span>
        </div>
      </div>

      <div className="relative rounded-[26px] border border-brand-200/45 bg-surface/55 p-2 shadow-lift backdrop-blur-xl">
        <div className="overflow-hidden rounded-[20px] border border-ink-100 bg-[#0d0818]">
          <div className="flex h-11 items-center justify-between gap-3 border-b border-ink-100 bg-surface/90 px-3.5">
            <div className="flex items-center gap-1.5" aria-hidden="true">
              <span className="h-2 w-2 rounded-full bg-[#F0A8A8]" />
              <span className="h-2 w-2 rounded-full bg-[#F2D49B]" />
              <span className="h-2 w-2 rounded-full bg-[#A8D8BD]" />
            </div>
            <div className="flex min-w-0 items-center gap-1.5 rounded-md border border-ink-100 bg-ink-50/70 px-2.5 py-1 text-[9.5px] text-ink-400">
              <LockKeyhole className="h-2.5 w-2.5" aria-hidden="true" />
              <span className="truncate font-medium">documind.ai/workspace</span>
            </div>
            <span className="shrink-0 rounded-full border border-amber-200/80 bg-amber-50 px-2 py-0.5 text-[8.5px] font-semibold uppercase tracking-[0.08em] text-amber-700">
              Preview
            </span>
          </div>

          <div className="flex">
            <aside className="hidden w-[58px] shrink-0 flex-col items-center gap-2 border-r border-ink-100 bg-surface/60 py-4 sm:flex">
              <LogoMark className="h-7 w-7" />
              <div className="mt-3 flex flex-col gap-1.5">
                {[
                  { icon: LayoutGrid, active: true, label: "Workspace" },
                  { icon: Files, active: false, label: "Documents" },
                  { icon: Search, active: false, label: "Search" },
                ].map((item) => (
                  <span
                    key={item.label}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg",
                      item.active
                        ? "bg-brand-50 text-brand-300"
                        : "text-ink-300",
                    )}
                  >
                    <item.icon className="h-3.5 w-3.5" />
                  </span>
                ))}
              </div>
              <span className="mt-auto flex h-8 w-8 items-center justify-center rounded-lg text-ink-300">
                <Settings2 className="h-3.5 w-3.5" />
              </span>
            </aside>

            <div className="min-w-0 flex-1 p-3.5 sm:p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-400">
                    Workspace
                  </p>
                  <h3 className="mt-0.5 text-[13px] font-semibold tracking-[-0.01em] text-ink-900">
                    Document Q&amp;A
                  </h3>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50 px-2 py-0.5 text-[8.5px] font-semibold text-emerald-700">
                  <span className="h-1 w-1 rounded-full bg-emerald-500" />
                  Engine ready
                </span>
              </div>

              <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-ink-100 bg-surface p-2.5 shadow-[0_1px_2px_rgba(16,21,40,0.03)]">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-rose-500/20 bg-gradient-to-br from-rose-500/20 to-pink-500/10 text-rose-500">
                  <FileText className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[10.5px] font-semibold text-ink-800">
                    retrieval-evaluation.pdf
                  </p>
                  <p className="text-[9px] text-ink-400">
                    24 pages · 63 chunks
                  </p>
                </div>
                <span className="hidden items-center gap-1 rounded-full bg-ink-50 px-1.5 py-0.5 text-[8px] font-medium text-ink-500 sm:inline-flex">
                  <Check className="h-2.5 w-2.5 text-emerald-500" />
                  Indexed
                </span>
              </div>

              <div className="mt-3 flex justify-end">
                <div className="max-w-[88%] rounded-2xl rounded-br-md bg-gradient-to-br from-violet-600 to-fuchsia-600 px-3 py-2.5 text-[10px] leading-relaxed text-white shadow-[0_10px_30px_-14px_rgba(168,85,247,0.9)]">
                  How did retrieval accuracy change after re-ranking, and what
                  explains it?
                </div>
              </div>

              <div className="mt-2.5 rounded-2xl rounded-tl-md border border-ink-100 bg-surface p-3 shadow-[0_8px_24px_-18px_rgba(16,21,40,0.25)] sm:p-3.5">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-ink-800">
                    <span className="flex h-4 w-4 items-center justify-center rounded-md bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 text-white">
                      <Sparkles className="h-2.5 w-2.5" aria-hidden="true" />
                    </span>
                    Answer
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-brand-100 bg-brand-50 px-1.5 py-0.5 text-[8px] font-semibold text-brand-300">
                    <Check className="h-2.5 w-2.5" />
                    Grounded
                  </span>
                </div>
                <p className="mt-2 text-[10px] leading-[1.65] text-ink-600">
                  Top-5 retrieval accuracy improved by 12.4% after the re-ranking
                  stage was added
                  <sup className="mx-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded bg-brand-50 align-super text-[7px] font-bold text-brand-300">
                    1
                  </sup>
                  . The authors attribute the gain to cross-encoder scoring that
                  filters near-miss passages before context construction
                  <sup className="mx-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded bg-brand-50 align-super text-[7px] font-bold text-brand-300">
                    2
                  </sup>
                  .
                </p>

                <div className="mt-2.5 border-t border-ink-100 pt-2.5">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[8.5px] font-semibold uppercase tracking-[0.12em] text-ink-400">
                      Sources
                    </span>
                    <span className="text-[8.5px] text-ink-400">
                      3 passages
                    </span>
                  </div>
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    <Citation
                      index={1}
                      name="retrieval-evaluation.pdf"
                      page="p. 7"
                      score="91%"
                    />
                    <Citation
                      index={2}
                      name="retrieval-evaluation.pdf"
                      page="p. 11"
                      score="87%"
                      className="hidden sm:flex"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-2.5 flex items-center justify-between rounded-lg border border-dashed border-ink-200/80 bg-surface/50 px-2.5 py-1.5">
                <span className="flex items-center gap-1.5 text-[8.5px] text-ink-400">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-60" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-500" />
                  </span>
                  Retrieving evidence
                </span>
                <span className="text-[8.5px] font-medium text-ink-500">
                  Gemini embeddings · FAISS
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-5 -left-3 hidden items-center gap-2 rounded-xl border border-ink-100 bg-surface/95 px-3 py-2 shadow-card backdrop-blur sm:flex">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-50 text-emerald-600">
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        <span>
          <span className="block text-[9px] font-semibold text-ink-800">
            Every claim traceable
          </span>
          <span className="block text-[8px] text-ink-400">
            Inspect the exact source passage
          </span>
        </span>
        <ArrowUpRight className="ml-1 h-3 w-3 text-ink-300" aria-hidden="true" />
      </div>

      <p className="mt-7 text-center text-[10px] leading-relaxed text-ink-400 sm:mt-6 lg:text-left">
        Illustrative product preview with sample content. Not a live document or
        retrieval result.
      </p>
    </div>
  );
}
