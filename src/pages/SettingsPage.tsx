import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Cpu,
  Database,
  HardDrive,
  Layers,
  Loader2,
  RefreshCw,
  RotateCcw,
  Save,
  Server,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Terminal,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { useWorkspace } from "@/context/WorkspaceContext";
import {
  DEFAULT_SETTINGS,
  useSettings,
  type RetrievalSettings,
} from "@/hooks/useSettings";
import { API_BASE } from "@/lib/api";
import { cn } from "@/lib/cn";
import {
  llmStatusLabel,
  llmStatusTone,
  ollamaGuidance,
} from "@/lib/llm";

type FieldErrors = Partial<Record<keyof RetrievalSettings, string>>;

function validate(draft: RetrievalSettings): FieldErrors {
  const errors: FieldErrors = {};
  if (
    !Number.isInteger(draft.chunkSize) ||
    draft.chunkSize < 100 ||
    draft.chunkSize > 2000
  ) {
    errors.chunkSize = "Use a whole number between 100 and 2,000.";
  }
  const maxOverlap = Number.isFinite(draft.chunkSize)
    ? Math.max(0, Math.floor(draft.chunkSize / 2))
    : 0;
  if (
    !Number.isInteger(draft.chunkOverlap) ||
    draft.chunkOverlap < 0 ||
    draft.chunkOverlap > maxOverlap
  ) {
    errors.chunkOverlap = `Use a whole number between 0 and ${maxOverlap}.`;
  }
  if (!Number.isInteger(draft.topK) || draft.topK < 1 || draft.topK > 10) {
    errors.topK = "Use a whole number between 1 and 10.";
  }
  if (
    !Number.isFinite(draft.threshold) ||
    draft.threshold < 0 ||
    draft.threshold > 1
  ) {
    errors.threshold = "Use a value between 0% and 100%.";
  }
  return errors;
}

function ProviderName({ provider }: { provider: string }) {
  if (provider === "ollama") return <>Ollama</>;
  if (provider === "openai") return <>OpenAI-compatible</>;
  if (provider === "extractive") return <>Extractive fallback</>;
  if (provider === "none") return <>Not configured</>;
  return <>{provider}</>;
}

function ValueInput({
  value,
  min,
  max,
  step = 1,
  onChange,
  suffix,
  invalid,
  label,
  id,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  suffix: string;
  invalid?: string;
  label: string;
  id: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="number"
          aria-label={label}
          aria-invalid={Boolean(invalid)}
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(event) => onChange(Number(event.target.value))}
          className={cn(
            "h-9 w-24 rounded-lg border bg-surface px-2.5 text-right text-[12px] font-medium tabular-nums text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500/15",
            invalid
              ? "border-red-300 focus:border-red-400"
              : "border-ink-200 focus:border-brand-300",
          )}
        />
        <span className="text-[9.5px] text-ink-400">{suffix}</span>
      </div>
      {invalid && (
        <p className="mt-1 text-[8.5px] font-medium text-red-600">{invalid}</p>
      )}
    </div>
  );
}

function StatusRow({
  label,
  value,
  tone = "default",
  detail,
}: {
  label: string;
  value: React.ReactNode;
  tone?: "default" | "good" | "warn" | "bad";
  detail?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <span className="text-[9.5px] text-ink-400">{label}</span>
      <span className="min-w-0 text-right">
        <span
          className={cn(
            "block truncate text-[9.5px] font-medium",
            tone === "good"
              ? "text-emerald-700"
              : tone === "warn"
                ? "text-amber-700"
                : tone === "bad"
                  ? "text-red-600"
                  : "text-ink-700",
          )}
          title={detail ?? (typeof value === "string" ? value : undefined)}
        >
          {value}
        </span>
        {detail && detail !== value && (
          <span className="mt-0.5 block max-w-[190px] truncate text-[8px] text-ink-300">
            {detail}
          </span>
        )}
      </span>
    </div>
  );
}

