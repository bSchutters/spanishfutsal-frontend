import { Metadata } from "next";

import { OG_IMAGE, SITE_URL } from "@/lib/site";
export const equipeMetadata: Metadata = {
  title: "Équipe | UD Asturiana - Nos Joueurs",
  description: "Découvrez l'équipe d'UD Asturiana : nos joueurs actuels, anciens joueurs et staff technique. Une famille unie par la passion du futsal.",
  openGraph: {
    title: "Équipe | UD Asturiana - Nos Joueurs",
    description: "Découvrez l'équipe d'UD Asturiana : nos joueurs actuels, anciens joueurs et staff technique. Une famille unie par la passion du futsal.",
    url: `${SITE_URL}/equipe`,
    images: [OG_IMAGE],
  },
  alternates: {
    canonical: `${SITE_URL}/equipe`,
  },
};