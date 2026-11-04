import type { Metadata } from "next";
import { AppLink as Link } from "@/components/ui/primitives";
import { frame, Photo } from "@/components/site/blocks";
import { textLinkClass } from "@/components/site/nav";
import { cn } from "@/lib/utils";
import { NEXT_STEPS, PHOTOS } from "../../content";

export const metadata: Metadata = {
  title: { absolute: "Thank you · Aalmaram Health" },
  robots: { index: false },
};

export default function TalkThanksPage() {
  return (
    <div className={cn(frame, "grid gap-14 pb-28 pt-36 md:grid-cols-12 md:gap-x-6 md:pt-44")}>
      <div data-rise className="md:col-span-6">
        <h1 className="site-head text-[clamp(2.4rem,1.4rem+3.6vw,4.75rem)]">Thank you — we will be in touch</h1>
        <p className="site-lead mt-6">Your request has reached our team. Here is what happens now.</p>
        <ol className="mt-12 space-y-8">
          {NEXT_STEPS.map((step) => (
            <li key={step.title}>
              <p className="site-display text-[clamp(1.75rem,1.3rem+1.2vw,2.4rem)] leading-tight">{step.title}</p>
              <p className="mt-2 leading-relaxed text-night-muted">{step.text}</p>
            </li>
          ))}
        </ol>
        <Link href="/" className={cn(textLinkClass, "mt-12")}>Back to the homepage</Link>
      </div>
      <Photo photo={PHOTOS.prow} sizes="(min-width: 768px) 40vw, 100vw" className="aspect-[4/5] md:col-span-5 md:col-start-8" />
    </div>
  );
}
