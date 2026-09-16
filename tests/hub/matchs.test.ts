import { describe, expect, it } from "vitest";

import {
  camp,
  construireChampsMatch,
  differences,
  heureRdvApresSynchro,
  jourDuMatch,
  scoreDe,
  type ContexteConstruction,
  type MatchLffs,
} from "@/hub/matchs/construction";
import { dateDuPost, modeleSApplique, planifierPosts, type ModelePost, type PostExistant } from "@/hub/matchs/posts";
import { rendreLexical, rendreTexte, variablesDe } from "@/hub/matchs/variables";
import { texteVersLexical } from "@/hub/texte";

const contexte: ContexteConstruction = {
  nomClub: "UD Asturiana",
  motifClub: "ASTURIANA",
  equipes: {
    "UNION DEPORTIVA ASTURIANA": { name: "UD Asturiana", logo: "", isClub: true },
    "POH ACTION": { name: "POH Action", logo: "", isClub: false },
  },
  salles: new Map([[7, { nom: "Salle Saint-Pierre", adresse: "Rue du Sport 1, 1180 Uccle" }]]),
  dureeMatchMinutes: 75,
  delaiRdvMinutes: 45,
};

const match = (extra: Partial<MatchLffs> = {}): MatchLffs => ({
  id: 12,
  lffs_id: 5001,
  home_team: "UNION DEPORTIVA ASTURIANA",
  away_team: "POH ACTION",
  score_home: null,
  score_away: null,
  date: "2026-09-02T00:00:00.000Z",
  time: "22:00:00",
  venue_id: 7,
  venue_name: "St-Pierre",
  live_link: null,
  replay_link: null,
  serie_reference: "P3C",
  season: 3,
  ...extra,
});

describe("camp du club", () => {
  it("suit la collection Equipes", () => {
    expect(camp(match(), contexte)).toEqual({ domicile: true, adversaire: "POH Action", nomClub: "UD Asturiana" });
    expect(camp(match({ home_team: "POH ACTION", away_team: "UNION DEPORTIVA ASTURIANA" }), contexte).domicile).toBe(false);
  });

  it("se rabat sur le motif quand les equipes sont inconnues", () => {
    const inconnues = { ...contexte, equipes: {} };
    expect(camp(match({ home_team: "FC INCONNU", away_team: "ASTURIANA B" }), inconnues)).toMatchObject({
      domicile: false,
      adversaire: "FC INCONNU",
    });
    // Rien ne tranche : a domicile, plutot que de perdre le match.
    expect(camp(match({ home_team: "A", away_team: "B" }), inconnues).domicile).toBe(true);
  });
});

