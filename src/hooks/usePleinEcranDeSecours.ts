"use client";

import { useEffect, useState } from "react";

import { basculerPleinEcran, suivrePleinEcran } from "@/lib/pleinEcran";

/**
 * Le plein ecran, avec un repli maison quand le navigateur ne sait pas faire.
 *
 * Sur iPhone, le plein ecran d'un element quelconque n'existe pas : devant un
 * cadre YouTube, l'API ne peut rien. Plutot que de retirer le bouton, on etale
 * le lecteur sur tout l'ecran par la mise en page. Ce n'est pas le vrai plein
 * ecran, la barre du navigateur reste, mais l'image occupe tout le reste et le
 * geste attendu fonctionne partout.
 */
export function usePleinEcranDeSecours(
  conteneur: React.RefObject<HTMLElement | null>,
  video?: React.RefObject<HTMLVideoElement | null>,
) {
  const [natif, setNatif] = useState(false);
  const [secours, setSecours] = useState(false);
  // Ne revient jamais en arriere : le rapport de diffusion veut savoir si la
  // personne a mis le match en grand, pas ou elle en est a la seconde.
  const [dejaUtilise, setDejaUtilise] = useState(false);

  useEffect(
    () =>
      suivrePleinEcran((actif) => {
        setNatif(actif);
        if (actif) setDejaUtilise(true);
      }, video?.current),
    [video],
  );

  const basculer = () => {
    if (secours) {
      setSecours(false);
      return;
    }

    if (basculerPleinEcran(conteneur.current, video?.current)) return;

    // Aucun chemin natif : c'est le repli qui prend le relais.
    setSecours(true);
    setDejaUtilise(true);
  };

  /**
   * Echap sort du repli comme il sortirait du vrai plein ecran.
   *
   * En capture et avec `preventDefault` : sans cela, la touche refermerait la
   * surimpression entiere, et on perdrait le match au lieu de revenir a la
   * taille normale.
   */
  useEffect(() => {
    if (!secours) return;

    const surTouche = (evenement: KeyboardEvent) => {
      if (evenement.key !== "Escape") return;

      evenement.preventDefault();
      evenement.stopPropagation();
      setSecours(false);
    };

    document.addEventListener("keydown", surTouche, true);
    return () => document.removeEventListener("keydown", surTouche, true);
  }, [secours]);

  return { pleinEcran: natif || secours, secours, dejaUtilise, basculer };
}
