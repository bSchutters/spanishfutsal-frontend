import { NextResponse } from 'next/server'
import { getMatchs } from '@/lib/getMatchs'
import { extractVideoId, getViewers, getYoutubeLive } from '@/lib/getYoutubeLive'

// La diffusion demarre avant le coup d envoi et la meme duree de match que sur
// le front ferme la fenetre : au-dela, la rencontre est consideree terminee.
const WINDOW_BEFORE_MS = 30 * 60 * 1000
const WINDOW_AFTER_MS = 70 * 60 * 1000

// Une minute cote navigateur comme cote CDN : la reponse change pendant la
// rencontre, elle ne peut pas etre figee comme les autres routes publiques.
const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=120',
}

// Delais que la route conseille au navigateur avant de revenir. Le bandeau est
// monte sur toutes les pages : sans cette indication, il interrogerait la route
// toutes les minutes, jour et nuit, pour une rencontre par semaine.
const RAPPEL_PENDANT = 60
const RAPPEL_APPROCHE = 300
const RAPPEL_LOIN = 3600

const APPROCHE_MS = 6 * 60 * 60 * 1000

export const dynamic = 'force-dynamic'

/**
 * La LFFS donne la date et l heure en heure belge, sans decalage ecrit. Le
 * navigateur du visiteur les lit donc juste, mais pas la fonction Vercel, qui
 * tourne en UTC : une rencontre de 20h30 y serait placee deux heures trop tot.
 */
function brusselsOffset(utcMs: number): number {
  const date = new Date(utcMs)
  const local = new Date(date.toLocaleString('en-US', { timeZone: 'Europe/Brussels' }))
  const utc = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }))
  return local.getTime() - utc.getTime()
}

function kickoff(date: string, time: string): number {
  const naive = Date.parse(`${date}T${time.slice(0, 5)}:00Z`)
  return Number.isNaN(naive) ? NaN : naive - brusselsOffset(naive)
}

/** Dans combien de secondes le navigateur a interet a redemander. */
function rappel(coupsDEnvoi: number[], now: number, enCours: boolean): number {
  if (enCours) return RAPPEL_PENDANT

  const prochain = coupsDEnvoi.filter((t) => t > now).sort((a, b) => a - b)[0]
  if (prochain && prochain - now < APPROCHE_MS) return RAPPEL_APPROCHE

  return RAPPEL_LOIN
}

/**
 * Y a-t-il une diffusion en cours, laquelle, et pour quelle rencontre.
 *
 * L interrogation de YouTube n a lieu que si une rencontre est en cours : sans
 * cette condition, une verification toutes les trois minutes autour de l horloge
 * epuiserait a elle seule cinq fois le quota quotidien.
 */
export async function GET() {
  try {
    const matchs = await getMatchs()
    const now = Date.now()

    const coupsDEnvoi = matchs
      .filter((match) => match.date && match.time)
      .map((match) => kickoff(match.date, match.time))
      .filter((t) => !Number.isNaN(t))

    const current = matchs.find((match) => {
      if (!match.date || !match.time) return false
      const start = kickoff(match.date, match.time)
      if (Number.isNaN(start)) return false
      return now >= start - WINDOW_BEFORE_MS && now < start + WINDOW_AFTER_MS
    })

    if (!current) {
      return NextResponse.json(
        { live: false, nextCheckIn: rappel(coupsDEnvoi, now, false) },
        { headers: CACHE_HEADERS }
      )
    }

    const affiche = {
      // L identifiant permet a la bonne carte de /matchs de se reconnaitre,
      // sans avoir a comparer des noms d equipes.
      id: current.id,
      homeTeam: current.homeTeam,
      awayTeam: current.awayTeam,
      competition: current.competitionName,
      time: current.time,
    }

    // Le champ Lien Live de l admin l emporte sur la detection : il permet de
    // pointer une diffusion qui n est pas sur la chaine du club. Elle ne
    // s integre a la page que si elle est bien sur YouTube.
    if (current.liveLink) {
      const videoId = extractVideoId(current.liveLink)

      return NextResponse.json(
        {
          live: true,
          url: current.liveLink,
          videoId,
          viewers: videoId ? await getViewers(videoId) : null,
          title: null,
          source: 'manuel',
          match: affiche,
          nextCheckIn: RAPPEL_PENDANT,
        },
        { headers: CACHE_HEADERS }
      )
    }

    const broadcast = await getYoutubeLive()

    if (!broadcast) {
      return NextResponse.json({ live: false, nextCheckIn: rappel(coupsDEnvoi, now, true) }, { headers: CACHE_HEADERS })
    }

    return NextResponse.json(
      { live: true, ...broadcast, source: 'youtube', match: affiche, nextCheckIn: RAPPEL_PENDANT },
      { headers: CACHE_HEADERS }
    )
  } catch (error) {
    // Une erreur ici ne vaut pas une page en echec : le bandeau reste masque.
    console.error('Etat du live indisponible :', error)
    return NextResponse.json({ live: false, nextCheckIn: RAPPEL_LOIN }, { headers: CACHE_HEADERS })
  }
}
