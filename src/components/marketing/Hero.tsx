import { Link } from "react-router-dom";
import {
  ArrowRight,
  BriefcaseBusiness,
  Check,
  FlaskConical,
  GraduationCap,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { HeroPreview } from "./HeroPreview";

const audiences = [
  { icon: GraduationCap, label: "Students" },
  { icon: FlaskConical, label: "Researchers" },
  { icon: BriefcaseBusiness, label: "Professionals" },
  { icon: Users, label: "Knowledge workers" },
];

const proofPoints = ["PDF & TXT", "Gemini-powered retrieval", "Inspectable sources"];

export function Hero() {
  return (
    <section
      id="home"
      className="relative overflow-hidden pb-20 pt-28 sm:pb-24 sm:pt-32 lg:pb-28 lg:pt-40"
    >
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-grid mask-radial opacity-60"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -left-40 top-0 -z-10 h-[620px] w-[620px] animate-aurora rounded-full bg-[radial-gradient(circle,rgba(124,58,237,0.24),transparent_66%)] blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-32 top-24 -z-10 h-[560px] w-[560px] animate-aurora rounded-full bg-[radial-gradient(circle,rgba(236,72,153,0.17),transparent_66%)] blur-3xl [animation-delay:-6s]"
        aria-hidden="true"
      />

      <div className="container-page grid items-center gap-14 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16 xl:gap-20">
        <div className="max-w-[620px]">
          <Reveal>
            <span className="eyebrow">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-500" />
              </span>
              AI-Powered Document Intelligence
            </span>
          </Reveal>

          <Reveal delay={70}>
            <h1 className="mt-6 text-[2.65rem] font-semibold leading-[1.04] tracking-[-0.045em] text-ink-950 sm:text-[3.4rem] lg:text-[3.75rem] xl:text-[4.15rem]">
              Your Documents.
              <br />
              <span className="text-gradient">Your Knowledge.</span>
              <br />
              One Intelligent AI.
            </h1>
          </Reveal>

          <Reveal delay={130}>
            <p className="mt-6 max-w-[540px] text-[15.5px] leading-[1.75] text-ink-500 sm:text-[16.5px]">
              Stop searching through endless pages. Upload your documents, ask
              questions in natural language, and discover answers grounded in
              your own information.
            </p>
          </Reveal>

          <Reveal delay={190}>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                size="lg"
                to="/workspace"
                iconRight={
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                }
                className="group"
              >
                Get Started Free
              </Button>
              <Link
                to="/#features"
                className="focus-ring inline-flex h-12 items-center justify-center gap-2 rounded-xl px-5 text-[15px] font-medium text-ink-600 transition-colors hover:bg-surface-raised/70 hover:text-ink-900"
              >
                Explore Features
                <span aria-hidden="true" className="text-ink-300">
                  ↓
                </span>
              </Link>
            </div>
          </Reveal>

          <Reveal delay={250}>
            <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-3">
              <div className="flex -space-x-1.5" aria-hidden="true">
                {audiences.map((audience) => (
                  <span
                    key={audience.label}
                    title={audience.label}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-brand-200/60 bg-surface text-ink-400 shadow-[0_4px_14px_rgba(0,0,0,0.35)]"
                  >
                    <audience.icon className="h-3.5 w-3.5" />
                  </span>
                ))}
              </div>
              <p className="text-[12.5px] leading-5 text-ink-400">
                Built for students, researchers, professionals, and knowledge
                workers.
              </p>
            </div>
          </Reveal>

          <Reveal delay={300}>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
              {proofPoints.map((point) => (
                <span
                  key={point}
                  className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-ink-400"
                >
                  <Check className="h-3 w-3 text-brand-500" aria-hidden="true" />
                  {point}
                </span>
              ))}
            </div>
          </Reveal>
        </div>

        <Reveal delay={160} className="relative">
          <HeroPreview />
        </Reveal>
      </div>

      <div className="container-page mt-20 lg:mt-24">
        <Reveal>
          <div className="flex flex-col items-start justify-between gap-6 rounded-2xl border border-brand-200/35 bg-surface/55 px-5 py-5 shadow-soft backdrop-blur-xl sm:flex-row sm:items-center sm:px-7">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-300">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-[13px] font-semibold text-ink-800">
                  A complete document intelligence workflow
                </p>
                <p className="text-[12px] text-ink-400">
                  From ingestion to evidence-backed answers — in one focused
                  workspace.
                </p>
              </div>
            </div>
            <Link
              to="/#how-it-works"
              className="focus-ring group inline-flex items-center gap-1.5 rounded-lg text-[12.5px] font-semibold text-brand-300 transition hover:text-brand-300"
            >
              See how it works
              <ArrowRight
                className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
