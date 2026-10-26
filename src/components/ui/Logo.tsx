import { Link } from "react-router-dom";
import { cn } from "@/lib/cn";

interface LogoProps {
  className?: string;
  compact?: boolean;
  onDark?: boolean;
  to?: string;
}

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[11px] bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_10px_24px_-10px_rgba(192,38,211,0.9)]",
        className,
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" className="h-[62%] w-[62%]" fill="none">
        <path
          d="M7 3.75h6.2L17 7.55v12.7H7V3.75Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
          className="opacity-95"
        />
        <path
          d="M13 3.9v4h3.85"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
          className="opacity-95"
        />
        <path
          d="M9.4 11.2h5.2M9.4 14h3.6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          className="opacity-80"
        />
        <path
          d="m17.3 12.5.62 1.55 1.58.62-1.58.62-.62 1.56-.62-1.56-1.58-.62 1.58-.62.62-1.55Z"
          fill="currentColor"
        />
      </svg>
    </span>
  );
}

export function Logo({
  className,
  compact = false,
  onDark = false,
  to = "/",
}: LogoProps) {
  return (
    <Link
      to={to}
      aria-label="DocuMind AI — home"
      className={cn(
        "focus-ring group inline-flex items-center gap-2.5 rounded-lg",
        className,
      )}
    >
      <LogoMark className="h-9 w-9 transition-transform duration-300 ease-premium group-hover:-rotate-3 group-hover:scale-[1.04]" />
      {!compact && (
        <span
          className={cn(
            "text-[17px] font-semibold tracking-[-0.02em]",
            onDark ? "text-white" : "text-ink-950",
          )}
        >
          DocuMind
          <span
            className={cn(
              "ml-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em]",
              onDark
                ? "bg-white/10 text-brand-300"
                : "bg-brand-50 text-brand-300 ring-1 ring-brand-200/50",
            )}
          >
            AI
          </span>
        </span>
      )}
    </Link>
  );
}
