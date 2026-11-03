import Image from "next/image";
import { ArrowRight, CalendarCheck, Phone } from "lucide-react";
import { AppLink as Link } from "@/components/ui/primitives";
import { NEXT_STEPS, type Photo } from "@/app/(site)/content";
import { contactEmail, contactPhone } from "@/lib/env";
import { cn } from "@/lib/utils";
import { Banyan } from "./banyan";
import { ctaClass } from "./nav";

/** Shared building blocks for the public site's pages (server components). */

export const photoUrl = (src: string, width: number) => `${src}?auto=format&fit=crop&w=${width}&q=70`;
export const telHref = (phone: string) => `tel:${phone.replace(/[^+\d]/g, "")}`;
export const goldCta = cn(ctaClass, "min-h-14 bg-gold-300 px-7 text-[18px] text-banyan-950 hover:bg-kasavu-100");

export function Eyebrow({ children, light }: { children: React.ReactNode; light?: boolean }) {
  return <p className={cn("text-[16px] font-semibold uppercase tracking-[0.18em]", light ? "text-gold-300" : "text-gold-700")}>{children}</p>;
}

export function Section({
  id,
  eyebrow,
  title,
  intro,
  tint,
  children,
}: {
  id: string;
  eyebrow?: string;
  title: string;
  intro?: string;
  tint?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={cn("scroll-mt-24", tint && "bg-kasavu-100")}>
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="site-reveal max-w-3xl">
          {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
          <h2 id={`${id}-title`} className="mt-3 font-display text-[32px] font-medium leading-[1.15] tracking-tight text-banyan-900 sm:text-[42px]">
            {title}
          </h2>
          {intro && <p className="mt-4 text-[19px] leading-relaxed text-ink-700 md:text-[20px]">{intro}</p>}
        </div>
        <div className="mt-10">{children}</div>
      </div>
    </section>
  );
}

/** "Read more" from a homepage preview to its full page. */
export function MoreLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="mt-10 inline-flex min-h-12 items-center gap-2 text-[19px] font-semibold text-banyan-900 underline underline-offset-4">
      {children} <ArrowRight className="h-5 w-5" aria-hidden="true" />
    </Link>
  );
}

/** Top of an inner page: words on the left, an optional photo on the right. */
export function PageHero({ eyebrow, title, intro, photo }: { eyebrow: string; title: string; intro: string; photo?: Photo }) {
  return (
    <section aria-labelledby="page-title" className="bg-banyan-900 p-2 text-white sm:p-4">
      <div className="relative isolate overflow-hidden rounded-[28px] bg-banyan-950">
        {photo && (
          <div className="absolute inset-0 -z-10">
            <Image src={photoUrl(photo.src, 2000)} alt="" fill priority sizes="100vw" className="object-cover opacity-80" />
            <div className="absolute inset-0 bg-gradient-to-r from-banyan-950/95 via-banyan-950/70 to-banyan-950/20" />
          </div>
        )}
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-10 sm:py-28 lg:px-14">
          <Eyebrow light>{eyebrow}</Eyebrow>
          <h1 id="page-title" className="mt-4 max-w-3xl font-display text-[40px] font-medium leading-[1.08] tracking-tight sm:text-[58px]">
            {title}
          </h1>
          <p className="mt-6 max-w-2xl text-[19px] leading-relaxed text-white/95 sm:text-[21px]">{intro}</p>
          <Link href="/talk" className={cn(goldCta, "mt-9")}>
            <CalendarCheck className="h-5 w-5" aria-hidden="true" /> Book a free conversation
          </Link>
        </div>
      </div>
    </section>
  );
}

/** Numbered steps beside the banyan that lowers a root for each (site.css). */
export function BanyanSteps({ steps }: { steps: { title: string; text: string; children?: React.ReactNode }[] }) {
  return (
    <div className="site-steps grid gap-10 lg:grid-cols-[1fr_minmax(0,420px)] lg:gap-16">
      <ol className="relative space-y-8 border-l-2 border-kasavu-200 pl-8 lg:space-y-0 lg:border-0 lg:pl-0">
        {steps.map((step, i) => (
          <li key={step.title} className="site-step relative lg:flex lg:min-h-[44vh] lg:items-center lg:py-10">
            <span className="site-step-bar absolute -left-[35px] top-1 h-14 w-[4px] rounded-full bg-gold-500 lg:-left-6 lg:top-auto" aria-hidden="true" />
            <div className="site-reveal max-w-xl">
              <p className="font-display text-[22px] text-gold-700">Step {i + 1}</p>
              <h3 className="mt-1 font-display text-[28px] font-medium leading-tight text-banyan-900 sm:text-[32px]">{step.title}</h3>
              <p className="mt-3 text-[19px] leading-relaxed text-ink-700">{step.text}</p>
              {step.children}
            </div>
          </li>
        ))}
      </ol>
      <div className="hidden lg:block">
        <Banyan className="sticky top-32 w-full" />
      </div>
    </div>
  );
}