describe("construction de l evenement", () => {
  it("lit la date LFFS a minuit UTC et l heure a part, sans decaler le jour", () => {
    expect(jourDuMatch(match())).toBe("2026-09-02");
    // Une date saisie dans l'admin, en minuit de Bruxelles, donne le meme jour.
    expect(jourDuMatch(match({ date: "2026-09-01T22:00:00.000Z" }))).toBe("2026-09-02");
    const champs = construireChampsMatch(match(), contexte);
    expect(champs).toMatchObject({
      title: "UD Asturiana vs POH Action",
      starts_at: "2026-09-02T20:00:00.000Z",
      ends_at: "2026-09-02T21:15:00.000Z",
      all_day: false,
      location_name: "St-Pierre",
      location_address: "Rue du Sport 1, 1180 Uccle",
      opponent: "POH Action",
      home: true,
      competition: "P3C",
      score: null,
      lffs_id: 5001,
      description: "P3C",
    });
  });

  it("tient compte de l heure d hiver et de la nuit du changement d heure", () => {
    expect(construireChampsMatch(match({ date: "2027-01-13T00:00:00.000Z" }), contexte)?.starts_at).toBe("2027-01-13T21:00:00.000Z");
    expect(construireChampsMatch(match({ date: "2026-10-25T00:00:00.000Z" }), contexte)?.starts_at).toBe("2026-10-25T21:00:00.000Z");
    expect(construireChampsMatch(match({ date: "2026-10-24T00:00:00.000Z" }), contexte)?.starts_at).toBe("2026-10-24T20:00:00.000Z");
  });

  it("ignore un match sans date, et met un match sans heure sur la journee", () => {
    expect(construireChampsMatch(match({ date: null }), contexte)).toBeNull();
    expect(construireChampsMatch(match({ lffs_id: null }), contexte)).toBeNull();
    expect(construireChampsMatch(match({ time: null }), contexte)).toMatchObject({
      all_day: true,
      starts_at: "2026-09-01T22:00:00.000Z",
      ends_at: null,
    });
  });

  it("titre a l exterieur, score et lien live", () => {
    const champs = construireChampsMatch(
      match({ home_team: "POH ACTION", away_team: "UNION DEPORTIVA ASTURIANA", score_home: 1, score_away: 3, live_link: "https://youtu.be/x" }),
      contexte,
    );
    expect(champs?.title).toBe("POH Action vs UD Asturiana");
    expect(champs?.score).toBe("1 - 3");
    expect(champs?.description).toBe("P3C\nLive : https://youtu.be/x");
    expect(scoreDe({ score_home: 2, score_away: null })).toBeNull();
  });

  it("ne renvoie que ce qui change", () => {
    const champs = construireChampsMatch(match(), contexte)!;
    const enBase = { ...champs, starts_at: "2026-09-02T20:00:00+00:00", competition: "P3C", title: "UD Asturiana vs POH Action" };
    expect(differences(enBase, champs)).toEqual({});
    expect(differences({ ...enBase, title: "vieux titre", score: "" }, champs)).toEqual({ title: "UD Asturiana vs POH Action" });
    expect(differences({ ...enBase, score: "" }, { ...champs, score: "1 - 3" })).toEqual({ score: "1 - 3" });
  });
});

describe("rendez-vous", () => {
  it("par defaut avant le coup d envoi, conserve l ecart regle a la main", () => {
    expect(
      heureRdvApresSynchro({ ancienDebut: null, ancienRdv: null, nouveauDebut: "2026-09-02T20:00:00.000Z", journeeEntiere: false, delaiMinutes: 45 }),
    ).toBe("2026-09-02T19:15:00.000Z");
    // Rendez-vous regle deux heures avant : le match bouge, l'ecart reste.
    expect(
      heureRdvApresSynchro({
        ancienDebut: "2026-09-02T20:00:00.000Z",
        ancienRdv: "2026-09-02T18:00:00.000Z",
        nouveauDebut: "2026-09-09T19:00:00.000Z",
        journeeEntiere: false,
        delaiMinutes: 45,
      }),
    ).toBe("2026-09-09T17:00:00.000Z");
    expect(
      heureRdvApresSynchro({ ancienDebut: null, ancienRdv: null, nouveauDebut: "2026-09-02T20:00:00.000Z", journeeEntiere: true, delaiMinutes: 45 }),
    ).toBeNull();
  });
});

describe("variables", () => {
  const champs = construireChampsMatch(match(), contexte)!;
  const variables = variablesDe(champs, { heureRdv: "2026-09-02T19:15:00.000Z", lienLive: "https://youtu.be/x", lienReplay: null });

  it("sont celles du cahier, au format du club", () => {
    expect(variables).toEqual({
      adversaire: "POH Action",
      date: "mercredi 2 septembre",
      date_courte: "02/09/2026",
      heure: "22h00",
      heure_rdv: "21h15",
      salle: "St-Pierre",
      adresse: "Rue du Sport 1, 1180 Uccle",
      domicile_exterieur: "à domicile",
      competition: "P3C",
      score: "",
      lien_live: "https://youtu.be/x",
      lien_replay: "",
    });
  });

  it("se remplacent dans un texte et dans un etat Lexical", () => {
    expect(rendreTexte("Annonce vs {adversaire} {date} à {heure} 📍 {salle} {inconnue}", variables)).toBe(
      "Annonce vs POH Action mercredi 2 septembre à 22h00 📍 St-Pierre {inconnue}",
    );
    const rendu = rendreLexical(texteVersLexical("Penser au sponsor pour {adversaire}."), variables) as {
      root: { children: Array<{ children: Array<{ text: string }> }> };
    };
    expect(rendu.root.children[0].children[0].text).toBe("Penser au sponsor pour POH Action.");
  });
});

