import { getMatchs } from "./getMatchs";
import { getMisesEnLigne } from "./getYoutubeLive";
import { getPayloadClient } from "./payload";
import { FENETRE_JOURS, JOUR_MS, rapprocher } from "./replayMatching";

/**
 * Le rattrapage des replays.
 *
 * La diffusion passe par le flux du club, dont l'adresse est signee et expire :
 * contrairement a une video YouTube, elle ne survit pas a la rencontre. Le
 * replay arrive donc par un autre chemin, la mise en ligne de l'enregistrement
 * sur la chaine, et il fallait jusqu'ici aller chercher son adresse a la main.
 *
 * Ce module lit les dernieres mises en ligne de la chaine et les rapproche des
 * rencontres jouees dont le champ Lien Replay est encore vide. Deux unites de
 * quota par passage, quel que soit le nombre de matchs.
 *
 * La reconnaissance ne demande aucune discipline de titre particuliere : le nom
 * de l'adversaire suffit. Un titre qui porte en plus la date de la rencontre
 * leve toute ambiguite, y compris entre l'aller et le retour contre la meme
 * equipe.
 */

export type Rattrapage = {
  examines: number;
  remplis: { id: number; affiche: string; url: string }[];
  /** Rencontres jouees dont aucune mise en ligne ne parle encore. */
  sansReplay: string[];
  /** Renseigne quand le rattrapage n'a pas pu avoir lieu du tout. */
  erreur?: string;
};

/**
 * Remplit le champ Lien Replay des rencontres jouees qui n'en ont pas encore.
 *
 * Le crochet de la collection revalide le cache des matchs : le bouton Replay
 * apparait sur la carte sans autre intervention.
 */
export async function rattraperLesReplays(): Promise<Rattrapage> {
  const rapport: Rattrapage = { examines: 0, remplis: [], sansReplay: [] };

  const videos = await getMisesEnLigne();

  if (!videos) {
    rapport.erreur =
      "Liste des mises en ligne indisponible : cle YouTube absente, quota epuise ou panne chez eux.";
    return rapport;
  }

  const matchs = await getMatchs();
  const now = Date.now();

  const aRattraper = matchs.filter((match) => {
    if (!match.date || match.replayLink) return false;

    const jour = Date.parse(`${match.date}T00:00:00Z`);
    if (Number.isNaN(jour)) return false;

    const age = now - jour;
    return age > 0 && age <= FENETRE_JOURS * JOUR_MS;
  });

  rapport.examines = aRattraper.length;

  if (!aRattraper.length) return rapport;

  const payload = await getPayloadClient();

  for (const match of aRattraper) {
    const affiche = `${match.homeTeam} - ${match.awayTeam}`;
    const video = rapprocher(match, videos);

    if (!video) {
      rapport.sansReplay.push(affiche);
      continue;
    }

    try {
      await payload.update({
        collection: "matches",
        id: match.id,
        data: { replay_link: video.url },
      });

      rapport.remplis.push({ id: match.id, affiche, url: video.url });
    } catch (error) {
      console.error(`Replay non enregistre pour ${affiche} :`, error);
      rapport.sansReplay.push(affiche);
    }
  }

  return rapport;
}
