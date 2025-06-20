import { create } from "zustand";

type Stat = {
  id: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  matchesPlayed: number;
  mvp: number;
  cleanSheets: number;
  saves: number;
};
type Player = {
  id: number;
  prenom: string;
  nom: string;
  photo: string;
  numero: number;
  stats: Stat[];
  actif: boolean;
  capitaine: boolean;
  poste: "Joueur" | "Gardien" | "Staff";
};

type State = {
  players: Player[];
  isLoading: boolean;
  fetchPlayers: () => Promise<void>;
};

type PlayerAPIResponse = {
  id: number;
  nom: string;
  prenom: string;
  numero: number;
  poste: "Joueur" | "Gardien" | "Staff";
  photo: { url: string } | null;
  stats: {
    id: number;
    goals: number;
    assists: number;
    yellow_cards: number;
    red_cards: number;
    matches_played: number;
    mvp: number;
    clean_sheets: number;
    saves: number;
  }[];
  actif: boolean;
  capitaine: boolean;
};

const API_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL;

export const usePlayersStore = create<State>((set) => ({
  players: [],
  isLoading: false,
  fetchPlayers: async () => {
    set({ isLoading: true });

    try {
      const res = await fetch(`${API_URL}/api/joueurs?populate=*`);
      const json = await res.json();

      set({
        players: (json.data as PlayerAPIResponse[]).map((p) => ({
          id: p.id,
          nom: p.nom,
          prenom: p.prenom,
          photo: p.photo?.url
            ? `${API_URL}${p.photo.url}`
            : "/assets/images/webp/placeholder.webp",
          numero: p.numero,
          poste: p.poste,
          stats: p.stats.map((s) => ({
            id: s.id,
            goals: s.goals || 0,
            assists: s.assists || 0,
            yellowCards: s.yellow_cards || 0,
            redCards: s.red_cards || 0,
            matchesPlayed: s.matches_played || 0,
            mvp: s.mvp || 0,
            saves: s.saves || 0,
            cleanSheets: s.clean_sheets || 0,
          })),
          actif: p.actif,
          capitaine: p.capitaine,
        })),
      });
    } catch (error) {
      console.error("Failed to fetch players:", error);
    } finally {
      set({ isLoading: false });
    }
  },
}));