const modele = (extra: Partial<ModelePost> = {}): ModelePost => ({
  id: 1,
  nom: "Annonce",
  actif: true,
  appliquerA: "both",
  decalageJours: -2,
  modeHeure: "fixed_time",
  heureFixe: "18:00",
  decalageMinutes: null,
  titreModele: "Annonce vs {adversaire}",
  legendeModele: "🔥 {date} à {heure}\n📍 {salle}",
  instructions: null,
  reseauxIds: [1, 2],
  formatId: 4,
  fluxIds: [],
  responsablesIds: [],
  ...extra,
});

describe("date des posts", () => {
  const debut = "2026-09-02T20:00:00.000Z"; // mercredi 2 septembre, 22h00

  it("a heure fixe, N jours avant ou apres", () => {
    expect(dateDuPost(debut, modele())).toBe("2026-08-31T16:00:00.000Z"); // lundi 31 aout 18h00
    expect(dateDuPost(debut, modele({ decalageJours: 1, heureFixe: "12:00" }))).toBe("2026-09-03T10:00:00.000Z");
  });

  it("par rapport au coup d envoi", () => {
    expect(dateDuPost(debut, modele({ decalageJours: 0, modeHeure: "relative_to_kickoff", decalageMinutes: -120 }))).toBe(
      "2026-09-02T18:00:00.000Z",
    );
  });

  it("garde l heure locale a travers le changement d heure", () => {
    // Match le dimanche 25 octobre 22h00 (heure d'hiver) ; deux jours avant, encore en heure d'ete.
    expect(dateDuPost("2026-10-25T21:00:00.000Z", modele())).toBe("2026-10-23T16:00:00.000Z");
  });

  it("s applique selon le camp", () => {
    expect(modeleSApplique(modele({ appliquerA: "home" }), true)).toBe(true);
    expect(modeleSApplique(modele({ appliquerA: "home" }), false)).toBe(false);
    expect(modeleSApplique(modele({ actif: false }), true)).toBe(false);
  });
});

