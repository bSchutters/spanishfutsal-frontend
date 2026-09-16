import { describe, expect, it } from "vitest";

import { alarmesDe, construireIcs, descriptionDe, titreDe, uidDe, type EvenementIcal, type FluxIcal } from "@/hub/flux/ical";

const reglages = { heureRappelMatin: "09:00", delaiRappelAvantMinutes: 60 };
const base = "https://www.udasturiana.be";

const flux = (options: FluxIcal["options"] = {}, extra: Partial<FluxIcal> = {}): FluxIcal => ({
  name: "Social",
  slug: "social",
  emoji: null,
  alarms: false,
  options,
  ...extra,
});

const post = (extra: Partial<EvenementIcal> = {}): EvenementIcal => ({
  id: 42,
  titre: "Annonce vs POH ACTION",
  debut: "2026-09-16T16:00:00.000Z", // 18h00 a Bruxelles
  fin: "2026-09-16T16:30:00.000Z",
  journeeEntiere: false,
  annule: false,
  pasDeRappel: false,
  categorie: "post",
  statut: "to_create",
  reseaux: ["Instagram", "Facebook"],
  format: "Reel",
  lieuNom: null,
  lieuAdresse: null,
  heureRdv: null,
  description: "Penser au sponsor.",
  responsables: ["Bryan"],
  legende: "🔥 Ce mercredi, 22h00 📍 Salle des sports",
  lienVisuels: "https://drive.example/visuels",
  recurrence: null,
  creeLe: "2026-09-01T10:00:00.000Z",
  modifieLe: "2026-09-02T10:00:00.000Z",
  ...extra,
});

/** Deplie les lignes repliees du format iCal pour lire les proprietes entieres. */
const deplier = (ics: string) => ics.replace(/\r\n[ \t]/g, "");

describe("uid", () => {
  it("est stable par evenement et par flux", () => {
    expect(uidDe(42, "social")).toBe("42-social@udasturiana.be");
    expect(uidDe(42, "joueurs")).not.toBe(uidDe(42, "social"));
  });
});

describe("titre", () => {
  it("prefixe le statut et le format quand le flux les montre", () => {
    expect(titreDe(post(), flux({ show_status: true, show_networks_format: true }))).toBe("🔴 Reel · Annonce vs POH ACTION");
    expect(titreDe(post(), flux())).toBe("Annonce vs POH ACTION");
  });

  it("met l emoji du flux devant, et le marqueur d annulation", () => {
    expect(titreDe(post({ annule: true }), flux({}, { emoji: "📣" }))).toBe("📣 ❌ ANNULÉ Annonce vs POH ACTION");
  });
});

describe("description", () => {
  it("suit l ordre du cahier et n inclut que ce que le flux montre", () => {
    const texte = descriptionDe(
      post({ heureRdv: "2026-09-16T15:15:00.000Z" }),
      flux({
        show_meeting_time: true,
        show_networks_format: true,
        show_status: true,
        show_responsibles: true,
        show_visuals_link: true,
        show_caption: true,
        show_hub_link: true,
      }),
      base,
    );
    expect(texte.split("\n\n")).toEqual([
      "RDV : 17h15",
      "Penser au sponsor.",
      "Instagram, Facebook · Reel",
      "Statut : À créer",
      "Responsables : Bryan",
      "Visuels : https://drive.example/visuels",
      "Légende :\n🔥 Ce mercredi, 22h00 📍 Salle des sports",
      "https://www.udasturiana.be/hub/calendrier/evenements/42",
    ]);
  });

  it("se reduit a la description quand rien n est coche", () => {
    expect(descriptionDe(post(), flux(), base)).toBe("Penser au sponsor.");
  });
});