export function NumberedList({ items, light }: { items: { title: string; text: string }[]; light?: boolean }) {
  return (
    <ol className="space-y-6">
      {items.map((item, i) => (
        <li key={item.title} className="flex gap-4">
          <span
            className={cn(
              "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-display text-[19px]",
              light ? "border border-gold-300/60 text-gold-300" : "bg-banyan-900 text-white",
            )}
          >
            {i + 1}
          </span>
          <div>
            <p className={cn("text-[19px] font-semibold", !light && "text-ink-900")}>{item.title}</p>
            <p className={cn("mt-1 leading-relaxed", light ? "text-white/85" : "text-ink-700")}>{item.text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function Faq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <>
      <div className="max-w-3xl divide-y divide-kasavu-200 rounded-[28px] bg-white ring-1 ring-kasavu-200">
        {items.map((item) => (
          <details key={item.q} className="group px-6 py-4 sm:px-8">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 text-[19px] font-semibold text-ink-900">
              {item.q}
              <span aria-hidden="true" className="text-[26px] leading-none text-gold-700 transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-2 pb-2 leading-relaxed text-ink-700">{item.a}</p>
          </details>
        ))}
      </div>
      <MoreLink href="/talk">Something else? Ask us in a free conversation</MoreLink>
    </>
  );
}

/** The closing call to action on every page, with what happens next. */
export function TalkBand() {
  const email = contactEmail();
  const phone = contactPhone();
  return (
    <section id="talk" aria-labelledby="talk-title" className="scroll-mt-24 bg-banyan-900 text-white">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 sm:py-24 lg:grid-cols-[1.1fr_1fr]">
        <div className="site-reveal">
          <Eyebrow light>Free conversation</Eyebrow>
          <h2 id="talk-title" className="mt-3 font-display text-[34px] font-medium leading-[1.15] tracking-tight sm:text-[44px]">
            Talk to a person — free
          </h2>
          <p className="mt-4 max-w-xl text-[20px] leading-relaxed text-white/90">
            Tell us what you have in mind. We will answer your questions and, if it suits you, start planning together.
          </p>
          <div className="mt-8 flex flex-col gap-4">
            <Link href="/talk" className={cn(goldCta, "self-start")}>
              <CalendarCheck className="h-5 w-5" aria-hidden="true" /> Book a free conversation
            </Link>
            {phone && (
              <a href={telHref(phone)} className="inline-flex min-h-11 items-center gap-2 text-[18px] underline underline-offset-4">
                <Phone className="h-5 w-5 text-gold-300" aria-hidden="true" /> Or call {phone}
              </a>
            )}
            {email && (
              <a href={`mailto:${email}?subject=${encodeURIComponent("Free call with Aalmaram Health")}`} className="inline-flex min-h-11 items-center gap-2 text-[18px] underline underline-offset-4">
                Or email {email}
              </a>
            )}
          </div>
        </div>
        <div className="site-reveal">
          <h3 className="text-[21px] font-semibold text-gold-300">What happens next</h3>
          <div className="mt-6">
            <NumberedList items={NEXT_STEPS} light />
          </div>
        </div>
      </div>
    </section>
  );
}

/** Phones: the free conversation stays one tap away at the bottom of the page. */
export function MobileCta() {
  return (
    <div className="sticky bottom-0 z-30 border-t border-kasavu-200 bg-kasavu-50/95 p-3 backdrop-blur md:hidden">
      <Link href="/talk" className={cn(ctaClass, "w-full")}>
        <CalendarCheck className="h-5 w-5" aria-hidden="true" /> Book a free conversation
      </Link>
    </div>
  );
}
