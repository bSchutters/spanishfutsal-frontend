import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  devIndicators: false,
  images: {
    domains: ["localhost", "strapi.sbryan.studio"], // ou ton domaine prod plus tard
  },
};

export default nextConfig;
