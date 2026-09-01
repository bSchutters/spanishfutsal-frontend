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
  viewers: number | null;
  match: LiveMatch | null;
};

type State = {
  live: Live | null;
  isOpen: boolean;
  /** Hauteur reelle du bandeau, en pixels. Zero quand il n'y a pas de direct. */
  hauteurBandeau: number;
  setLive: (live: Live | null) => void;
  setHauteurBandeau: (hauteur: number) => void;
  open: () => void;
  close: () => void;
};

/**
 * L'etat du direct, partage par tout le site.
 *
 * Le bandeau interroge la route une seule fois pour tout le monde et depose le
 * resultat ici ; les cartes de match s'y abonnent. Sans ce point commun, chaque
 * composant aurait son propre minuteur et sa propre requete.
 */
export const useLiveStore = create<State>((set) => ({
  live: null,
  isOpen: false,
  hauteurBandeau: 0,
  // La fin de la diffusion referme le lecteur : le laisser ouvert sur un flux
  // termine afficherait un cadre noir sans explication.
  setLive: (live) =>
    set(live ? { live } : { live: null, isOpen: false, hauteurBandeau: 0 }),
  setHauteurBandeau: (hauteurBandeau) => set({ hauteurBandeau }),
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));
