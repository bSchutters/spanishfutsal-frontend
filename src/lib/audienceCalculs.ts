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
  /** Largeur d'ecran arrondie a la centaine. */
  largeur?: number | null;
  son?: boolean | null;
  plein_ecran?: boolean | null;
  source?: string | null;
  coupures?: number | null;
  /** Identite qui survit a la fermeture du navigateur, si elle a ete acceptee. */
  durable?: string | null;
};

/**
 * Une personne, reconstituee depuis ses presences.
 *
 * Tout ce qui decrit une audience se compte par personne et non par presence :
 * quelqu'un qui revient trois fois reste un spectateur, et sa duree est la somme
 * de ce qu'il a regarde.
 */
type Personne = {
  visionne: number;
  arrivee: number;
  depart: number;
  mobile: boolean;
  son: boolean;
  pleinEcran: boolean;
  largeur: number | null;
  source: string;
  coupures: number;
  durable: string | null;
};

/** Regroupe les presences par personne. */
function parPersonne(traces: Trace[]): Personne[] {
  const gens = new Map<string, Personne>();

  for (const trace of traces) {
    const debut = Date.parse(trace.debut);
    const fin = Date.parse(trace.fin);
    const deja = gens.get(trace.visiteur);

    if (!deja) {
      gens.set(trace.visiteur, {
        visionne: dureeDe(trace),
        arrivee: debut,
        depart: fin,
        mobile: Boolean(trace.mobile),
        son: Boolean(trace.son),
        pleinEcran: Boolean(trace.plein_ecran),
        largeur: trace.largeur ?? null,
        source: trace.source ?? "direct",
        coupures: trace.coupures ?? 0,
        durable: trace.durable ?? null,
      });
      continue;
    }

    deja.visionne += dureeDe(trace);
    deja.arrivee = Math.min(deja.arrivee, debut);
    deja.depart = Math.max(deja.depart, fin);
    // Ces quatre-la s'enclenchent : une seule presence suffit a les etablir.
    deja.mobile = deja.mobile || Boolean(trace.mobile);
    deja.son = deja.son || Boolean(trace.son);
    deja.pleinEcran = deja.pleinEcran || Boolean(trace.plein_ecran);
    deja.coupures = Math.max(deja.coupures, trace.coupures ?? 0);
    deja.largeur = trace.largeur ?? deja.largeur;
    // Le bandeau de mesure peut etre ferme en cours de match : l'identite
    // arrive alors sur une presence et pas sur les precedentes.
    deja.durable = deja.durable ?? trace.durable ?? null;
  }

  return [...gens.values()];
}

/** La valeur du milieu, moins sensible aux extremes que la moyenne. */
function mediane(valeurs: number[]): number {
  if (!valeurs.length) return 0;

  const triees = [...valeurs].sort((a, b) => a - b);
  const milieu = Math.floor(triees.length / 2);

  return triees.length % 2
    ? triees[milieu]
    : (triees[milieu - 1] + triees[milieu]) / 2;
}

/** Les arrivees minute par minute, pour voir quand la salle se remplit. */
function arriveesParMinute(
  gens: Personne[],
  debut: number,
  fin: number,
): number[] {
  const points = Math.floor((fin - debut) / 60_000) + 1;
  const arrivees = new Array<number>(points).fill(0);

  for (const personne of gens) {
    const minute = Math.min(
      points - 1,
      Math.max(0, Math.floor((personne.arrivee - debut) / 60_000)),
    );
    arrivees[minute] += 1;
  }

  return arrivees;
}

/**
 * La famille d'ecran, par sa largeur. Trois familles suffisent a savoir pour qui
 * on developpe, et aucune ne designe un appareil precis.
 */
function familleDEcran(largeur: number | null, mobile: boolean) {
  if (largeur === null) return mobile ? "telephone" : "ordinateur";
  if (largeur < 600) return "telephone";
  if (largeur < 1000) return "tablette";
  return "ordinateur";
}

const arrondi = (valeur: number, decimales = 1) => {
  const facteur = 10 ** decimales;
  return Math.round(valeur * facteur) / facteur;
};

const pourcentage = (part: number, total: number) =>
  total ? Math.round((part / total) * 100) : 0;

