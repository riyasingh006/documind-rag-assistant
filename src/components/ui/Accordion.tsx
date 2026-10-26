import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

export interface AccordionItem {
  id: string;
  question: string;
  answer: React.ReactNode;
}

export function Accordion({
  items,
  className,
  defaultOpen,
}: {
  items: AccordionItem[];
  className?: string;
  defaultOpen?: string;
}) {
  const [openId, setOpenId] = useState<string | null>(defaultOpen ?? null);

  return (
    <div className={cn("divide-y divide-ink-100", className)}>
      {items.map((item) => {
        const open = openId === item.id;
        return (
          <div key={item.id} className="py-1">
            <h3>
              <button
                type="button"
                id={`faq-trigger-${item.id}`}
                aria-expanded={open}
                aria-controls={`faq-panel-${item.id}`}
                onClick={() => setOpenId(open ? null : item.id)}
                className="focus-ring group flex w-full items-center justify-between gap-6 rounded-xl px-1 py-5 text-left transition-colors hover:text-brand-300 sm:px-2"
              >
                <span className="text-[15px] font-medium tracking-[-0.01em] text-ink-900 group-hover:text-brand-300 sm:text-base">
                  {item.question}
                </span>
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-ink-200 bg-surface text-ink-400 transition duration-300 ease-premium group-hover:border-brand-300/50 group-hover:text-brand-300",
                    open && "rotate-180 border-brand-300/50 bg-brand-50 text-brand-300",
                  )}
                >
                  <ChevronDown className="h-4 w-4" aria-hidden="true" />
                </span>
              </button>
            </h3>
            <div
              id={`faq-panel-${item.id}`}
              role="region"
              aria-labelledby={`faq-trigger-${item.id}`}
              className={cn(
                "grid transition-all duration-300 ease-premium",
                open
                  ? "grid-rows-[1fr] opacity-100"
                  : "grid-rows-[0fr] opacity-0",
              )}
              aria-hidden={!open}
            >
              <div className="overflow-hidden">
                <div className="px-1 pb-5 pr-10 text-[14px] leading-7 text-ink-600 sm:px-2">
                  {item.answer}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
