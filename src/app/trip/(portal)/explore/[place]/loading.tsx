/** A place while it loads: the photograph's space, then the text and side column at their final sizes. */
export default function PlaceLoading() {
  const block = "animate-pulse bg-paper-line motion-reduce:animate-none";
  return (
    <div aria-busy="true">
      <p role="status" className="sr-only">
        Loading…
      </p>
      <div className="pk-night h-[68svh] min-h-[440px] md:h-[min(80svh,760px)]" aria-hidden="true" />
      <div className="pk-frame mt-12 grid gap-12 md:mt-20 md:grid-cols-12 md:gap-x-16" aria-hidden="true">
        <div className="space-y-4 md:col-span-7">
          <div className={`${block} h-6 w-full`} />
          <div className={`${block} h-6 w-11/12`} />
          <div className={`${block} h-6 w-4/5`} />
        </div>
        <div className="space-y-4 md:col-span-5">
          <div className={`${block} h-10 w-2/3`} />
          <div className={`${block} h-28 w-full`} />
        </div>
      </div>
    </div>
  );
}
