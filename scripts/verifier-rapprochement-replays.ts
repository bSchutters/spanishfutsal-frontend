/**
 * Les cas du rapprochement entre une rencontre et une mise en ligne.
 *
 *   pnpm test:replays
 *
 * Le projet n'a pas de lanceur de tests, et ce fichier n'en demande pas : il
 * s'execute seul et rend un code de sortie. Il existe parce que le
 * rapprochement est une heuristique, la seule partie du site dont une erreur ne
 * se voit pas. Elle ne produit pas de panne, elle produit un lien plausible et
 * faux. Chaque retouche des signaux ou des mots ignores se repasse ici.
 */

import { rapprocher } from "../src/lib/replayMatching";

type Match = Parameters<typeof rapprocher>[0];
type Video = Parameters<typeof rapprocher>[1][number];

const match = (date: string, adversaire: string, domicile = true): Match =>
  ({
    id: 1,
    date,
    time: "20:30",
    homeTeam: domicile ? "UD ASTURIANA" : adversaire,
    awayTeam: domicile ? adversaire : "UD ASTURIANA",
    homeIsClub: domicile,
    awayIsClub: !domicile,
  }) as unknown as Match;

const video = (titre: string, publiee: string, description = ""): Video => ({
  videoId: titre.slice(0, 6),
  url: `https://www.youtube.com/watch?v=${titre.slice(0, 6)}`,
  title: titre,
  description,
  publishedAt: publiee,
});

let echecs = 0;

function verifie(nom: string, obtenu: string | null, attendu: string | null) {
  const ok = obtenu === attendu;
  if (!ok) echecs += 1;
  console.log(`${ok ? "ok  " : "RATE"}  ${nom}`);
  if (!ok) console.log(`        attendu ${attendu}, obtenu ${obtenu}`);
}

const titre = (v: Video | null) => (v ? v.title : null);

// 1. Le cas courant : nom de l'adversaire, date dans le titre, publiee apres.
verifie(
  "titre complet avec date",
  titre(
    rapprocher(match("2026-09-12", "FUTSAL TEAM ANTWERPEN"), [
      video("UD Asturiana - Futsal Team Antwerpen | 12/09/2026", "2026-09-14T10:00:00Z"),
    ]),
  ),
  "UD Asturiana - Futsal Team Antwerpen | 12/09/2026",
);

// 2. Sans date dans le titre, mais mise en ligne trois jours apres.
verifie(
  "sans date, publiee dans les temps",
  titre(
    rapprocher(match("2026-09-12", "FUTSAL TEAM ANTWERPEN"), [
      video("Resume du match contre Antwerpen", "2026-09-15T10:00:00Z"),
    ]),
  ),
  "Resume du match contre Antwerpen",
);

// 3. Une video publiee AVANT la rencontre ne peut pas en etre le replay.
verifie(
  "publiee avant la rencontre",
  titre(
    rapprocher(match("2026-09-12", "FUTSAL TEAM ANTWERPEN"), [
      video("Avant-match contre Antwerpen", "2026-09-10T10:00:00Z"),
    ]),
  ),
  null,
);

// 4. Trop tard : c'est une autre rencontre contre la meme equipe.
verifie(
  "publiee quarante jours apres",
  titre(
    rapprocher(match("2026-09-12", "FUTSAL TEAM ANTWERPEN"), [
      video("Asturiana contre Antwerpen", "2026-10-22T10:00:00Z"),
    ]),
  ),
  null,
);

// 5. L'aller et le retour contre la meme equipe, departages par la date.
const videosAllerRetour = [
  video("UD Asturiana vs Antwerpen 12/09/2026", "2026-09-14T10:00:00Z"),
  video("Antwerpen vs UD Asturiana 16/01/2027", "2027-01-18T10:00:00Z"),
];
verifie(
  "aller departage par la date",
  titre(rapprocher(match("2026-09-12", "FUTSAL TEAM ANTWERPEN"), videosAllerRetour)),
  "UD Asturiana vs Antwerpen 12/09/2026",
);
verifie(
  "retour departage par la date",
  titre(
    rapprocher(match("2027-01-16", "FUTSAL TEAM ANTWERPEN", false), videosAllerRetour),
  ),
  "Antwerpen vs UD Asturiana 16/01/2027",
);

// 6. Nom de l'adversaire absent : on ne devine pas.
verifie(
  "adversaire absent du titre",
  titre(
    rapprocher(match("2026-09-12", "FUTSAL TEAM ANTWERPEN"), [
      video("Entrainement des U11", "2026-09-13T10:00:00Z"),
    ]),
  ),
  null,
);

// 7. Un adversaire dont le nom n'est fait que de mots communs ne doit rien
// accrocher : mieux vaut un champ vide qu'un lien faux.
verifie(
  "adversaire sans mot distinctif",
  titre(
    rapprocher(match("2026-09-12", "ROYAL FUTSAL CLUB"), [
      video("Royal Futsal Club, le resume", "2026-09-13T10:00:00Z"),
    ]),
  ),
  null,
);

// 8. Date ecrite en points, et annee sur deux chiffres.
verifie(
  "date en points, annee courte",
  titre(
    rapprocher(match("2026-09-12", "FUTSAL TEAM ANTWERPEN"), [
      video("Antwerpen - Asturiana 12.09.26", "2027-05-01T10:00:00Z"),
    ]),
  ),
  "Antwerpen - Asturiana 12.09.26",
);

// 9. Deux candidates plausibles : celle qui porte la date l'emporte.
verifie(
  "la date l'emporte sur la proximite",
  titre(
    rapprocher(match("2026-09-12", "FUTSAL TEAM ANTWERPEN"), [
      video("Antwerpen, tous les buts", "2026-09-13T10:00:00Z"),
      video("Asturiana - Antwerpen du 12/09/2026", "2026-09-20T10:00:00Z"),
    ]),
  ),
  "Asturiana - Antwerpen du 12/09/2026",
);

// 10. Le nom dans la description seule suffit, la date restant lue au titre.
verifie(
  "nom trouve dans la description",
  titre(
    rapprocher(match("2026-09-12", "FUTSAL TEAM ANTWERPEN"), [
      video("Journee 3, le resume", "2026-09-13T10:00:00Z", "Face au Futsal Team Antwerpen, a domicile."),
    ]),
  ),
  "Journee 3, le resume",
);

console.log(echecs ? `\n${echecs} cas en echec` : "\nTous les cas passent");
process.exit(echecs ? 1 : 0);
