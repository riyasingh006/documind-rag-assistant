import {
  ArrowRight,
  Binary,
  Check,
  FileText,
  ScanSearch,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";

const principles = [
  {
    icon: ShieldCheck,
    title: "Grounded by design",
    description:
      "Answers are constrained to a bounded context built from retrieved passages.",
  },
  {
    icon: ScanSearch,
    title: "Transparent by default",
    description:
      "Citations are validated against the retrieved chunks before they are shown.",
  },
  {
    icon: Binary,
    title: "Local-first processing",
    description:
      "Extraction and embeddings run on the backend machine. No third-party embedding service.",
  },
];

const stack = ["FastAPI", "sentence-transformers", "FAISS", "React"];

export function About() {
  return (
    <section id="about" className="relative scroll-mt-24 py-20 sm:py-24 lg:py-28">
      <div className="container-page">
        <div className="grid items-center gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
          <div>
            <Reveal>
              <SectionHeading
                align="left"
                eyebrow="About"
                title="Making Knowledge Easier to Access"
                description="DocuMind AI is designed to help people interact with their documents more intelligently. By combining document processing, semantic retrieval, and AI-powered generation, it transforms static files into searchable, evidence-backed knowledge."
              />
            </Reveal>

            <div className="mt-8 space-y-5">
              {principles.map((principle, index) => (
                <Reveal key={principle.title} delay={index * 70}>
                  <div className="flex items-start gap-3.5">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-ink-100 bg-surface text-brand-300 shadow-[0_1px_2px_rgba(16,21,40,0.04)]">
                      <principle.icon
                        className="h-4 w-4"
                        aria-hidden="true"
                      />
                    </span>
                    <div>
                      <h3 className="text-[13.5px] font-semibold text-ink-900">
                        {principle.title}
                      </h3>
                      <p className="mt-1 text-[12.5px] leading-[1.7] text-ink-500">
                        {principle.description}
                      </p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>

            <Reveal delay={180}>
              <div className="mt-8 flex flex-wrap items-center gap-2 border-t border-ink-100 pt-6">
                <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-400">
                  Built with
                </span>
                {stack.map((item) => (
                  <span
                    key={item}
                    className="rounded-md border border-ink-100 bg-surface px-2 py-1 text-[10px] font-medium text-ink-500"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </Reveal>
          </div>

          <Reveal delay={100}>
            <figure className="relative overflow-hidden rounded-2xl border border-ink-100 bg-gradient-to-br from-surface-raised via-surface to-brand-50/60 p-5 shadow-card sm:p-7">
              <div
                className="pointer-events-none absolute inset-0 bg-grid opacity-50 [mask-image:radial-gradient(ellipse_70%_70%_at_30%_30%,black,transparent)]"
                aria-hidden="true"
              />

              <div className="relative">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-ink-400">
                    Documents → knowledge
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-brand-100 bg-brand-50 px-2 py-0.5 text-[8px] font-semibold text-brand-300">
                    <Sparkles className="h-2.5 w-2.5" />
                    Semantic layer
                  </span>
                </div>

                <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-4">
                  <div className="space-y-2">
                    {[
                      { name: "report.pdf", rotate: "-rotate-1" },
                      { name: "notes.txt", rotate: "rotate-1" },
                      { name: "brief.pdf", rotate: "-rotate-1" },
                    ].map((doc, index) => (
                      <div
                        key={doc.name}
                        className={`flex items-center gap-2 rounded-lg border border-ink-100 bg-surface px-2.5 py-2 shadow-[0_1px_2px_rgba(16,21,40,0.05)] ${doc.rotate}`}
                        style={{ marginLeft: `${index * 6}px` }}
                      >
                        <FileText className="h-3.5 w-3.5 shrink-0 text-brand-500" />
                        <span className="truncate text-[9.5px] font-medium text-ink-700">
                          {doc.name}
                        </span>
                      </div>
                    ))}
                  </div>

                  <span className="flex h-7 w-7 items-center justify-center rounded-full border border-ink-100 bg-surface text-ink-300 shadow-sm">
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>

                  <div className="rounded-xl border border-brand-100 bg-surface p-3 shadow-card">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-sky-500 text-white">
                        <Binary className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                      <div>
                        <p className="text-[9.5px] font-semibold text-ink-800">
                          Indexed knowledge
                        </p>
                        <p className="text-[8px] text-ink-400">
                          chunks + embeddings
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 space-y-1.5">
                      {[92, 74, 84, 61].map((width, index) => (
                        <span
                          key={index}
                          className="flex items-center gap-1.5"
                        >
                          <span className="h-1 w-1 shrink-0 rounded-full bg-brand-400" />
                          <span className="h-1 flex-1 overflow-hidden rounded-full bg-ink-100">
                            <span
                              className="block h-full rounded-full bg-gradient-to-r from-brand-400 to-sky-400"
                              style={{ width: `${width}%` }}
                            />
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-2">
                  {[
                    { label: "Text chunks", detail: "~800 tokens" },
                    { label: "Embeddings", detail: "384 dimensions" },
                    { label: "Citations", detail: "validated IDs" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-lg border border-ink-100 bg-surface/80 px-2.5 py-2"
                    >
                      <p className="text-[9px] font-semibold text-ink-700">
                        {item.label}
                      </p>
                      <p className="mt-0.5 text-[8px] text-ink-400">
                        {item.detail}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex items-start gap-2 rounded-lg border border-dashed border-brand-200/80 bg-surface/60 px-3 py-2.5">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <Check className="h-2.5 w-2.5" aria-hidden="true" />
                  </span>
                  <p className="text-[9px] leading-4 text-ink-500">
                    Each answer stays connected to the passages that support it.
                  </p>
                </div>
              </div>
            </figure>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
