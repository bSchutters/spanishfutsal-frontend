import { calculerLeRapport } from "./audience";
import type { Rapport } from "./audienceCalculs";
import { coupDEnvoi, FENETRE_APRES_MS } from "./fenetreDuMatch";
import { getMatchs } from "./getMatchs";
import { getPayloadClient } from "./payload";

/**
 * Le compte rendu d'une diffusion, ecrit a la fin du direct.
 *
 * Il ne va pas sur le site : l'audience du club ne regarde personne d'autre. Il
 * se lit dans le Hub, module Direct, ou chaque soiree se compare a la
 * precedente.
 *
 * Il etait aussi pousse vers un salon Discord. Ce salon a ete supprime en
 * septembre 2026, le Hub faisant mieux : on va chercher les chiffres quand on
 * veut les savoir, et on les compare. Tout ce qui redigeait et envoyait le
 * message est parti avec lui.
 *
 * La fin d'une diffusion peut etre constatee deux fois, par le dernier visiteur
 * encore present comme par le rattrapage du matin : la fiche existante suffit a
 * savoir qu'il n'y a plus rien a faire.
 */

export async function cloturerLaDiffusion(
  matchId: number,
  affiche: string,
  // `recalculer: true` : la fiche existante est refaite. C'est le cas de
  // l'essai du direct, qu'on rejoue autant de fois qu'on veut.
  options: { recalculer?: boolean } = {},
): Promise<void> {
  try {
    const payload = await getPayloadClient();

    const { docs } = await payload.find({
      collection: "live-reports",
      where: { match: { equals: matchId } },
      limit: 1,
      depth: 0,
    });

    const existant = docs[0] as { id: number | string } | undefined;

    // Le rapport d'une soiree s'ecrit une fois. Sans cette sortie, chaque
    // interrogation de la route le recalculerait jusqu'a la fermeture de la
    // fenetre.
    if (existant && !options.recalculer) return;

    const rapport = await calculerLeRapport(matchId);
    if (!rapport) return;

    const {
      uniques,
      pointe,
      dureeMoyenneMinutes,
      partMobile,
      debut,
      fin,
      courbe,
      ...details
    } = rapport;

    const chiffres = {
      match: matchId,
      affiche,
      debut,
      fin,
      uniques,
      pointe,
      duree_moyenne: dureeMoyenneMinutes,
      part_mobile: partMobile,
      courbe,
      // Le reste des mesures dans un seul bloc : en ajouter une ne demande pas
      // de toucher a la base.
      details,
    };

    if (existant) {
      await payload.update({
        collection: "live-reports",
        id: existant.id,
        data: chiffres,
      });
      return;
    }

    await payload.create({ collection: "live-reports", data: chiffres });
  } catch (error) {
    // Un rapport manque : la diffusion, elle, s'est bien passee.
    console.error("Cloture de la diffusion impossible :", error);
  }
}

/**
 * Reprend les diffusions passees dont le rapport manque encore.
 *
 * La cloture normale a lieu quand un visiteur encore present constate que la
 * salle s'est eteinte. Si tout le monde ferme son onglet au coup de sifflet
 * final, personne ne la constate : ce balayage est le filet.
 */
export async function balayerLesDiffusions(): Promise<number> {
  const matchs = await getMatchs();
  const now = Date.now();
  let clotures = 0;

  for (const match of matchs) {
    if (!match.date || !match.time) continue;

    const debut = coupDEnvoi(match.date, match.time);
    if (Number.isNaN(debut)) continue;

    const finDeFenetre = debut + FENETRE_APRES_MS;

    // Les trois derniers jours : au-dela, une diffusion sans rapport n'en aura
    // jamais, et ratisser toute la saison a chaque passage ne servirait a rien.
    if (finDeFenetre > now || now - finDeFenetre > 3 * 24 * 60 * 60 * 1000)
      continue;

    await cloturerLaDiffusion(
      match.id,
      `${match.homeTeam} - ${match.awayTeam}`,
    );
    clotures += 1;
  }

  return clotures;
}
