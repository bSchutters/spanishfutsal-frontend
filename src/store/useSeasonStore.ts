import { create } from "zustand";

type Season = {
  id: number;
  name: string;
  label: string;
  active: boolean;
  archived: boolean;
};

type State = {
  seasons: Season[];
  selectedSeasonId: number | null;
  isLoading: boolean;
  fetchSeasons: () => Promise<void>;
  setSelectedSeason: (id: number | null) => void;
  isArchivedSeason: () => boolean;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_STRAPI_API_URL || "";

/**
 * Requete en cours, partagee par tous les appelants. `SeasonSelector` est monte
 * plusieurs fois par page et chaque instance verifiait `seasons.length === 0`
 * avant de partir : elles voyaient toutes la liste vide en meme temps et
 * lancaient trois requetes identiques.
 */
let pendingSeasons: Promise<void> | null = null;

export const useSeasonStore = create<State>((set, get) => ({
  seasons: [],
  selectedSeasonId: null,
  isLoading: false,
  fetchSeasons: async () => {
    if (pendingSeasons) return pendingSeasons;

    set({ isLoading: true });
    pendingSeasons = (async () => {
      try {
        const res = await fetch(`${API_URL}/api/public/seasons`);
        const json = await res.json();
        const seasons = (json.data || []) as Season[];
        set({ seasons });
      } catch (error) {
        console.error("Failed to fetch seasons:", error);
      } finally {
        set({ isLoading: false });
        pendingSeasons = null;
      }
    })();

    return pendingSeasons;
  },
  setSelectedSeason: (id) => {
    set({ selectedSeasonId: id });
  },
  isArchivedSeason: () => {
    const { selectedSeasonId, seasons } = get();
    if (!selectedSeasonId) return false;
    const season = seasons.find((s) => s.id === selectedSeasonId);
    return season ? !season.active : false;
  },
}));
