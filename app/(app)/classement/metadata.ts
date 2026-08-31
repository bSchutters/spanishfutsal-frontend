import { Metadata } from "next";

import { OG_IMAGE, SITE_URL } from "@/lib/site";
export const classementMetadata: Metadata = {
  title: "Classement | UD Asturiana - Position Championnat",
  description: "Suivez le classement d'UD Asturiana en championnat. Position actuelle, statistiques et évolution de notre équipe de futsal.",
  openGraph: {
    title: "Classement | UD Asturiana - Position Championnat",
    description: "Suivez le classement d'UD Asturiana en championnat. Position actuelle, statistiques et évolution de notre équipe de futsal.",
    url: `${SITE_URL}/classement`,
    images: [OG_IMAGE],
  },
  alternates: {
    canonical: `${SITE_URL}/classement`,
  },
};