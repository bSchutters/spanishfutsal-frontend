import { create } from "zustand";
import { DEFAULT_TEAM_LOGO } from "@/lib/teams";

type Match = {
  id: number;
  date: string;
  time: string;
  homeTeam: string;
  homeTeamLogo: string;
  homeIsClub: boolean;
  awayTeam: string;
  awayTeamLogo: string;
  awayIsClub: boolean;
  homeScore: number;
  awayScore: number;
  venueId: number;
  venueName: string;
  serieReference: string;
  competitionName: string;
  liveLink: string;
  replayLink: string;
};

type State = {
  matchs: Match[];
  isLoading: boolean;
  fetchMatchs: (seasonId?: number | null) => Promise<void>;
};

type MatchAPIResponse = {
  id: number;
  date: string;
  time: string | null;
  home_team: string;
  home_team_logo: string | null;
  home_is_club: boolean;
  away_team: string;
  away_team_logo: string | null;
  away_is_club: boolean;
  score_home: number;
  score_away: number;
  venue_id: number;
  venue_name: string;
  serie_reference: string;
  competition_name: string;
  live_link: string;
  replay_link: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_STRAPI_API_URL || "";

export const useMatchsStore = create<State>((set) => ({
  matchs: [],
  isLoading: false,
  fetchMatchs: async (seasonId) => {
    set({ isLoading: true, matchs: [] });

    try {
      const url = seasonId
        ? `${API_URL}/api/public/matches/${seasonId}`
        : `${API_URL}/api/public/matches`;
      const res = await fetch(url);
      const json = await res.json();

      set({
        matchs: (json.data as MatchAPIResponse[]).map((m) => ({
          id: m.id,
          date: m.date,
          time: m.time ? m.time.slice(0, 5) : "",
          homeTeam: m.home_team,
          homeTeamLogo: m.home_team_logo || DEFAULT_TEAM_LOGO,
          homeIsClub: m.home_is_club,
          awayTeam: m.away_team,
          awayTeamLogo: m.away_team_logo || DEFAULT_TEAM_LOGO,
          awayIsClub: m.away_is_club,
          homeScore: m.score_home,
          awayScore: m.score_away,
          venueId: m.venue_id,
          venueName: m.venue_name,
          serieReference: m.serie_reference,
          competitionName: m.competition_name || m.serie_reference,
          liveLink: m.live_link,
          replayLink: m.replay_link,
        })),
      });
    } catch (error) {
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
}));
