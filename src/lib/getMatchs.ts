import { unstable_cache } from "next/cache";
import { getCompetitionName } from "./getCompetitionName";
import { getTeamsIndex } from "./getTeamsIndex";
import { getPayloadClient } from "./payload";
import { resolveTeam } from "./teams";

export type Match = {
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

/**
 * Source unique des matchs, partagee par la page et par la route publique. La
 * page la lit directement, ce qui met le calendrier dans le HTML des la
 * premiere frame ; la route ne sert plus qu'au changement de saison.
 */
async function fetchMatchs(seasonId?: number | null): Promise<Match[]> {
  const payload = await getPayloadClient();

  const season = seasonId
    ? await payload.findByID({ collection: "seasons", id: seasonId })
    : (
        await payload.find({
          collection: "seasons",
          where: { active: { equals: true } },
          limit: 1,
        })
      ).docs[0];

  const teams = await getTeamsIndex(payload);

  const result = await payload.find({
    collection: "matches",
    limit: 1000,
    sort: "date",
    depth: 1,
    ...(season && { where: { season: { equals: season.id } } }),
  });

  return result.docs.map((m) => {
    const home = resolveTeam(teams, m.home_team);
    const away = resolveTeam(teams, m.away_team);

    return {
      id: m.id as number,
      date: m.date ? m.date.split("T")[0] : "",
      time: m.time ? m.time.slice(0, 5) : "",
      homeTeam: home.name,
      homeTeamLogo: home.logo,
      homeIsClub: home.isClub,
      awayTeam: away.name,
      awayTeamLogo: away.logo,
      awayIsClub: away.isClub,
      homeScore: m.score_home,
      awayScore: m.score_away,
      venueId: m.venue_id,
      venueName: m.venue_name,
      serieReference: m.serie_reference,
      competitionName:
        getCompetitionName(m.serie_reference, season) || m.serie_reference,
      liveLink: m.live_link,
      replayLink: m.replay_link,
    };
  });
}

// Cle distincte de celle de la route publique : `unstable_cache` indexe sur la
// cle, pas sur la fonction, et les deux ne renvoient pas la meme forme.
export const getMatchs = unstable_cache(fetchMatchs, ["matches-page"], {
  tags: ["matches", "teams"],
});
