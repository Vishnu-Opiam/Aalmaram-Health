import { AppLink } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "quiet";

/**
 * Button classes. Colours come from the ground (.pk-paper / .pk-night), so
 * "primary" is ink-on-paper on paper and brass-on-night on night or a photo.
 * Primary and secondary are 56px tall, quiet (a text link) 48px. Fully round.
 */
export function buttonClass(variant: ButtonVariant = "primary", className?: string) {
  return cn(
    "inline-flex items-center justify-center gap-2 text-[17px] font-medium leading-tight transition-[background-color,border-color,color,text-decoration-color] duration-200 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
    variant === "primary" &&
      "min-h-14 rounded-full bg-(--pk-primary-bg) px-7 text-(--pk-primary-fg) hover:bg-(--pk-primary-hover)",
    variant === "secondary" &&
      "min-h-14 rounded-full border-2 border-(--pk-fg) px-7 text-(--pk-fg) hover:bg-(--pk-fg)/8",
    variant === "quiet" &&
      "min-h-12 px-1 text-(--pk-fg) underline decoration-(--pk-fg)/35 decoration-1 underline-offset-[6px] hover:decoration-(--pk-fg)",
    className,
  );
}

/** A <button> in the portal's language (type="button" unless given). */
export function Button({
  variant = "primary",
  className,
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button type={type} className={buttonClass(variant, className)} {...props} />;
}

/** A link that looks like a button (AppLink: no prefetch). */
export function ButtonLink({
  variant = "primary",
  className,
  ...props
}: React.ComponentProps<typeof AppLink> & { variant?: ButtonVariant }) {
  return <AppLink className={buttonClass(variant, className)} {...props} />;
}
