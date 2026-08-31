import { Metadata } from "next";

import { OG_IMAGE, SITE_URL } from "@/lib/site";
export const contactMetadata: Metadata = {
  title: "Contact | UD Asturiana - Nous Joindre",
  description: "Contactez UD Asturiana pour sponsoring, partenariat, rejoindre l'équipe ou toute autre demande. Nous sommes à votre écoute.",
  openGraph: {
    title: "Contact | UD Asturiana - Nous Joindre",
    description: "Contactez UD Asturiana pour sponsoring, partenariat, rejoindre l'équipe ou toute autre demande. Nous sommes à votre écoute.",
    url: `${SITE_URL}/contact`,
    images: [OG_IMAGE],
  },
  alternates: {
    canonical: `${SITE_URL}/contact`,
  },
};