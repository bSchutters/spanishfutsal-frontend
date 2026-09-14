import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getMatchs } from '@/lib/getMatchs'
import { getPayloadClient } from '@/lib/payload'
import { extraireSalle, getXbotgoLive, salleDepuisTexte, type SalleXbotgo } from '@/lib/getXbotgoLive'
import { coupDEnvoi as kickoff, dansLaFenetre } from '@/lib/fenetreDuMatch'
import { compterLesSpectateurs } from '@/lib/audience'
import { cloturerLaDiffusion } from '@/lib/rapportDeDiffusion'
import { extractVideoId, getBroadcastById, getViewers, getYoutubeLive } from '@/lib/getYoutubeLive'

// La fenetre de recherche, plus courte. La recherche coute cent unites de quota
// contre une pour tout le reste, et c est le seul appel qui tourne pour rien
// quand le club ne diffuse pas. Passe ce delai sans rien avoir trouve, il n y a
// plus rien a trouver : la chaine n a pas ouvert pour ce match.
const RECHERCHE_APRES_MS = 15 * 60 * 1000

/**
 * Deux regimes de cache, et jamais de cache dans le navigateur.
 *
 * `max-age=60` figeait la reponse chez le visiteur : le bandeau relisait sa
 * propre copie au lieu d'interroger le site, et le nombre de spectateurs ne
 * bougeait qu'apres un rechargement force. C'est le bandeau qui decide du
 * rythme, pas le cache du navigateur.
 *
 * Le CDN, lui, garde toujours quelque chose : c'est lui qui fait que la
 * consommation ne depend pas de l'affluence. Cinq secondes pendant la
 * rencontre, pour que le compteur soit vivant, une minute le reste du temps.
 * Cinq secondes veut dire au pire douze passages par minute chez nous, quel que
 * soit le nombre de spectateurs.
 */
const CACHE_DIRECT = {
  'Cache-Control': 'public, max-age=0, s-maxage=5, stale-while-revalidate=15',
}

const CACHE_REPOS = {
  'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=120',
}

// La regle : toute reponse qui donne rendez-vous dans quarante-cinq secondes
// decrit une rencontre en cours et prend CACHE_DIRECT. Les autres, CACHE_REPOS.

// Delais que la route conseille au navigateur avant de revenir. Le bandeau est
// monte sur toutes les pages : sans cette indication, il interrogerait la route
// toutes les minutes, jour et nuit, pour une rencontre par semaine.
//
// Trente secondes pendant la rencontre : c'est le rythme du compteur de
// spectateurs, et il doit se voir bouger. Le CDN, lui, ne laisse passer qu'une
// interrogation toutes les quinze secondes, donc l'affluence ne coute rien.
const RAPPEL_PENDANT = 30
const RAPPEL_APPROCHE = 300
const RAPPEL_LOIN = 3600

const APPROCHE_MS = 6 * 60 * 60 * 1000

// Avant cela, une salle eteinte veut dire que la diffusion n a pas encore
// commence, ou qu elle a hoquete. Apres, c est une fin de rencontre.
const CLOTURE_APRES_MS = 45 * 60 * 1000

export const dynamic = 'force-dynamic'

/**
 * Une salle imposee par le cookie `salle-essai`, en developpement seulement.
 *
 * Eprouver le direct demande un direct, et il ne s'en presente pas sur commande.
 * Ce detour joue n'importe quelle salle en cours sur le site lui-meme, bandeau
 * et lecteur compris, sans attendre une rencontre et sans ecrire dans les
 * parametres, qui sont partages avec la production.
 *
 * Le garde sur l'environnement est ce qui compte : en production, ce cookie ne
 * peut rien, quoi qu'on y mette.
 */
async function salleDEssai(): Promise<SalleXbotgo | null> {
  if (process.env.NODE_ENV === 'production') return null

  return salleDepuisTexte((await cookies()).get('salle-essai')?.value ?? '')
}

/** Dans combien de secondes le navigateur a interet a redemander. */
function rappel(coupsDEnvoi: number[], now: number, enCours: boolean): number {
  if (enCours) return RAPPEL_PENDANT

  const prochain = coupsDEnvoi.filter((t) => t > now).sort((a, b) => a - b)[0]
  if (prochain && prochain - now < APPROCHE_MS) return RAPPEL_APPROCHE

  return RAPPEL_LOIN
}

