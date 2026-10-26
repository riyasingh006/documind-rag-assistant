import { cn } from "@/lib/cn";

interface SectionHeadingProps {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: "left" | "center";
  className?: string;
  headingId?: string;
  tone?: "light" | "dark";
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  className,
  headingId,
  tone = "light",
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4",
        align === "center" ? "items-center text-center" : "items-start text-left",
        className,
      )}
    >
      {eyebrow && (
        <span
          className={cn(
            "eyebrow",
            tone === "dark" && "border-white/15 bg-surface/5 text-brand-200",
          )}
        >
          <span className="h-1 w-1 rounded-full bg-brand-500" aria-hidden="true" />
          {eyebrow}
        </span>
      )}
      <h2
        id={headingId}
        className={cn(
          "max-w-3xl text-[2.05rem] font-semibold leading-[1.1] tracking-[-0.035em] sm:text-[2.55rem]",
          tone === "dark" ? "text-white" : "text-ink-950",
        )}
      >
        {title}
      </h2>
      {description && (
        <p
          className={cn(
            "max-w-2xl text-[15px] leading-7 sm:text-base",
            tone === "dark" ? "text-ink-300" : "text-ink-500",
          )}
        >
          {description}
        </p>
      )}
    </div>
  );
}
