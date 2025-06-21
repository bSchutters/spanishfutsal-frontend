import { create } from "zustand";

type Match = {
  id: number;
  date: string;
  time: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  venueId: number;
  venueName: string;
  serieReference: string;
  liveLink: string;
  replayLink: string;
};

type State = {
  matchs: Match[];
  isLoading: boolean;
  fetchMatchs: () => Promise<void>;
};

type MatchAPIResponse = {
  id: number;
  date: string;
  time: string | null;
  home_team: string;
  away_team: string;
  score_home: number;
  score_away: number;
  venue_id: number;
  venue_name: string;
  serie_reference: string;
  live_link: string;
  replay_link: string;
};

const API_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL;

export const useMatchsStore = create<State>((set) => ({
  matchs: [],
  isLoading: false,
  fetchMatchs: async () => {
    set({ isLoading: true, matchs: [] });

    try {
      const res = await fetch(
        `${API_URL}/api/matches?populate=*?pagination[page]=1&pagination[pageSize]=1000&sort=date:asc`
      );
      const json = await res.json();

      set({
        matchs: (json.data as MatchAPIResponse[]).map((m) => ({
          id: m.id,
          date: m.date,
          time: m.time ? m.time.slice(0, 5) : "",
          homeTeam:
            m.home_team === "SPANISH BRUXELLES"
              ? "Spanish Futsal"
              : m.home_team,
          awayTeam:
            m.away_team === "SPANISH BRUXELLES"
              ? "Spanish Futsal"
              : m.away_team,
          homeScore: m.score_home,
          awayScore: m.score_away,
          venueId: m.venue_id,
          venueName: m.venue_name,
          serieReference: m.serie_reference,
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
