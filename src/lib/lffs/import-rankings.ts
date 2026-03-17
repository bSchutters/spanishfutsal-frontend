import type { Payload } from 'payload'
import { getLffsToken } from './get-token'
import { upsertLffsUpdate } from './upsert-update'

const BASE_URL = 'https://gestion.lffs.eu/lms_league_ws/public/api/v1'

interface LffsTeamRanking {
  team_name: string
  position: number
  played: number
  points: number
  wins: number
  losses: number
  draws: number
  score_for: number
  score_against: number
  result_sequence: string
}

export async function importRankings(payload: Payload) {
  try {
    await upsertLffsUpdate(payload, 'ranking', { status: 'in_progress' })

    const seasonsResult = await payload.find({
      collection: 'seasons',
      where: { active: { equals: true } },
      limit: 1,
    })
    const season = seasonsResult.docs[0]

    if (!season) {
      await upsertLffsUpdate(payload, 'ranking', {
        status: 'error',
        error_message: 'Aucune saison active trouvee',
      })
      return { success: false, error: 'No active season' }
    }

    const settings = await payload.findGlobal({ slug: 'settings' })
    const token = await getLffsToken({ manualToken: settings.lffs_token, payload })

    const url = `${BASE_URL}/ranking/byMyLeague?serie_id=${season.serie_id}`
    const res = await fetch(url, {
      headers: {
        Authorization: `WP_Access ${token}`,
        Origin: 'https://www.lffs.eu',
        Referer: 'https://www.lffs.eu/',
      },
    })

    if (!res.ok) {
      throw new Error(`LFFS API returned ${res.status}`)
    }

    const data = await res.json()
    const rankings: LffsTeamRanking[] = Array.isArray(data.elements) ? data.elements : data
    if (!Array.isArray(rankings)) {
      throw new Error('Unexpected ranking format')
    }

    // Batch-fetch existing rankings for this season (#7 fix)
    const existingResult = await payload.find({
      collection: 'rankings',
      where: { season: { equals: season.id } },
      limit: 1000,
    })
    const existingMap = new Map<string, { id: number; position?: number | null }>()
    for (const doc of existingResult.docs) {
      existingMap.set(doc.team_name, { id: doc.id as number, position: doc.position })
    }

    // Check if ranking changed (compare position, points, and played)
    let hasChanged = false
    for (const team of rankings) {
      const previous = existingMap.get(team.team_name)
      if (!previous) {
        hasChanged = true
        break
      }
      // Fetch full data to compare points and played
      const fullDoc = existingResult.docs.find(d => d.team_name === team.team_name)
      if (
        previous.position !== team.position ||
        fullDoc?.points !== team.points ||
        fullDoc?.played !== team.played ||
        fullDoc?.wins !== team.wins ||
        fullDoc?.losses !== team.losses ||
        fullDoc?.draws !== team.draws ||
        fullDoc?.goals_for !== team.score_for ||
        fullDoc?.goals_against !== team.score_against
      ) {
        hasChanged = true
        break
      }
    }

    if (!hasChanged) {
      console.log('Rankings unchanged, skipping import')
      await upsertLffsUpdate(payload, 'ranking', { status: 'success', items_processed: 0 })
      return { success: true, updated: 0, message: 'unchanged' }
    }

    let processed = 0
    for (const team of rankings) {
      const goalDiff = team.score_for - team.score_against
      const existing = existingMap.get(team.team_name)

      let positionChange: 'no_change' | 'up' | 'down' = 'no_change'
      if (existing?.position != null) {
        if (existing.position > team.position) positionChange = 'up'
        else if (existing.position < team.position) positionChange = 'down'
      }

      const rankingData: Record<string, unknown> = {
        team_name: team.team_name,
        played: team.played,
        points: team.points,
        wins: team.wins,
        losses: team.losses,
        draws: team.draws,
        goals_for: team.score_for,
        goals_against: team.score_against,
        goal_difference: goalDiff,
        position: team.position,
        result_sequence: team.result_sequence,
        season: season.id,
        imported_at: new Date().toISOString(),
        positionChange,
      }

      if (existing) {
        await payload.update({ collection: 'rankings', id: existing.id, data: rankingData })
      } else {
        await payload.create({ collection: 'rankings', data: rankingData })
      }
      processed++
    }

    await upsertLffsUpdate(payload, 'ranking', { status: 'success', items_processed: processed })
    console.log(`Rankings imported: ${processed} teams`)
    return { success: true, updated: processed }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Error importing rankings:', msg)
    await upsertLffsUpdate(payload, 'ranking', { status: 'error', error_message: msg })
    return { success: false, error: msg }
  }
}
