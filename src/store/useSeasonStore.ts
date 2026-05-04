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

export const useSeasonStore = create<State>((set, get) => ({
  seasons: [],
  selectedSeasonId: null,
  isLoading: false,
  fetchSeasons: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch(`${API_URL}/api/public/seasons`);
      const json = await res.json();
      const seasons = (json.data || []) as Season[];
      set({ seasons });
    } catch (error) {
      console.error("Failed to fetch seasons:", error);
    } finally {
      set({ isLoading: false });
    }
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
