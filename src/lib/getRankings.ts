import { unstable_cache } from "next/cache";
import { getTeamsIndex } from "./getTeamsIndex";
import { getPayloadClient } from "./payload";
import { resolveTeam } from "./teams";

export type Ranking = {
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

/**
 * Source unique du classement, partagee par la page et par la route publique.
 * La page la lit directement, ce qui met les donnees dans le HTML des la
 * premiere frame ; la route ne sert plus qu'au changement de saison, declenche
 * apres coup par l'utilisateur.
 */
async function fetchRankings(seasonId?: number | null): Promise<Ranking[]> {
  const payload = await getPayloadClient();

  const season =
    seasonId ??
    (
      await payload.find({
        collection: "seasons",
        where: { active: { equals: true } },
        limit: 1,
      })
    ).docs[0]?.id;

  const teams = await getTeamsIndex(payload);

  const result = await payload.find({
    collection: "rankings",
    limit: 1000,
    sort: "position",
    ...(season && { where: { season: { equals: season } } }),
  });

  return result.docs.map((r) => {
    const team = resolveTeam(teams, r.team_name);

    return {
      id: r.id as number,
      teamName: team.name,
      teamLogo: team.logo,
      isClub: team.isClub,
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
    };
  });
}

// Cle distincte de celle de la route publique : `unstable_cache` indexe sur la
// cle, pas sur la fonction, et les deux ne renvoient pas la meme forme.
export const getRankings = unstable_cache(fetchRankings, ["rankings-page"], {
  tags: ["rankings", "teams"],
});
