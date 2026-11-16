import { ChevronLeft, ChevronRight } from "lucide-react";
import { AppLink } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { buttonClass } from "./button";
import { ModuleDot, type Kind } from "./module";

/**
 * A filter chip, 56px: a toggle button (aria-pressed) with an optional module
 * dot and count — "● Wellness 6". Pressed fills with the ground's ink.
 */
export function Chip({
  pressed,
  kind,
  count,
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { pressed: boolean; kind?: Kind; count?: number }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={cn(
        "inline-flex min-h-14 shrink-0 items-center gap-2.5 whitespace-nowrap rounded-full border-2 px-5 text-[17px] font-medium transition-colors duration-200",
        pressed
          ? "border-(--pk-fg) bg-(--pk-fg) text-(--pk-primary-fg)"
          : "border-(--pk-muted)/70 text-(--pk-fg) hover:border-(--pk-fg)",
        className,
      )}
      {...props}
    >
      {kind ? <ModuleDot kind={kind} label={children} /> : children}
      {count !== undefined && <span className={cn("tabular-nums", pressed ? "opacity-75" : "text-(--pk-muted)")}>{count}</span>}
    </button>
  );
}

export type Step = { label: string; href?: string; onClick?: () => void; disabled?: boolean };

function StepControl({ step, dir, compact }: { step: Step; dir: "prev" | "next"; compact?: boolean }) {
  const Icon = dir === "prev" ? ChevronLeft : ChevronRight;
  const className = buttonClass("secondary", compact ? "h-12 min-h-12 w-12 px-0" : dir === "prev" ? "pl-4 pr-6" : "pl-6 pr-4");
  const body = (
    <>
      {dir === "prev" && <Icon className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />}
      {compact ? <span className="sr-only">{step.label}</span> : step.label}
      {dir === "next" && <Icon className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />}
    </>
  );
  if (step.disabled) return <span aria-disabled="true" className={className}>{body}</span>;
  if (step.href)
    return (
      <AppLink href={step.href} scroll={false} className={className}>
        {body}
      </AppLink>
    );
  return (
    <button type="button" onClick={step.onClick} className={className}>
      {body}
    </button>
  );
}

/**
 * ‹ Previous · [middle] · Next ›: the buttons that go with anything that can
 * be swiped or stepped. Steps are links (URL state, so Back works) or
 * buttons. `compact` makes them 48px squares with the words for screen
 * readers only (the sticky day bar).
 */
export function Stepper({
  prev,
  next,
  children,
  compact,
  className,
}: {
  prev: Step;
  next: Step;
  children?: React.ReactNode;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <StepControl step={prev} dir="prev" compact={compact} />
      {children && <div className="min-w-0 flex-1 text-center">{children}</div>}
      <StepControl step={next} dir="next" compact={compact} />
    </div>
  );
}

/**
 * A bottom action bar (price + "Review and confirm", "Add to my trip"). On
 * phones it is fixed just above the tab bar and leaves a spacer in the page
 * so nothing is covered; from md it sticks to the bottom of its column
 * (`variant="bar"`) or to the top of a side column (`variant="side"`).
 */
export function StickyBar({
  children,
  variant = "bar",
  className,
}: {
  children: React.ReactNode;
  variant?: "bar" | "side";
  className?: string;
}) {
  return (
    <>
      <div aria-hidden="true" className="h-24 md:hidden" />
      <div
        className={cn(
          "pk-paper fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-30 border-t border-paper-line px-4 py-3 shadow-float min-[390px]:px-5",
          variant === "bar"
            ? "md:sticky md:inset-x-auto md:bottom-6 md:mt-10 md:rounded-[6px] md:border md:bg-paper-raised md:px-6 md:py-4"
            : "md:sticky md:inset-x-auto md:top-24 md:bottom-auto md:border-0 md:bg-transparent md:p-0 md:shadow-none",
          className,
        )}
      >
        <div className={cn("flex items-center justify-between gap-4", variant === "side" && "md:flex-col md:items-stretch")}>{children}</div>
      </div>
    </>
  );
}
