import { describe, expect, it } from "vitest";

import {
  composerDateHeure,
  depuisChampDateHeure,
  formaterDate,
  formaterDateHeure,
  formaterHeure,
  versChampDateHeure,
} from "@/hub/dates";

describe("dates du club", () => {
  it("affiche en francais, au format du club", () => {
    expect(formaterDate("2026-09-16T20:00:00.000Z")).toBe("mercredi 16 septembre 2026");
    expect(formaterHeure("2026-09-16T20:00:00.000Z")).toBe("22h00");
    expect(formaterDateHeure("2026-09-16T20:00:00.000Z")).toBe("mercredi 16 septembre 2026 à 22h00");
  });

  it("lit une saisie locale comme une heure de Bruxelles", () => {
    expect(depuisChampDateHeure("2026-09-16T22:00")).toBe("2026-09-16T20:00:00.000Z");
    expect(depuisChampDateHeure("2026-12-16T22:00")).toBe("2026-12-16T21:00:00.000Z");
    expect(depuisChampDateHeure("n importe quoi")).toBeNull();
  });

  it("fait l'aller-retour entre l'instant et le champ", () => {
    expect(versChampDateHeure("2026-09-16T20:00:00.000Z")).toBe("2026-09-16T22:00");
    expect(versChampDateHeure(null)).toBe("");
  });

  it("compose une date LFFS et son heure sans decaler le jour", () => {
    // Le cas du cahier : date a minuit UTC, heure a part, ete comme hiver.
    expect(composerDateHeure("2026-09-02", "22:00")?.toISOString()).toBe("2026-09-02T20:00:00.000Z");
    expect(composerDateHeure("2027-01-13", "22:00")?.toISOString()).toBe("2027-01-13T21:00:00.000Z");
    // Nuit du changement d'heure : 25 octobre 2026, 22h00 est deja en heure d'hiver.
    expect(composerDateHeure("2026-10-25", "22:00")?.toISOString()).toBe("2026-10-25T21:00:00.000Z");
    expect(composerDateHeure("2026-10-24", "22:00")?.toISOString()).toBe("2026-10-24T20:00:00.000Z");
  });
});
