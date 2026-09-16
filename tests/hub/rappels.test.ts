import { describe, expect, it } from "vitest";

import {
  dansLaFenetre,
  destinataires,
  destinataireDepuisUtilisateur,
  estExclu,
  fenetreDuJob,
  messageDe,
  rappelsDe,
  type EvenementARappeler,
} from "@/hub/rappels/regles";

const reglages = { heureRappelMatin: "09:00", delaiRappelAvantMinutes: 60 };

const post = (extra: Partial<EvenementARappeler> = {}): EvenementARappeler => ({
  id: 42,
  titre: "Annonce vs POH ACTION",
  categorie: "post",
  journeeEntiere: false,
  annule: false,
  pasDeRappel: false,
  statut: "to_create",
  fluxIds: [3],
  formats: ["Post", "Repost en story"],
  reseaux: ["Instagram"],
  ...extra,
});

// Un post a 14h00 le 16 septembre 2026, heure de Bruxelles.
const quatorzeHeures = new Date("2026-09-16T12:00:00.000Z");

describe("rappels d une occurrence", () => {
  it("un post a 14h : le matin a 9h et une heure avant", () => {
    expect(rappelsDe(post(), quatorzeHeures, reglages)).toEqual([
      { evenementId: 42, occurrence: "2026-09-16T12:00:00.000Z", type: "morning", instant: "2026-09-16T07:00:00.000Z" },
      { evenementId: 42, occurrence: "2026-09-16T12:00:00.000Z", type: "before", instant: "2026-09-16T11:00:00.000Z" },
    ]);
  });

  it("avant 10h : seulement le rappel avant", () => {
    const neufHeuresTrente = new Date("2026-09-16T07:30:00.000Z");
    expect(rappelsDe(post(), neufHeuresTrente, reglages).map((r) => r.type)).toEqual(["before"]);
    const dixHeures = new Date("2026-09-16T08:00:00.000Z");
    expect(rappelsDe(post(), dixHeures, reglages).map((r) => r.type)).toEqual(["morning", "before"]);
  });

  it("journee entiere : seulement le matin", () => {
    const rappels = rappelsDe(post({ journeeEntiere: true }), new Date("2026-09-15T22:00:00.000Z"), reglages);
    expect(rappels.map((r) => [r.type, r.instant])).toEqual([["morning", "2026-09-16T07:00:00.000Z"]]);
  });

  it("rien pour un post publie ou annule, un evenement annule ou sans rappel", () => {
    expect(estExclu(post({ statut: "published" }))).toBe(true);
    expect(estExclu(post({ statut: "cancelled" }))).toBe(true);
    expect(estExclu(post({ annule: true }))).toBe(true);
    expect(estExclu(post({ pasDeRappel: true }))).toBe(true);
    expect(estExclu(post({ categorie: "match", statut: "published" }))).toBe(false);
    expect(rappelsDe(post({ statut: "published" }), quatorzeHeures, reglages)).toEqual([]);
  });

  it("l heure d hiver ne decale pas le rappel du matin", () => {
    const rappels = rappelsDe(post(), new Date("2026-12-16T13:00:00.000Z"), reglages);
    expect(rappels[0].instant).toBe("2026-12-16T08:00:00.000Z");
  });
});

describe("fenetre du job", () => {
  it("retient les rappels des dix dernieres minutes, bornes comprises", () => {
    const maintenant = new Date("2026-09-16T07:05:00.000Z");
    const fenetre = fenetreDuJob(maintenant);
    const rappels = rappelsDe(post(), quatorzeHeures, reglages);
    expect(dansLaFenetre(rappels, fenetre).map((r) => r.type)).toEqual(["morning"]);
    expect(dansLaFenetre(rappels, fenetreDuJob(new Date("2026-09-16T07:11:00.000Z")))).toEqual([]);
    expect(dansLaFenetre(rappels, fenetreDuJob(new Date("2026-09-16T11:00:00.000Z"))).map((r) => r.type)).toEqual(["before"]);
  });
});

describe("destinataires", () => {
  const personnes = [
    { id: 1, accesHub: true, pushActif: true, fluxNotifiesIds: [3], abonnements: 2 },
    { id: 2, accesHub: true, pushActif: false, fluxNotifiesIds: [3], abonnements: 1 },
    { id: 3, accesHub: true, pushActif: true, fluxNotifiesIds: [1], abonnements: 1 },
    { id: 4, accesHub: true, pushActif: true, fluxNotifiesIds: [3], abonnements: 0 },
    { id: 5, accesHub: false, pushActif: true, fluxNotifiesIds: [3], abonnements: 1 },
  ];

  it("push actif, un appareil, et un flux de l evenement parmi les flux notifies", () => {
    expect(destinataires(post(), personnes).map((p) => p.id)).toEqual([1]);
    expect(destinataires(post({ fluxIds: [1, 3] }), personnes).map((p) => p.id)).toEqual([1, 3]);
  });

  it("se lit depuis un utilisateur Payload, l administrateur ayant l acces d office", () => {
    const admin = destinataireDepuisUtilisateur({ id: 9, role: "admin", hub: { push_enabled: true, notified_feeds: [{ id: 3 }] } }, 1);
    expect(admin).toEqual({ id: 9, accesHub: true, pushActif: true, fluxNotifiesIds: [3], abonnements: 1 });
    const membre = destinataireDepuisUtilisateur({ id: 10, role: "manager", hub: { access: false, push_enabled: true, notified_feeds: [3] } }, 1);
    expect(membre.accesHub).toBe(false);
  });
});

describe("message", () => {
  it("pour un post, le moment, l heure, le format et les reseaux", () => {
    expect(messageDe(post(), "morning", quatorzeHeures, 60)).toEqual({
      title: "À publier aujourd'hui",
      body: "Annonce vs POH ACTION · 14h00 · Post, Repost en story, Instagram",
      url: "/hub/calendrier/evenements/42",
      tag: "rappel-42-morning-2026-09-16T12:00:00.000Z",
    });
    expect(messageDe(post(), "before", quatorzeHeures, 60).title).toBe("À publier dans 1 h");
    expect(messageDe(post(), "before", quatorzeHeures, 30).title).toBe("À publier dans 30 min");
  });

  it("pour un match, sans format ni reseaux", () => {
    const match = post({ categorie: "match", titre: "UD Asturiana vs POH", formats: [], reseaux: [] });
    expect(messageDe(match, "before", quatorzeHeures, 60)).toMatchObject({ title: "Dans 1 h", body: "UD Asturiana vs POH · 14h00" });
    expect(messageDe({ ...match, journeeEntiere: true }, "morning", quatorzeHeures, 60).body).toBe("UD Asturiana vs POH");
  });
});
