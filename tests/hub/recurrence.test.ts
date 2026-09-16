import { describe, expect, it } from "vitest";

import { formaterHeure } from "@/hub/dates";
import { occurrences } from "@/hub/recurrence";

const plage = (debut: string, fin: string) => ({ debut: new Date(debut), fin: new Date(fin) });

describe("recurrence", () => {
  it("un evenement simple a une occurrence, dans sa plage seulement", () => {
    const ev = { starts_at: "2026-09-16T20:00:00.000Z", ends_at: "2026-09-16T21:30:00.000Z" };
    expect(occurrences(ev, plage("2026-09-14T00:00:00Z", "2026-09-21T00:00:00Z"))).toHaveLength(1);
    expect(occurrences(ev, plage("2026-09-21T00:00:00Z", "2026-09-28T00:00:00Z"))).toHaveLength(0);
  });

  it("hebdomadaire : les jours choisis, a la meme heure locale, jusqu'a la borne", () => {
    // Mercredi 16 septembre 2026, 20h00 a Bruxelles (18h00 UTC en heure d'ete).
    const ev = {
      starts_at: "2026-09-16T18:00:00.000Z",
      ends_at: "2026-09-16T19:30:00.000Z",
      recurrence: { frequency: "weekly" as const, interval: 1, weekdays: ["mon", "wed"], until: "2026-09-30" },
    };
    const occ = occurrences(ev, plage("2026-09-01T00:00:00Z", "2026-10-31T00:00:00Z"));
    // 16, 21, 23, 28, 30 septembre : le lundi 14 est avant le debut.
    expect(occ.map((o) => o.debut.toISOString().slice(0, 10))).toEqual([
      "2026-09-16",
      "2026-09-21",
      "2026-09-23",
      "2026-09-28",
      "2026-09-30",
    ]);
    expect(occ.every((o) => formaterHeure(o.debut) === "20h00")).toBe(true);
    expect(occ[0].fin?.getTime()).toBe(new Date("2026-09-16T19:30:00.000Z").getTime());
  });

  it("garde 20h00 locales a travers le changement d'heure", () => {
    // Jeudi 22 octobre 2026 20h00 (UTC+2), puis 29 octobre 20h00 (UTC+1).
    const ev = {
      starts_at: "2026-10-22T18:00:00.000Z",
      ends_at: null,
      recurrence: { frequency: "weekly" as const, interval: 1, weekdays: ["thu"], until: "2026-11-05" },
    };
    const occ = occurrences(ev, plage("2026-10-01T00:00:00Z", "2026-11-30T00:00:00Z"));
    expect(occ.map((o) => o.debut.toISOString())).toEqual([
      "2026-10-22T18:00:00.000Z",
      "2026-10-29T19:00:00.000Z",
      "2026-11-05T19:00:00.000Z",
    ]);
  });

  it("toutes les deux semaines", () => {
    const ev = {
      starts_at: "2026-09-16T18:00:00.000Z",
      recurrence: { frequency: "weekly" as const, interval: 2, weekdays: ["wed"], until: "2026-10-31" },
    };
    const occ = occurrences(ev, plage("2026-09-01T00:00:00Z", "2026-11-01T00:00:00Z"));
    expect(occ.map((o) => o.debut.toISOString().slice(0, 10))).toEqual([
      "2026-09-16",
      "2026-09-30",
      "2026-10-14",
      "2026-10-28",
    ]);
  });

  it("mensuelle : le meme jour du mois, en sautant les mois trop courts", () => {
    const ev = {
      starts_at: "2026-08-31T17:00:00.000Z",
      recurrence: { frequency: "monthly" as const, interval: 1, until: "2026-12-31" },
    };
    const occ = occurrences(ev, plage("2026-08-01T00:00:00Z", "2027-01-01T00:00:00Z"));
    expect(occ.map((o) => o.debut.toISOString().slice(0, 10))).toEqual([
      "2026-08-31",
      "2026-10-31",
      "2026-12-31",
    ]);
  });

  it("sans date de fin, la recurrence n'est pas developpee", () => {
    const ev = {
      starts_at: "2026-09-16T18:00:00.000Z",
      recurrence: { frequency: "weekly" as const, interval: 1, weekdays: ["wed"], until: null },
    };
    expect(occurrences(ev, plage("2026-09-01T00:00:00Z", "2026-12-01T00:00:00Z"))).toHaveLength(1);
  });
});
