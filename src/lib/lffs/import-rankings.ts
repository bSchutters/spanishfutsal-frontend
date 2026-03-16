import type { Payload } from 'payload'
import { getLffsToken } from './get-token'

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

    // Find active season
    const seasonsResult = await payload.find({
      collection: 'seasons',
      where: { active: { equals: true } },
      limit: 1,
    })
    const season = seasonsResult.docs[0]

    if (!season) {
      console.log('No active season found')
      await upsertLffsUpdate(payload, 'ranking', {
        status: 'error',
        error_message: 'Aucune saison active trouvee',
      })
      return { success: false, error: 'No active season' }
    }

    // Get token
    const settings = await payload.findGlobal({ slug: 'settings' })
    const token = await getLffsToken({ manualToken: settings.lffs_token })

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

    // Get previous rankings for change detection
    const lastRankings = await payload.find({
      collection: 'rankings',
      where: { season: { equals: season.id } },
      limit: 1000,
      sort: '-imported_at',
    })

    const lastRankingMap = new Map<string, (typeof lastRankings.docs)[number]>()
    for (const entry of lastRankings.docs) {
      if (!lastRankingMap.has(entry.team_name)) {
        lastRankingMap.set(entry.team_name, entry)
      }
    }

    // Check if ranking changed
    let hasChanged = false
    for (const team of rankings) {
      const previous = lastRankingMap.get(team.team_name)
      if (
        !previous ||
        previous.position !== team.position ||
        previous.points !== team.points ||
        previous.wins !== team.wins ||
        previous.losses !== team.losses ||
        previous.draws !== team.draws ||
        previous.goals_for !== team.score_for ||
        previous.goals_against !== team.score_against
      ) {
        hasChanged = true
        break
      }
    }

    if (!hasChanged) {
      console.log('Rankings unchanged, skipping import')
      await upsertLffsUpdate(payload, 'ranking', {
        status: 'success',
        items_processed: 0,
      })
      return { success: true, updated: 0, message: 'unchanged' }
    }

    // Build previous position map
    const previousPositions = new Map<string, number>()
    for (const entry of lastRankings.docs) {
      if (!previousPositions.has(entry.team_name) && entry.position) {
        previousPositions.set(entry.team_name, entry.position)
      }
    }

    // Update rankings
    let processed = 0
    for (const team of rankings) {
      const goalDiff = team.score_for - team.score_against
      const prevPos = previousPositions.get(team.team_name)

      let positionChange: 'no_change' | 'up' | 'down' = 'no_change'
      if (typeof prevPos === 'number') {
        if (prevPos > team.position) positionChange = 'up'
        else if (prevPos < team.position) positionChange = 'down'
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

      // Upsert: find existing by team_name + season
      const existing = await payload.find({
        collection: 'rankings',
        where: {
          and: [
            { team_name: { equals: team.team_name } },
            { season: { equals: season.id } },
          ],
        },
        limit: 1,
      })

      if (existing.docs.length > 0) {
        await payload.update({
          collection: 'rankings',
          id: existing.docs[0].id,
          data: rankingData,
        })
      } else {
        await payload.create({
          collection: 'rankings',
          data: rankingData,
        })
      }
      processed++
    }

    await upsertLffsUpdate(payload, 'ranking', {
      status: 'success',
      items_processed: processed,
    })

    console.log(`Rankings imported: ${processed} teams`)
    return { success: true, updated: processed }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Error importing rankings:', msg)
    await upsertLffsUpdate(payload, 'ranking', {
      status: 'error',
      error_message: msg,
    })
    return { success: false, error: msg }
  }
}

async function upsertLffsUpdate(
  payload: Payload,
  type: 'ranking' | 'matches',
  options: { status?: string; error_message?: string; items_processed?: number }
) {
  const { status = 'success', error_message, items_processed } = options

  const existing = await payload.find({
    collection: 'lffs-updates',
    where: { type: { equals: type } },
    limit: 1,
  })

  const updateData: Record<string, unknown> = {
    type,
    last_update: new Date().toISOString(),
    status,
    error_message: error_message || null,
    items_processed: items_processed ?? null,
  }

  if (existing.docs.length > 0) {
    await payload.update({
      collection: 'lffs-updates',
      id: existing.docs[0].id,
      data: updateData,
    })
  } else {
    await payload.create({
      collection: 'lffs-updates',
      data: updateData,
    })
  }
}
