import {
  Files,
  FileUp,
  MessageSquareText,
  Quote,
  ScanSearch,
  ShieldCheck,
} from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";

const features = [
  {
    icon: FileUp,
    title: "Smart Document Upload",
    description:
      "Upload and process PDF and TXT files through a simple, validated interface.",
    meta: "20 MB limit · configurable chunking",
    gradient: "from-brand-500 to-brand-600",
  },
  {
    icon: ScanSearch,
    title: "Semantic Search",
    description:
      "Discover relevant passages based on meaning rather than relying only on exact keyword matches.",
    meta: "all-MiniLM-L6-v2 · FAISS cosine index",
    gradient: "from-sky-500 to-brand-500",
  },
  {
    icon: MessageSquareText,
    title: "AI-Powered Answers",
    description:
      "Ask natural-language questions and receive answers based on retrieved document content.",
    meta: "Bounded context · configurable LLM",
    gradient: "from-brand-500 to-sky-500",
  },
  {
    icon: Quote,
    title: "Source Citations",
    description:
      "Inspect supporting passages and their document references, with page numbers when available.",
    meta: "Citation IDs validated before display",
    gradient: "from-indigo-500 to-brand-500",
  },
  {
    icon: Files,
    title: "Multi-Document Intelligence",
    description:
      "Search across multiple documents and filter the results by selected files.",
    meta: "Library-wide or scoped retrieval",
    gradient: "from-sky-500 to-cyan-500",
  },
  {
    icon: ShieldCheck,
    title: "Privacy-Conscious Processing",
    description:
      "Extraction and embeddings run on the machine hosting the backend. Documents are stored in a local data directory — no third-party embedding API.",
    meta: "External LLM only if you configure one",
    gradient: "from-emerald-500 to-teal-500",
  },
];

export function Features() {
  return (
    <section id="features" className="relative scroll-mt-24 py-20 sm:py-24 lg:py-28">
      <div
        className="pointer-events-none absolute left-1/2 top-0 -z-10 h-72 w-[780px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(110,93,240,0.07),transparent_70%)] blur-2xl"
        aria-hidden="true"
      />
      <div className="container-page">
        <Reveal>
          <SectionHeading
            eyebrow="Features"
            title="Everything You Need to Understand Your Documents"
            description="From document ingestion to evidence-backed answers, explore a smarter knowledge workflow."
          />
        </Reveal>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          {features.map((feature, index) => (
            <Reveal
              key={feature.title}
              delay={(index % 3) * 70}
              as="article"
            >
              <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-ink-100 bg-surface p-6 shadow-[0_1px_2px_rgba(16,21,40,0.03)] transition duration-300 ease-premium hover:-translate-y-1 hover:border-brand-200/80 hover:shadow-card">
                <div
                  className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-brand-50/0 blur-2xl transition-colors duration-500 group-hover:bg-brand-100/60"
                  aria-hidden="true"
                />
                <div className="flex items-start justify-between">
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${feature.gradient} text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_8px_18px_-10px_rgba(70,56,194,0.6)] transition-transform duration-300 ease-premium group-hover:scale-[1.06]`}
                  >
                    <feature.icon className="h-[18px] w-[18px]" aria-hidden="true" />
                  </span>
                  <span className="font-mono text-[10px] font-medium tracking-[0.12em] text-ink-300">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="mt-5 text-[15.5px] font-semibold tracking-[-0.015em] text-ink-900">
                  {feature.title}
                </h3>
                <p className="mt-2 flex-1 text-[13.5px] leading-[1.7] text-ink-500">
                  {feature.description}
                </p>
                <div className="mt-5 border-t border-ink-100 pt-3.5">
                  <span className="text-[10.5px] font-medium leading-5 text-ink-400">
                    {feature.meta}
                  </span>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
