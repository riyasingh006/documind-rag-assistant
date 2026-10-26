import { cn } from "@/lib/cn";

type Tone = "brand" | "neutral" | "success" | "warning" | "danger" | "sky";

const tones: Record<Tone, string> = {
  brand: "border-brand-300/30 bg-brand-500/10 text-brand-300",
  neutral: "border-ink-200 bg-surface text-ink-500",
  success: "border-emerald-400/25 bg-emerald-500/10 text-emerald-700",
  warning: "border-amber-400/25 bg-amber-500/10 text-amber-700",
  danger: "border-red-400/25 bg-red-500/10 text-red-700",
  sky: "border-sky-400/25 bg-sky-500/10 text-sky-700",
};

export function Badge({
  children,
  tone = "neutral",
  className,
  dot = false,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-[0.01em]",
        tones[tone],
        className,
      )}
    >
      {dot && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            tone === "success" && "bg-emerald-500",
            tone === "warning" && "bg-amber-500",
            tone === "danger" && "bg-red-500",
            tone === "brand" && "bg-brand-500",
            tone === "sky" && "bg-sky-500",
            tone === "neutral" && "bg-ink-400",
          )}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}
