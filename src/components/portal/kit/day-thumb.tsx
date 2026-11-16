import { Check } from "lucide-react";
import { AppLink } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { Photo, type PhotoSource } from "./photo";

const STATE_WORDS = { free: "free", planned: "planned", booked: "booked" } as const;

/**
 * A 72px day in a thumbnail rail: the day's photo with its number on a scrim,
 * or a paper square with the number for a free day. A green check marks a
 * booked day, a small dot a planned one. The current day is outlined in brass
 * (and aria-current). A link (`href`, for `?day=`), a button (`onClick`, from
 * client code) or plain.
 */
export function DayThumb({
  day,
  dateLabel,
  photo,
  state,
  current,
  href,
  onClick,
  className,
}: {
  day: number;
  /** "Fri 18 Dec", for the accessible name. */
  dateLabel: string;
  photo?: PhotoSource | null;
  state: "free" | "planned" | "booked";
  current?: boolean;
  href?: string;
  onClick?: () => void;
  className?: string;
}) {
  const withPhoto = Boolean(photo) && state !== "free";
  const body = (
    <>
      {withPhoto ? (
        <Photo photo={photo} ratio="1/1" sizes="72px" scrim="bottom" overlayClassName="items-end p-2">
          <span className="pk-numeral text-[28px]">{day}</span>
        </Photo>
      ) : (
        <span className="flex aspect-square items-end border border-paper-line bg-paper-raised p-2 text-mist-ink">
          <span className="pk-numeral text-[28px]">{day}</span>
        </span>
      )}
      {state === "booked" && (
        <span className="absolute right-1.5 top-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-success-600 text-white" aria-hidden="true">
          <Check className="h-3 w-3" strokeWidth={3} />
        </span>
      )}
      {state === "planned" && (
        <span className={cn("absolute right-2 top-2 h-2 w-2 rounded-full", withPhoto ? "bg-night-ink" : "bg-mist-ink")} aria-hidden="true" />
      )}
      <span className="sr-only">
        Day {day}, {dateLabel}, {STATE_WORDS[state]}
      </span>
    </>
  );
  const cls = cn(
    "relative block w-18 shrink-0",
    current && "ring-3 ring-gold-700 ring-offset-3 ring-offset-paper",
    className,
  );
  if (href)
    return (
      <AppLink href={href} scroll={false} aria-current={current ? "true" : undefined} className={cls}>
        {body}
      </AppLink>
    );
  if (onClick)
    return (
      <button type="button" onClick={onClick} aria-current={current ? "true" : undefined} className={cls}>
        {body}
      </button>
    );
  return <span className={cls}>{body}</span>;
}
