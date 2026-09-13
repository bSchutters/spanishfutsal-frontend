import { BATTEMENT_S } from "./battement";

/**
 * Les chiffres d'une audience, calcules depuis ses traces.
 *
 * Sans base ni reseau, pour la meme raison que le rapprochement des replays :
 * une erreur ici ne provoque aucune panne. Elle produit un nombre plausible et
 * faux, dans un message que personne ne pourra recouper. Les cas s'executent par
 * `pnpm test:audience`.
 */

/** Duree creditee a un spectateur qui n'a envoye qu'un seul signe. */
const DUREE_MINIMALE_MS = BATTEMENT_S * 1000;

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

export type Trace = {
  id: number | string;
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
export function resumer(traces: Trace[]): Rapport | null {
  if (!traces.length) return null;

  const debuts = traces.map((trace) => Date.parse(trace.debut));
  const fins = traces.map((trace) => Date.parse(trace.fin));
  const debut = Math.min(...debuts);
  const fin = Math.max(...fins);

  const durees = traces.map((trace) =>
    Math.max(
      Date.parse(trace.fin) - Date.parse(trace.debut),
      DUREE_MINIMALE_MS,
    ),
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