export type Rapport = {
  /** Personnes differentes, et non presences. */
  uniques: number;
  /** Le plus grand nombre de personnes presentes en meme temps. */
  pointe: number;
  /** Minute ou la pointe a eu lieu, comptee depuis le debut de la diffusion. */
  minutePointe: number;
  /** Temps regarde par personne, pauses et absences exclues. */
  dureeMoyenneMinutes: number;
  /** La valeur du milieu, qu'une poignee de fideles ne tire pas vers le haut. */
  dureeMedianeMinutes: number;
  /** Somme de tout ce qui a ete regarde. */
  heuresVisionnees: number;
  partMobile: number;
  /** Part de personnes ayant active le son au moins une fois. */
  partSon: number;
  partPleinEcran: number;
  /** Nombre de personnes ayant tenu au moins tant de minutes. */
  retention: {
    cinq: number;
    quinze: number;
    trente: number;
    quarantecinq: number;
    /** Encore presentes a la derniere minute de la diffusion. */
    jusquauBout: number;
  };
  /** Personnes par provenance. */
  provenances: Record<string, number>;
  /** Personnes par famille d'ecran. */
  ecrans: Record<string, number>;
  /** Personnes ayant ferme le bandeau, donc reconnaissables d'un match a l'autre. */
  avecIdentite: number;
  /**
   * Parmi elles, celles deja vues a une diffusion precedente. Vaut null quand la
   * question n'a pas ete posee a la base, le calcul pur ne pouvant pas y repondre.
   */
  habitues: number | null;
  /** Coupures subies par personne, en moyenne. */
  coupuresMoyennes: number;
  /** Part de personnes qui n'ont subi aucune coupure. */
  partSansCoupure: number;
  debut: string | null;
  fin: string | null;
  /** Presents minute par minute. */
  courbe: number[];
  /** Arrivees minute par minute. */
  arrivees: number[];
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
  const gens = parPersonne(traces);

  const debut = Math.min(...gens.map((p) => p.arrivee));
  const fin = Math.max(...gens.map((p) => p.depart));

  const visionne = gens.reduce((total, p) => total + p.visionne, 0);
  const minutes = gens.map((p) => p.visionne / 60_000);

  const compte = (filtre: (p: Personne) => boolean) =>
    gens.filter(filtre).length;
  const aTenu = (m: number) => compte((p) => p.visionne >= m * 60_000);

  // Encore la a la derniere minute : c'est ce qui distingue celui qui a suivi le
  // match de celui qui est parti a la mi-temps.
  const jusquauBout = compte((p) => fin - p.depart < 60_000);

  const provenances: Record<string, number> = {};
  const ecrans: Record<string, number> = {};

  for (const personne of gens) {
    provenances[personne.source] = (provenances[personne.source] ?? 0) + 1;
    const famille = familleDEcran(personne.largeur, personne.mobile);
    ecrans[famille] = (ecrans[famille] ?? 0) + 1;
  }

  const courbe = courbeParMinute(traces, debut, fin);
  const coupures = gens.reduce((total, p) => total + p.coupures, 0);

  return {
    uniques: gens.length,
    pointe: pointeSimultanee(traces),
    minutePointe: courbe.indexOf(Math.max(...courbe)),
    dureeMoyenneMinutes: arrondi(visionne / gens.length / 60_000),
    dureeMedianeMinutes: arrondi(mediane(minutes)),
    heuresVisionnees: arrondi(visionne / 3_600_000),
    partMobile: pourcentage(
      compte((p) => p.mobile),
      gens.length,
    ),
    partSon: pourcentage(
      compte((p) => p.son),
      gens.length,
    ),
    partPleinEcran: pourcentage(
      compte((p) => p.pleinEcran),
      gens.length,
    ),
    retention: {
      cinq: aTenu(5),
      quinze: aTenu(15),
      trente: aTenu(30),
      quarantecinq: aTenu(45),
      jusquauBout,
    },
    provenances,
    ecrans,
    avecIdentite: compte((p) => Boolean(p.durable)),
    habitues: null,
    coupuresMoyennes: arrondi(coupures / gens.length),
    partSansCoupure: pourcentage(
      compte((p) => p.coupures === 0),
      gens.length,
    ),
    debut: new Date(debut).toISOString(),
    fin: new Date(fin).toISOString(),
    courbe,
    arrivees: arriveesParMinute(gens, debut, fin),
  };
}

/**
 * Les identites durables presentes dans ces traces.
 *
 * Rendues a part et jamais dans le rapport : celui-ci est enregistre en base et
 * pousse vers un webhook, et des identifiants n'ont rien a faire dans un message
 * qui sort du site.
 */
export function identitesDurables(traces: Trace[]): string[] {
  return [
    ...new Set(
      traces
        .map((trace) => trace.durable)
        .filter((durable): durable is string => Boolean(durable)),
    ),
  ];
}
