"use client";

import { useState } from "react";
import { CalendarCheck, Phone, X } from "lucide-react";
import { AppLink as Link } from "@/components/ui/primitives";
import { PortalBrand } from "@/components/portal/ui";
import { cn } from "@/lib/utils";
import { ctaClass, SITE_MENU } from "./nav";

/**
 * Every menu item stays visible on desktop. On phones and tablets a button
 * labelled "Menu" (a word, not just an icon) opens the same list, and the
 * free-conversation button never hides.
 */
export function SiteHeader({ phone }: { phone?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-kasavu-200 bg-kasavu-50/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" aria-label="Aalmaram Health — home" className="shrink-0">
          {/* Phones show the tree mark alone so the call to action and Menu both fit. */}
          <PortalBrand className="max-sm:[&>span]:hidden" />
        </Link>

        <nav aria-label="Main" className="hidden xl:block">
          <ul className="flex items-center gap-1">
            {SITE_MENU.map((item) => (
              <li key={item.href}>
                <a href={item.href} className="rounded-full px-3 py-2.5 text-[17px] font-medium text-ink-700 hover:bg-kasavu-100 hover:text-ink-900">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          {phone && (
            <a href={`tel:${phone.replace(/[^+\d]/g, "")}`} className="hidden items-center gap-2 rounded-full px-3 py-2.5 text-[17px] font-medium text-ink-800 hover:bg-kasavu-100 lg:inline-flex">
              <Phone className="h-4 w-4 text-gold-700" aria-hidden="true" /> {phone}
            </a>
          )}
          <Link href="/trip/sign-in" className="hidden rounded-full px-3 py-2.5 text-[17px] font-medium text-ink-700 hover:bg-kasavu-100 hover:text-ink-900 sm:inline-block">
            My trip
          </Link>
          <Link href="/talk" className={ctaClass}>
            <CalendarCheck className="hidden h-5 w-5 sm:block" aria-hidden="true" />
            <span className="whitespace-nowrap sm:hidden">Free conversation</span>
            <span className="hidden sm:inline">Book a free conversation</span>
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="site-menu"
            className="inline-flex min-h-12 items-center gap-2 rounded-full border-2 border-kasavu-200 px-4 text-[17px] font-semibold text-ink-900 hover:border-banyan-800 xl:hidden"
          >
            {open ? <X className="h-5 w-5" aria-hidden="true" /> : null}
            Menu
          </button>
        </div>
      </div>

      <nav id="site-menu" aria-label="Menu" hidden={!open} className="border-t border-kasavu-200 bg-kasavu-50 xl:hidden">
        <ul className="mx-auto grid max-w-7xl gap-1 px-4 py-4 sm:grid-cols-2 sm:px-6">
          {[...SITE_MENU, { href: "/trip/sign-in", label: "My trip" }].map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn("flex min-h-12 items-center rounded-2xl px-4 text-[19px] font-medium text-ink-900 hover:bg-kasavu-100")}
              >
                {item.label}
              </a>
            </li>
          ))}
          {phone && (
            <li>
              <a href={`tel:${phone.replace(/[^+\d]/g, "")}`} className="flex min-h-12 items-center gap-2 rounded-2xl px-4 text-[19px] font-medium text-ink-900 hover:bg-kasavu-100">
                <Phone className="h-5 w-5 text-gold-700" aria-hidden="true" /> Call us: {phone}
              </a>
            </li>
          )}
        </ul>
      </nav>
    </header>
  );
}