export function SettingsPage() {
  const { health, healthError, healthLoading, refreshHealth } = useWorkspace();
  const { settings, saveSettings, resetSettings } = useSettings();

  const [draft, setDraft] = useState<RetrievalSettings>(settings);
  const [resetOpen, setResetOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Settings · DocuMind AI";
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const errors = useMemo(() => validate(draft), [draft]);
  const hasErrors = Object.keys(errors).length > 0;
  const dirty =
    draft.chunkSize !== settings.chunkSize ||
    draft.chunkOverlap !== settings.chunkOverlap ||
    draft.topK !== settings.topK ||
    Math.abs(draft.threshold - settings.threshold) > 0.0001;

  function update<K extends keyof RetrievalSettings>(
    key: K,
    value: RetrievalSettings[K],
  ) {
    setDraft((current) => {
      const next = { ...current, [key]: value };
      if (key === "chunkSize") {
        const maxOverlap = Math.max(0, Math.floor(Number(value) / 2));
        next.chunkOverlap = Math.min(
          Number(current.chunkOverlap) || 0,
          maxOverlap,
        );
      }
      return next;
    });
  }

  function handleSave() {
    if (hasErrors) return;
    const saved = saveSettings(draft);
    setDraft(saved);
    setNotice("Retrieval settings saved. They apply to your next question.");
  }

  function handleReset() {
    resetSettings();
    setDraft(DEFAULT_SETTINGS);
    setResetOpen(false);
    setNotice("Retrieval settings were reset to defaults.");
  }

  const thresholdPercent = Math.round(draft.threshold * 100);
  const online = Boolean(health) && !healthError;
  const extractive = health?.llm.active_provider === "extractive";
  const ollamaModel = health?.llm.ollama_model ?? "qwen2.5:3b";
  const ollamaConnected = health?.llm.ollama_connected;
  const modelAvailable = health?.llm.model_available;

  return (
    <div className="min-h-[calc(100dvh-56px)] lg:min-h-dvh">
      <div className="mx-auto w-full max-w-[1120px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-brand-300">
              Configuration
            </p>
            <h1 className="mt-1 text-[22px] font-semibold tracking-[-0.03em] text-ink-950 sm:text-2xl">
              Settings
            </h1>
            <p className="mt-1 max-w-lg text-[11px] leading-5 text-ink-500">
              Tune retrieval behavior and inspect the local embedding and answer
              engines.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {dirty && (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[9px] font-medium text-amber-700">
                Unsaved changes
              </span>
            )}
            <Button
              size="sm"
              icon={<Save className="h-3.5 w-3.5" />}
              onClick={handleSave}
              disabled={!dirty || hasErrors}
            >
              Save changes
            </Button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_330px]">
          <div className="space-y-4">
            <section className="overflow-hidden rounded-2xl border border-ink-100 bg-surface shadow-[0_1px_2px_rgba(16,21,40,0.03)]">
              <div className="flex items-start gap-2.5 border-b border-ink-100 p-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-300">
                  <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-[12.5px] font-semibold text-ink-950">
                    Retrieval defaults
                  </h2>
                  <p className="mt-0.5 text-[9.5px] leading-4 text-ink-400">
                    Saved in this browser. Chunking applies to new uploads;
                    top-K and relative cutoff apply to future questions.
                  </p>
                </div>
              </div>

              <div className="divide-y divide-ink-50">
                <div className="grid gap-3 p-4 sm:grid-cols-[1fr_220px] sm:items-start">
                  <div>
                    <label
                      htmlFor="chunk-size"
                      className="text-[10.5px] font-medium text-ink-800"
                    >
                      Chunk size
                    </label>
                    <p className="mt-0.5 text-[9px] leading-4 text-ink-400">
                      Approximate tokens per chunk. Measured with a deterministic
                      word and punctuation tokenizer, not the embedding model's
                      subword tokenizer.
                    </p>
                  </div>
                  <div>
                    <ValueInput
                      id="chunk-size"
                      label="Chunk size in approximate tokens"
                      value={draft.chunkSize}
                      min={100}
                      max={2000}
                      step={50}
                      suffix="tokens"
                      onChange={(value) => update("chunkSize", value)}
                      invalid={errors.chunkSize}
                    />
                    <p className="mt-1 text-[8px] text-ink-300">
                      Default 800 · min 100 · max 2,000
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 p-4 sm:grid-cols-[1fr_220px] sm:items-start">
                  <div>
                    <label
                      htmlFor="chunk-overlap"
                      className="text-[10.5px] font-medium text-ink-800"
                    >
                      Chunk overlap
                    </label>
                    <p className="mt-0.5 text-[9px] leading-4 text-ink-400">
                      Tokens shared between neighboring chunks. Overlap keeps
                      boundary-spanning sentences retrievable and cannot exceed
                      half the chunk size.
                    </p>
                  </div>
                  <div>
                    <ValueInput
                      id="chunk-overlap"
                      label="Chunk overlap in approximate tokens"
                      value={draft.chunkOverlap}
                      min={0}
                      max={Math.max(0, Math.floor(draft.chunkSize / 2))}
                      step={10}
                      suffix="tokens"
                      onChange={(value) => update("chunkOverlap", value)}
                      invalid={errors.chunkOverlap}
                    />
                    <p className="mt-1 text-[8px] text-ink-300">
                      Default 120 · max half of chunk size
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 p-4 sm:grid-cols-[1fr_220px] sm:items-start">
                  <div>
                    <label
                      htmlFor="top-k"
                      className="text-[10.5px] font-medium text-ink-800"
                    >
                      Passages to retrieve (top-K)
                    </label>
                    <p className="mt-0.5 text-[9px] leading-4 text-ink-400">
                      Maximum number of matching chunks passed to the answer
                      stage. More passages can add context, but also noise and
                      latency.
                    </p>
                  </div>
                  <div className="sm:pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[8.5px] text-ink-400">1</span>
                      <span className="rounded-md bg-ink-50 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-ink-800">
                        {draft.topK}
                      </span>
                      <span className="text-[8.5px] text-ink-400">10</span>
                    </div>
                    <input
                      id="top-k"
                      type="range"
                      min={1}
                      max={10}
                      step={1}
                      value={Number.isFinite(draft.topK) ? draft.topK : 5}
                      onChange={(event) => update("topK", Number(event.target.value))}
                      aria-label="Number of passages to retrieve"
                      className="mt-1.5 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-ink-100 accent-brand-600"
                    />
                    <p className="mt-1.5 text-[8px] text-ink-300">Default 5</p>
                  </div>
                </div>

                <div className="grid gap-3 p-4 sm:grid-cols-[1fr_220px] sm:items-start">
                  <div>
                    <label
                      htmlFor="threshold"
                      className="text-[10.5px] font-medium text-ink-800"
                    >
                      Relative relevance cutoff
                    </label>
                    <p className="mt-0.5 text-[9px] leading-4 text-ink-400">
                      A passage must score at least this fraction of the best
                      match. Lower values add more supporting passages. An
                      absolute similarity floor (
                      {Math.round(
                        (health?.defaults.min_similarity_floor ?? 0.15) * 100,
                      )}
                      %) still rejects unrelated material.
                    </p>
                  </div>
                  <div className="sm:pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[8.5px] text-ink-400">0%</span>
                      <span className="rounded-md bg-ink-50 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-ink-800">
                        {thresholdPercent}%
                      </span>
                      <span className="text-[8.5px] text-ink-400">100%</span>
                    </div>
                    <input
                      id="threshold"
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={Number.isFinite(draft.threshold) ? thresholdPercent : 20}
                      onChange={(event) =>
                        update("threshold", Number(event.target.value) / 100)
                      }
                      aria-label="Relative relevance cutoff percentage"
                      className="mt-1.5 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-ink-100 accent-brand-600"
                    />
                    <p className="mt-1.5 text-[8px] text-ink-300">Default 20%</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ink-100 bg-ink-50/35 px-4 py-3">
                <button
                  type="button"
                  onClick={() => setResetOpen(true)}
                  className="focus-ring inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[9.5px] font-medium text-ink-500 transition hover:bg-surface-raised hover:text-ink-800"
                >
                  <RotateCcw className="h-3 w-3" aria-hidden="true" />
                  Reset to defaults
                </button>
                <div className="flex items-center gap-2">
                  {hasErrors && (
                    <span className="inline-flex items-center gap-1 text-[8.5px] font-medium text-red-600">
                      <AlertCircle className="h-2.5 w-2.5" aria-hidden="true" />
                      Fix invalid values
                    </span>
                  )}
                  <Button
                    size="sm"
                    icon={<Save className="h-3.5 w-3.5" />}
                    onClick={handleSave}
                    disabled={!dirty || hasErrors}
                  >
                    Save changes
                  </Button>
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-ink-100 bg-surface shadow-[0_1px_2px_rgba(16,21,40,0.03)]">
              <div className="flex items-start gap-2.5 border-b border-ink-100 p-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-[12.5px] font-semibold text-ink-950">
                    Answer generation
                  </h2>
                  <p className="mt-0.5 text-[9.5px] leading-4 text-ink-400">
                    The answer engine is configured on the backend, not stored
                    in this browser.
                  </p>
                </div>
              </div>

              <div className="p-4">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-xl border border-ink-100 bg-ink-50/35 p-3">
                    <p className="text-[8px] font-semibold uppercase tracking-[0.12em] text-ink-400">
                      Configured
                    </p>
                    <p className="mt-1 text-[11px] font-medium text-ink-800">
                      {health ? (
                        <ProviderName provider={health.llm.configured_provider} />
                      ) : (
                        "Unknown"
                      )}
                    </p>
                    <p className="mt-0.5 truncate text-[8.5px] text-ink-400">
                      {health?.llm.detail
                        ? health.llm.detail
                        : "Start the backend to inspect provider status."}
                    </p>
                  </div>
                  <div className="rounded-xl border border-ink-100 bg-ink-50/35 p-3">
                    <p className="text-[8px] font-semibold uppercase tracking-[0.12em] text-ink-400">
                      Active
                    </p>
                    <p className="mt-1 text-[11px] font-medium text-ink-800">
                      {health ? (
                        <ProviderName provider={health.llm.active_provider} />
                      ) : (
                        "Unavailable"
                      )}
                    </p>
                    <p className="mt-0.5 truncate text-[8.5px] text-ink-400">
                      {health ? health.llm.model : "Backend offline"}
                    </p>
                  </div>
                </div>

                {extractive ? (
                  <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
                    <div className="flex items-center gap-1.5">
                      <AlertCircle
                        className="h-3 w-3 text-amber-600"
                        aria-hidden="true"
                      />
                      <p className="text-[10px] font-semibold text-amber-900">
                        Extractive fallback is active
                      </p>
                    </div>
                    <p className="mt-1 text-[9px] leading-4 text-amber-800/90">
                      {ollamaGuidance(health?.llm) ||
                        "Answers quote the strongest matching passage instead of being synthesized."}
                    </p>
                    <div className="mt-2 rounded-lg border border-amber-200/70 bg-surface/70 p-2.5 font-mono text-[8.5px] leading-5 text-ink-700">
                      <p className="text-ink-400"># Local option</p>
                      <p>ollama pull {ollamaModel}</p>
                      <p>ollama serve</p>
                      <p className="mt-1.5 text-ink-400"># then restart the API</p>
                      <p>uvicorn app.main:app --port 8000</p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex items-start gap-1.5 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
                    <CheckCircle2
                      className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600"
                      aria-hidden="true"
                    />
                    <p className="text-[9px] leading-4 text-emerald-800">
                      A language model is available. Answers are synthesized
                      strictly from retrieved passages, with citation checks
                      applied by the backend.
                    </p>
                  </div>
                )}

                <div className="mt-3">
                  <p className="flex items-center gap-1.5 text-[8.5px] font-semibold uppercase tracking-[0.12em] text-ink-400">
                    <Terminal className="h-2.5 w-2.5" aria-hidden="true" />
                    Backend environment
                  </p>
                  <div className="mt-1.5 overflow-x-auto rounded-lg border border-ink-100 bg-ink-50/50 p-2.5 font-mono text-[8.5px] leading-5 text-ink-600">
                    <p>
                      <span className="text-ink-400"># backend/.env</span>
                    </p>
                    <p>DOCUMIND_LLM_PROVIDER=auto</p>
                    <p>DOCUMIND_OLLAMA_MODEL={ollamaModel}</p>
                    <p className="text-ink-400">
                      # or use an OpenAI-compatible endpoint
                    </p>
                    <p>DOCUMIND_OPENAI_API_KEY=...</p>
                  </div>
                  <p className="mt-1.5 text-[8px] leading-4 text-ink-300">
                    Provider selection uses Ollama when reachable, otherwise the
                    configured external endpoint, then the extractive fallback.
                    Restart the backend after changing environment variables.
                  </p>
                </div>
              </div>
            </section>
          </div>

          <div className="space-y-3 lg:sticky lg:top-5 lg:self-start">
            <section className="rounded-2xl border border-ink-100 bg-surface p-4 shadow-[0_1px_2px_rgba(16,21,40,0.03)]">
              <div className="flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-1.5 text-[10.5px] font-semibold text-ink-900">
                  <Server className="h-3.5 w-3.5 text-ink-400" aria-hidden="true" />
                  Engine status
                </h2>
                <button
                  type="button"
                  onClick={() => void refreshHealth()}
                  disabled={healthLoading}
                  className="focus-ring inline-flex items-center gap-1 rounded-md border border-ink-100 bg-surface px-1.5 py-1 text-[8.5px] font-medium text-ink-500 transition hover:bg-ink-50 hover:text-ink-800 disabled:opacity-50"
                >
                  {healthLoading ? (
                    <Loader2 className="h-2.5 w-2.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <RefreshCw className="h-2.5 w-2.5" aria-hidden="true" />
                  )}
                  Test
                </button>
              </div>

              <div className="mt-2 divide-y divide-ink-50">
                <StatusRow
                  label="Backend"
                  value={online ? "Online" : healthLoading ? "Checking…" : "Offline"}
                  tone={online ? "good" : "bad"}
                  detail={API_BASE}
                />
                <StatusRow
                  label="Embedding index"
                  value={
                    health?.embedding.ready
                      ? "Ready"
                      : healthLoading
                        ? "Loading…"
                        : "Unavailable"
                  }
                  tone={health?.embedding.ready ? "good" : "bad"}
                  detail={
                    health
                      ? `${health.counts.chunks} chunks · ${health.counts.index_vectors} vectors`
                      : undefined
                  }
                />
                <StatusRow
                  label="Answer engine"
                  value={llmStatusLabel(health?.llm ?? null)}
                  tone={llmStatusTone(health?.llm ?? null)}
                  detail={health?.llm.model}
                />
                <StatusRow
                  label="Ollama API"
                  value={
                    ollamaConnected === true
                      ? "Connected"
                      : ollamaConnected === false
                        ? "Unavailable"
                        : "Not used"
                  }
                  tone={
                    ollamaConnected === true
                      ? "good"
                      : ollamaConnected === false
                        ? "bad"
                        : "default"
                  }
                  detail={health?.llm.ollama_base_url ?? undefined}
                />
                <StatusRow
                  label="Ollama model"
                  value={
                    modelAvailable === true
                      ? "Available"
                      : modelAvailable === false
                        ? "Missing"
                        : ollamaModel
                  }
                  tone={
                    modelAvailable === true
                      ? "good"
                      : modelAvailable === false
                        ? "bad"
                        : "default"
                  }
                  detail={ollamaModel}
                />
                <StatusRow
                  label="Generation"
                  value={health?.llm.generation_active ? "Active" : "Fallback"}
                  tone={health?.llm.generation_active ? "good" : "warn"}
                  detail={health?.llm.active_provider}
                />
                <StatusRow
                  label="Documents"
                  value={String(health?.counts.documents ?? 0)}
                  detail={online ? "Stored locally" : undefined}
                />
              </div>

              {healthError && (
                <div className="mt-2 rounded-lg border border-red-100 bg-red-50/60 p-2.5">
                  <p className="flex items-start gap-1.5 text-[8.5px] leading-4 text-red-700">
                    <AlertCircle
                      className="mt-0.5 h-2.5 w-2.5 shrink-0"
                      aria-hidden="true"
                    />
                    {healthError}
                  </p>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-ink-100 bg-surface p-4 shadow-[0_1px_2px_rgba(16,21,40,0.03)]">
              <h2 className="flex items-center gap-1.5 text-[10.5px] font-semibold text-ink-900">
                <Cpu className="h-3.5 w-3.5 text-ink-400" aria-hidden="true" />
                Embedding model
              </h2>
              <div className="mt-2 divide-y divide-ink-50">
                <StatusRow
                  label="Model"
                  value={health?.embedding.model ?? "Not loaded"}
                  detail={
                    health?.embedding.model
                      ? health.embedding.model.split("/").pop()
                      : undefined
                  }
                />
                <StatusRow
                  label="Dimension"
                  value={
                    health?.embedding.dimension
                      ? `${health.embedding.dimension}`
                      : "—"
                  }
                />
                <StatusRow
                  label="Device"
                  value={health?.embedding.device ?? "—"}
                />
                <StatusRow
                  label="State"
                  value={health?.embedding.ready ? "Ready" : "Unavailable"}
                  tone={health?.embedding.ready ? "good" : "bad"}
                />
              </div>
              <p className="mt-2 text-[8px] leading-4 text-ink-300">
                Sentence-transformers runs locally on CPU. Embeddings are
                generated during upload and stored in the backend index.
              </p>
            </section>

            <section className="rounded-2xl border border-ink-100 bg-surface p-4 shadow-[0_1px_2px_rgba(16,21,40,0.03)]">
              <h2 className="flex items-center gap-1.5 text-[10.5px] font-semibold text-ink-900">
                <ShieldCheck
                  className="h-3.5 w-3.5 text-ink-400"
                  aria-hidden="true"
                />
                Data & privacy
              </h2>
              <div className="mt-2 space-y-2 text-[8.5px] leading-4 text-ink-400">
                <p className="flex items-start gap-1.5">
                  <HardDrive
                    className="mt-0.5 h-2.5 w-2.5 shrink-0"
                    aria-hidden="true"
                  />
                  Uploaded files, chunks, and vectors persist in{" "}
                  <code className="rounded bg-ink-50 px-1 font-mono text-ink-600">
                    backend/data
                  </code>
                  . This demo has no authentication; do not expose the API
                  publicly.
                </p>
                <p className="flex items-start gap-1.5">
                  <Database
                    className="mt-0.5 h-2.5 w-2.5 shrink-0"
                    aria-hidden="true"
                  />
                  Chat history is kept in this browser tab only and is cleared
                  when the tab closes. Retrieval settings are saved in local
                  storage.
                </p>
              </div>
              <Link
                to="/workspace/documents"
                className="focus-ring mt-3 flex items-center justify-between rounded-lg border border-ink-100 bg-ink-50/40 px-2.5 py-2 text-[9px] font-medium text-ink-600 transition hover:border-ink-200 hover:bg-surface-raised hover:text-ink-900"
              >
                <span className="inline-flex items-center gap-1.5">
                  <Layers className="h-3 w-3" aria-hidden="true" />
                  Manage stored documents
                </span>
                <ChevronRight className="h-3 w-3" aria-hidden="true" />
              </Link>
            </section>

            <div className="flex items-center justify-between px-1 text-[8px] text-ink-300">
              <span>DocuMind AI v{health?.version ?? "1.0.0"}</span>
              <span>Local build</span>
            </div>
          </div>
        </div>
      </div>

      <Dialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Reset retrieval defaults?"
        description="Chunk size, overlap, top-K, and relative cutoff will return to their defaults. This does not re-index existing documents."
        footer={
          <>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setResetOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              icon={<RotateCcw className="h-3.5 w-3.5" />}
              onClick={handleReset}
            >
              Reset defaults
            </Button>
          </>
        }
      >
        <div className="rounded-lg border border-ink-100 bg-ink-50/50 px-3 py-2.5 text-[10px] leading-5 text-ink-500">
          Defaults: chunk size 800, overlap 120, top-K 5, relative cutoff 20%.
        </div>
      </Dialog>

      {notice && (
        <div
          role="status"
          className="fixed bottom-4 right-4 z-[75] flex items-center gap-2 rounded-xl border border-emerald-200 bg-surface px-3.5 py-2.5 text-[10px] font-medium text-emerald-800 shadow-lift animate-fade-up"
        >
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
          {notice}
        </div>
      )}
    </div>
  );
}
