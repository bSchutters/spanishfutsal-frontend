import { Metadata } from "next";

import { SITE_URL } from "@/lib/site";
export const matchsMetadata: Metadata = {
  title: "Matchs | UD Asturiana - Calendrier et Résultats",
  description: "Consultez le calendrier des matchs d'UD Asturiana : prochaines rencontres, résultats, replays et matchs en direct. Suivez notre parcours en futsal.",
  openGraph: {
    title: "Matchs | UD Asturiana - Calendrier et Résultats",
    description: "Consultez le calendrier des matchs d'UD Asturiana : prochaines rencontres, résultats, replays et matchs en direct. Suivez notre parcours en futsal.",
    url: `${SITE_URL}/matchs`,
  },
  alternates: {
    canonical: `${SITE_URL}/matchs`,
  },
};