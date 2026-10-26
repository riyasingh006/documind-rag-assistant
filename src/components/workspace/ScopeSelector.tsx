import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, Files, Search, X } from "lucide-react";
import type { DocumentRecord } from "@/lib/types";
import { cn } from "@/lib/cn";

interface ScopeSelectorProps {
  documents: DocumentRecord[];
  selectedIds: string[] | null;
  onChange: (ids: string[] | null) => void;
  className?: string;
}

export function ScopeSelector({
  documents,
  selectedIds,
  onChange,
  className,
}: ScopeSelectorProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const panelId = useId();

  const allSelected = selectedIds === null;
  const selectedCount = allSelected
    ? documents.length
    : (selectedIds ?? []).filter((id) =>
        documents.some((document) => document.id === id),
      ).length;

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => searchRef.current?.focus(), 30);

    const handlePointer = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  function toggle(id: string) {
    const current = selectedIds ?? documents.map((document) => document.id);
    const next = current.includes(id)
      ? current.filter((item) => item !== id)
      : [...current, id];
    onChange(next.length === documents.length ? null : next);
  }

  function selectAll() {
    onChange(null);
  }

  function clearAll() {
    onChange([]);
  }

  const filtered = documents.filter((document) =>
    document.filename.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const label =
    selectedCount === 0
      ? "No documents selected"
      : allSelected
        ? `All documents (${documents.length})`
        : `${selectedCount} of ${documents.length} selected`;

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        disabled={documents.length === 0}
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="dialog"
        className={cn(
          "focus-ring inline-flex h-9 max-w-full items-center gap-2 rounded-lg border bg-surface px-3 text-[11px] font-medium transition",
          selectedCount === 0
            ? "border-red-200 text-red-600"
            : "border-ink-200 text-ink-700 hover:border-ink-300 hover:bg-ink-50/40",
          "disabled:cursor-not-allowed disabled:opacity-50",
        )}
      >
        <Files className="h-3.5 w-3.5 text-ink-400" aria-hidden="true" />
        <span className="truncate">{label}</span>
        <ChevronDown
          className={cn(
            "h-3 w-3 shrink-0 text-ink-400 transition",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Choose document scope"
          className="absolute right-0 top-full z-50 mt-2 w-[300px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-ink-100 bg-surface shadow-lift animate-fade-up"
        >
          <div className="flex items-center justify-between border-b border-ink-100 px-3 py-2.5">
            <div>
              <p className="text-[11px] font-semibold text-ink-900">
                Search scope
              </p>
              <p className="mt-0.5 text-[9.5px] text-ink-400">
                Restrict retrieval to specific files
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="focus-ring flex h-6 w-6 items-center justify-center rounded text-ink-300 hover:bg-ink-50 hover:text-ink-600"
              aria-label="Close scope selector"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>

          {documents.length > 5 && (
            <div className="border-b border-ink-100 p-2">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-ink-300"
                  aria-hidden="true"
                />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Find a document…"
                  className="h-8 w-full rounded-lg border border-ink-100 bg-ink-50/50 pl-7 pr-2 text-[10.5px] text-ink-800 placeholder:text-ink-300 focus:border-brand-300 focus:bg-surface focus:outline-none"
                />
              </div>
            </div>
          )}

          <div className="max-h-60 overflow-y-auto p-1.5">
            <button
              type="button"
              onClick={selectAll}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition",
                allSelected ? "bg-brand-50/70" : "hover:bg-ink-50",
              )}
            >
              <span
                className={cn(
                  "flex h-4 w-4 items-center justify-center rounded border",
                  allSelected
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-ink-200 bg-surface",
                )}
              >
                {allSelected && <Check className="h-2.5 w-2.5" aria-hidden="true" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[10.5px] font-medium text-ink-800">
                  All documents
                </span>
                <span className="block text-[9px] text-ink-400">
                  Search across your whole library
                </span>
              </span>
            </button>

            <div className="my-1 border-t border-ink-50" />

            {filtered.length === 0 ? (
              <p className="px-2 py-4 text-center text-[10px] text-ink-400">
                No documents match “{query}”.
              </p>
            ) : (
              filtered.map((document) => {
                const checked =
                  allSelected || (selectedIds ?? []).includes(document.id);
                return (
                  <label
                    key={document.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 transition",
                      checked && !allSelected
                        ? "bg-brand-50/70"
                        : "hover:bg-ink-50",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(document.id)}
                      className="sr-only"
                    />
                    <span
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                        checked
                          ? "border-brand-600 bg-brand-600 text-white"
                          : "border-ink-200 bg-surface",
                      )}
                    >
                      {checked && (
                        <Check className="h-2.5 w-2.5" aria-hidden="true" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[10.5px] font-medium text-ink-700">
                        {document.filename}
                      </span>
                      <span className="block text-[9px] text-ink-400">
                        {document.chunk_count} chunks ·{" "}
                        {document.file_type.toUpperCase()}
                      </span>
                    </span>
                  </label>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between border-t border-ink-100 bg-ink-50/40 px-2.5 py-2">
            <button
              type="button"
              onClick={selectAll}
              className="focus-ring rounded text-[9.5px] font-medium text-ink-500 hover:text-brand-300"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="focus-ring rounded text-[9.5px] font-medium text-ink-500 hover:text-red-600"
            >
              Clear selection
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
