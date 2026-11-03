import { MIX_KEYS, type Mix, type MixKey } from "@/domain/site/mix";
import { cn } from "@/lib/utils";

/** Category colours and the split bar, shared by the server page and the "Your mix" widget. */
export const MIX_STYLE: Record<MixKey, { label: string; bar: string; tile: string; text: string }> = {
  health: { label: "Health", bar: "bg-lagoon-600", tile: "bg-lagoon-50 text-lagoon-700", text: "text-lagoon-700" },
  wellness: { label: "Wellness", bar: "bg-leaf-600", tile: "bg-leaf-50 text-leaf-700", text: "text-leaf-700" },
  culture: { label: "Culture", bar: "bg-laterite-600", tile: "bg-laterite-50 text-laterite-600", text: "text-laterite-600" },
};

export function MixBar({ mix, className }: { mix: Mix; className?: string }) {
  return (
    <div className={cn("flex h-3 overflow-hidden rounded-full bg-kasavu-200", className)} aria-hidden="true">
      {MIX_KEYS.map((k) => (
        <span key={k} className={cn("h-full", MIX_STYLE[k].bar)} style={{ flexGrow: mix[k] }} />
      ))}
    </div>
  );
}

export const describeMix = (mix: Mix) => MIX_KEYS.map((k) => `${mix[k]}% ${MIX_STYLE[k].label.toLowerCase()}`).join(", ");
