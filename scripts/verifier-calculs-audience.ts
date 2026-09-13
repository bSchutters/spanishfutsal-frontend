/**
 * Les cas du calcul d'audience.
 *
 *   pnpm test:audience
 *
 * Meme raison que pour le rapprochement des replays : une erreur ici ne
 * provoque aucune panne. Elle produit un nombre plausible et faux, dans un
 * message que personne ne pourra recouper avec quoi que ce soit.
 */

import {
  courbeParMinute,
  esquisse,
  pointeSimultanee,
  resumer,
  type Trace,
} from "../src/lib/audienceCalculs";

const MINUTE = 60_000;
const DEPART = Date.parse("2026-09-12T20:00:00Z");

/** Une trace, exprimee en minutes depuis le depart. */
const trace = (arrivee: number, depart: number, mobile = false): Trace => ({
  id: `${arrivee}-${depart}`,
  debut: new Date(DEPART + arrivee * MINUTE).toISOString(),
  fin: new Date(DEPART + depart * MINUTE).toISOString(),
  mobile,
});

let echecs = 0;

function verifie(nom: string, obtenu: unknown, attendu: unknown) {
  const rendu = (v: unknown) => JSON.stringify(v);
  const ok = rendu(obtenu) === rendu(attendu);
  if (!ok) echecs += 1;
  console.log(`${ok ? "ok  " : "RATE"}  ${nom}`);
  if (!ok) console.log(`        attendu ${rendu(attendu)}, obtenu ${rendu(obtenu)}`);
}

// --- La pointe simultanee ---

verifie("pointe, personne", pointeSimultanee([]), 0);

verifie(
  "pointe, trois qui se chevauchent",
  pointeSimultanee([trace(0, 30), trace(5, 25), trace(10, 20)]),
  3,
);

verifie(
  "pointe, trois qui ne se croisent jamais",
  pointeSimultanee([trace(0, 10), trace(11, 20), trace(21, 30)]),
  1,
);

// Le depart de l'un a l'instant exact de l'arrivee de l'autre ne fait pas deux.
verifie(
  "pointe, une releve a la seconde",
  pointeSimultanee([trace(0, 10), trace(10, 20)]),
  1,
);

verifie(
  "pointe atteinte au milieu, pas a la fin",
  pointeSimultanee([trace(0, 60), trace(10, 20), trace(12, 18), trace(50, 60)]),
  3,
);

// --- La courbe par minute ---

verifie(
  "courbe, un seul spectateur, deux minutes et les deux bornes",
  courbeParMinute([trace(0, 2)], DEPART, DEPART + 2 * MINUTE),
  [1, 1, 1],
);

verifie(
  "courbe, une arrivee en cours de route",
  courbeParMinute([trace(0, 4), trace(2, 4)], DEPART, DEPART + 4 * MINUTE),
  [1, 1, 2, 2, 2],
);

// Le decrochage de la derniere minute doit apparaitre, c'est tout l'interet.
verifie(
  "courbe, le decrochage final est dessine",
  courbeParMinute([trace(0, 3), trace(0, 1)], DEPART, DEPART + 3 * MINUTE),
  [2, 2, 1, 1],
);

// Une diffusion plus courte qu'une minute doit quand meme rendre un point.
verifie(
  "courbe, moins d'une minute",
  courbeParMinute([trace(0, 0)], DEPART, DEPART),
  [1],
);

// --- L'esquisse ---

verifie("esquisse, courbe vide", esquisse([]), "");
verifie("esquisse, que des zeros", esquisse([0, 0, 0]), "");
verifie("esquisse, plateau", esquisse([5, 5, 5]), "███");
verifie("esquisse, du creux au plein", esquisse([0, 4, 8]), "▁▅█");

// Au-dela de soixante points, la ligne est echantillonnee pour rester lisible.
verifie(
  "esquisse, cent vingt minutes",
  esquisse(Array.from({ length: 120 }, () => 3)).length,
  60,
);

// --- Le resume complet ---

verifie("resume, aucune trace", resumer([]), null);

const rapport = resumer([
  trace(0, 60, true),
  trace(10, 40, true),
  trace(30, 35, false),
]);

verifie("resume, spectateurs differents", rapport?.uniques, 3);
verifie("resume, pointe", rapport?.pointe, 3);
// Soixante, trente et cinq minutes : trente-et-une virgule sept de moyenne.
verifie("resume, duree moyenne", rapport?.dureeMoyenneMinutes, 31.7);
verifie("resume, part de telephones", rapport?.partMobile, 67);
verifie("resume, premiere arrivee", rapport?.debut, new Date(DEPART).toISOString());
verifie(
  "resume, dernier depart",
  rapport?.fin,
  new Date(DEPART + 60 * MINUTE).toISOString(),
);
verifie("resume, longueur de la courbe", rapport?.courbe.length, 61);

// Un spectateur qui n'a envoye qu'un seul signe ne dure pas zero minute : il
// est credite d'un battement, sinon la moyenne serait tiree vers le bas par
// tous ceux qui ouvrent et referment.
verifie(
  "resume, un seul battement credite un battement",
  resumer([trace(0, 0)])?.dureeMoyenneMinutes,
  0.8,
);

console.log(echecs ? `\n${echecs} cas en echec` : "\nTous les cas passent");
process.exit(echecs ? 1 : 0);
