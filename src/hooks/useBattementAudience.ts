"use client";

import { useEffect } from "react";

import { BATTEMENT_S } from "@/lib/battement";

/**
 * Signale au site qu'on regarde le match, regulierement, tant que le lecteur est
 * ouvert.
 *
 * C'est ce qui permet d'afficher un nombre de spectateurs qui soit le notre. Le
 * diffuseur compte les gens sur sa propre page, et depuis que le match se
 * regarde ici, son chiffre tombe vers zero pendant que la tribune est chez nous.
 *
 * Aucune donnee personnelle ne part : l'identifiant est tire au hasard, garde le
 * temps de l'onglet, et ne designe personne. Rouvrir le site dans un autre
 * onglet compte donc pour un second spectateur, ce qui est le bon comportement
 * pour une audience.
 */

const CLE = "uda-visiteur";

/** Un identifiant de session, cree au besoin. */
function identifiant(): string | null {
  try {
    const existant = sessionStorage.getItem(CLE);
    if (existant) return existant;

    // Deux mots de base 36 : assez large pour qu'une collision entre deux
    // spectateurs d'un meme match soit hors de portee.
    const neuf = `${Math.random().toString(36).slice(2, 12)}${Math.random()
      .toString(36)
      .slice(2, 8)}`.replace(/[^a-z0-9]/g, "");

    sessionStorage.setItem(CLE, neuf);
    return neuf;
  } catch {
    // Navigation privee stricte, ou stockage refuse : on ne compte pas cette
    // personne plutot que de la compter a neuf a chaque battement.
    return null;
  }
}

export function useBattementAudience(
  matchId: number | null | undefined,
  enLecture: boolean,
) {
  useEffect(() => {
    // Rien n'est compte si la lecture est en pause ou si l'onglet est passe a
    // l'arriere-plan. Sans cela, un onglet oublie ouvert toute la soiree pesait
    // autant qu'une personne devant son ecran, et la duree moyenne racontait
    // n'importe quoi.
    if (typeof matchId !== "number" || !enLecture) return;

    const visiteur = identifiant();
    if (!visiteur) return;

    // Le seul renseignement d'appareil envoye, et le plus grossier possible.
    const mobile =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(pointer: coarse)").matches;

    let arrete = false;

    const battre = () => {
      if (arrete || document.hidden) return;

      fetch("/api/live-audience", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ match: matchId, visiteur, mobile }),
        // Le comptage ne doit jamais retarder la lecture.
        keepalive: true,
      }).catch(() => {
        // Un battement perdu se rattrape au suivant.
      });
    };

    battre();
    const rythme = setInterval(battre, BATTEMENT_S * 1000);

    // Le retour sur l'onglet recompte tout de suite, plutot que d'attendre le
    // prochain battement : quelqu'un qui revient veut etre compte tout de suite.
    const surRetour = () => {
      if (!document.hidden) battre();
    };
    document.addEventListener("visibilitychange", surRetour);

    return () => {
      arrete = true;
      clearInterval(rythme);
      document.removeEventListener("visibilitychange", surRetour);
    };
  }, [matchId, enLecture]);
}
