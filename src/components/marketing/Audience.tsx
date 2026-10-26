import {
  BriefcaseBusiness,
  FlaskConical,
  GraduationCap,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";

const audiences = [
  {
    icon: GraduationCap,
    title: "Students",
    description:
      "Understand notes, assignments, and study materials by asking questions across your course readings.",
    examples: "Lecture notes · Reading packs · Assignments",
    color: "text-brand-300 bg-brand-50 border-brand-100",
  },
  {
    icon: FlaskConical,
    title: "Researchers",
    description:
      "Explore reports and research documents, then jump straight to the passages that support each answer.",
    examples: "Papers · Evaluation reports · Literature reviews",
    color: "text-sky-600 bg-sky-50 border-sky-100",
  },
  {
    icon: BriefcaseBusiness,
    title: "Professionals",
    description:
      "Extract information from business documents such as briefs, policies, and project documentation.",
    examples: "Briefs · Policies · Specifications",
    color: "text-emerald-600 bg-emerald-50 border-emerald-100",
  },
  {
    icon: Users,
    title: "Teams",
    description:
      "A natural fit for shared knowledge collections. Team accounts, roles, and access control are not part of this build yet.",
    examples: "Shared collections · Access control",
    color: "text-amber-700 bg-amber-50 border-amber-100",
    badge: "Planned",
  },
];

export function Audience() {
  return (
    <section className="relative overflow-hidden border-y border-brand-200/25 bg-[#0c0716]/70 py-20 sm:py-24 lg:py-28">
      <div
        className="pointer-events-none absolute inset-0 -z-0 bg-grid opacity-40 [mask-image:radial-gradient(ellipse_55%_60%_at_50%_50%,black,transparent)]"
        aria-hidden="true"
      />
      <div className="container-page relative">
        <Reveal>
          <SectionHeading
            eyebrow="Who it's for"
            title="Built for People Who Work With Documents"
            description="One focused workspace for reading, searching, and understanding your own knowledge base."
          />
        </Reveal>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {audiences.map((audience, index) => (
            <Reveal key={audience.title} delay={index * 70} as="article">
              <div className="group flex h-full flex-col rounded-2xl border border-ink-100 bg-surface/80 p-5 backdrop-blur-sm transition duration-300 ease-premium hover:-translate-y-1 hover:border-brand-200/70 hover:bg-surface-raised hover:shadow-card">
                <div className="flex items-start justify-between">
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-xl border ${audience.color}`}
                  >
                    <audience.icon className="h-[18px] w-[18px]" aria-hidden="true" />
                  </span>
                  {audience.badge && (
                    <Badge tone="warning" className="text-[9px]">
                      {audience.badge}
                    </Badge>
                  )}
                </div>
                <h3 className="mt-4 text-[15px] font-semibold tracking-[-0.015em] text-ink-950">
                  {audience.title}
                </h3>
                <p className="mt-2 flex-1 text-[12.5px] leading-[1.7] text-ink-500">
                  {audience.description}
                </p>
                <p className="mt-4 border-t border-ink-100 pt-3 text-[9.5px] font-medium leading-4 text-ink-400">
                  {audience.examples}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
