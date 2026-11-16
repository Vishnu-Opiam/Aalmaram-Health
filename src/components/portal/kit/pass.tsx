import { cn } from "@/lib/utils";

type StubAt = "responsive" | "right" | "bottom";

// Per position: the main part's corners and notches, the stub's, and which perforation shows.
const LAYOUT: Record<StubAt, { row: string; main: string; stub: string; mainCut: string; stubCut: string; x: string; y: string }> = {
  responsive: {
    row: "flex flex-col md:flex-row",
    main: "rounded-t-[6px] md:rounded-l-[6px] md:rounded-tr-none",
    stub: "rounded-b-[6px] md:rounded-r-[6px] md:rounded-bl-none md:w-56 md:shrink-0",
    mainCut: "notch-b md:notch-r",
    stubCut: "notch-t md:notch-l",
    x: "md:hidden",
    y: "hidden md:block",
  },
  right: {
    row: "flex flex-row",
    main: "rounded-l-[6px]",
    stub: "rounded-r-[6px] shrink-0",
    mainCut: "notch-r",
    stubCut: "notch-l",
    x: "hidden",
    y: "block",
  },
  bottom: {
    row: "flex flex-col",
    main: "rounded-t-[6px]",
    stub: "rounded-b-[6px]",
    mainCut: "notch-b",
    stubCut: "notch-t",
    x: "block",
    y: "hidden",
  },
};

/**
 * The travel-pass surface: paper-raised, 6px corners, the kasavu band on top.
 * ONLY for things that are booked or confirmed: the trip pass, booked items,
 * the confirm summary. `state="booked"` gives a dashed perforation with two
 * 12px notches before the stub; `state="pending"` ("Being booked") the same
 * layout with a dotted gold line and no notches. Planned things are plain
 * paper rows, never passes. `stamp` plays the booked stamp once.
 */
export function Pass({
  children,
  stub,
  stubAt = "responsive",
  state = "booked",
  kasavu = true,
  stamp,
  className,
  mainClassName,
  stubClassName,
}: {
  children: React.ReactNode;
  stub?: React.ReactNode;
  stubAt?: StubAt;
  state?: "booked" | "pending";
  kasavu?: boolean;
  stamp?: boolean;
  className?: string;
  mainClassName?: string;
  stubClassName?: string;
}) {
  const l = LAYOUT[stubAt];
  const booked = state === "booked";
  const notched = booked && Boolean(stub);
  return (
    <div className={cn("pk-pass-edge pk-on-paper text-mist-ink", stamp && "pk-stamp", className)}>
      <div className={stub ? l.row : undefined}>
        <div
          className={cn(
            "pk-notched relative min-w-0 flex-1 bg-paper-raised p-5 md:p-7",
            stub ? l.main : "rounded-[6px]",
            notched && l.mainCut,
            kasavu && "pk-kasavu pt-7 md:pt-9",
            mainClassName,
          )}
        >
          {children}
        </div>
        {stub && (
          <div
            className={cn(
              "pk-notched relative bg-paper-raised p-5 md:p-6",
              l.stub,
              notched && l.stubCut,
              kasavu && stubAt !== "bottom" && (stubAt === "right" ? "pk-kasavu pt-7" : "md:pk-kasavu md:pt-9"),
              stubClassName,
            )}
          >
            <span
              aria-hidden="true"
              className={cn("absolute inset-x-4 top-0 pk-perf-anim-x", booked ? "pk-perf-x" : "pk-dots-x", l.x)}
            />
            <span
              aria-hidden="true"
              className={cn("absolute inset-y-4 left-0 pk-perf-anim", booked ? "pk-perf-y" : "pk-dots-y", l.y)}
            />
            {stub}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * A row of numerals split by dashed perforations — the trip pass's
 * "1 Traveller · 10 Days · €955 Total". Put it inside a Pass. An optional
 * `action` takes the last cell on desktop and the full width below on phones.
 */
export function PassStrip({
  cells,
  action,
  className,
}: {
  cells: { value: React.ReactNode; label: React.ReactNode }[];
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-y-6 md:grid-cols-[1fr_auto] md:items-center", className)}>
      <dl className="grid auto-cols-fr grid-flow-col">
        {cells.map((cell, i) => (
          <div key={i} className={cn("relative flex flex-col-reverse justify-end", i > 0 && "pl-4 md:pl-8", i < cells.length - 1 && "pr-4 md:pr-8")}>
            {i > 0 && <span aria-hidden="true" className="pk-perf-y absolute inset-y-0 left-0" />}
            <dt className="mt-2.5 text-[15px] font-medium leading-snug text-mist-muted md:text-[16px]">{cell.label}</dt>
            <dd className="pk-numeral pk-numeral-stat whitespace-nowrap">{cell.value}</dd>
          </div>
        ))}
      </dl>
      {action && <div className="md:border-l-0 md:pl-8">{action}</div>}
    </div>
  );
}
