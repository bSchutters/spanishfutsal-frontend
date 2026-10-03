import { describe, expect, it } from "vitest";

import { anniversairesDeLaSemaine, type Personne } from "@/hub/accueil/anniversaires";

/**
 * Les anniversaires de l'accueil : aujourd'hui et les six jours suivants,
 * vus depuis Bruxelles, les fiches inactives ecartees.
 */

const personne = (id: number, dateNaissance: string | null, actif = true): Personne => ({
  id,
  prenom: `P${id}`,
  nom: `N${id}`,
  dateNaissance,
  actif,
});

// Samedi 3 octobre 2026, 10 h a Bruxelles.
const SAMEDI = new Date("2026-10-03T08:00:00Z");

describe("anniversaires de la semaine", () => {
  it("garde aujourd'hui et les six jours suivants, du plus proche au plus lointain", () => {
    const resultat = anniversairesDeLaSemaine(
      [personne(1, "2000-10-09"), personne(2, "1998-10-03"), personne(3, "2001-10-10"), personne(4, "1995-10-02")],
      SAMEDI,
    );
    expect(resultat.map((a) => [a.id, a.jour, a.age, a.dansJours])).toEqual([
      [2, "2026-10-03", 28, 0],
      [1, "2026-10-09", 26, 6],
    ]);
  });

  it("ecarte les fiches inactives et celles sans date", () => {
    expect(anniversairesDeLaSemaine([personne(1, "2000-10-04", false), personne(2, null)], SAMEDI)).toEqual([]);
  });

  it("lit le jour a Bruxelles et non en UTC", () => {
    // 23 h 30 UTC le 3 octobre : il est deja 1 h 30 le 4 a Bruxelles.
    const resultat = anniversairesDeLaSemaine([personne(1, "2000-10-03")], new Date("2026-10-03T23:30:00Z"));
    expect(resultat).toEqual([]);
  });

  it("passe le cap de l'annee", () => {
    const resultat = anniversairesDeLaSemaine([personne(1, "2000-01-02")], new Date("2026-12-29T12:00:00Z"));
    expect(resultat.map((a) => [a.jour, a.age])).toEqual([["2027-01-02", 27]]);
  });

  it("fete un 29 fevrier le 28 les annees sans 29", () => {
    const resultat = anniversairesDeLaSemaine([personne(1, "2000-02-29")], new Date("2027-02-25T12:00:00Z"));
    expect(resultat.map((a) => [a.jour, a.age])).toEqual([["2027-02-28", 27]]);
  });
});
