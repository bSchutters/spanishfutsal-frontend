import { create } from "zustand";

type Stat = {
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  matchesPlayed: number;
  cleanSheets: number;
};
type Player = {
  id: number;
  prenom: string;
  nom: string;
  photo: string;
  numero: number;
  stats: Stat;
  actif: boolean;
  capitaine: boolean;
  poste: "Joueur" | "Gardien" | "Staff";
  isGoalkeeper: boolean;
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
    matchesPlayed: number;
    goals: number;
    assists: number;
    yellowCards: number;
    redCards: number;
    cleanSheets: number;
    isGoalkeeper: boolean;
  } | null;
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
      const res = await fetch(`${API_URL}/api/joueurs-with-stats`);
      const json = await res.json();

      // Handle both {data: [...]} and direct array responses
      const playersData = Array.isArray(json) ? json : (json.data || []);

      set({
        players: (playersData as PlayerAPIResponse[]).map((p) => ({
          id: p.id,
          nom: p.nom,
          prenom: p.prenom,
          photo: p.photo?.url
            ? `${API_URL}${p.photo.url}`
            : "/assets/images/webp/placeholder.webp",
          numero: p.numero,
          poste: p.poste,
          stats: p.stats
            ? {
                goals: p.stats.goals || 0,
                assists: p.stats.assists || 0,
                yellowCards: p.stats.yellowCards || 0,
                redCards: p.stats.redCards || 0,
                matchesPlayed: p.stats.matchesPlayed || 0,
                cleanSheets: p.stats.cleanSheets || 0,
              }
            : {
                goals: 0,
                assists: 0,
                yellowCards: 0,
                redCards: 0,
                matchesPlayed: 0,
                cleanSheets: 0,
              },
          actif: p.actif,
          capitaine: p.capitaine,
          isGoalkeeper: p.stats?.isGoalkeeper || p.poste === "Gardien",
        })),
      });
    } catch (error) {
      console.error("Failed to fetch players:", error);
    } finally {
      set({ isLoading: false });
    }
  },
}));
