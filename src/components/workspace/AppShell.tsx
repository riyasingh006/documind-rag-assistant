import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, Link, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  FileText,
  Files,
  Layers,
  Menu,
  MessageSquareText,
  Settings2,
  Sparkles,
  X,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { WorkspaceProvider, useWorkspace } from "@/context/WorkspaceContext";
import { cn } from "@/lib/cn";
import { truncate } from "@/lib/format";
import { llmStatusLabel } from "@/lib/llm";

const navigation = [
  {
    label: "Workspace",
    to: "/workspace",
    icon: MessageSquareText,
    end: true,
  },
  { label: "Documents", to: "/workspace/documents", icon: Files, end: false },
  { label: "Settings", to: "/settings", icon: Settings2, end: false },
];

function EngineStatus() {
  const { health, healthError, healthLoading } = useWorkspace();
  const online = Boolean(health) && !healthError;

  return (
    <div className="rounded-xl border border-ink-100 bg-ink-50/50 p-3">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-ink-400">
          System status
        </span>
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            online ? "bg-emerald-500" : healthLoading ? "bg-amber-400" : "bg-red-500",
          )}
        />
      </div>

      <div className="mt-2.5 space-y-1.5 text-[10.5px]">
        <div className="flex items-center justify-between gap-2">
          <span className="text-ink-400">Backend</span>
          <span
            className={cn(
              "font-medium",
              online ? "text-emerald-700" : "text-red-600",
            )}
          >
            {online ? "Online" : healthLoading ? "Checking…" : "Offline"}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-ink-400">Embeddings</span>
          <span
            className="max-w-[120px] truncate font-medium text-ink-700"
            title={health?.embedding.model}
          >
            {health?.embedding.ready
              ? health.embedding.model.split("/").pop()
              : healthLoading
                ? "Loading…"
                : "Unavailable"}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-ink-400">Answers</span>
          <span
            className={cn(
              "max-w-[130px] truncate font-medium",
              health?.llm.available ? "text-ink-700" : "text-amber-700",
            )}
            title={health?.llm.detail ?? undefined}
          >
            {health ? llmStatusLabel(health.llm) : "—"}
          </span>
        </div>
      </div>

      {!online && !healthLoading && (
        <p className="mt-2.5 border-t border-ink-200/60 pt-2 text-[9px] leading-4 text-ink-400">
          {truncate(
            healthError ??
              "Start the FastAPI server with: uvicorn app.main:app --port 8000",
            110,
          )}
        </p>
      )}

      {online && health?.counts && (
        <div className="mt-2.5 flex items-center gap-3 border-t border-ink-200/60 pt-2 text-[9px] text-ink-400">
          <span className="inline-flex items-center gap-1">
            <FileText className="h-2.5 w-2.5" />
            {health.counts.documents} docs
          </span>
          <span className="inline-flex items-center gap-1">
            <Layers className="h-2.5 w-2.5" />
            {health.counts.chunks} chunks
          </span>
        </div>
      )}
    </div>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { documents, health } = useWorkspace();
  const recent = documents.slice(0, 3);

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4 no-scrollbar">
      <div className="flex items-center justify-between">
        <Logo to="/" />
        {onNavigate && (
          <button
            type="button"
            onClick={onNavigate}
            className="focus-ring flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 hover:bg-ink-50 hover:text-ink-700"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      <Link
        to="/"
        onClick={onNavigate}
        className="focus-ring mt-5 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-medium text-ink-400 transition hover:bg-ink-50 hover:text-ink-700"
      >
        <ArrowLeft className="h-3 w-3" aria-hidden="true" />
        Back to Home
      </Link>

      <nav className="mt-5" aria-label="Workspace navigation">
        <p className="px-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-ink-400">
          Workspace
        </p>
        <div className="mt-2 space-y-0.5">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  "focus-ring group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] font-medium transition",
                  isActive
                    ? "bg-brand-500/10 text-ink-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ring-1 ring-brand-300/20"
                    : "text-ink-500 hover:bg-surface-raised/70 hover:text-ink-800",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className={cn(
                      "h-4 w-4",
                      isActive ? "text-brand-300" : "text-ink-400",
                    )}
                    aria-hidden="true"
                  />
                  <span className="flex-1">{item.label}</span>
                  {item.to === "/workspace/documents" && (
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[9px] font-semibold",
                        isActive
                          ? "bg-brand-50 text-brand-300"
                          : "bg-ink-100 text-ink-500",
                      )}
                    >
                      {documents.length}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="mt-6">
        <div className="flex items-center justify-between px-2">
          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-ink-400">
            Library
          </p>
          <Link
            to="/workspace/documents"
            onClick={onNavigate}
            aria-label="View all documents"
            className="focus-ring rounded text-ink-300 transition hover:text-brand-300"
          >
            <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        </div>

        <div className="mt-2 space-y-0.5">
          {recent.length === 0 ? (
            <p className="px-2 py-1 text-[10px] leading-4 text-ink-400">
              No documents yet. Upload a PDF or TXT to get started.
            </p>
          ) : (
            recent.map((document) => (
              <Link
                key={document.id}
                to="/workspace/documents"
                onClick={onNavigate}
                className="focus-ring group flex items-center gap-2 rounded-lg px-2 py-1.5 transition hover:bg-surface-raised/80"
              >
                <FileText className="h-3.5 w-3.5 shrink-0 text-ink-300 group-hover:text-brand-500" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[10.5px] font-medium text-ink-600 group-hover:text-ink-900">
                    {document.filename}
                  </span>
                  <span className="block text-[8.5px] text-ink-400">
                    {document.chunk_count} chunks
                  </span>
                </span>
              </Link>
            ))
          )}
          {documents.length > 3 && (
            <Link
              to="/workspace/documents"
              onClick={onNavigate}
              className="focus-ring block px-2 py-1 text-[9.5px] font-medium text-ink-400 hover:text-brand-300"
            >
              + {documents.length - 3} more documents
            </Link>
          )}
        </div>
      </div>

      <div className="mt-auto pt-6">
        <EngineStatus />
        <div className="mt-3 flex items-center justify-between px-1 text-[8.5px] text-ink-300">
          <span>DocuMind AI v{health?.version ?? "1.0.0"}</span>
          <span className="inline-flex items-center gap-1">
            <Sparkles className="h-2.5 w-2.5" />
            Local workspace
          </span>
        </div>
      </div>
    </div>
  );
}

