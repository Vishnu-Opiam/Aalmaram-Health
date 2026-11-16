/** Explore while it loads: the night header, the three module tiles and a grid of 4:5 cards, at their final sizes. */
export default function ExploreLoading() {
  const block = "animate-pulse bg-paper-line motion-reduce:animate-none";
  return (
    <div aria-busy="true">
      <p role="status" className="sr-only">
        Loading Explore…
      </p>
      <div className="pk-night pb-20 pt-10 md:pb-32 md:pt-16" aria-hidden="true">
        <div className="pk-frame space-y-4">
          <div className="h-5 w-24 bg-night-raised" />
          <div className="h-12 w-3/4 max-w-xl bg-night-raised md:h-16" />
          <div className="h-5 w-full max-w-md bg-night-raised" />
        </div>
      </div>
      <div className="pk-frame" aria-hidden="true">
        <div className="relative -mt-12 grid grid-cols-3 gap-2 md:-mt-20 md:gap-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="aspect-[3/4] bg-night-raised md:aspect-[4/3]" />
          ))}
        </div>
        <div className={`${block} mt-16 h-10 w-72 md:mt-24`} />
        <div className="mt-10 grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-3 md:gap-x-6">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i}>
              <div className={`${block} aspect-[4/5]`} />
              <div className={`${block} mt-4 h-6 w-2/3`} />
              <div className={`${block} mt-2 h-4 w-1/2`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
