import { Drama, Leaf, Stethoscope } from "lucide-react";
import type { BuilderBlock } from "@/domain/trips/builder-view";
import { cn } from "@/lib/utils";
import { buttonClass } from "./kit/button";
import { MODULE, kindOf, type Kind } from "./kit/module";
import { StatusMark } from "./kit/status";

/**
 * Older portal helpers, kept so pages not yet rebuilt keep working. They now
 * draw in the kit's language (src/components/portal/kit); new code should use
 * the kit directly.
 */

type PillVariant = "primary" | "secondary" | "quiet" | "danger";

/** Button classes: the kit's buttonClass, plus the one danger style. */
export function pill(variant: PillVariant = "primary", className?: string) {
  if (variant === "danger") {
    return cn(
      "inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-danger-600 px-7 text-[17px] font-medium leading-tight text-white transition-colors hover:bg-danger-500 disabled:pointer-events-none disabled:opacity-50",
      className,
    );
  }
  return buttonClass(variant, className);
}

export { kindOf, type Kind };

/** Module words and (for older layouts) an icon. New code: ModuleDot. */
export const KIND = {
  health: { label: MODULE.health.label, Icon: Stethoscope, tile: "", ring: "" },
  wellness: { label: MODULE.wellness.label, Icon: Leaf, tile: "", ring: "" },
  culture: { label: MODULE.culture.label, Icon: Drama, tile: "", ring: "" },
} as const;

/** Was a pastel icon tile; now the module's 8px dot, in a box that keeps older rows aligned. */
export function KindIcon({ moduleName, size = "md" }: { moduleName: string; size?: "md" | "lg" }) {
  return (
    <span className={cn("inline-flex w-3 shrink-0 items-center justify-center", size === "lg" ? "h-14" : "h-11")} aria-hidden="true">
      <span className={cn("h-2 w-2 rounded-full", MODULE[kindOf(moduleName)].dot)} />
    </span>
  );
}

/** A block's status in words. New code: StatusMark. */
export function StatusPill({ block, className }: { block: Pick<BuilderBlock, "progress" | "addedBy">; className?: string }) {
  return <StatusMark progress={block.progress} addedBy={block.addedBy} className={className} />;
}

/** The wordmark, as on the public site: "Aalmaram" in Gambarino, set as text. */
export function PortalBrand({ className }: { className?: string }) {
  return <span className={cn("pk-wordmark", className)}>Aalmaram</span>;
}

/** "Arjun Nair (demo RM)" → "Arjun", for warm, short copy. */
export function firstName(name: string): string {
  return name.replace(/\s*\(.*\)\s*$/, "").split(/\s+/)[0] || name;
}
