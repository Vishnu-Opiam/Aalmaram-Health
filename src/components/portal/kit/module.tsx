import { cn } from "@/lib/utils";

export type Kind = "health" | "wellness" | "culture";

/** Module name from the catalogue ("Health & Medical", "Wellness & Spa", …) → kind. */
export const kindOf = (moduleName: string): Kind =>
  /health|medical/i.test(moduleName) ? "health" : /wellness|spa/i.test(moduleName) ? "wellness" : "culture";

/** Lagoon, leaf, laterite: on paper the -600 shades; on night, lighter tints that still read. */
export const MODULE = {
  health: { label: "Health", dot: "bg-lagoon-600 in-[.pk-night,.pk-on-photo]:bg-[#7cb9c1]" },
  wellness: { label: "Wellness", dot: "bg-leaf-600 in-[.pk-night,.pk-on-photo]:bg-[#9cc77f]" },
  culture: { label: "Culture", dot: "bg-laterite-600 in-[.pk-night,.pk-on-photo]:bg-[#e3906f]" },
} as const;

/** Module identity: an 8px dot plus the word ("● Wellness"), never a glyph or a tinted tile. */
export function ModuleDot({
  kind,
  moduleName,
  label,
  className,
}: {
  kind?: Kind;
  moduleName?: string;
  /** Defaults to the module's word; pass "" for the dot alone (then give it words nearby). */
  label?: React.ReactNode;
  className?: string;
}) {
  const m = MODULE[kind ?? kindOf(moduleName ?? "")];
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className={cn("h-2 w-2 shrink-0 rounded-full", m.dot)} aria-hidden="true" />
      {label ?? m.label}
    </span>
  );
}
