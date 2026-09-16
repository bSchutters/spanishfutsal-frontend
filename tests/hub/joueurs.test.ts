import { describe, expect, it } from "vitest";

import { modulesAccessibles, niveauModule, type UtilisateurHub } from "@/hub/droits";
import { ageAu, nettoyerSelonPoste, schemaJoueur, SAISIE_JOUEUR_VIDE } from "@/hub/joueurs/fiche";
import {
  butsDuClub,
  depuisTableauxMatch,
  ecartAvecLeScore,
  etatSaisie,
  joueursParNumero,
  refusNumero,
  schemaFeuilleStats,
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

describe("numeros de feuille de match", () => {
  const joueurs = [
    { id: 1, prenom: "Ana", nom: "Diaz", gardien: false, numeroFeuille1: 2, numeroFeuille2: 12 },
    { id: 2, prenom: "Bo", nom: "Alvarez", gardien: false, numeroFeuille1: 7, numeroFeuille2: 12 },
    { id: 3, prenom: "Cy", nom: "Perez", gardien: false, numeroFeuille1: 7, numeroFeuille2: 7 },
    { id: 4, prenom: "Di", nom: "Ruiz", gardien: false, numeroFeuille1: null, numeroFeuille2: null },
    { id: 5, prenom: "Ed", nom: "Sola", gardien: true, numeroFeuille1: 21, numeroFeuille2: null },
    { id: 6, prenom: "Fa", nom: "Toro", gardien: true, numeroFeuille1: 1, numeroFeuille2: null },
    { id: 7, prenom: "Gi", nom: "Uzo", gardien: false, numeroFeuille1: 30, numeroFeuille2: null },
  ];

  it("liste les maillots, gardiens d abord, avec leurs porteurs et leurs places, plus les numeros inconnus", () => {
    const places = joueursParNumero(joueurs);
    expect(places.map((p) => p.numero)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 21, 30]);
    const par = Object.fromEntries(places.map((p) => [p.numero, [p.joueurs.map((j) => j.id), p.placesLibres, p.maillot, p.gardien]]));
    expect(par[1]).toEqual([[6], 1, true, true]);
    expect(par[2]).toEqual([[1], 1, true, false]);
    expect(par[7]).toEqual([[2, 3], 0, true, false]);
    expect(par[12]).toEqual([[1, 2], 0, true, false]);
    expect(par[9]).toEqual([[], 2, true, false]);
    expect(par[21]).toEqual([[5], 1, true, true]);
    expect(par[30]).toEqual([[7], 1, false, false]);
  });

  it("refuse un troisieme porteur, un doublon chez le meme joueur et un numero hors maillots", () => {
    expect(refusNumero(joueurs, 4, "numeroFeuille1", 12)).toBe("Le 12 est déjà porté par deux joueurs, Ana Diaz et Bo Alvarez.");
    expect(refusNumero(joueurs, 4, "numeroFeuille1", 7)).toBe("Le 7 est déjà porté par deux joueurs, Bo Alvarez et Cy Perez.");
    expect(refusNumero(joueurs, 4, "numeroFeuille2", 2)).toBeNull();
    expect(refusNumero(joueurs, 4, "numeroFeuille1", 5)).toBeNull();
    expect(refusNumero(joueurs, 4, "numeroFeuille1", null)).toBeNull();
    expect(refusNumero(joueurs, 4, "numeroFeuille1", 1)).toBe("Un numéro de 2 à 14, ceux des maillots.");
    expect(refusNumero(joueurs, 4, "numeroFeuille1", 15)).toBe("Un numéro de 2 à 14, ceux des maillots.");
    // Un gardien reste sur le 1 ou le 21, et un joueur de champ n y touche pas.
    expect(refusNumero(joueurs, 5, "numeroFeuille2", 1)).toBeNull();
    expect(refusNumero(joueurs, 5, "numeroFeuille2", 5)).toBe("Un gardien porte le 1 ou le 21.");
    expect(refusNumero(joueurs, 4, "numeroFeuille1", 21)).toBe("Un numéro de 2 à 14, ceux des maillots.");
    // Le joueur qui porte deja le numero peut le garder dans la meme case.
    expect(refusNumero(joueurs, 1, "numeroFeuille2", 12)).toBeNull();
    expect(refusNumero(joueurs, 1, "numeroFeuille2", 2)).toBe("Ce joueur a déjà le 2.");
  });

  it("trie par numero principal, les sans numero en fin, puis par nom", () => {
    // A egalite sur le principal (Bo et Cy ont le 7), le secondaire departage : 7 avant 12.
    expect(trierJoueurs(joueurs).map((j) => j.id)).toEqual([6, 1, 3, 2, 5, 7, 4]);
    expect(trierJoueurs([joueurs[3], { ...joueurs[3], id: 8, nom: "Aa" }]).map((j) => j.id)).toEqual([8, 4]);
  });

});

describe("fiche d un joueur", () => {
  it("exige un prenom et un nom, et n accepte que des maillots connus", () => {
    const base = { ...SAISIE_JOUEUR_VIDE, prenom: "Ana", nom: "Diaz" };
    expect(schemaJoueur.safeParse(base).success).toBe(true);
    expect(schemaJoueur.safeParse({ ...base, nom: " " }).success).toBe(false);
    expect(schemaJoueur.safeParse({ ...base, numeroFeuille1: 2, numeroFeuille2: 14 }).success).toBe(true);
    expect(schemaJoueur.safeParse({ ...base, numeroFeuille1: 1, numeroFeuille2: 21 }).success).toBe(true);
    expect(schemaJoueur.safeParse({ ...base, numeroFeuille1: 15 }).success).toBe(false);
    expect(schemaJoueur.safeParse({ ...base, numero: 100 }).success).toBe(false);
    expect(schemaJoueur.safeParse({ ...base, dateNaissance: "2001-06-30" }).success).toBe(true);
    expect(schemaJoueur.safeParse({ ...base, dateNaissance: "30/06/2001" }).success).toBe(false);
  });

  it("le staff perd numeros de feuille et brassard", () => {
    const coach = { ...SAISIE_JOUEUR_VIDE, prenom: "Dani", nom: "Correas", poste: "Coach" as const, numeroFeuille1: 7, capitaine: true };
    expect(nettoyerSelonPoste(coach)).toEqual({ ...coach, numeroFeuille1: null, numeroFeuille2: null, capitaine: false });
    const joueur = { ...coach, poste: "Joueur" as const };
    expect(nettoyerSelonPoste(joueur)).toBe(joueur);
  });

  it("calcule l age au jour pres", () => {
    expect(ageAu("2000-06-30", new Date("2026-06-29T12:00:00Z"))).toBe(25);
    expect(ageAu("2000-06-30", new Date("2026-06-30T12:00:00Z"))).toBe(26);
    expect(ageAu(null, new Date())).toBeNull();
    expect(ageAu("n importe quoi", new Date())).toBeNull();
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
