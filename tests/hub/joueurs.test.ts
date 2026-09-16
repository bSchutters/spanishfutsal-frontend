import { describe, expect, it } from "vitest";

import { modulesAccessibles, niveauModule, type UtilisateurHub } from "@/hub/droits";
import {
  butsDuClub,
  depuisTableauxMatch,
  ecartAvecLeScore,
  etatSaisie,
  numerosEnDoublon,
  schemaFeuilleStats,
  schemaNumeros,
  trierJoueurs,
  versTableauxMatch,
  type Poste,
} from "@/hub/joueurs/schema";

const postes = new Map<number, Poste | null>([
  [1, "Gardien"],
  [2, "Joueur"],
  [3, "Joueur"],
  [4, null],
  [9, "Coach"],
]);

const ligne = (joueurId: number, extra: Partial<{ buts: number; assists: number; jaunes: number; rouges: number; cleanSheet: boolean }> = {}) => ({
  joueurId,
  buts: 0,
  assists: 0,
  jaunes: 0,
  rouges: 0,
  cleanSheet: false,
  ...extra,
});

describe("feuille vers la collection Matchs", () => {
  it("range le gardien avec sa clean sheet et les joueurs de champ sans", () => {
    const tableaux = versTableauxMatch([ligne(1, { cleanSheet: true }), ligne(2, { buts: 2, assists: 1 }), ligne(4, { jaunes: 1 })], postes);
    expect(tableaux.goalkeeper_stats).toEqual([{ joueur: 1, goals: 0, assists: 0, yellow_cards: 0, red_cards: 0, clean_sheet: true }]);
    expect(tableaux.field_players_stats).toEqual([
      { joueur: 2, goals: 2, assists: 1, yellow_cards: 0, red_cards: 0 },
      { joueur: 4, goals: 0, assists: 0, yellow_cards: 1, red_cards: 0 },
    ]);
  });

  it("ignore le staff, les inconnus et les doublons", () => {
    const tableaux = versTableauxMatch([ligne(9), ligne(42), ligne(2), ligne(2, { buts: 5 })], postes);
    expect(tableaux.goalkeeper_stats).toEqual([]);
    expect(tableaux.field_players_stats).toEqual([{ joueur: 2, goals: 0, assists: 0, yellow_cards: 0, red_cards: 0 }]);
  });

  it("une feuille vide efface les deux tableaux", () => {
    expect(versTableauxMatch([], postes)).toEqual({ field_players_stats: [], goalkeeper_stats: [] });
  });
});

describe("collection Matchs vers la feuille", () => {
  it("lit les relations peuplees ou non, gardiens d abord", () => {
    const lignes = depuisTableauxMatch({
      field_players_stats: [
        { joueur: 2, goals: 1, assists: null, yellow_cards: 2 },
        { joueur: { id: 3 }, goals: 0 },
        { joueur: null, goals: 4 },
      ],
      goalkeeper_stats: [{ joueur: "1", clean_sheet: true, goals: 0 }],
    });
    expect(lignes).toEqual([
      ligne(1, { cleanSheet: true }),
      ligne(2, { buts: 1, jaunes: 2 }),
      ligne(3),
    ]);
  });

  it("un aller-retour ne change rien", () => {
    const depart = [ligne(1, { cleanSheet: true, assists: 1 }), ligne(2, { buts: 3 }), ligne(3, { rouges: 1 })];
    expect(depuisTableauxMatch(versTableauxMatch(depart, postes))).toEqual(depart);
  });

  it("sans tableaux, aucune ligne", () => {
    expect(depuisTableauxMatch({})).toEqual([]);
  });
});

