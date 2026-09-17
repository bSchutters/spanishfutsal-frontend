"use client";

import { useEffect } from "react";

/**
 * Empeche l'ecran de s'eteindre pendant qu'on regarde le match.
 *
 * Un telephone se met en veille au bout d'une minute ou deux sans qu'on le
 * touche, et regarder une video, c'est precisement ne pas le toucher. Une
 * personne l'a remonte apres la premiere diffusion : son ecran s'eteignait sans
 * arret, comme si elle ne faisait rien.
 *
 * Le verrou est relache par le navigateur des que l'onglet passe a
 * l'arriere-plan, et il ne revient pas tout seul : on le redemande au retour.
 *
 * Aucun repli n'est possible la ou l'API n'existe pas, iOS avant 16.4 par
 * exemple. Le refus est donc silencieux : ce serait une bien mauvaise raison de
 * couvrir le match d'un message.
 */
export function useEcranAllume(actif: boolean) {
  useEffect(() => {
    if (!actif) return;

    let verrou: WakeLockSentinel | null = null;
    let annule = false;

    const demander = async () => {
      try {
        const lock = await navigator.wakeLock?.request("screen");
        if (annule) {
          lock?.release().catch(() => {});
          return;
        }
        verrou = lock ?? null;
      } catch {
        // Refuse, absent, ou batterie trop faible : l'ecran s'eteindra, et
        // c'est tout.
      }
    };

    demander();

    const surRetour = () => {
      if (!document.hidden && !verrou) demander();
    };

    document.addEventListener("visibilitychange", surRetour);

    return () => {
      annule = true;
      document.removeEventListener("visibilitychange", surRetour);
      verrou?.release().catch(() => {});
      verrou = null;
    };
  }, [actif]);
}
