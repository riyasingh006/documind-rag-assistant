import { useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  FileText,
  Files,
  Layers,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { cn } from "@/lib/cn";

interface DemoSource {
  id: number;
  filename: string;
  page: string;
  score: number;
  excerpt: string;
}

interface Demo {
  id: string;
  question: string;
  answer: string;
  sources: DemoSource[];
}

const docs = [
  {
    name: "retrieval-evaluation.pdf",
    meta: "24 pages · 63 chunks",
    type: "PDF",
  },
  {
    name: "product-brief-q3.txt",
    meta: "12 sections · 31 chunks",
    type: "TXT",
  },
  {
    name: "literature-review.pdf",
    meta: "41 pages · 96 chunks",
    type: "PDF",
  },
];

const demos: Demo[] = [
  {
    id: "accuracy",
    question: "What changed retrieval accuracy after re-ranking was added?",
    answer:
      "Top-5 retrieval accuracy improved by 12.4% after the re-ranking stage was introduced [1]. The report attributes the gain to cross-encoder scoring that filters near-miss passages before the context is constructed [2].",
    sources: [
      {
        id: 1,
        filename: "retrieval-evaluation.pdf",
        page: "Page 7",
        score: 0.91,
        excerpt:
          "After adding the re-ranking stage, top-5 retrieval accuracy increased from 71.8% to 84.2%, a 12.4 percentage point improvement over the baseline dense retriever. [[The improvement was consistent across all four evaluation subsets.]]",
      },
      {
        id: 2,
        filename: "retrieval-evaluation.pdf",
        page: "Page 11",
        score: 0.87,
        excerpt:
          "[[The authors attribute the observed gain primarily to cross-encoder scoring]], which reorders candidate passages and removes near-miss results that share vocabulary but not meaning.",
      },
    ],
  },
  {
    id: "limitations",
    question: "Which limitations does the study call out?",
    answer:
      "The study notes two limitations: a relatively small evaluation set, and the added latency of cross-encoder re-ranking [1]. It also recommends validating the results on a larger, domain-diverse corpus [2].",
    sources: [
      {
        id: 1,
        filename: "retrieval-evaluation.pdf",
        page: "Page 19",
        score: 0.89,
        excerpt:
          "[[Two limitations should be noted. First, the evaluation set contains only 240 question-answer pairs from a single domain. Second, cross-encoder re-ranking adds measurable latency]] to the query path.",
      },
      {
        id: 2,
        filename: "literature-review.pdf",
        page: "Page 34",
        score: 0.84,
        excerpt:
          "Future work should [[validate retrieval quality on larger and more domain-diverse corpora]] before generalizing these findings to production knowledge bases.",
      },
    ],
  },
  {
    id: "chunking",
    question: "How is chunking configured in the prototype?",
    answer:
      "The prototype uses approximately 800-token chunks with 120 tokens of overlap between adjacent chunks [1]. The configuration is treated as a starting point, not a universal optimum [2].",
    sources: [
      {
        id: 1,
        filename: "product-brief-q3.txt",
        page: "Section 4",
        score: 0.93,
        excerpt:
          "The ingestion pipeline defaults to [[approximately 800 tokens per chunk with 120 tokens of overlap]]. Both values are exposed in the workspace settings for new uploads.",
      },
      {
        id: 2,
        filename: "retrieval-evaluation.pdf",
        page: "Page 22",
        score: 0.81,
        excerpt:
          "[[Chunk size should be treated as a configurable starting value]] rather than a universally optimal setting; retrieval quality depends on document structure and question style.",
      },
    ],
  },
];

function AnswerText({ text }: { text: string }) {
  const parts = text.split(/(\[\d+\])/g);
  return (
    <p className="text-[13px] leading-[1.8] text-ink-600">
      {parts.map((part, index) => {
        const match = /^\[(\d+)\]$/.exec(part);
        if (match) {
          return (
            <sup
              key={`${part}-${index}`}
              className="mx-0.5 inline-flex h-4 w-4 items-center justify-center rounded bg-brand-50 align-super text-[8px] font-bold text-brand-300"
            >
              {match[1]}
            </sup>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </p>
  );
}

function HighlightedExcerpt({ text }: { text: string }) {
  const parts = text.split(/(\[\[.*?\]\])/g);
  return (
    <p className="text-[11.5px] leading-[1.8] text-ink-500">
      {parts.map((part, index) => {
        if (part.startsWith("[[") && part.endsWith("]]")) {
          return (
            <mark
              key={index}
              className="rounded-[3px] bg-brand-100/70 px-0.5 text-ink-800"
            >
              {part.slice(2, -2)}
            </mark>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </p>
  );
}

export function ProductShowcase() {
  const [activeDemo, setActiveDemo] = useState(demos[0].id);
  const [openSource, setOpenSource] = useState<number | null>(demos[0].sources[0].id);
  const demo = demos.find((item) => item.id === activeDemo) ?? demos[0];

  const handleDemoChange = (id: string) => {
    setActiveDemo(id);
    const next = demos.find((item) => item.id === id);
    setOpenSource(next?.sources[0]?.id ?? null);
  };

  const activeSource =
    demo.sources.find((source) => source.id === openSource) ?? demo.sources[0];

  return (
    <section id="showcase" className="relative scroll-mt-24 py-20 sm:py-24 lg:py-28">
      <div className="container-page">
        <Reveal>
          <SectionHeading
            eyebrow="Product showcase"
            title="See Your Documents Differently"
            description="A focused workspace where every question is answered from your library, and every answer can be traced back to its evidence."
          />
        </Reveal>

        <Reveal delay={90}>
          <div className="mt-12 overflow-hidden rounded-[24px] border border-ink-100 bg-surface shadow-lift">
            <div className="flex h-11 items-center justify-between gap-3 border-b border-ink-100 bg-ink-50/50 px-4">
              <div className="flex items-center gap-1.5" aria-hidden="true">
                <span className="h-2 w-2 rounded-full bg-[#F0A8A8]" />
                <span className="h-2 w-2 rounded-full bg-[#F2D49B]" />
                <span className="h-2 w-2 rounded-full bg-[#A8D8BD]" />
              </div>
              <span className="text-[10.5px] font-medium text-ink-400">
                DocuMind AI · Workspace
              </span>
              <Badge tone="warning" className="text-[8.5px] uppercase tracking-[0.08em]">
                Illustrative preview
              </Badge>
            </div>

            <div className="grid lg:grid-cols-[252px_1fr]">
              <aside className="border-b border-ink-100 bg-surface p-4 lg:border-b-0 lg:border-r lg:p-5">
                <div className="flex items-center justify-between">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-ink-400">
                    Document library
                  </p>
                  <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[8px] font-semibold text-emerald-700">
                    3 selected
                  </span>
                </div>

                <div className="mt-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar lg:flex-col lg:overflow-visible lg:pb-0">
                  {docs.map((doc) => (
                    <div
                      key={doc.name}
                      className="flex min-w-[210px] items-center gap-2.5 rounded-xl border border-brand-100 bg-brand-50/40 p-2.5 lg:min-w-0"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-surface text-brand-300 shadow-[0_1px_2px_rgba(16,21,40,0.06)]">
                        <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[10.5px] font-semibold text-ink-800">
                          {doc.name}
                        </span>
                        <span className="block text-[9px] text-ink-400">
                          {doc.meta}
                        </span>
                      </span>
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-brand-500 bg-brand-500 text-white">
                        <Check className="h-2.5 w-2.5" aria-hidden="true" />
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 hidden rounded-xl border border-dashed border-ink-200/80 p-3 lg:block">
                  <div className="flex items-center gap-1.5 text-[9px] font-semibold text-ink-500">
                    <Layers className="h-3 w-3 text-brand-500" />
                    Library index
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-ink-100">
                    <span className="block h-full w-[82%] rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500" />
                  </div>
                  <p className="mt-1.5 text-[8.5px] text-ink-400">
                    190 sample chunks · 3 documents
                  </p>
                </div>

                <p className="mt-4 hidden text-[8.5px] leading-4 text-ink-300 lg:block">
                  Sample documents shown for illustration. Your workspace starts
                  empty until you upload files.
                </p>
              </aside>

              <div className="min-w-0 bg-[#0d0818] p-4 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-night text-white">
                      <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-[11px] font-semibold text-ink-900">
                        Ask your documents
                      </p>
                      <p className="text-[9px] text-ink-400">
                        3 sample documents in scope
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-[9px] text-ink-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Sample session
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {demos.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleDemoChange(item.id)}
                      aria-pressed={activeDemo === item.id}
                      className={cn(
                        "focus-ring rounded-full border px-2.5 py-1.5 text-[9.5px] font-medium transition",
                        activeDemo === item.id
                          ? "border-brand-200 bg-brand-50 text-brand-300"
                          : "border-ink-200 bg-surface text-ink-500 hover:border-ink-300 hover:text-ink-800",
                      )}
                    >
                      {item.question}
                    </button>
                  ))}
                </div>

                <div className="mt-4 flex justify-end">
                  <div className="max-w-[92%] rounded-2xl rounded-br-md bg-gradient-to-br from-violet-600 to-fuchsia-600 px-3.5 py-2.5 text-[11px] leading-relaxed text-white shadow-sm">
                    {demo.question}
                  </div>
                </div>

                <div className="mt-3 rounded-2xl rounded-tl-md border border-ink-100 bg-surface p-4 shadow-[0_12px_30px_-24px_rgba(16,21,40,0.3)]">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold text-ink-800">
                      <span className="flex h-4 w-4 items-center justify-center rounded-md bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 p-0.5 text-white">
                        <Sparkles className="h-2.5 w-2.5" aria-hidden="true" />
                      </span>
                      Answer
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/80 bg-emerald-50 px-1.5 py-0.5 text-[8px] font-semibold text-emerald-700">
                      <Check className="h-2.5 w-2.5" />
                      2 sources cited
                    </span>
                  </div>
                  <div className="mt-2">
                    <AnswerText text={demo.answer} />
                  </div>

                  <div className="mt-3.5 grid gap-2 sm:grid-cols-2">
                    {demo.sources.map((source) => {
                      const expanded = activeSource.id === source.id;
                      return (
                        <button
                          key={source.id}
                          type="button"
                          onClick={() => setOpenSource(expanded ? null : source.id)}
                          aria-expanded={expanded}
                          className={cn(
                            "focus-ring group flex items-start gap-2 rounded-lg border p-2.5 text-left transition",
                            expanded
                              ? "border-brand-200 bg-brand-50/40"
                              : "border-ink-100 bg-surface hover:border-ink-200",
                          )}
                        >
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-surface text-[9px] font-bold text-brand-300 shadow-[0_1px_2px_rgba(16,21,40,0.08)]">
                            {source.id}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[9.5px] font-semibold text-ink-800">
                              {source.filename}
                            </span>
                            <span className="block text-[8.5px] text-ink-400">
                              {source.page} · {Math.round(source.score * 100)}%
                              match
                            </span>
                          </span>
                          <ChevronDown
                            className={cn(
                              "h-3 w-3 shrink-0 text-ink-300 transition-transform",
                              expanded && "rotate-180 text-brand-500",
                            )}
                            aria-hidden="true"
                          />
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-2.5 rounded-lg border border-ink-100 bg-ink-50/40 p-3">
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 text-[8.5px] font-semibold uppercase tracking-[0.12em] text-ink-400">
                        <Files className="h-2.5 w-2.5" />
                        Document context
                      </span>
                      <span className="text-[8.5px] text-ink-400">
                        {activeSource.filename} · {activeSource.page}
                      </span>
                    </div>
                    <HighlightedExcerpt text={activeSource.excerpt} />
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2 rounded-xl border border-ink-200/80 bg-surface px-3 py-2.5 opacity-90">
                  <span className="flex-1 truncate text-[10.5px] text-ink-300">
                    Ask a follow-up question…
                  </span>
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-night text-white">
                    <ArrowRight className="h-3 w-3" aria-hidden="true" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={120}>
          <div className="mt-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-center text-[11px] leading-5 text-ink-400 sm:text-left">
              Illustrative interface with sample content. Nothing shown here is a
              live retrieval result.
            </p>
            <Button
              to="/workspace"
              variant="dark"
              iconRight={<ArrowRight className="h-4 w-4" aria-hidden="true" />}
            >
              Try DocuMind AI
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
