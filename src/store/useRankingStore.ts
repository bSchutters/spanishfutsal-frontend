import { create } from "zustand";
import { DEFAULT_TEAM_LOGO } from "@/lib/teams";

type Ranking = {
  id: number;
  teamName: string;
  teamLogo: string;
  isClub: boolean;
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
  fetchRankings: (seasonId?: number | null) => Promise<void>;
};

type RankingAPIResponse = {
  id: number;
  team_name: string;
  team_logo: string | null;
  is_club: boolean;
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
  positionChange?: "no_change" | "up" | "down";
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_STRAPI_API_URL || "";

export const useRankingStore = create<State>((set) => ({
  rankings: [],
  isLoading: false,
  fetchRankings: async (seasonId) => {
    set({ isLoading: true, rankings: [] });

    try {
      const url = seasonId
        ? `${API_URL}/api/public/rankings/${seasonId}`
        : `${API_URL}/api/public/rankings`;
      const res = await fetch(url);
      const json = await res.json();

      set({
        rankings: (json.data as RankingAPIResponse[])
          .map((r) => ({
            id: r.id,
            teamName: r.team_name,
            teamLogo: r.team_logo || DEFAULT_TEAM_LOGO,
            isClub: r.is_club,
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
            positionChange: r.positionChange || "no_change",
          }))
          .sort((a, b) => a.position - b.position),
      });
    } catch (error) {
      console.error("Error fetching rankings:", error);
    } finally {
      set({ isLoading: false });
    }
  },
}));
