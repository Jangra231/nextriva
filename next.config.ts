import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["3000-imktb4l5d2buxot45uhog-6820febc.us3.manus.computer"],
  serverExternalPackages: ["mysql2"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "fitizen-uploads-prod-891377123635.s3.ap-south-1.amazonaws.com" },
    ],
  },
};

export default nextConfig;