/**
 * Retient l adresse de la diffusion dans le champ Lien Replay.
 *
 * Une fois le direct termine, la video reste sur la chaine sous le meme
 * identifiant : l adresse du direct est donc deja celle du replay. L ecrire
 * pendant la rencontre evite d avoir a la retrouver apres coup, ce qui
 * demanderait de fouiller la chaine et de deviner quelle video correspond a
 * quel match.
 *
 * Le champ n est rempli que s il est vide : une saisie manuelle garde la main.
 * Le crochet de la collection revalide le cache des matchs, la carte affiche
 * donc son bouton Replay sans autre intervention.
 */
async function memoriserLeReplay(matchId: number, url: string) {
  try {
    const payload = await getPayloadClient()
    await payload.update({ collection: 'matches', id: matchId, data: { replay_link: url } })
  } catch (error) {
    // Un echec ici ne doit pas priver les visiteurs du direct en cours.
    console.error('Memorisation du replay impossible :', error)
  }
}

type Reglages = {
  /**
   * La case « Verifier le direct XbotGo maintenant ».
   *
   * Elle sert aux essais sur place : le club arrive, lance sa diffusion et veut
   * la voir sur le site sans attendre le coup d envoi. Elle ne vaut que pour
   * XbotGo, dont l interrogation ne coute rien ; la recherche YouTube reste
   * enfermee dans sa fenetre puisque c est elle qui consomme le quota.
   */
  forcer: boolean
  /**
   * La salle de diffusion du club, reglee une fois pour toutes. Le lien ne
   * change jamais d une rencontre a l autre : le demander dans chaque match
   * etait une corvee et une occasion d oubli.
   */
  salle: string | null
}

/**
 * Les reglages, relus a chaque invocation.
 *
 * Une seule ligne dans une table d une ligne, et l entete de cache de la route
 * ramene le tout a une lecture par minute quelle que soit l affluence. La
 * mettre en cache ferait perdre a la case son interet, qui est de repondre tout
 * de suite quand on la coche depuis le terrain.
 */
