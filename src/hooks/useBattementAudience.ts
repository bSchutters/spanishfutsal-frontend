"use client";

import { useEffect, useRef } from "react";

import { ABSENCE_MAX_MS, BATTEMENT_S } from "@/lib/battement";
import { identiteDurable } from "@/lib/identiteDurable";
import { useLiveStore } from "@/store/useLiveStore";
import { provenance } from "@/lib/provenance";

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

/** Ce que le lecteur sait de la seance en cours. */
export type EtatSpectateur = {
  enLecture: boolean;
  /** Le son a ete active au moins une fois. */
  son: boolean;
  /** Le plein ecran a ete demande au moins une fois. */
  pleinEcran: boolean;
  /** Nombre de fois ou la lecture a cale depuis l'ouverture. */
  coupures: number;
};

export function useBattementAudience(
  matchId: number | null | undefined,
  etat: EtatSpectateur,
) {
  // Lu a chaque battement plutot que capture dans l'effet : le son, le plein
  // ecran et les coupures changent en cours de seance, et relier l'effet a
  // chacun d'eux le remonterait a la moindre variation.
  //
  // La mise a jour passe par un effet et non par le corps du composant : ecrire
  // dans une reference pendant le rendu est ce que React interdit, parce qu'un
  // rendu abandonne laisserait la valeur derriere lui.
  const dernier = useRef(etat);

  useEffect(() => {
    dernier.current = etat;
  });

  useEffect(() => {
    // Rien n'est compte si la lecture est en pause ou si l'onglet est passe a
    // l'arriere-plan. Sans cela, un onglet oublie ouvert toute la soiree pesait
    // autant qu'une personne devant son ecran, et la duree moyenne racontait
    // n'importe quoi.
    if (typeof matchId !== "number" || !etat.enLecture) return;

    const visiteur = identifiant();
    if (!visiteur) return;

    // Les renseignements d'appareil, aussi grossiers que possible : de quoi
    // savoir pour qui on developpe, pas de quoi reconnaitre une machine.
    const mobile =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(pointer: coarse)").matches;
    const largeur = Math.round(window.innerWidth / 100) * 100;
    const source = provenance();

    let arrete = false;

    // Depuis quand l'onglet est a l'arriere-plan, ou zero s'il est devant.
    let cacheDepuis = document.hidden ? Date.now() : 0;

    let premier = true;

    const battre = () => {
      if (arrete) return;

      // L'onglet cache ne disqualifie pas : le son continue, et ecouter le
      // match en travaillant, c'est le regarder. Passe cinq minutes sans
      // revenir, en revanche, c'est un onglet oublie.
      if (cacheDepuis && Date.now() - cacheDepuis > ABSENCE_MAX_MS) return;

      fetch("/api/live-audience", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          match: matchId,
          visiteur,
          mobile,
          largeur,
          source,
          // Nulle tant que le bandeau de mesure n'a pas ete ferme : sans
          // elle, la personne est comptee mais pas reconnue d'un match a
          // l'autre.
          durable: identiteDurable(),
          son: dernier.current.son,
          pleinEcran: dernier.current.pleinEcran,
          coupures: dernier.current.coupures,
        }),
        // Le comptage ne doit jamais retarder la lecture.
        keepalive: true,
      })
        .then(() => {
          // Le tout premier : on demande au bandeau de recompter sans attendre,
          // pour que la personne se voie apparaitre dans le compteur.
          if (premier) {
            premier = false;
            useLiveStore.getState().reveiller();
          }
        })
        .catch(() => {
          // Un battement perdu se rattrape au suivant.
        });
    };

    /**
     * Annonce que la place est libre.
     *
     * Un onglet ferme ne previent personne : sans cette annonce, il faut
     * attendre l'expiration de la presence, pres de deux minutes pendant
     * lesquelles le compteur garde quelqu'un qui est deja parti.
     *
     * `sendBeacon` existe pour ce moment precis : le navigateur se charge de
     * l'envoi meme si la page disparait dans la seconde, ce qu'une requete
     * ordinaire ne survit pas.
     */
    const annoncerLeDepart = () => {
      const corps = JSON.stringify({ match: matchId, visiteur, depart: true });

      try {
        if (navigator.sendBeacon) {
          navigator.sendBeacon(
            "/api/live-audience",
            new Blob([corps], { type: "application/json" }),
          );
          return;
        }
      } catch {
        // Refuse ou indisponible : on tente la voie ordinaire ci-dessous.
      }

      fetch("/api/live-audience", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: corps,
        keepalive: true,
      }).catch(() => {});
    };

    /** Le depart, plus le rappel au bandeau pour que la place se libere a vue. */
    const partirEtPrevenir = () => {
      annoncerLeDepart();
      useLiveStore.getState().reveiller();
    };

    battre();
    const rythme = setInterval(battre, BATTEMENT_S * 1000);

    // `pagehide` plutot que `beforeunload` : c'est le seul que Safari mobile
    // declenche a coup sur, et il couvre aussi la mise en cache de la page.
    window.addEventListener("pagehide", annoncerLeDepart);

    // Le retour sur l'onglet recompte tout de suite, plutot que d'attendre le
    // prochain battement : quelqu'un qui revient veut etre compte tout de suite.
    const surRetour = () => {
      if (document.hidden) {
        cacheDepuis = Date.now();
        return;
      }

      cacheDepuis = 0;
      battre();
    };
    document.addEventListener("visibilitychange", surRetour);

    return () => {
      arrete = true;
      clearInterval(rythme);
      document.removeEventListener("visibilitychange", surRetour);
      window.removeEventListener("pagehide", annoncerLeDepart);

      // Fermer le lecteur ou mettre en pause, c'est aussi partir. Un onglet
      // simplement passe a l'arriere-plan, lui, expire tout seul : l'annoncer
      // ferait danser le compteur a chaque coup d'oeil ailleurs.
      partirEtPrevenir();
    };
  }, [matchId, etat.enLecture]);
}
