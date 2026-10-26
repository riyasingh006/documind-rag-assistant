import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, Menu, X } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

const links = [
  { label: "Home", href: "/#home", id: "home" },
  { label: "Features", href: "/#features", id: "features" },
  { label: "How It Works", href: "/#how-it-works", id: "how-it-works" },
  { label: "About", href: "/#about", id: "about" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("home");
  const location = useLocation();
  const onLanding = location.pathname === "/";

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 12);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = original;
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  useEffect(() => {
    if (!onLanding) {
      setActive("");
      return;
    }

    let frame = 0;
    const updateActive = () => {
      frame = 0;
      const marker = window.scrollY + 160;
      let current = "home";
      for (const link of links) {
        const element = document.getElementById(link.id);
        if (element && element.offsetTop <= marker) {
          current = link.id;
        }
      }
      setActive(current);
    };

    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(updateActive);
    };

    updateActive();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [onLanding]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300 ease-premium",
        scrolled || open
          ? "border-b border-brand-200/35 glass shadow-[0_20px_50px_-30px_rgba(0,0,0,0.9)]"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <nav
        className="container-page flex h-[68px] items-center justify-between gap-4"
        aria-label="Main navigation"
      >
        <Logo />

        <div className="hidden items-center gap-1 rounded-full border border-transparent lg:flex">
          {links.map((link) => {
            const isActive = onLanding && active === link.id;
            return (
              <Link
                key={link.href}
                to={link.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "focus-ring group relative rounded-full px-3.5 py-2 text-[13.5px] font-medium transition-colors",
                  isActive
                    ? "text-ink-950"
                    : "text-ink-500 hover:text-ink-900",
                )}
              >
                {link.label}
                <span
                  className={cn(
                    "absolute inset-x-3.5 -bottom-0.5 h-px origin-left bg-brand-500 transition-transform duration-300 ease-premium",
                    isActive
                      ? "scale-x-100"
                      : "scale-x-0 group-hover:scale-x-100",
                  )}
                  aria-hidden="true"
                />
              </Link>
            );
          })}
        </div>

        <div className="hidden items-center gap-2.5 sm:flex">
          <Button variant="ghost" size="sm" to="/workspace" className="px-3">
            Workspace
          </Button>
          <Button
            size="sm"
            to="/workspace"
            iconRight={
              <ArrowRight
                className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            }
            className="group"
          >
            Get Started
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="mobile-navigation"
          aria-label={open ? "Close navigation menu" : "Open navigation menu"}
          className="focus-ring flex h-10 w-10 items-center justify-center rounded-xl border border-ink-200 bg-surface/80 text-ink-700 transition hover:bg-surface-raised sm:hidden"
        >
          {open ? (
            <X className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Menu className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      </nav>

      <nav
        id="mobile-navigation"
        aria-label="Mobile navigation"
        className={cn(
          "overflow-hidden border-t border-ink-100 bg-[#08060f]/95 backdrop-blur-2xl transition-all duration-300 ease-premium sm:hidden",
          open ? "max-h-[420px] opacity-100" : "max-h-0 opacity-0",
        )}
        aria-hidden={!open}
      >
        <div className="container-page flex flex-col gap-1 py-4">
          {links.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              onClick={() => setOpen(false)}
              className="focus-ring rounded-xl px-3 py-2.5 text-[15px] font-medium text-ink-700 transition hover:bg-surface-raised hover:text-ink-950"
              tabIndex={open ? undefined : -1}
            >
              {link.label}
            </Link>
          ))}
          <div className="my-2 h-px bg-ink-100" />
          <Button
            to="/workspace"
            fullWidth
            onClick={() => setOpen(false)}
            tabIndex={open ? undefined : -1}
            iconRight={<ArrowRight className="h-4 w-4" aria-hidden="true" />}
          >
            Get Started Free
          </Button>
          <p className="px-1 pt-2 text-center text-xs text-ink-400">
            No account required for the local workspace.
          </p>
        </div>
      </nav>
    </header>
  );
}
