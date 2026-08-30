import type { NextConfig } from "next";
import { withPayload } from "@payloadcms/next/withPayload";

const nextConfig: NextConfig = {
  devIndicators: false,
  images: {
    // Liste par defaut de Next, plus 2560 et 3072. Entre 2048 et 3840 il n y
    // avait aucun palier : un portable de 1039 px en densite 2 demande 2078 px
    // et se voyait servir la variante 3840. Les deux bannieres plein ecran
    // (accueil et /a-propos) sont concernees, elles pesaient 291 Ko.
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 2560, 3072, 3840],
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "https",
        hostname: "strapi.sbryan.studio",
      },
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default withPayload(nextConfig);
