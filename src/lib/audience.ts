import {
  identitesDurables,
  resumer,
  type Rapport,
  type Trace,
} from "./audienceCalculs";
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
 * Une ligne est un intervalle de presence, pas une personne. Tant que les signes
 * s'enchainent, le meme intervalle s'allonge ; apres un silence plus long que la
 * fenetre de presence, un nouvel intervalle s'ouvre.
 *
 * C'est ce qui rend la courbe honnete : quelqu'un qui met en pause et revient un
 * quart d'heure plus tard ne doit pas compter comme present pendant tout ce
 * temps. Les deux lignes portent le meme identifiant de visiteur, donc il reste
 * une seule personne au comptage.
 */
export type Mesures = {
  durable: string | null;
  mobile: boolean;
  son: boolean;
  pleinEcran: boolean;
  largeur: number | null;
  source: string;
  coupures: number;
};

export async function enregistrerBattement(
  matchId: number,
  visiteur: string,
  mesures: Mesures,
): Promise<void> {
  const payload = await getPayloadClient();
  const maintenant = new Date().toISOString();

  const { docs } = await payload.find({
    collection: "live-audience",
    where: {
      and: [{ match: { equals: matchId } }, { visiteur: { equals: visiteur } }],
    },
    sort: "-fin",
    limit: 1,
    depth: 0,
  });

  const trace = docs[0] as
    | {
        id: number | string;
        fin: string;
        battements?: number;
        son?: boolean | null;
        plein_ecran?: boolean | null;
        coupures?: number | null;
      }
    | undefined;

  // Le dernier signe est-il assez recent pour prolonger le meme intervalle ?
  const enchaine = trace && Date.parse(trace.fin) > Date.now() - PRESENCE_MS;

  if (trace && enchaine) {
    await payload.update({
      collection: "live-audience",
      id: trace.id,
      data: {
        fin: maintenant,
        battements: (trace.battements ?? 1) + 1,
        // Le son et le plein ecran s'enclenchent et ne reviennent pas : ils
        // disent ce que la personne a fait, pas ou elle en est a la seconde.
        son: Boolean(trace.son) || mesures.son,
        plein_ecran: Boolean(trace.plein_ecran) || mesures.pleinEcran,
        // Le compteur du navigateur repart de zero s'il remonte le lecteur, on
        // garde donc le plus grand des deux.
        coupures: Math.max(trace.coupures ?? 0, mesures.coupures),
        largeur: mesures.largeur,
        // Quelqu'un peut fermer le bandeau en cours de match : son identite
        // arrive alors au milieu de sa presence, et on la rattrape.
        ...(mesures.durable ? { durable: mesures.durable } : {}),
      },
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
      durable: mesures.durable,
      mobile: mesures.mobile,
      largeur: mesures.largeur,
      son: mesures.son,
      plein_ecran: mesures.pleinEcran,
      source: mesures.source,
      coupures: mesures.coupures,
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

    // Des personnes, et non des lignes : une meme personne peut en avoir
    // plusieurs, et deux battements partis ensemble en creent deux d'un coup.
    const { docs } = await payload.find({
      collection: "live-audience",
      where: {
        and: [
          { match: { equals: matchId } },
          { fin: { greater_than: depuis } },
        ],
      },
      limit: 1000,
      pagination: false,
      depth: 0,
    });

    return new Set(
      docs.map((trace) => (trace as unknown as { visiteur: string }).visiteur),
    ).size;
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

  const traces = docs as unknown as Trace[];
  const rapport = resumer(traces);
  if (!rapport) return null;

  return { ...rapport, habitues: await compterLesHabitues(traces, matchId) };
}

/**
 * Combien de ces spectateurs avaient deja regarde une diffusion precedente.
 *
 * Ne concerne que ceux qui ont ferme le bandeau de mesure : les autres sont
 * comptes mais pas reconnus, et c'est le fonctionnement voulu. Rend null quand
 * personne n'est reconnaissable, pour ne pas annoncer zero fidele la ou la
 * question n'a simplement pas de reponse.
 */
async function compterLesHabitues(
  traces: Trace[],
  matchId: number,
): Promise<number | null> {
  const identites = identitesDurables(traces);
  if (!identites.length) return null;

  try {
    const payload = await getPayloadClient();

    const { docs } = await payload.find({
      collection: "live-audience",
      where: {
        and: [
          { durable: { in: identites } },
          { match: { not_equals: matchId } },
        ],
      },
      limit: 5000,
      pagination: false,
      depth: 0,
    });

    return identitesDurables(docs as unknown as Trace[]).length;
  } catch (error) {
    console.error("Comptage des habitues impossible :", error);
    return null;
  }
}
