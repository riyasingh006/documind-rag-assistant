import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

const columns = [
  {
    title: "Product",
    links: [
      { label: "Features", to: "/#features" },
      { label: "How It Works", to: "/#how-it-works" },
      { label: "Workspace", to: "/workspace" },
    ],
  },
  {
    title: "Explore",
    links: [
      { label: "About", to: "/#about" },
      { label: "FAQ", to: "/#faq" },
      { label: "Product Showcase", to: "/#showcase" },
    ],
  },
  {
    title: "Application",
    links: [
      { label: "Documents", to: "/workspace/documents" },
      { label: "Settings", to: "/settings" },
      { label: "Get Started", to: "/workspace" },
    ],
  },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-brand-200/20 bg-[#08060f]/80">
      <div className="container-page py-14 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:gap-12">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-4 text-[12.5px] leading-6 text-ink-500">
              Turn your documents into answers. A document intelligence
              workspace with semantic retrieval, grounded generation, and
              inspectable sources.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-ink-100 bg-ink-50/60 px-2.5 py-1 text-[9.5px] font-medium text-ink-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Local-first RAG workspace
            </div>
          </div>

          {columns.map((column) => (
            <div key={column.title}>
              <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">
                {column.title}
              </h2>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="focus-ring group inline-flex items-center gap-1 rounded text-[12.5px] text-ink-500 transition-colors hover:text-ink-900"
                    >
                      {link.label}
                      <ArrowUpRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-60" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-ink-100 pt-6 sm:flex-row sm:items-center">
          <p className="text-[11px] text-ink-400">
            © {year} DocuMind AI. Turn your documents into answers.
          </p>
          <p className="text-[11px] text-ink-400">
            Built with FastAPI, sentence-transformers, and FAISS.
          </p>
        </div>
      </div>
    </footer>
  );
}
