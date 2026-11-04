"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AppLink as Link } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { ctaClass, SITE_MENU } from "./nav";

const telHref = (phone: string) => `tel:${phone.replace(/[^+\d]/g, "")}`;
const MENU = [...SITE_MENU, { href: "/trip/sign-in", label: "My trip" }];

/**
 * A plain bar that sits on the first photograph and turns solid once you
 * scroll. Every menu item stays visible on wide screens; narrower ones get a
 * button labelled "Menu" (a word, not an icon) that opens the same list full
 * screen. The free-conversation button never hides.
 */
export function SiteHeader({ phone }: { phone?: string }) {
  const [open, setOpen] = useState(false);
  const [solid, setSolid] = useState(false);
  const [hidden, setHidden] = useState(false);
  const pathname = usePathname();
  const current = (href: string) => (href === pathname ? "page" : undefined);

  useEffect(() => {
    // Step aside while reading down the page; come back the moment you scroll up.
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setSolid(y > 24);
      setHidden(y > 400 && y > last + 4 ? true : y < last - 4 ? false : (h) => h);
      last = y;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className={cn("fixed inset-x-0 top-0 z-40 text-night-ink transition-[background-color,transform] duration-500 ease-out", solid || open ? "bg-night" : "bg-transparent", hidden && !open && "has-[:focus-visible]:translate-y-0 -translate-y-full")}>
      <div className="flex h-20 items-center justify-between gap-4 px-5 sm:px-8 lg:px-[5vw]">
        <Link href="/" className="site-display shrink-0 text-[26px] leading-none" aria-label="Aalmaram Health — home">
          Aalmaram<span className="max-sm:hidden"> Health</span>
        </Link>

        <nav aria-label="Main" className="hidden xl:block">
          <ul className="flex items-center gap-7">
            {SITE_MENU.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  aria-current={current(item.href)}
                  className="inline-flex min-h-12 items-center text-[16px] underline-offset-[6px] transition-opacity hover:opacity-70 aria-[current=page]:underline"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2 sm:gap-5">
          {phone && (
            <a href={telHref(phone)} className="hidden min-h-12 items-center text-[16px] transition-opacity hover:opacity-70 2xl:inline-flex">
              {phone}
            </a>
          )}
          <Link href="/trip/sign-in" className="hidden min-h-12 items-center text-[16px] transition-opacity hover:opacity-70 sm:inline-flex">
            My trip
          </Link>
          <Link href="/talk" className={cn(ctaClass, "px-5 text-[16px]")}>
            <span className="whitespace-nowrap sm:hidden">Free conversation</span>
            <span className="hidden sm:inline">Book a free conversation</span>
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="site-menu"
            className="inline-flex min-h-12 items-center px-2 text-[16px] font-medium underline-offset-[6px] hover:underline xl:hidden"
          >
            {open ? "Close" : "Menu"}
          </button>
        </div>
      </div>

      <nav id="site-menu" aria-label="Menu" hidden={!open} className="h-[calc(100svh-5rem)] overflow-y-auto bg-night px-5 pb-10 pt-6 sm:px-8 lg:px-[5vw] xl:hidden">
        <ul className="space-y-1">
          {MENU.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                aria-current={current(item.href)}
                onClick={() => setOpen(false)}
                className="site-display inline-flex min-h-14 items-center text-[clamp(2.25rem,9vw,3.5rem)] transition-opacity hover:opacity-70 aria-[current=page]:underline"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
        {phone && (
          <a href={telHref(phone)} className="mt-10 inline-flex min-h-12 items-center text-[19px] underline underline-offset-4">
            Call us: {phone}
          </a>
        )}
      </nav>
    </header>
  );
}