describe("alertes", () => {
  it("rien sans alertes sur le flux, ou avec pas de rappel", () => {
    expect(alarmesDe(post(), flux(), reglages)).toEqual([]);
    expect(alarmesDe(post({ pasDeRappel: true }), flux({}, { alarms: true }), reglages)).toEqual([]);
  });

  it("le matin et une heure avant pour un post a 18h00", () => {
    const alertes = alarmesDe(post(), flux({}, { alarms: true }), reglages);
    expect(alertes).toHaveLength(2);
    // 18h00 moins 9h00 : neuf heures avant.
    expect(alertes[0]).toMatchObject({ trigger: 9 * 3600 });
    expect(alertes[1]).toMatchObject({ trigger: 3600 });
  });

  it("seulement l alerte avant quand l evenement commence avant 10h00", () => {
    const alertes = alarmesDe(post({ debut: "2026-09-16T07:30:00.000Z" }), flux({}, { alarms: true }), reglages);
    expect(alertes).toHaveLength(1);
    expect(alertes[0]).toMatchObject({ trigger: 3600 });
  });

  it("seulement l alerte du matin pour une journee entiere", () => {
    const alertes = alarmesDe(post({ journeeEntiere: true }), flux({}, { alarms: true }), reglages);
    expect(alertes).toHaveLength(1);
    expect(alertes[0]).toMatchObject({ triggerAfter: 9 * 3600 });
  });
});

describe("fichier ics", () => {
  it("porte le nom du calendrier, l uid, la sequence et le fuseau", () => {
    const ics = deplier(construireIcs({ flux: flux(), evenements: [post()], reglages, baseUrl: base }));
    expect(ics).toContain("X-WR-CALNAME:UDA · Social");
    expect(ics).toContain("UID:42-social@udasturiana.be");
    expect(ics).toContain("SEQUENCE:86400");
    expect(ics).toContain("DTSTART;TZID=Europe/Brussels:20260916T180000");
    expect(ics).toContain("STATUS:CONFIRMED");
    expect(ics).not.toContain("VALARM");
  });

  it("ecrit la recurrence en RRULE", () => {
    const ics = deplier(
      construireIcs({
        flux: flux(),
        evenements: [
          post({
            categorie: "training",
            recurrence: { frequency: "weekly", interval: 2, weekdays: ["mon", "wed"], until: "2026-12-15" },
          }),
        ],
        reglages,
        baseUrl: base,
      }),
    );
    expect(ics).toMatch(/RRULE:FREQ=WEEKLY;.*INTERVAL=2/);
    expect(ics).toMatch(/RRULE:.*BYDAY=MO,WE/);
    expect(ics).toMatch(/RRULE:.*UNTIL=20261215T/);
  });

  it("garde l evenement annule avec STATUS:CANCELLED et le prefixe", () => {
    const ics = deplier(construireIcs({ flux: flux(), evenements: [post({ annule: true })], reglages, baseUrl: base }));
    expect(ics).toContain("STATUS:CANCELLED");
    expect(ics).toContain("SUMMARY:❌ ANNULÉ Annonce vs POH ACTION");
  });

  it("ecrit les alertes quand le flux les demande", () => {
    const ics = deplier(construireIcs({ flux: flux({}, { alarms: true }), evenements: [post()], reglages, baseUrl: base }));
    expect(ics.match(/BEGIN:VALARM/g)).toHaveLength(2);
    expect(ics).toContain("TRIGGER:-PT9H");
    expect(ics).toContain("TRIGGER:-PT1H");
  });

  it("n ecrit jamais les notes internes, meme si on les lui glisse", () => {
    const evenement = { ...post(), notesInternes: "SECRET INTERNE" } as EvenementIcal;
    const ics = construireIcs({
      flux: flux({ show_caption: true, show_status: true, show_responsibles: true, show_hub_link: true }),
      evenements: [evenement],
      reglages,
      baseUrl: base,
    });
    expect(ics).not.toContain("SECRET INTERNE");
  });

  it("met le lieu et l adresse dans LOCATION", () => {
    const ics = deplier(
      construireIcs({
        flux: flux(),
        evenements: [post({ lieuNom: "Salle Saint-Pierre", lieuAdresse: "Rue du Sport 1, 1180 Uccle" })],
        reglages,
        baseUrl: base,
      }),
    );
    expect(ics).toContain("LOCATION:Salle Saint-Pierre\\, Rue du Sport 1\\, 1180 Uccle");
  });
});
