import {
  ArrowRight,
  Binary,
  FileStack,
  MessageSquareQuote,
  Radar,
  Scissors,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";

const steps = [
  {
    number: "01",
    title: "Upload Your Documents",
    description:
      "Add your PDF or TXT files to create your personal document knowledge base.",
    icon: UploadCloud,
  },
  {
    number: "02",
    title: "AI Understands the Content",
    description:
      "Your documents are extracted, divided into smaller sections, converted into embeddings, and indexed for semantic retrieval.",
    icon: Binary,
  },
  {
    number: "03",
    title: "Ask and Discover",
    description:
      "Ask questions and receive answers grounded in relevant document passages, with supporting sources you can inspect.",
    icon: MessageSquareQuote,
  },
];

const pipeline = [
  { icon: FileStack, label: "Documents", detail: "PDF / TXT" },
  { icon: Scissors, label: "Text Chunks", detail: "≈800 tokens" },
  { icon: Binary, label: "Embeddings", detail: "Gemini · 768-d" },
  { icon: Radar, label: "Vector Search", detail: "FAISS · Top-K" },
  { icon: MessageSquareQuote, label: "Grounded Answers", detail: "with citations" },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative scroll-mt-24 overflow-hidden border-y border-brand-200/20 bg-[#0b0714]/55 py-20 sm:py-24 lg:py-28"
    >
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-[0.35] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_35%,black,transparent)]"
        aria-hidden="true"
      />
      <div className="container-page">
        <Reveal>
          <SectionHeading
            eyebrow="How it works"
            title="From Documents to Answers in Three Simple Steps"
            description="A transparent pipeline that keeps your content at the center — and the evidence in view."
          />
        </Reveal>

        <div className="relative mt-14">
          <div
            className="absolute left-[16.66%] right-[16.66%] top-[42px] hidden h-px bg-gradient-to-r from-brand-200 via-brand-300 to-sky-200 lg:block"
            aria-hidden="true"
          >
            <span className="absolute -top-[3px] left-0 h-[7px] w-[7px] rounded-full border border-brand-200 bg-surface" />
            <span className="absolute -top-[3px] left-1/2 h-[7px] w-[7px] -translate-x-1/2 rounded-full border border-brand-300 bg-surface" />
            <span className="absolute -top-[3px] right-0 h-[7px] w-[7px] rounded-full border border-sky-200 bg-surface" />
          </div>

          <div className="grid gap-8 lg:grid-cols-3 lg:gap-10">
            {steps.map((step, index) => (
              <Reveal key={step.number} delay={index * 90} as="article">
                <div className="relative flex gap-4 lg:block">
                  <div className="relative z-10 flex shrink-0 flex-col items-center lg:items-start">
                    <span className="flex h-[84px] w-[84px] flex-col items-center justify-center gap-1 rounded-2xl border border-ink-100 bg-surface shadow-soft">
                      <span className="font-mono text-[10px] font-semibold tracking-[0.16em] text-brand-500">
                        {step.number}
                      </span>
                      <step.icon
                        className="h-5 w-5 text-ink-700"
                        aria-hidden="true"
                      />
                    </span>
                    {index < steps.length - 1 && (
                      <span
                        className="my-2 h-full w-px bg-gradient-to-b from-ink-200 to-transparent lg:hidden"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                  <div className="pb-2 lg:mt-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400 lg:hidden">
                      Step {step.number}
                    </p>
                    <h3 className="mt-0.5 text-[17px] font-semibold tracking-[-0.02em] text-ink-950 lg:mt-0">
                      {step.title}
                    </h3>
                    <p className="mt-2 max-w-[340px] text-[13.5px] leading-[1.75] text-ink-500">
                      {step.description}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        <Reveal delay={120}>
          <div className="mt-14 rounded-2xl border border-ink-100 bg-gradient-to-b from-surface-raised to-ink-50/60 p-5 shadow-[0_1px_2px_rgba(16,21,40,0.03)] sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">
                  Retrieval pipeline
                </p>
                <p className="mt-0.5 text-[13px] font-medium text-ink-700">
                  How a question becomes a cited answer
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-100 bg-brand-50 px-2.5 py-1 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-brand-300">
                <span className="h-1 w-1 rounded-full bg-brand-500" />
                Runs on your backend
              </span>
            </div>

            <div className="mt-5 flex flex-col gap-2 md:flex-row md:items-stretch">
              {pipeline.map((stage, index) => (
                <div
                  key={stage.label}
                  className="flex flex-1 items-center gap-2 md:gap-0"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-ink-100 bg-surface px-3 py-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ink-50 text-ink-600">
                      <stage.icon className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[11.5px] font-semibold text-ink-800">
                        {stage.label}
                      </span>
                      <span className="block truncate text-[9.5px] text-ink-400">
                        {stage.detail}
                      </span>
                    </span>
                  </div>
                  {index < pipeline.length - 1 && (
                    <ArrowRight
                      className="mx-0.5 h-3.5 w-3.5 shrink-0 rotate-90 text-ink-300 md:rotate-0"
                      aria-hidden="true"
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-dashed border-ink-200/80 px-3.5 py-3">
              <ShieldCheck
                className="mt-0.5 h-4 w-4 shrink-0 text-brand-300"
                aria-hidden="true"
              />
              <p className="text-[11.5px] leading-5 text-ink-500">
                <span className="font-semibold text-ink-700">
                  Grounding guard.
                </span>{" "}
                If retrieval finds no evidence above your configured threshold,
                DocuMind returns an insufficient-evidence message instead of
                inventing an answer. Chunk size, overlap, Top-K, and threshold
                are all configurable.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
