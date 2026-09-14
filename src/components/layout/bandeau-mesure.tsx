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
 * Le texte est court a dessein, mais il dit ce qu'il fait. La formule habituelle
 * des bandeaux, « necessaire au bon fonctionnement du site », designe justement
 * la seule categorie qui n'a pas besoin d'etre annoncee : l'employer pour une
 * mesure d'audience est l'erreur que les regulateurs sanctionnent.
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
      {/* Le texte prend la place qui reste, ce qui pousse le bouton contre le
          bord droit quelle que soit la longueur de la phrase. Un bandeau
          d'information se lit en passant : il reste sur une ligne et ne pese
          pas plus que la barre de navigation. */}
      <div className="mx-auto flex max-w-5xl items-center gap-4 sm:gap-6">
        <p className="min-w-0 flex-1 text-xs leading-snug text-white/90">
          <span className="font-bold uppercase tracking-wide">
            Mesure d&apos;audience.
          </span>{" "}
          Pendant les matchs en direct, ce site compte ses spectateurs de façon
          anonyme.
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
