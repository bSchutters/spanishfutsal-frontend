"use client";

import { useLiveStore } from "@/store/useLiveStore";

/**
 * Le cale-pied du bandeau.
 *
 * La navigation est fixe, donc hors du flux : ce qu'elle porte ne pousse rien.
 * Les pages reservent l'espace de la barre, pas celui du bandeau, et sans ce
 * bloc leur premier titre passerait dessous des qu'une diffusion commence.
 */
export default function LiveSpacer() {
  const hauteur = useLiveStore((s) => s.hauteurBandeau);

  if (!hauteur) return null;

  return <div aria-hidden style={{ height: hauteur }} />;
}
