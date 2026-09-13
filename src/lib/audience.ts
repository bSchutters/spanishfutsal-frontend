import { resumer, type Rapport, type Trace } from "./audienceCalculs";
import { BATTEMENT_S, TOLERANCE_BATTEMENTS } from "./battement";
import { getPayloadClient } from "./payload";

export type { Rapport };

/**
 * Le comptage des spectateurs, chez nous.
 *
 * Le diffuseur compte les gens sur sa propre page : depuis que le match se
 * regarde ici, son chiffre ne decrit plus notre tribune. Le lecteur envoie donc
 * un signe de vie regulier, et c'est ce qui est compte.
 *
 * Rien de personnel n'est stocke, voir la collection : l'identifiant du visiteur
 * est tire au hasard, vit le temps de l'onglet et ne designe personne.
 */

/** Au-dela de ce delai sans signe, le spectateur n'est plus compte comme present. */
const PRESENCE_MS = TOLERANCE_BATTEMENTS * BATTEMENT_S * 1000;

/**
 * Nombre de spectateurs differents admis pour une rencontre.
 *
 * La route du battement est publique par nature, et son identifiant de visiteur
 * ne se verifie pas : rien n'empeche d'en inventer mille. Ce plafond borne les
 * degats a une table qui ne grossit plus, plutot que de laisser une soiree
 * remplir la base. Il est place tres au-dessus de toute audience plausible pour
 * un club de futsal, et seule la creation d'une nouvelle ligne le consulte.
 */
const PLAFOND_VISITEURS = 2000;

/**
 * Enregistre le signe de vie d'un spectateur.
 *
 * Un enregistrement par personne et par rencontre : le premier signe le cree,
 * les suivants repoussent sa fin. Compter les battements plutot que les lignes
 * garde la table petite, et donne la duree de presence gratuitement.
 */
export async function enregistrerBattement(
  matchId: number,
  visiteur: string,
  mobile: boolean,
): Promise<void> {
  const payload = await getPayloadClient();
  const maintenant = new Date().toISOString();

  const { docs } = await payload.find({
    collection: "live-audience",
    where: {
      and: [{ match: { equals: matchId } }, { visiteur: { equals: visiteur } }],
    },
    limit: 1,
    depth: 0,
  });

  const trace = docs[0] as
    | { id: number | string; battements?: number }
    | undefined;

  if (trace) {
    await payload.update({
      collection: "live-audience",
      id: trace.id,
      data: { fin: maintenant, battements: (trace.battements ?? 1) + 1 },
    });
    return;
  }

  const { totalDocs } = await payload.count({
    collection: "live-audience",
    where: { match: { equals: matchId } },
  });

  if (totalDocs >= PLAFOND_VISITEURS) return;

  await payload.create({
    collection: "live-audience",
    data: {
      match: matchId,
      visiteur,
      debut: maintenant,
      fin: maintenant,
      battements: 1,
      mobile,
    },
  });
}

/**
 * Combien de personnes regardent en ce moment.
 *
 * Un comptage, pas une lecture de lignes : c'est la seule requete que la route
 * du direct ajoute a son chemin le plus chaud, et son entete de cache la ramene
 * a une par minute quelle que soit l'affluence.
 */
export async function compterLesSpectateurs(matchId: number): Promise<number> {
  try {
    const payload = await getPayloadClient();
    const depuis = new Date(Date.now() - PRESENCE_MS).toISOString();

    const { totalDocs } = await payload.count({
      collection: "live-audience",
      where: {
        and: [
          { match: { equals: matchId } },
          { fin: { greater_than: depuis } },
        ],
      },
    });

    return totalDocs;
  } catch (error) {
    // Le bandeau se passe tres bien d'un compteur ; il ne se passe pas d'exister.
    console.error("Comptage des spectateurs indisponible :", error);
    return 0;
  }
}

/** Les chiffres d'une diffusion, lus en base puis resumes. */
export async function calculerLeRapport(
  matchId: number,
): Promise<Rapport | null> {
  const payload = await getPayloadClient();

  const { docs } = await payload.find({
    collection: "live-audience",
    where: { match: { equals: matchId } },
    limit: 5000,
    pagination: false,
    depth: 0,
  });

  return resumer(docs as unknown as Trace[]);
}
