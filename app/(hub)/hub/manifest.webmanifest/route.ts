import { NextResponse } from "next/server";

/**
 * Le manifeste de l'application Hub, distinct de celui du site : son propre
 * nom, ses icones tirees du blason, et un perimetre limite a /hub. C'est lui
 * qui permet « Sur l'ecran d'accueil » sur iPhone et l'installation ailleurs.
 */
export function GET() {
  const manifeste = {
    name: "Hub UDA",
    short_name: "Hub UDA",
    description: "L'espace prive de l'UD Asturiana : calendrier, posts, idees.",
    id: "/hub",
    start_url: "/hub",
    scope: "/hub",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0d1c2e",
    theme_color: "#0d1c2e",
    lang: "fr",
    icons: [
      { src: "/hub/icone/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/hub/icone/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/hub/icone/192?fond=1", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/hub/icone/512?fond=1", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
  return NextResponse.json(manifeste, {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
