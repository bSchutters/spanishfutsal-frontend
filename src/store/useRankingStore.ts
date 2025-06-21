import { create } from "zustand";

type Ranking = {
  id: number;
  teamName: string;
  points: number;
  wins: number;
  losses: number;
  draws: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  result_sequence: string;
  played: number;
  position: number;
  positionChange: "no_change" | "up" | "down";
};

type State = {
  rankings: Ranking[];
  isLoading: boolean;
  fetchRankings: () => Promise<void>;
};

type RankingAPIResponse = {
  id: number;
  team_name: string;
  points: number;
  wins: number;
  losses: number;
  draws: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  result_sequence: string;
  played: number;
  position: number;
  position_change?: "no_change" | "up" | "down";
};

const API_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL;

export const useRankingStore = create<State>((set) => ({
  rankings: [],
  isLoading: false,
  fetchRankings: async () => {
    set({ isLoading: true, rankings: [] });

    try {
      const res = await fetch(
        `${API_URL}/api/rankings?populate=*&pagination[page]=1&pagination[pageSize]=1000`
      );
      const json = await res.json();

      set({
        rankings: (json.data as RankingAPIResponse[]).map((r) => ({
          id: r.id,
          teamName:
            r.team_name === "SPANISH BRUXELLES"
              ? "Spanish Futsal"
              : r.team_name,
          points: r.points,
          wins: r.wins,
          losses: r.losses,
          draws: r.draws,
          goalsFor: r.goals_for,
          goalsAgainst: r.goals_against,
          goalDifference: r.goal_difference,
          result_sequence: r.result_sequence,
          played: r.played,
          position: r.position,
          positionChange: r.position_change || "no_change",
        })),
      });
    } catch (error) {
      console.error("Error fetching rankings:", error);
    } finally {
      set({ isLoading: false });
    }
  },
}));
