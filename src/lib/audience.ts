import { BATTEMENT_S, TOLERANCE_BATTEMENTS } from "./battement";
import { getPayloadClient } from "./payload";

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

/** Duree creditee a un spectateur qui n'a envoye qu'un seul signe. */
const DUREE_MINIMALE_MS = BATTEMENT_S * 1000;

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

type Trace = {
  id: number | string;
  debut: string;
  fin: string;
  mobile?: boolean | null;
};

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

  const trace = docs[0] as { id: number | string; battements?: number } | undefined;

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
        and: [{ match: { equals: matchId } }, { fin: { greater_than: depuis } }],
      },
    });

    return totalDocs;
  } catch (error) {
    // Le bandeau se passe tres bien d'un compteur ; il ne se passe pas d'exister.
    console.error("Comptage des spectateurs indisponible :", error);
    return 0;
  }
}

export type Rapport = {
  uniques: number;
  pointe: number;
  dureeMoyenneMinutes: number;
  partMobile: number;
  debut: string | null;
  fin: string | null;
  /** Spectateurs simultanes, minute par minute. */
  courbe: number[];
};

/**
 * La pointe simultanee, par balayage des arrivees et des departs.
 *
 * C'est le chiffre qui decrit une audience : le total des visiteurs melange
 * ceux qui sont restes une heure et ceux qui ont ouvert par curiosite.
 */
function pointeSimultanee(traces: Trace[]): number {
  const mouvements: { instant: number; delta: number }[] = [];

  for (const trace of traces) {
    mouvements.push({ instant: Date.parse(trace.debut), delta: 1 });
    mouvements.push({ instant: Date.parse(trace.fin), delta: -1 });
  }

  // A instant egal, les departs d'abord : deux spectateurs qui se croisent a la
  // seconde pres ne font pas une pointe de deux.
  mouvements.sort((a, b) => a.instant - b.instant || a.delta - b.delta);

  let presents = 0;
  let pointe = 0;

  for (const { delta } of mouvements) {
    presents += delta;
    if (presents > pointe) pointe = presents;
  }

  return pointe;
}

/** Le nombre de presents a chaque minute, du premier arrive au dernier parti. */
function courbeParMinute(traces: Trace[], debut: number, fin: number): number[] {
  const minutes = Math.max(1, Math.ceil((fin - debut) / 60_000));
  const courbe: number[] = [];

  for (let minute = 0; minute < minutes; minute += 1) {
    const instant = debut + minute * 60_000;
    courbe.push(
      traces.filter(
        (trace) =>
          Date.parse(trace.debut) <= instant && Date.parse(trace.fin) >= instant,
      ).length,
    );
  }

  return courbe;
}

/** Les chiffres d'une diffusion, calcules depuis ses traces. */
export async function calculerLeRapport(matchId: number): Promise<Rapport | null> {
  const payload = await getPayloadClient();

  const { docs } = await payload.find({
    collection: "live-audience",
    where: { match: { equals: matchId } },
    limit: 5000,
    pagination: false,
    depth: 0,
  });

  const traces = docs as unknown as Trace[];
  if (!traces.length) return null;

  const debuts = traces.map((trace) => Date.parse(trace.debut));
  const fins = traces.map((trace) => Date.parse(trace.fin));
  const debut = Math.min(...debuts);
  const fin = Math.max(...fins);

  const durees = traces.map((trace) =>
    Math.max(Date.parse(trace.fin) - Date.parse(trace.debut), DUREE_MINIMALE_MS),
  );
  const dureeMoyenne = durees.reduce((a, b) => a + b, 0) / durees.length;

  const surTelephone = traces.filter((trace) => trace.mobile).length;

  return {
    uniques: traces.length,
    pointe: pointeSimultanee(traces),
    dureeMoyenneMinutes: Math.round((dureeMoyenne / 60_000) * 10) / 10,
    partMobile: Math.round((surTelephone / traces.length) * 100),
    debut: new Date(debut).toISOString(),
    fin: new Date(fin).toISOString(),
    courbe: courbeParMinute(traces, debut, fin),
  };
}
