import type { Metadata } from "next";
import { gambarino, generalSans } from "../fonts";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: { default: "Your trip", template: "%s · Aalmaram Health" },
  robots: { index: false, follow: false, nocache: true },
};

// Runs before the first paint: a page's intro motion (hero shutter, numeral
// settle) plays once per browser session, so moving between tabs (full page
// loads) never replays it.
// (A <style> in <head>, not an attribute on <html>: React leaves extra head nodes alone when hydrating.)
const INTRO_ONCE = `try{var s=sessionStorage,k="pk-intro:"+location.pathname;if(s.getItem(k)){var e=document.createElement("style");e.textContent=".pk-shutter img,.pk-settle>*{animation:none!important}";document.head.appendChild(e)}else s.setItem(k,"1")}catch(e){}`;

/**
 * Client portal ground: the public site's faces, paper, 18–19 px body text
 * (most clients are 55+) and the skip link. The signed-in chrome (header, tab
 * bar, disclaimer) is in (portal)/layout; sign-in draws its own.
 */
export default function TripLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={cn(gambarino.variable, generalSans.variable, "portal-shell flex min-h-svh flex-col")}>
      <script dangerouslySetInnerHTML={{ __html: INTRO_ONCE }} />
      <a
        href="#trip-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[80] focus:rounded-full focus:bg-paper focus:px-5 focus:py-3 focus:text-[17px] focus:text-mist-ink"
      >
        Skip to content
      </a>
      {children}
    </div>
  );
}