describe("plan des posts", () => {
  const champs = construireChampsMatch(match(), contexte)!;
  const variables = variablesDe(champs, { heureRdv: null, lienLive: null, lienReplay: null });
  const contextePosts = { typePostId: 9, fluxParDefautId: 3 };
  const existant = (extra: Partial<PostExistant> = {}): PostExistant => ({
    id: 100,
    modeleId: 1,
    debut: "2026-08-31T16:00:00.000Z",
    fin: "2026-08-31T16:30:00.000Z",
    statut: "to_create",
    annule: false,
    titre: "Annonce vs POH Action",
    legende: "🔥 mercredi 2 septembre à 22h00\n📍 St-Pierre",
    description: null,
    dateModifieeManuellement: false,
    legendeModifieeManuellement: false,
    ...extra,
  });
  const planifier = (existants: PostExistant[], mode: "synchro" | "completer" | "reinitialiser" = "synchro", modeles = [modele()]) =>
    planifierPosts({ modeles, existants, champs, variables, contexte: contextePosts, mode });

  it("cree un post par modele qui s applique, avec le flux Social par defaut", () => {
    const plan = planifier([]);
    expect(plan.aCreer).toHaveLength(1);
    expect(plan.aCreer[0].data).toMatchObject({
      title: "Annonce vs POH Action",
      caption: "🔥 mercredi 2 septembre à 22h00\n📍 St-Pierre",
      starts_at: "2026-08-31T16:00:00.000Z",
      ends_at: "2026-08-31T16:30:00.000Z",
      type: 9,
      feeds: [3],
      primary_feed: 3,
      networks: [1, 2],
      format: 4,
      status: "to_create",
      template: 1,
    });
    expect(planifier([], "synchro", [modele({ appliquerA: "away" })]).aCreer).toHaveLength(0);
  });

  it("ne cree jamais deux posts pour le meme couple match et modele", () => {
    const plan = planifier([existant()]);
    expect(plan.aCreer).toHaveLength(0);
    expect(plan.aModifier).toHaveLength(0);
  });

  it("donne une fin d une demi-heure a un post qui n en a pas", () => {
    expect(planifier([existant({ fin: null })]).aModifier).toEqual([{ id: 100, data: { ends_at: "2026-08-31T16:30:00.000Z" } }]);
    expect(planifier([existant({ fin: null, dateModifieeManuellement: true })]).aModifier).toHaveLength(0);
  });

  it("deplace les posts quand le match bouge, sauf ceux regles a la main, publies ou annules", () => {
    const deplace = { ...champs, starts_at: "2026-09-09T19:00:00.000Z" };
    const plan = planifierPosts({
      modeles: [modele()],
      existants: [existant({ legendeModifieeManuellement: true })],
      champs: deplace,
      variables,
      contexte: contextePosts,
      mode: "synchro",
    });
    expect(plan.aModifier).toEqual([
      { id: 100, data: { starts_at: "2026-09-07T16:00:00.000Z", ends_at: "2026-09-07T16:30:00.000Z" } },
    ]);

    for (const fige of [existant({ dateModifieeManuellement: true }), existant({ statut: "published" }), existant({ statut: "cancelled" })]) {
      const sans = planifierPosts({ modeles: [modele()], existants: [fige], champs: deplace, variables, contexte: contextePosts, mode: "synchro" });
      expect(sans.aModifier.every((m) => !("starts_at" in m.data))).toBe(true);
    }
  });

  it("re-rend les textes quand le score arrive, sauf legende retouchee a la main", () => {
    const resultat = modele({ id: 2, nom: "Résultat", decalageJours: 1, heureFixe: "12:00", titreModele: "Résultat vs {adversaire}", legendeModele: "🏁 {score}" });
    const avecScore = variablesDe({ ...champs, score: "3 - 1" }, { heureRdv: null, lienLive: null, lienReplay: null });
    const post = existant({
      id: 200,
      modeleId: 2,
      debut: "2026-09-03T10:00:00.000Z",
      fin: "2026-09-03T10:30:00.000Z",
      titre: "Résultat vs POH Action",
      legende: "🏁 ",
    });
    const plan = planifierPosts({ modeles: [resultat], existants: [post], champs: { ...champs, score: "3 - 1" }, variables: avecScore, contexte: contextePosts, mode: "synchro" });
    expect(plan.aModifier).toEqual([{ id: 200, data: { caption: "🏁 3 - 1" } }]);

    const retouche = planifierPosts({
      modeles: [resultat],
      existants: [{ ...post, legendeModifieeManuellement: true }],
      champs: { ...champs, score: "3 - 1" },
      variables: avecScore,
      contexte: contextePosts,
      mode: "synchro",
    });
    expect(retouche.aModifier).toHaveLength(0);
  });

  it("le bouton Regenerer complete sans toucher, ou reinitialise les non publies", () => {
    const touche = existant({ debut: "2026-08-30T10:00:00.000Z", dateModifieeManuellement: true, statut: "ready" });
    expect(planifier([touche], "completer").aModifier).toHaveLength(0);
    expect(planifier([], "completer").aCreer).toHaveLength(1);

    const remis = planifier([touche], "reinitialiser");
    expect(remis.aModifier).toEqual([
      {
        id: 100,
        data: {
          starts_at: "2026-08-31T16:00:00.000Z",
          ends_at: "2026-08-31T16:30:00.000Z",
          title: "Annonce vs POH Action",
          caption: "🔥 mercredi 2 septembre à 22h00\n📍 St-Pierre",
          description: null,
          status: "to_create",
          cancelled: false,
          date_edited_manually: false,
          caption_edited_manually: false,
        },
      },
    ]);
    expect(planifier([existant({ statut: "published", dateModifieeManuellement: true })], "reinitialiser").aModifier).toHaveLength(0);
  });
});
