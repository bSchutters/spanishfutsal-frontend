"use client";

import { useSyncExternalStore } from "react";

import {
  accordDonne,
  donnerLAccord,
  souscrireALAccord,
} from "@/lib/identiteDurable";

/**
 * Le bandeau qui dit comment le site compte ses spectateurs.
 *
 * Il n'est pas la pour demander une permission au sens ou l'entendent les
 * bandeaux de publicite : il n'y a ni regie, ni revente, ni profil. Il annonce
 * une mesure d'audience et laisse la refermer.
 *
 * Le texte affiche est la formule generique des bandeaux, choisie par le club.
 * A savoir, si la question revient un jour : elle annonce du « bon
 * fonctionnement », c'est-a-dire la categorie qui n'a pas besoin d'etre
 * annoncee, alors que ce bouton declenche bel et bien une mesure d'audience.
 * Ce que le bandeau fait reellement est decrit dans `identiteDurable.ts`, et
 * reste volontairement sobre : un numero tire au hasard, aucune donnee
 * personnelle, aucune revente, et rien d'ecrit avant le clic.
 *
 * Ce qui compte est l'ordre : tant qu'il n'est pas ferme, rien de persistant
 * n'est ecrit et le comptage reste anonyme, le temps d'un onglet. Le fermer
 * cree l'identite qui permet de reconnaitre un appareil d'un match a l'autre.
 * Poser l'identifiant avant le clic serait tout le contraire.
 */
export default function BandeauMesure() {
  // La reponse est dans le navigateur, donc dans une source exterieure a React.
  // Le rendu du serveur repond « deja ferme » : rien n'apparait dans le HTML,
  // et le bandeau ne se montre qu'une fois le vrai etat connu. L'inverse le
  // ferait clignoter chez tous ceux qui l'ont deja ferme.
  const accepte = useSyncExternalStore(
    souscrireALAccord,
    accordDonne,
    () => true,
  );

  if (accepte) return null;

  return (
    <div
      role="region"
      aria-label="Mesure d'audience"
      className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-spanish-accent-2 bg-spanish-bg-dark/95 px-4 py-2.5 backdrop-blur-sm sm:px-6"
    >
      {/* Pleine largeur, sans colonne centrale : le texte se cale contre le
          bord gauche et le bouton contre le bord droit. Le texte prend la place
          qui reste, donc le bouton ne bouge pas si la phrase change. Un bandeau
          d'information se lit en passant, il ne pese pas plus que la barre de
          navigation. */}
      <div className="flex items-center gap-4 sm:gap-6">
        <p className="min-w-0 flex-1 text-xs leading-snug text-white/90">
          Ce site utilise des cookies pour assurer son bon fonctionnement.
        </p>

        <button
          type="button"
          onClick={donnerLAccord}
          className="shrink-0 cursor-pointer rounded-md border-2 border-spanish-accent-2-dark bg-spanish-accent-2 px-3 py-1.5 text-[0.7rem] font-bold uppercase tracking-wide text-spanish-bg-dark transition-[scale,background-color] duration-200 ease-[var(--ease-out-strong)] hover:bg-spanish-accent-2-dark active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          C&apos;est noté
        </button>
      </div>
    </div>
  );
}
