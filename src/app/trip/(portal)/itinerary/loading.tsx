/** Day by day while it loads: the night band, the strip and a chapter photo, at their real sizes (no jump). */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading your days">
      <div className="pk-night">
        <div className="pk-frame pb-7 pt-5 md:pb-10 md:pt-9">
          <div className="h-4 w-24 bg-night-raised" />
          <div className="mt-4 h-9 w-3/4 max-w-xl bg-night-raised md:h-12" />
          <div className="mt-4 h-4 w-60 bg-night-raised" />
        </div>
      </div>
      <div className="border-b border-paper-line">
        <div className="pk-frame flex gap-2 overflow-hidden py-3">
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} className="h-[5.25rem] w-14 shrink-0 rounded-full bg-paper-line/60 md:w-16" />
          ))}
        </div>
      </div>
      <div className="pk-frame pt-6 md:pt-10">
        <div className="-mx-4 aspect-[4/3] bg-paper-line/60 min-[390px]:-mx-5 md:mx-0 md:aspect-[16/9] md:max-w-[51rem] motion-safe:animate-pulse" />
      </div>
    </div>
  );
}
