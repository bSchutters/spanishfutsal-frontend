import type { Payload } from 'payload'
import { DEFAULT_TEAM_LOGO, normalizeTeamKey, type TeamDisplay, type TeamsIndex } from './teams'

/**
 * Indexes every LFFS name declared in the `teams` collection, so match and
 * ranking rows can be enriched with the public name and logo in one pass.
 */
export async function getTeamsIndex(payload: Payload): Promise<TeamsIndex> {
  const result = await payload.find({
    collection: 'teams',
    limit: 500,
    depth: 1,
  })

  const index: TeamsIndex = {}

  for (const team of result.docs) {
    const logo = typeof team.logo === 'object' && team.logo?.url ? team.logo.url : DEFAULT_TEAM_LOGO
    const entry: TeamDisplay = {
      name: team.name,
      logo,
      isClub: Boolean(team.is_club),
    }

    for (const lffsName of team.lffs_names ?? []) {
      if (lffsName) index[normalizeTeamKey(lffsName)] = entry
    }
    // The public name is a valid lookup too, for rows already stored renamed.
    index[normalizeTeamKey(team.name)] ??= entry
  }

  return index
}
