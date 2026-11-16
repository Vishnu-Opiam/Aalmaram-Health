import { cn } from "@/lib/utils";

const SIZE = {
  hero: { numeral: "pk-numeral-hero", label: "text-[18px] md:text-[24px] mt-3" },
  day: { numeral: "pk-numeral-day", label: "text-[19px] md:text-[22px] mt-2" },
  stat: { numeral: "pk-numeral-stat", label: "text-[15px] md:text-[16px] mt-2.5 font-medium" },
  sm: { numeral: "pk-numeral-sm", label: "text-[15px] mt-1.5 font-medium" },
} as const;

/**
 * A display numeral in Gambarino with a small label under it ("32" / "days to
 * go"). The real number is readable at once: `settle` only lets it rise out of
 * a line mask on first paint (once per session), it never counts up.
 */
export function BigNumeral({
  value,
  label,
  size = "stat",
  align = "start",
  settle,
  delay,
  className,
}: {
  value: React.ReactNode;
  label?: React.ReactNode;
  size?: keyof typeof SIZE;
  align?: "start" | "end";
  settle?: boolean;
  /** Settle delay in ms (default 250, to follow the hero shutter); stagger pass numerals by 60. */
  delay?: number;
  className?: string;
}) {
  const s = SIZE[size];
  return (
    <span className={cn("flex flex-col", align === "end" ? "items-end text-right" : "items-start", className)}>
      <span
        className={cn("pk-numeral whitespace-nowrap", s.numeral, settle && "pk-settle")}
        style={delay === undefined ? undefined : ({ "--pk-delay": `${delay}ms` } as React.CSSProperties)}
      >
        <span>{value}</span>
      </span>
      {label && <span className={cn("leading-snug", s.label, size !== "hero" && size !== "day" && "text-(--pk-muted)")}>{label}</span>}
    </span>
  );
}
