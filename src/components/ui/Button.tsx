import { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/cn";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "dark"
  | "light"
  | "danger";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  to?: string;
  href?: string;
  onClick?: React.MouseEventHandler<HTMLElement>;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  ariaLabel?: string;
  title?: string;
  fullWidth?: boolean;
  tabIndex?: number;
}

const variants: Record<ButtonVariant, string> = {
  primary:
    "border border-white/10 bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_14px_30px_-14px_rgba(168,85,247,0.85)] hover:brightness-110 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_18px_38px_-14px_rgba(236,72,153,0.62)]",
  secondary:
    "border border-ink-200/80 bg-surface text-ink-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_10px_26px_-22px_rgba(0,0,0,0.9)] hover:border-brand-300/55 hover:bg-surface-raised",
  ghost: "text-ink-500 hover:bg-brand-50/70 hover:text-ink-900",
  dark: "border border-white/10 bg-white/[0.06] text-ink-900 backdrop-blur-md hover:bg-white/[0.1]",
  light:
    "bg-white text-[#160b26] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_12px_30px_-16px_rgba(0,0,0,0.55)] hover:bg-brand-100",
  danger:
    "border border-red-500/20 bg-red-600 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_12px_26px_-14px_rgba(244,63,94,0.7)] hover:bg-red-500",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 gap-1.5 rounded-lg px-3.5 text-[13px]",
  md: "h-11 gap-2 rounded-xl px-5 text-sm",
  lg: "h-12 gap-2 rounded-xl px-6 text-[15px]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      children,
      variant = "primary",
      size = "md",
      className,
      loading = false,
      icon,
      iconRight,
      to,
      href,
      onClick,
      disabled,
      type = "button",
      ariaLabel,
      title,
      fullWidth,
      tabIndex,
    },
    ref,
  ) {
    const classes = cn(
      "focus-ring inline-flex select-none items-center justify-center font-medium transition duration-200 ease-premium",
      "disabled:pointer-events-none disabled:opacity-55",
      variant !== "ghost" && "hover:-translate-y-0.5 active:translate-y-0",
      variants[variant],
      sizes[size],
      fullWidth && "w-full",
      className,
    );

    const content = (
      <>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          icon
        )}
        <span>{children}</span>
        {iconRight}
      </>
    );

    if (to) {
      return (
        <Link
          to={to}
          className={classes}
          onClick={onClick}
          aria-label={ariaLabel}
          title={title}
          aria-disabled={disabled}
          tabIndex={tabIndex ?? (disabled ? -1 : undefined)}
        >
          {content}
        </Link>
      );
    }

    if (href) {
      return (
        <a
          href={href}
          className={classes}
          onClick={onClick}
          aria-label={ariaLabel}
          title={title}
          tabIndex={tabIndex}
        >
          {content}
        </a>
      );
    }

    return (
      <button
        ref={ref}
        type={type}
        className={classes}
        onClick={onClick}
        disabled={disabled || loading}
        aria-label={ariaLabel}
        title={title}
        aria-busy={loading || undefined}
        tabIndex={tabIndex}
      >
        {content}
      </button>
    );
  },
);
