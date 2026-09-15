"use client";

import { useEffect } from "react";

/** En dessous de six jours restants, le jeton de sept jours est renouvele. */
const SEUIL_SECONDES = 6 * 24 * 60 * 60;

/**
 * Prolonge la session a chaque visite : un jeton Payload a une duree fixe, il
 * ne se prolonge pas tout seul. Une personne qui passe regulierement reste
 * donc connectee, une personne absente sept jours est deconnectee. Le
 * renouvellement passe par la route de Payload, qui pose elle-meme le cookie.
 */
export default function RafraichirSession({ exp }: { exp: number | null }) {
  useEffect(() => {
    if (exp === null) return;
    const restant = exp - Math.floor(Date.now() / 1000);
    if (restant > SEUIL_SECONDES) return;

    fetch("/api/users/refresh-token", { method: "POST", credentials: "include" }).catch(() => {
      // Sans reseau, la prochaine visite reessaiera.
    });
  }, [exp]);

  return null;
}
