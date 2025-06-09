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

      console.log("Fetched matchs:", json);

      set({
        matchs: json.data.map((m: any) => ({
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
