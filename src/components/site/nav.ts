/** Shared by the site header (client), footer and pages (server). */
export const SITE_MENU = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/why-kerala", label: "Why Kerala" },
  { href: "/#explore", label: "Explore" },
  { href: "/safety", label: "Is it safe?" },
  { href: "/#pricing", label: "Prices" },
  { href: "/#faq", label: "Questions" },
];

/** The one filled button on the site: lamp brass, fully round. */
export const ctaClass =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-brass px-6 text-[17px] font-medium text-night transition-[background-color,transform] duration-200 hover:bg-brass-bright active:scale-[0.98] focus-visible:outline-offset-4";

/** A quiet second action beside the button: text with an underline that grows on hover. */
export const textLinkClass =
  "inline-flex min-h-12 items-center gap-2 text-[17px] font-medium underline decoration-1 underline-offset-[6px] transition-[text-decoration-color,text-underline-offset] duration-200 hover:underline-offset-[9px]";
