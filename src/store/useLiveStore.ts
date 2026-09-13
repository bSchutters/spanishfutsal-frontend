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
  /**
   * Flux HLS de la salle de diffusion du club, lu par notre propre lecteur.
   *
   * L'adresse est signee et datee : elle change a chaque interrogation, et
   * celle qui a servi a ouvrir le lecteur finit par etre refusee. C'est
   * pourquoi elle redescend jusqu'au lecteur a chaque verification, et non
   * une seule fois a l'ouverture.
   */
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

/**
 * Repose la lecture en cours sur une adresse fraiche.
 *
 * Ne concerne que le flux du club : une video YouTube est designee par un
 * identifiant stable, qui n'expire pas. L'objet n'est recree que si l'adresse a
 * reellement change, pour ne pas reveiller les abonnes du magasin a chaque
 * verification.
 */
function rafraichirLaSource(
  lecture: Lecture | null,
  hlsUrl: string | null,
): Lecture | null {
  if (!lecture || lecture.mode !== "hls" || !hlsUrl) return lecture;
  if (lecture.hlsUrl === hlsUrl) return lecture;

  return { ...lecture, hlsUrl };
}

type State = {
  live: Live | null;
  lecture: Lecture | null;
  /** Hauteur reelle du bandeau, en pixels. Zero quand il n'y a pas de direct. */
  hauteurBandeau: number;
  /**
   * Incremente pour demander au bandeau d'interroger la route sans attendre son
   * prochain rendez-vous. Le lecteur s'en sert quand sa source est refusee : il
   * lui faut une adresse fraiche tout de suite, pas dans quarante-cinq
   * secondes. Le bandeau reste ainsi le seul a appeler la route.
   */
  reveil: number;
  setLive: (live: Live | null) => void;
  setHauteurBandeau: (hauteur: number) => void;
  ouvrir: (lecture: Lecture) => void;
  fermer: () => void;
  reveiller: () => void;
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
  reveil: 0,
  setLive: (live) =>
    set(
      live
        ? {
            live,
            // L'adresse signee vient d'etre renouvelee : le lecteur ouvert doit
            // en profiter, sinon il garderait jusqu'au bout celle de son
            // ouverture. Rien n'est remonte ici, c'est la meme lecture avec une
            // source a jour.
            lecture: rafraichirLaSource(get().lecture, live.hlsUrl),
          }
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
  reveiller: () => set({ reveil: get().reveil + 1 }),
}));
