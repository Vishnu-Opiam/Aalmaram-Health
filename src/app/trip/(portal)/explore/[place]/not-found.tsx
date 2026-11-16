import { ButtonLink } from "@/components/portal/kit";

/** An old or mistyped place link. */
export default function PlaceNotFound() {
  return (
    <section className="pk-night py-20 md:py-28">
      <div className="pk-frame max-w-xl">
        <h1 className="pk-h1">We could not find that place</h1>
        <p className="pk-body mt-5 text-night-muted">It may have moved, or the link is not quite right. Every place we work with is on Explore.</p>
        <ButtonLink href="/trip/explore" className="mt-8">
          Go to Explore
        </ButtonLink>
      </div>
    </section>
  );
}
