import { Link } from "react-router-dom";
import { ArrowLeft, FileQuestion } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-ink-100/80 bg-transparent backdrop-blur-xl">
        <div className="container-page flex h-[68px] items-center justify-between">
          <Logo />
          <Button variant="secondary" size="sm" to="/" icon={<ArrowLeft className="h-3.5 w-3.5" />}>
            Back to Home
          </Button>
        </div>
      </header>
      <main className="container-page flex flex-1 flex-col items-center justify-center py-20 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-ink-100 bg-surface text-brand-300 shadow-soft">
          <FileQuestion className="h-6 w-6" aria-hidden="true" />
        </span>
        <p className="mt-6 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-300">
          404
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-ink-950">
          This page isn't in the library.
        </h1>
        <p className="mt-2 max-w-md text-sm leading-6 text-ink-500">
          The page you're looking for doesn't exist or has been moved. Head back
          to the homepage or open the workspace.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-2">
          <Button to="/" variant="secondary">
            Go Home
          </Button>
          <Button to="/workspace">Open Workspace</Button>
        </div>
        <Link to="/#faq" className="mt-5 text-xs font-medium text-ink-400 hover:text-ink-700">
          Read the FAQ
        </Link>
      </main>
    </div>
  );
}
