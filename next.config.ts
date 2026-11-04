import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // Public site placeholder photography (Unsplash licence) until we have our own.
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
    // Extra steps between 1200 and 3840 so large screens aren't sent a much bigger file than they need.
    deviceSizes: [640, 750, 828, 1080, 1200, 1440, 1920, 2400, 2880, 3840],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
