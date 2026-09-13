import { BATTEMENT_S } from "./battement";

/**
 * Les chiffres d'une audience, calcules depuis ses traces.
 *
 * Sans base ni reseau, pour la meme raison que le rapprochement des replays :
 * une erreur ici ne provoque aucune panne. Elle produit un nombre plausible et
 * faux, dans un message que personne ne pourra recouper. Les cas s'executent par
 * `pnpm test:audience`.
 */

/**
 * La duree d'un intervalle de presence.
 *
 * L'ecart entre le premier et le dernier signe, plus un battement : le dernier
 * signe couvre les quarante-cinq secondes qui le suivent, et sans cette addition
 * une presence d'un seul signe durerait zero. Le compte est juste a un battement
 * pres, ce qui est la precision de la mesure elle-meme.
 */
const dureeDe = (trace: Trace) =>
  Date.parse(trace.fin) - Date.parse(trace.debut) + BATTEMENT_S * 1000;

const BARRES = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];

/**
 * La courbe de la soiree, ramenee a une ligne lisible dans un message.
 *
 * Les hauteurs sont relatives a la pointe : la ligne montre la forme de
 * l'audience, pas son volume, que les chiffres au-dessus donnent deja.
 */
export function esquisse(courbe: number[]): string {
  if (!courbe.length) return "";

  const haut = Math.max(...courbe);
  if (haut <= 0) return "";

  // Un point sur deux au-dela de soixante : une ligne de cent barres ne se lit
  // plus sur un telephone.
  const pas = Math.ceil(courbe.length / 60);
  const points = courbe.filter((_, index) => index % pas === 0);

  return points
    .map(
      (valeur) =>
        BARRES[
          Math.min(
            BARRES.length - 1,
            Math.round((valeur / haut) * (BARRES.length - 1)),
          )
        ],
    )
    .join("");
}

/**
 * Un intervalle de presence, et non une personne : quelqu'un qui met en pause et
 * revient un quart d'heure plus tard laisse deux intervalles. C'est ce qui
 * permet a la courbe et a la pointe de ne pas le compter pendant son absence.
 */
export type Trace = {
  id: number | string;
  /** Identifiant de session, tire au hasard. Plusieurs traces peuvent le porter. */
  visiteur: string;
  debut: string;
  fin: string;
  mobile?: boolean | null;
};

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
 * Fusionne, pour chaque personne, les presences qui se chevauchent ou se
 * touchent.
 *
 * Deux battements partis en meme temps peuvent creer deux lignes pour la meme
 * personne au meme instant : chacun cherche une presence en cours, aucun ne voit
 * celle que l'autre est en train d'ecrire. C'est arrive des le premier essai sur
 * un vrai direct, et cela comptait deux spectateurs la ou il y en avait un.
 *
 * Le comptage se defend donc ici, plutot que d'esperer que l'ecriture ne se
 * croise jamais : une meme personne ne peut pas etre presente deux fois.
 */
function fusionner(traces: Trace[]): Trace[] {
  const parPersonne = new Map<string, Trace[]>();

  for (const trace of traces) {
    const siennes = parPersonne.get(trace.visiteur) ?? [];
    siennes.push(trace);
    parPersonne.set(trace.visiteur, siennes);
  }

  const fusionnees: Trace[] = [];

  for (const siennes of parPersonne.values()) {
    const triees = [...siennes].sort(
      (a, b) => Date.parse(a.debut) - Date.parse(b.debut),
    );
    let courante = triees[0];

    for (const suivante of triees.slice(1)) {
      // Le chevauchement se juge a un battement pres : deux presences qui se
      // touchent decrivent une seule presence continue.
      if (
        Date.parse(suivante.debut) <=
        Date.parse(courante.fin) + BATTEMENT_S * 1000
      ) {
        const fin = Math.max(
          Date.parse(courante.fin),
          Date.parse(suivante.fin),
        );
        courante = { ...courante, fin: new Date(fin).toISOString() };
        continue;
      }

      fusionnees.push(courante);
      courante = suivante;
    }

    fusionnees.push(courante);
  }

  return fusionnees;
}

/**
 * La pointe simultanee, par balayage des arrivees et des departs.
 *
 * C'est le chiffre qui decrit une audience : le total des visiteurs melange
 * ceux qui sont restes une heure et ceux qui ont ouvert par curiosite.
 */
export function pointeSimultanee(traces: Trace[]): number {
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

/**
 * Le nombre de presents a chaque minute, du premier arrive au dernier parti,
 * bornes comprises.
 *
 * Les deux bornes, donc un point de plus que la duree en minutes : sans le
 * dernier, la courbe s'arretait juste avant la fin et coupait le decrochage du
 * coup de sifflet, qui est precisement ce qu'on veut voir.
 */
export function courbeParMinute(
  traces: Trace[],
  debut: number,
  fin: number,
): number[] {
  const points = Math.floor((fin - debut) / 60_000) + 1;
  const courbe: number[] = [];

  for (let minute = 0; minute < points; minute += 1) {
    const instant = debut + minute * 60_000;
    courbe.push(
      traces.filter(
        (trace) =>
          Date.parse(trace.debut) <= instant &&
          Date.parse(trace.fin) >= instant,
      ).length,
    );
  }

  return courbe;
}

/**
 * Le resume d'une liste de traces, ou null si personne n'a regarde.
 */
export function resumer(brutes: Trace[]): Rapport | null {
  if (!brutes.length) return null;

  const traces = fusionner(brutes);

  const debuts = traces.map((trace) => Date.parse(trace.debut));
  const fins = traces.map((trace) => Date.parse(trace.fin));
  const debut = Math.min(...debuts);
  const fin = Math.max(...fins);

  // Les personnes, et non les intervalles : deux allers-retours d'un meme
  // spectateur ne font pas deux spectateurs.
  const personnes = new Set(traces.map((trace) => trace.visiteur));

  // Le temps reellement regarde, pauses et absences exclues, rapporte aux
  // personnes et non aux intervalles.
  const visionne = traces.reduce((total, trace) => total + dureeDe(trace), 0);

  const surTelephone = new Set(
    traces.filter((trace) => trace.mobile).map((trace) => trace.visiteur),
  ).size;

  return {
    uniques: personnes.size,
    pointe: pointeSimultanee(traces),
    dureeMoyenneMinutes:
      Math.round((visionne / personnes.size / 60_000) * 10) / 10,
    partMobile: Math.round((surTelephone / personnes.size) * 100),
    debut: new Date(debut).toISOString(),
    fin: new Date(fin).toISOString(),
    courbe: courbeParMinute(traces, debut, fin),
  };
}
