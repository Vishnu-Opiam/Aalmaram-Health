import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Aalmaram Health",
    template: "%s · Aalmaram Health",
  },
  description:
    "Curated diagnostic, Ayurveda, wellness and heritage journeys in Kerala.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#faf8f5",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-sand-50 text-ink-800 antialiased">
        {children}
      </body>
    </html>
  );
}