async function lireReglages(): Promise<Reglages> {
  try {
    const payload = await getPayloadClient()
    const parametres = await payload.findGlobal({ slug: 'settings' })

    return {
      forcer: Boolean(parametres?.force_live_check),
      salle: parametres?.xbotgo_room ?? null,
    }
  } catch (error) {
    console.error('Parametres illisibles :', error)
    return { forcer: false, salle: null }
  }
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
    const reglages = await lireReglages()

    // La salle du club, celle des parametres. Le champ Lien Live d une
    // rencontre precise reste prioritaire sur elle.
    const salleDuClub = extraireSalle(reglages.salle ?? '')

    const coupsDEnvoi = matchs
      .filter((match) => match.date && match.time)
      .map((match) => kickoff(match.date, match.time))
      .filter((t) => !Number.isNaN(t))

    const essai = await salleDEssai()

    let current = matchs.find((match) => dansLaFenetre(match, now))

    // Hors fenetre, une salle d'essai designe la rencontre la plus proche, pour
    // que l'affiche et le compteur aient de quoi s'accrocher.
    if (!current && essai) {
      current = matchs
        .filter((match) => match.date && match.time)
        .sort((a, b) => Math.abs(kickoff(a.date, a.time) - now) - Math.abs(kickoff(b.date, b.time) - now))[0]
    }

    // Hors fenetre, la case des parametres permet un essai sur place. Elle ne
    // designe que des rencontres portant une salle XbotGo : la recherche
    // YouTube n est jamais declenchee de cette facon, c est elle qui coute.
    if (!current && reglages.forcer) {
      current = matchs
        .filter((match) => match.date && match.time && (salleDuClub || extraireSalle(match.liveLink ?? '')))
        .sort((a, b) => Math.abs(kickoff(a.date, a.time) - now) - Math.abs(kickoff(b.date, b.time) - now))[0]
    }

    if (!current) {
      return NextResponse.json({ live: false, nextCheckIn: rappel(coupsDEnvoi, now, false) }, { headers: CACHE_REPOS })
    }

    const coupDEnvoi = kickoff(current.date, current.time)
    const chercheEncore = now < coupDEnvoi + RECHERCHE_APRES_MS

    const affiche = {
      // L identifiant permet a la bonne carte de /matchs de se reconnaitre,
      // sans avoir a comparer des noms d equipes.
      id: current.id,
      homeTeam: current.homeTeam,
      awayTeam: current.awayTeam,
      competition: current.competitionName,
      time: current.time,
    }

    // La diffusion du club se joue sur le site meme : leur API rend une adresse
    // HLS que notre lecteur lit directement, sans cadre ni page intermediaire.
    //
    // Le champ Lien Live du match l emporte sur la salle des parametres, pour
    // la rencontre exceptionnelle diffusee ailleurs.
    const salleXbotgo = essai ?? (current.liveLink ? extraireSalle(current.liveLink) : salleDuClub)

    if (salleXbotgo) {
      const diffusion = await getXbotgoLive(salleXbotgo)

      if (!diffusion) {
        // Salle eteinte alors que la rencontre est bien avancee : c'est une fin
        // de diffusion, pas un essai avant le coup d envoi. Le rapport
        // d audience est ecrit ici, une seule fois, et le rattrapage du matin
        // sert de filet si personne n a constate cette fin.
        if (now > coupDEnvoi + CLOTURE_APRES_MS) {
          await cloturerLaDiffusion(current.id, `${current.homeTeam} - ${current.awayTeam}`)
        }

        return NextResponse.json({ live: false, nextCheckIn: RAPPEL_PENDANT }, { headers: CACHE_DIRECT })
      }

      return NextResponse.json(
        {
          live: true,
          url: current.liveLink || reglages.salle,
          hlsUrl: diffusion.hlsUrl,
          videoId: null,
          // Nos spectateurs, et non les leurs : leur compteur decrit les gens
          // sur leur page, qui est vide depuis que le match se regarde ici.
          viewers: await compterLesSpectateurs(current.id),
          source: 'xbotgo',
          match: affiche,
          nextCheckIn: RAPPEL_PENDANT,
        },
        { headers: CACHE_DIRECT }
      )
    }

    // Le champ Lien Live de l admin l emporte sur la detection : il permet de
    // pointer une diffusion qui n est pas sur la chaine du club. Elle ne
    // s integre a la page que si elle est bien sur YouTube.
    if (current.liveLink) {
      const videoId = extractVideoId(current.liveLink)

      if (videoId && !current.replayLink) {
        await memoriserLeReplay(current.id, current.liveLink)
      }

      return NextResponse.json(
        {
          live: true,
          url: current.liveLink,
          videoId,
          viewers: videoId ? await getViewers(videoId) : null,
          source: 'manuel',
          match: affiche,
          nextCheckIn: RAPPEL_PENDANT,
        },
        { headers: CACHE_DIRECT }
      )
    }

    // La recherche ne sert qu a decouvrir la diffusion, une fois. Son
    // identifiant est ensuite retenu dans le champ Lien Replay, et la
    // surveiller ne coute plus qu une unite de quota au lieu de cent.
    const dejaConnu = current.replayLink ? extractVideoId(current.replayLink) : null

    if (dejaConnu) {
      const encoreEnCours = await getBroadcastById(dejaConnu)

      // Elle s est arretee : la rencontre a eu sa diffusion, il n y a plus rien
      // a chercher jusqu a la fermeture de la fenetre.
      if (!encoreEnCours) {
        return NextResponse.json({ live: false, nextCheckIn: RAPPEL_PENDANT }, { headers: CACHE_DIRECT })
      }

      return NextResponse.json(
        { live: true, ...encoreEnCours, source: 'youtube', match: affiche, nextCheckIn: RAPPEL_PENDANT },
        { headers: CACHE_DIRECT }
      )
    }

    if (!chercheEncore) {
      return NextResponse.json({ live: false, nextCheckIn: RAPPEL_APPROCHE }, { headers: CACHE_REPOS })
    }

    const broadcast = await getYoutubeLive()

    if (!broadcast) {
      return NextResponse.json({ live: false, nextCheckIn: rappel(coupsDEnvoi, now, true) }, { headers: CACHE_DIRECT })
    }

    await memoriserLeReplay(current.id, broadcast.url)

    return NextResponse.json(
      { live: true, ...broadcast, source: 'youtube', match: affiche, nextCheckIn: RAPPEL_PENDANT },
      { headers: CACHE_DIRECT }
    )
  } catch (error) {
    // Une erreur ici ne vaut pas une page en echec : le bandeau reste masque.
    console.error('Etat du live indisponible :', error)
    return NextResponse.json({ live: false, nextCheckIn: RAPPEL_LOIN }, { headers: CACHE_REPOS })
  }
}
