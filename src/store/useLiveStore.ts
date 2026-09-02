import { create } from "zustand";

export type LiveMatch = {
  id: number;
  homeTeam: string;
  awayTeam: string;
  competition: string;
  time: string;
};

export type Live = {
  url: string;
  /** Absent si la diffusion saisie dans l'admin n'est pas sur YouTube. */
  videoId: string | null;
  /** TEMPORAIRE : flux HLS d'une salle XbotGo, lu par notre propre lecteur. */
  hlsUrl: string | null;
  viewers: number | null;
  match: LiveMatch | null;
};

/**
 * Ce que le lecteur joue. Un direct n'a ni fin ni barre de progression, un
 * replay n'a ni pastille rouge ni compteur de spectateurs : c'est le meme
 * lecteur, dans deux modes.
 */
export type Lecture = {
  mode: "direct" | "replay" | "hls";
  /** Vide en mode hls, ou c'est `hlsUrl` qui porte la source. */
  videoId: string;
  hlsUrl?: string | null;
  url: string;
  affiche: string;
  contexte: string | null;
  viewers: number | null;
};

type State = {
  live: Live | null;
  lecture: Lecture | null;
  /** Hauteur reelle du bandeau, en pixels. Zero quand il n'y a pas de direct. */
  hauteurBandeau: number;
  setLive: (live: Live | null) => void;
  setHauteurBandeau: (hauteur: number) => void;
  ouvrir: (lecture: Lecture) => void;
  fermer: () => void;
};

/**
 * L'etat du direct, partage par tout le site.
 *
 * Le bandeau interroge la route une seule fois pour tout le monde et depose le
 * resultat ici ; les cartes de match s'y abonnent. Sans ce point commun, chaque
 * composant aurait son propre minuteur et sa propre requete.
 */
export const useLiveStore = create<State>((set, get) => ({
  live: null,
  lecture: null,
  hauteurBandeau: 0,
  setLive: (live) =>
    set(
      live
        ? { live }
        : {
            live: null,
            hauteurBandeau: 0,
            // La fin de la diffusion referme le lecteur, quelle qu'en soit la
            // source. Seul un replay survit : il ne depend pas du direct.
            lecture: get().lecture?.mode === "replay" ? get().lecture : null,
          },
    ),
  setHauteurBandeau: (hauteurBandeau) => set({ hauteurBandeau }),
  ouvrir: (lecture) => set({ lecture }),
  fermer: () => set({ lecture: null }),
}));
