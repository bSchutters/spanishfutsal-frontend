import { create } from "zustand";

type Stat = {
  id: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  matchesPlayed: number;
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
};

type State = {
  players: Player[];
  isLoading: boolean;
  fetchPlayers: () => Promise<void>;
};

const API_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL;

export const usePlayersStore = create<State>((set) => ({
  players: [],
  isLoading: false,
  fetchPlayers: async () => {
    set({ isLoading: true });

    try {
      const res = await fetch("http://localhost:1337/api/joueurs?populate=*");
      const json = await res.json();

      console.log("Fetched players:", json.data);
      console.log("Photo:", json.data[0].photo?.url);

      set({
        players: json.data.map((p: any) => ({
          id: p.id,
          nom: p.nom,
          prenom: p.prenom,
          photo: p.photo?.url
            ? `${API_URL}${p.photo.url}`
            : "/assets/images/webp/placeholder.webp",
          numero: p.numero,
          poste: p.poste,
          stats: p.stats.map((s: any) => ({
            id: s.id,
            goals: s.goals,
            assists: s.assists,
            yellowCards: s.yellow_cards,
            redCards: s.red_cards,
            matchesPlayed: s.matches_played,
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
