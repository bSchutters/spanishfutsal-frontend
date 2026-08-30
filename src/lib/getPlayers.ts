import { unstable_cache } from 'next/cache'
import { getPayloadClient } from './payload'

/**
 * Source unique de l'effectif et de ses statistiques, partagee par la page
 * /equipe et par la route publique. La page la lit directement, ce qui met les
 * joueurs dans le HTML des la premiere frame.
 */
async function getPlayersWithStats() {
  const payload = await getPayloadClient()

  const seasonsResult = await payload.find({
    collection: 'seasons',
    where: { active: { equals: true } },
    limit: 1,
  })
  const activeSeason = seasonsResult.docs[0]

  const playersResult = await payload.find({
    collection: 'players',
    limit: 1000,
    where: { actif: { equals: true } },
    depth: 1,
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let matches: any[] = []
  if (activeSeason) {
    const matchesResult = await payload.find({
      collection: 'matches',
      where: { season: { equals: activeSeason.id } },
      limit: 1000,
      depth: 2,
    })
    matches = matchesResult.docs
  }

  const playersWithStats = playersResult.docs.map((player) => {
    const stats = {
      matchesPlayed: 0,
      goals: 0,
      assists: 0,
      yellowCards: 0,
      redCards: 0,
      cleanSheets: 0,
      isGoalkeeper: player.poste === 'Gardien',
    }

    for (const match of matches) {
      if (match.field_players_stats) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const playerStat = match.field_players_stats.find((s: any) => {
          const joueurId = typeof s.joueur === 'object' && s.joueur !== null ? s.joueur.id : s.joueur
          return joueurId === player.id
        })
        if (playerStat) {
          stats.matchesPlayed++
          stats.goals += playerStat.goals || 0
          stats.assists += playerStat.assists || 0
          stats.yellowCards += playerStat.yellow_cards || 0
          stats.redCards += playerStat.red_cards || 0
        }
      }

      if (match.goalkeeper_stats) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const gkStat = match.goalkeeper_stats.find((s: any) => {
          const joueurId = typeof s.joueur === 'object' && s.joueur !== null ? s.joueur.id : s.joueur
          return joueurId === player.id
        })
        if (gkStat) {
          stats.matchesPlayed++
          stats.isGoalkeeper = true
          stats.goals += gkStat.goals || 0
          stats.assists += gkStat.assists || 0
          stats.cleanSheets += gkStat.clean_sheet ? 1 : 0
          stats.yellowCards += gkStat.yellow_cards || 0
          stats.redCards += gkStat.red_cards || 0
        }
      }
    }

    const photo = player.photo && typeof player.photo === 'object'
      ? { url: (player.photo as { url?: string }).url }
      : null

    return {
      id: player.id,
      prenom: player.prenom,
      nom: player.nom,
      numero: player.numero,
      poste: player.poste === 'Coach' || player.poste === 'Kine' ? 'Staff' : player.poste,
      photo,
      stats,
      actif: player.actif,
      capitaine: player.capitaine,
    }
  })

  const inactiveResult = await payload.find({
    collection: 'players',
    limit: 1000,
    where: { actif: { equals: false } },
    depth: 1,
  })

  const inactivePlayers = inactiveResult.docs.map((player) => {
    const photo = player.photo && typeof player.photo === 'object'
      ? { url: (player.photo as { url?: string }).url }
      : null

    return {
      id: player.id,
      prenom: player.prenom,
      nom: player.nom,
      numero: player.numero,
      poste: player.poste === 'Coach' || player.poste === 'Kine' ? 'Staff' : player.poste,
      photo,
      stats: null,
      actif: player.actif,
      capitaine: player.capitaine,
    }
  })

  return [...playersWithStats, ...inactivePlayers]
}

export const getPlayers = unstable_cache(getPlayersWithStats, ['players-page'], {
  tags: ['players', 'matches'],
})

export type PlayerStats = {
  goals: number
  assists: number
  yellowCards: number
  redCards: number
  matchesPlayed: number
  cleanSheets: number
}

export type Player = {
  id: number
  prenom: string
  nom: string
  photo: string
  numero: number
  stats: PlayerStats
  actif: boolean
  capitaine: boolean
  poste: 'Joueur' | 'Gardien' | 'Staff'
  isGoalkeeper: boolean
}

const NO_STATS: PlayerStats = {
  goals: 0,
  assists: 0,
  yellowCards: 0,
  redCards: 0,
  matchesPlayed: 0,
  cleanSheets: 0,
}

/**
 * Mise en forme pour l'affichage : photo de repli, statistiques toujours
 * presentes. Reprend a l'identique ce que faisait le store cote client, pour
 * que la page serveur et la page d'accueil montrent les memes joueurs.
 */
export async function getPlayersForDisplay(): Promise<Player[]> {
  const players = await getPlayers()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (players as any[]).map((p) => ({
    id: p.id,
    nom: p.nom,
    prenom: p.prenom,
    photo: p.photo?.url || '/assets/images/webp/placeholder.webp',
    numero: p.numero,
    poste: p.poste,
    stats: p.stats
      ? {
          goals: p.stats.goals || 0,
          assists: p.stats.assists || 0,
          yellowCards: p.stats.yellowCards || 0,
          redCards: p.stats.redCards || 0,
          matchesPlayed: p.stats.matchesPlayed || 0,
          cleanSheets: p.stats.cleanSheets || 0,
        }
      : NO_STATS,
    actif: p.actif,
    capitaine: p.capitaine,
    isGoalkeeper: p.stats?.isGoalkeeper || p.poste === 'Gardien',
  }))
}