function MobileTopbar({ onOpen }: { onOpen: () => void }) {
  const { health, healthError } = useWorkspace();
  const online = Boolean(health) && !healthError;

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-ink-100 glass px-4 lg:hidden">
      <Logo />
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[9px] font-medium",
            online
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-600",
          )}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              online ? "bg-emerald-500" : "bg-red-500",
            )}
          />
          {online ? "Online" : "Offline"}
        </span>
        <button
          type="button"
          onClick={onOpen}
          className="focus-ring flex h-9 w-9 items-center justify-center rounded-lg border border-ink-200 bg-surface text-ink-700"
          aria-label="Open navigation"
        >
          <Menu className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => {
      panelRef.current
        ?.querySelector<HTMLButtonElement>("button")
        ?.focus();
    }, 30);

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = original;
      document.removeEventListener("keydown", handleKey);
    };
  }, [mobileOpen]);

  return (
    <WorkspaceProvider>
      <div className="min-h-screen">
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] border-r border-ink-100/80 bg-[#0b0715]/80 backdrop-blur-2xl lg:block">
          <SidebarContent />
        </aside>

        <MobileTopbar onOpen={() => setMobileOpen(true)} />

        <div className="lg:pl-[264px]">
          <main id="main-content">
            <Outlet />
          </main>
        </div>

        <div
          className={cn(
            "fixed inset-0 z-[70] lg:hidden",
            mobileOpen ? "pointer-events-auto" : "pointer-events-none",
          )}
          aria-hidden={!mobileOpen}
        >
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            tabIndex={mobileOpen ? undefined : -1}
            className={cn(
              "absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300",
              mobileOpen ? "opacity-100" : "opacity-0",
            )}
            aria-label="Close navigation overlay"
          />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Workspace navigation"
            className={cn(
              "absolute inset-y-0 left-0 w-[288px] max-w-[86vw] border-r border-ink-100 bg-[#0b0715] shadow-lift transition-transform duration-300 ease-premium",
              mobileOpen
                ? "visible translate-x-0"
                : "invisible -translate-x-full",
            )}
          >
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      </div>
    </WorkspaceProvider>
  );
}
