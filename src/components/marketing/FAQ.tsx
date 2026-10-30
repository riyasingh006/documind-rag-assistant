import { LifeBuoy } from "lucide-react";
import { Accordion, type AccordionItem } from "@/components/ui/Accordion";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";

const items: AccordionItem[] = [
  {
    id: "what",
    question: "What is DocuMind AI?",
    answer: (
      <p>
        DocuMind AI is a document question-answering workspace. Upload PDF or
        TXT files; the backend extracts and chunks the text, and Gemini creates
        embeddings for FAISS retrieval. Questions and relevant passages are sent
        to Gemini to generate source-grounded answers. Supporting sources are
        shown with each answer.
      </p>
    ),
  },
  {
    id: "formats",
    question: "Which file formats are supported?",
    answer: (
      <p>
        PDF and plain text (TXT) files are supported, up to 20 MB per file. PDFs
        must contain an extractable text layer. Scanned or image-only PDFs are
        rejected with a clear error because OCR is not included in this version.
      </p>
    ),
  },
  {
    id: "how",
    question: "How does document-based question answering work?",
    answer: (
      <p>
        Gemini embeds the question; a similarity search over the FAISS index
        returns the closest chunks above the configured relevance threshold.
        Those passages form a bounded context for Gemini. Citation IDs are
        validated against the retrieved chunks before they are displayed, so
        references cannot point to sources that were not supplied.
      </p>
    ),
  },
  {
    id: "insufficient",
    question: "What happens when an answer is not present in my documents?",
    answer: (
      <p>
        If no chunks pass the relevance threshold, or the model determines that
        the retrieved evidence is insufficient, DocuMind returns:
        <span className="mt-2 block rounded-lg border border-ink-100 bg-ink-50/70 px-3 py-2 text-[13px] italic text-ink-600">
          “I couldn't find sufficient information to answer this question from
          the uploaded documents.”
        </span>
        <span className="mt-2 block">
          It does not fill the gap with outside knowledge. You can adjust the
          threshold and Top-K settings in the workspace.
        </span>
      </p>
    ),
  },
  {
    id: "multiple",
    question: "Can I upload multiple documents?",
    answer: (
      <p>
        Yes. You can build a library of PDFs and TXT files, search across all of
        them, or limit retrieval to specific documents with the search scope
        selector. Deleting a document removes its chunks and rebuilds the vector
        index.
      </p>
    ),
  },
  {
    id: "api-key",
    question: "Does the application require an API key?",
    answer: (
      <p>
        Yes. A Gemini API key is required for embeddings and generated answers.
        Add it only to the backend environment as DOCUMIND_GEMINI_API_KEY; never
        expose it in the browser. If Gemini is temporarily unavailable, an
        evidence-only extractive fallback can be enabled and is clearly
        labelled.
      </p>
    ),
  },
  {
    id: "storage",
    question: "Are my uploaded documents stored?",
    answer: (
      <p>
        Yes. Uploaded files and their indexes are stored on the backend. On
        Render, they survive redeploys only when a persistent disk is attached
        and DOCUMIND_DATA_DIR points to its mount. This build has no user
        authentication, so do not expose it publicly with sensitive documents.
        Document and question text are sent to Gemini for embeddings, and
        retrieved excerpts are also sent for answer generation.
      </p>
    ),
  },
];

export function FAQ() {
  return (
    <section
      id="faq"
      className="relative scroll-mt-24 border-t border-brand-200/20 bg-[#0b0714]/55 py-20 sm:py-24 lg:py-28"
    >
      <div className="container-page grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <div>
          <Reveal>
            <SectionHeading
              align="left"
              eyebrow="FAQ"
              title="Questions, Answered Directly"
              description="The practical details about formats, retrieval, storage, and model configuration."
            />
          </Reveal>
          <Reveal delay={100}>
            <div className="mt-8 hidden rounded-xl border border-ink-100 bg-ink-50/50 p-4 lg:block">
              <div className="flex items-start gap-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface text-brand-300 shadow-sm">
                  <LifeBuoy className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <p className="text-[11.5px] leading-5 text-ink-500">
                  Setup, architecture, and the full RAG workflow are documented
                  in the project README. Answers here reflect the actual
                  implementation.
                </p>
              </div>
            </div>
          </Reveal>
        </div>

        <Reveal delay={80}>
          <div className="rounded-2xl border border-ink-100 bg-surface px-4 shadow-[0_1px_2px_rgba(16,21,40,0.03)] sm:px-6">
            <Accordion items={items} defaultOpen="what" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
