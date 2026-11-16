/** While a portal page streams in: a night band where the hero goes, quiet paper lines below. */
export default function TripLoading() {
  const line = "animate-pulse bg-paper-line motion-reduce:animate-none";
  return (
    <main id="trip-content" aria-busy="true" className="flex-1">
      <p role="status" className="sr-only">
        Loading your trip…
      </p>
      <div className="pk-night h-[42svh] md:h-[52svh]" aria-hidden="true" />
      <div className="pk-frame mt-12 space-y-5" aria-hidden="true">
        <div className={`${line} h-10 w-2/3 max-w-xl`} />
        <div className={`${line} h-5 w-full max-w-2xl`} />
        <div className={`${line} h-5 w-5/6 max-w-xl`} />
        <div className="grid gap-6 pt-8 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`${line} aspect-[4/5]`} />
          ))}
        </div>
      </div>
    </main>
  );
}
