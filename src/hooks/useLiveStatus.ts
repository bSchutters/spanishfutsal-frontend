"use client";

import { useEffect, useState } from "react";

const POLL_MS = 60 * 1000;

export type LiveStatus = {
  url: string;
  /** Absent si la diffusion saisie dans l'admin n'est pas sur YouTube. */
  videoId: string | null;
  thumbnail: string | null;
  viewers: number | null;
  title: string | null;
};

/**
 * La diffusion en cours, ou null.
 *
 * Les pages sont servies en statique : le HTML mis en cache avant le coup
 * d'envoi ne saura jamais, a lui seul, que la chaine s'est mise a diffuser.
 * D'ou cette interrogation cote client, active seulement pendant la rencontre.
 */
export default function useLiveStatus(enabled: boolean): LiveStatus | null {
  const [live, setLive] = useState<LiveStatus | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const check = async () => {
      try {
        const res = await fetch("/api/live-status");
        if (!res.ok) return;

        const data = await res.json();
        if (cancelled) return;

        setLive(
          data.live
            ? {
                url: data.url,
                videoId: data.videoId ?? null,
                thumbnail: data.thumbnail ?? null,
                viewers: data.viewers ?? null,
                title: data.title ?? null,
              }
            : null,
        );
      } catch {
        // Hors ligne ou route indisponible : on garde l'etat precedent plutot
        // que de faire disparaitre un lecteur deja affiche.
      }
    };

    check();
    const interval = setInterval(check, POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [enabled]);

  // Valeur derivee plutot que remise a zero dans l'effet : hors rencontre, la
  // derniere diffusion connue ne doit plus etre proposee, mais l'ecrire dans
  // l'etat depuis l'effet declencherait un rendu en cascade.
  return enabled ? live : null;
}