describe("score et etat", () => {
  it("lit les buts du club selon le camp", () => {
    expect(butsDuClub("3 - 1", true)).toBe(3);
    expect(butsDuClub("3 - 1", false)).toBe(1);
    expect(butsDuClub(null, true)).toBeNull();
    expect(butsDuClub("n/a", true)).toBeNull();
  });

  it("signale l ecart avec le score sans bloquer", () => {
    expect(ecartAvecLeScore([ligne(2, { buts: 2 }), ligne(3, { buts: 1 })], 3)).toBeNull();
    expect(ecartAvecLeScore([ligne(2, { buts: 1 })], 3)).toBe("Il manque 2 buts par rapport au score (3).");
    expect(ecartAvecLeScore([ligne(2, { buts: 4 })], 3)).toBe("1 but de trop par rapport au score (3).");
    expect(ecartAvecLeScore([ligne(2, { buts: 4 })], null)).toBeNull();
  });

  it("a venir sans score, a saisir avec, saisi des la premiere ligne", () => {
    expect(etatSaisie({ score: null, nbLignes: 0 })).toBe("a_venir");
    expect(etatSaisie({ score: "2 - 2", nbLignes: 0 })).toBe("a_saisir");
    expect(etatSaisie({ score: "2 - 2", nbLignes: 5 })).toBe("saisie");
    expect(etatSaisie({ score: null, nbLignes: 5 })).toBe("saisie");
  });
});

describe("numeros", () => {
  const joueurs = [
    { id: 1, prenom: "Ana", nom: "Diaz", numero: 1, numero2: 12 },
    { id: 2, prenom: "Bo", nom: "Alvarez", numero: 7, numero2: 12 },
    { id: 3, prenom: "Cy", nom: "Perez", numero: 7, numero2: 7 },
    { id: 4, prenom: "Di", nom: "Ruiz", numero: null, numero2: null },
  ];

  it("trouve les numeros portes par plusieurs joueurs, premier ou second", () => {
    expect([...numerosEnDoublon(joueurs)].sort()).toEqual([12, 7]);
    expect(numerosEnDoublon([joueurs[0], joueurs[3]]).size).toBe(0);
  });

  it("trie par numero, les sans numero en queue, puis par nom", () => {
    expect(trierJoueurs(joueurs).map((j) => j.id)).toEqual([1, 2, 3, 4]);
    expect(trierJoueurs([joueurs[2], joueurs[1]]).map((j) => j.id)).toEqual([2, 3]);
  });

  it("accepte de 1 a 99 ou rien", () => {
    expect(schemaNumeros.safeParse({ joueurId: 1, numero: 10, numero2: null }).success).toBe(true);
    expect(schemaNumeros.safeParse({ joueurId: 1, numero: 0, numero2: null }).success).toBe(false);
    expect(schemaNumeros.safeParse({ joueurId: 1, numero: 100, numero2: null }).success).toBe(false);
    expect(schemaNumeros.safeParse({ joueurId: 1, numero: 7.5, numero2: null }).success).toBe(false);
  });
});

describe("saisie d une feuille", () => {
  it("borne les compteurs", () => {
    const base = { matchId: 1, lignes: [ligne(2, { buts: 3 })] };
    expect(schemaFeuilleStats.safeParse(base).success).toBe(true);
    expect(schemaFeuilleStats.safeParse({ matchId: 1, lignes: [ligne(2, { jaunes: 3 })] }).success).toBe(false);
    expect(schemaFeuilleStats.safeParse({ matchId: 1, lignes: [ligne(2, { rouges: 2 })] }).success).toBe(false);
    expect(schemaFeuilleStats.safeParse({ matchId: 1, lignes: [ligne(2, { buts: -1 })] }).success).toBe(false);
    expect(schemaFeuilleStats.safeParse({ matchId: 0, lignes: [] }).success).toBe(false);
  });
});

describe("droits du module Joueurs", () => {
  const lecteur: UtilisateurHub = {
    id: 2,
    role: "manager",
    hub: { access: true, modules: [{ module: "players", level: "read" }], feeds: [] },
  };
  const deuxModules: UtilisateurHub = {
    id: 3,
    role: "manager",
    hub: {
      access: true,
      modules: [
        { module: "calendar", level: "read" },
        { module: "players", level: "edit" },
      ],
      feeds: [],
    },
  };

  it("se donne a part du calendrier", () => {
    expect(modulesAccessibles(lecteur)).toEqual(["players"]);
    expect(niveauModule(lecteur, "calendar")).toBeNull();
    expect(niveauModule(lecteur, "players")).toBe("read");
  });

  it("garde l ordre du registre et son propre niveau", () => {
    expect(modulesAccessibles(deuxModules)).toEqual(["calendar", "players"]);
    expect(niveauModule(deuxModules, "players")).toBe("edit");
    expect(modulesAccessibles({ id: 1, role: "admin" })).toEqual(["calendar", "players"]);
  });
});
