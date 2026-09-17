import { describe, expect, it } from "vitest";

import { modulesAccessibles, niveauModule, type UtilisateurHub } from "@/hub/droits";
import { ageAu, ficheDe, nettoyerSelonPoste, schemaJoueur, SAISIE_JOUEUR_VIDE } from "@/hub/joueurs/fiche";
import { libellePoste, libelleStaff, POSTES, rangPoste, surLaFeuille } from "@/lib/postes";
import {
  butsDuClub,
  depuisTableauxMatch,
  ecartAvecLeScore,
  etatSaisie,
  numerosEnDoublon,
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

describe("ordre de l effectif", () => {
  const joueurs = [
    { id: 1, prenom: "Ana", nom: "Diaz", numero: 2 },
    { id: 2, prenom: "Bo", nom: "Alvarez", numero: 7 },
    { id: 3, prenom: "Cy", nom: "Perez", numero: 7 },
    { id: 4, prenom: "Di", nom: "Ruiz", numero: null },
    { id: 5, prenom: "Ed", nom: "Sola", numero: 21 },
  ];

  it("signale les numeros portes par plusieurs personnes", () => {
    expect([...numerosEnDoublon(joueurs)]).toEqual([7]);
    expect(numerosEnDoublon([joueurs[0], joueurs[3]]).size).toBe(0);
    expect(numerosEnDoublon([joueurs[3], { ...joueurs[3], id: 9 }]).size).toBe(0);
  });

  it("trie par numero, les sans numero en fin, a egalite par nom", () => {
    expect(trierJoueurs(joueurs).map((j) => j.id)).toEqual([1, 2, 3, 5, 4]);
    expect(trierJoueurs([joueurs[3], { ...joueurs[3], id: 6, nom: "Aa" }]).map((j) => j.id)).toEqual([6, 4]);
    expect(joueurs.map((j) => j.id)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("fiche d un joueur", () => {
  it("exige un prenom et un nom, et un numero de 0 a 99 ou rien", () => {
    const base = { ...SAISIE_JOUEUR_VIDE, prenom: "Ana", nom: "Diaz" };
    expect(schemaJoueur.safeParse(base).success).toBe(true);
    expect(schemaJoueur.safeParse({ ...base, nom: " " }).success).toBe(false);
    expect(schemaJoueur.safeParse({ ...base, numero: 21 }).success).toBe(true);
    expect(schemaJoueur.safeParse({ ...base, numero: 100 }).success).toBe(false);
    expect(schemaJoueur.safeParse({ ...base, numero: 7.5 }).success).toBe(false);
    expect(schemaJoueur.safeParse({ ...base, dateNaissance: "2001-06-30" }).success).toBe(true);
    expect(schemaJoueur.safeParse({ ...base, dateNaissance: "30/06/2001" }).success).toBe(false);
  });

  it("le staff perd numero et brassard", () => {
    const coach = { ...SAISIE_JOUEUR_VIDE, prenom: "Dani", nom: "Correas", poste: "Coach" as const, numero: 7, capitaine: true };
    expect(nettoyerSelonPoste(coach)).toEqual({ ...coach, numero: null, capitaine: false });
    const joueur = { ...coach, poste: "Joueur" as const };
    expect(nettoyerSelonPoste(joueur)).toBe(joueur);
  });

  it("traduit un document de la collection, photo peuplee ou non", () => {
    const doc = {
      id: "12",
      prenom: "  Valadi ",
      nom: "Marias",
      poste: "Gardien",
      numero: 1,
      date_naissance: "1995-04-02T12:00:00.000Z",
      capitaine: true,
      actif: true,
      photo: { id: 7, url: "/media/valadi.webp" },
    };
    expect(ficheDe(doc)).toEqual({
      id: 12,
      prenom: "Valadi",
      nom: "Marias",
      poste: "Gardien",
      gardien: true,
      surFeuille: true,
      numero: 1,
      dateNaissance: "1995-04-02",
      capitaine: true,
      actif: true,
      photo: { id: 7, url: "/media/valadi.webp" },
    });
  });

  it("seuls le gardien et le joueur de champ sont sur la feuille, un poste absent non plus", () => {
    const base = { id: 1, prenom: "Dani", nom: "Correas" };
    expect(ficheDe({ ...base, poste: "Coach" })).toMatchObject({ surFeuille: false, gardien: false });
    expect(ficheDe({ ...base, poste: "Adjoint" })).toMatchObject({ surFeuille: false });
    expect(ficheDe({ ...base, poste: "Joueur" })).toMatchObject({ surFeuille: true, gardien: false });
    // Une fiche sans poste passe dans le staff, comme sur le site.
    expect(ficheDe(base)).toMatchObject({ poste: null, surFeuille: false });
  });

  it("sans valeur, une fiche reste lisible : actif par defaut, ni numero ni photo", () => {
    expect(ficheDe({ id: 3, prenom: "Ana", nom: "Diaz" })).toMatchObject({
      numero: null,
      dateNaissance: null,
      capitaine: false,
      actif: true,
      photo: null,
    });
    // Une relation non peuplee ne donne pas d'adresse d'image : pas de photo a montrer.
    expect(ficheDe({ id: 3, prenom: "Ana", nom: "Diaz", photo: 7 }).photo).toBeNull();
    expect(ficheDe({ id: 3, prenom: "Ana", nom: "Diaz", actif: false }).actif).toBe(false);
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
    expect(modulesAccessibles({ id: 1, role: "admin" })).toEqual(["calendar", "players", "live"]);
  });
});

describe("postes du club", () => {
  it("garde l ordre d affichage : le terrain, puis le staff du coach au reste", () => {
    expect([...POSTES]).toEqual(["Gardien", "Joueur", "Coach", "Adjoint", "Delegue", "Kine", "Staff"]);
    const staff = ["Staff", "Kine", "Adjoint", "Delegue", "Coach"];
    expect([...staff].sort((a, b) => rangPoste(a) - rangPoste(b))).toEqual(["Coach", "Adjoint", "Delegue", "Kine", "Staff"]);
    // Un poste absent ou inconnu ferme la marche.
    expect(rangPoste(null)).toBe(POSTES.length);
    expect(rangPoste("Intendant")).toBe(POSTES.length);
  });

  it("affiche les accents que la valeur stockee n a pas", () => {
    expect(libellePoste("Kine")).toBe("Kiné");
    expect(libellePoste("Delegue")).toBe("Délégué");
    expect(libellePoste("Adjoint")).toBe("Adjoint");
    expect(libellePoste(null)).toBe("");
    // Un poste inconnu se montre tel quel plutot que de disparaitre.
    expect(libellePoste("Intendant")).toBe("Intendant");
  });

  it("seuls le gardien et le joueur de champ sont sur la feuille", () => {
    expect(POSTES.filter((p) => surLaFeuille(p))).toEqual(["Gardien", "Joueur"]);
    expect(surLaFeuille(null)).toBe(false);
  });

  it("un membre du staff sans poste renseigne s affiche quand meme", () => {
    expect(libelleStaff(null)).toBe("Staff");
    expect(libelleStaff("Kine")).toBe("Kiné");
  });
});
