import { cn } from "@/lib/utils";

/**
 * A section's heading: optional small label above, the title in Gambarino,
 * one optional line under it and an optional action on the right (wraps
 * under on phones). No boxes: space does the structuring.
 */
export function SectionHeading({
  id,
  title,
  label,
  lead,
  action,
  as: Tag = "h2",
  size = "h2",
  className,
}: {
  id?: string;
  title: React.ReactNode;
  label?: React.ReactNode;
  lead?: React.ReactNode;
  action?: React.ReactNode;
  as?: "h1" | "h2" | "h3";
  size?: "h1" | "h2";
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-x-10 gap-y-5", className)}>
      <div className="min-w-0 max-w-[46rem]">
        {label && <p className="pk-label mb-3">{label}</p>}
        <Tag id={id} className={size === "h1" ? "pk-h1" : "pk-h2"}>
          {title}
        </Tag>
        {lead && <p className="pk-body mt-4 text-(--pk-muted)">{lead}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
