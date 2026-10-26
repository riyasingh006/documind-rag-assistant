import { Files, FileSearch, Quote, ScanSearch } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";

const values = [
  {
    icon: FileSearch,
    title: "Document-Grounded Answers",
    description:
      "Responses are built from retrieved passages in your own files — not from open-ended guessing.",
  },
  {
    icon: ScanSearch,
    title: "Semantic Search",
    description:
      "Retrieval works on meaning, surfacing relevant context beyond exact keyword matches.",
  },
  {
    icon: Quote,
    title: "Transparent Sources",
    description:
      "Inspect the passages behind an answer, including file names, page numbers, and match scores.",
  },
  {
    icon: Files,
    title: "Multiple Document Support",
    description:
      "Build a library of PDFs and text files, then search across all of them or a selected subset.",
  },
];

export function ValueStrip() {
  return (
    <section
      aria-label="Core capabilities"
      className="relative border-y border-ink-100 bg-surface/70"
    >
      <div className="container-page">
        <div className="grid divide-y divide-ink-100 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
          {values.map((value, index) => (
            <Reveal
              key={value.title}
              delay={index * 60}
              className="group py-6 sm:px-5 lg:px-7 lg:py-8 first:pl-0 last:pr-0"
            >
              <div className="flex items-start gap-3.5">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-ink-100 bg-surface text-brand-300 shadow-[0_1px_2px_rgba(16,21,40,0.04)] transition duration-300 group-hover:border-brand-200 group-hover:bg-brand-50">
                  <value.icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-[13.5px] font-semibold tracking-[-0.01em] text-ink-900">
                    {value.title}
                  </h2>
                  <p className="mt-1 text-[12.5px] leading-[1.65] text-ink-500">
                    {value.description}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
