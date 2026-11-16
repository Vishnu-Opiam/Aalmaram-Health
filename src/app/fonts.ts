import localFont from "next/font/local";

// One brand across the public site and the client portal: a narrow, sharp serif
// for the few big words and numerals, a plain sans for everything read. Both from
// Fontshare (ITF Free Font License, free for commercial use), self-hosted.
export const gambarino = localFont({
  src: "./(site)/fonts/gambarino-400.woff2",
  weight: "400",
  variable: "--font-site-serif",
  display: "swap",
});

export const generalSans = localFont({
  src: [
    { path: "./(site)/fonts/general-sans-400.woff2", weight: "400" },
    { path: "./(site)/fonts/general-sans-500.woff2", weight: "500" },
  ],
  variable: "--font-site-sans",
  display: "swap",
});
