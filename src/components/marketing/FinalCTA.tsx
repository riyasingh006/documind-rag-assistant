import { ArrowRight, Check, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";

export function FinalCTA() {
  return (
    <section className="relative py-16 sm:py-20 lg:py-24">
      <div className="container-page">
        <Reveal>
          <div className="relative overflow-hidden rounded-[28px] border border-brand-300/25 bg-[linear-gradient(120deg,#160b2b_0%,#24103f_46%,#32102f_100%)] px-6 py-14 shadow-lift sm:px-12 sm:py-16 lg:px-16 lg:py-20">
            <div
              className="pointer-events-none absolute inset-0 bg-grid opacity-[0.22] [mask-image:radial-gradient(ellipse_70%_80%_at_50%_30%,black,transparent)]"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute -left-24 top-0 h-96 w-96 animate-glow rounded-full bg-[radial-gradient(circle,rgba(124,58,237,0.46),transparent_65%)] blur-3xl"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute -right-24 bottom-0 h-96 w-96 animate-glow rounded-full bg-[radial-gradient(circle,rgba(236,72,153,0.34),transparent_65%)] blur-3xl [animation-delay:-3s]"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute right-8 top-8 hidden h-24 w-24 rounded-2xl border border-white/10 bg-surface/[0.03] lg:block"
              aria-hidden="true"
            >
              <div className="flex h-full flex-col items-center justify-center gap-2 text-brand-200/70">
                <Sparkles className="h-5 w-5" />
                <div className="space-y-1">
                  <span className="block h-0.5 w-8 rounded-full bg-surface/15" />
                  <span className="block h-0.5 w-5 rounded-full bg-surface/10" />
                </div>
              </div>
            </div>

            <div className="relative max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-surface/5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-200">
                <span className="h-1 w-1 rounded-full bg-brand-300" />
                Document intelligence, grounded
              </span>
              <h2 className="mt-5 text-[2.15rem] font-semibold leading-[1.08] tracking-[-0.04em] text-white sm:text-[2.8rem] lg:text-[3.1rem]">
                Your Documents Have
                <br className="hidden sm:block" /> More to Tell.
              </h2>
              <p className="mt-4 max-w-xl text-[14.5px] leading-7 text-ink-300">
                Start exploring your information with AI-powered document search
                and evidence-backed answers.
              </p>
              <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <Button
                  size="lg"
                  variant="light"
                  to="/workspace"
                  iconRight={
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  }
                >
                  Start Exploring
                </Button>
                <span className="inline-flex items-center gap-1.5 text-[11.5px] text-ink-400">
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  No account required for the local workspace
                </span>
              </div>

              <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-white/10 pt-6">
                {[
                  "Grounded answers",
                  "Validated citations",
                  "Gemini-powered retrieval",
                ].map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1.5 text-[10.5px] font-medium text-ink-400"
                  >
                    <ShieldCheck className="h-3.5 w-3.5 text-brand-300" />
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
