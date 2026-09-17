import { describe, expect, it } from "vitest";

import { evolution, precedente, type Diffusion } from "@/hub/direct/schema";
import { MODULES, trouverModule } from "@/hub/modules";

/**
 * Le module Direct.
 *
 * Deux fonctions pures portent tout ce qui peut se tromper sans se voir : la
 * comparaison d'une diffusion a la precedente, et l'ecart en pourcentage. Un
 * chiffre faux y serait invisible, comme dans le rapport lui-meme.
 */

const diffusion = (id: number, debut: string, uniques = 0): Diffusion => ({
  id,
  matchId: id,
  affiche: `Match ${id}`,
  debut,
  fin: debut,
  uniques,
  pointe: 0,
  dureeMoyenne: 0,
  partMobile: 0,
  courbe: [],
  detail: {},
});

// La liste arrive de la base triee par date decroissante : la precedente d'une
// diffusion est donc celle qui la suit dans le tableau.
const liste = [
  diffusion(3, "2026-09-16T20:00:00.000Z", 25),
  diffusion(2, "2026-09-09T20:00:00.000Z", 20),
  diffusion(1, "2026-09-02T20:00:00.000Z", 10),
];

describe("la diffusion precedente", () => {
  it("est la suivante dans une liste rangee du plus recent au plus ancien", () => {
    expect(precedente(liste, liste[0])?.id).toBe(2);
    expect(precedente(liste, liste[1])?.id).toBe(1);
  });

  it("n'existe pas pour la toute premiere", () => {
    expect(precedente(liste, liste[2])).toBeNull();
  });

  it("n'invente rien pour une diffusion absente de la liste", () => {
    expect(
      precedente(liste, diffusion(99, "2026-09-20T20:00:00.000Z")),
    ).toBeNull();
  });
});

describe("l'ecart d'une diffusion a l'autre", () => {
  it("compte une hausse et une baisse", () => {
    expect(evolution(20, 25)).toBe(25);
    expect(evolution(20, 10)).toBe(-50);
  });

  it("vaut zero quand rien ne bouge", () => {
    expect(evolution(25, 25)).toBe(0);
  });

  // Sans cette garde, une premiere diffusion a zero spectateur donnerait une
  // division par zero et un pourcentage infini.
  it("ne se prononce pas quand il n'y avait personne avant", () => {
    expect(evolution(0, 25)).toBeNull();
  });
});

describe("le registre des modules", () => {
  it("connait le module Direct et sa page", () => {
    const module = trouverModule("live");

    expect(module?.nom).toBe("Direct");
    expect(module?.route).toBe("/hub/direct");
    expect(module?.navigation).toHaveLength(1);
  });

  it("ne donne jamais deux fois la meme cle", () => {
    const cles = MODULES.map((module) => module.key);

    expect(new Set(cles).size).toBe(cles.length);
  });
});
