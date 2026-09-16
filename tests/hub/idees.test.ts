import { describe, expect, it } from "vitest";

import { appliquerVote, basculerVote, schemaIdee, trierIdees } from "@/hub/idees/schema";

const idees = [
  { id: 1, votes: 2, creeLe: "2026-09-10T10:00:00.000Z" },
  { id: 2, votes: 5, creeLe: "2026-09-01T10:00:00.000Z" },
  { id: 3, votes: 2, creeLe: "2026-09-15T10:00:00.000Z" },
];

describe("tri d une colonne", () => {
  it("par votes, les plus recentes a egalite", () => {
    expect(trierIdees(idees, "votes").map((i) => i.id)).toEqual([2, 3, 1]);
  });

  it("par date, les plus recentes d abord, sans toucher a la liste", () => {
    expect(trierIdees(idees, "date").map((i) => i.id)).toEqual([3, 1, 2]);
    expect(idees.map((i) => i.id)).toEqual([1, 2, 3]);
  });
});

describe("vote", () => {
  it("bascule et ne compte qu une voix par personne", () => {
    expect(basculerVote([1, 2], 3)).toEqual([1, 2, 3]);
    expect(basculerVote([1, 2, 3], 2)).toEqual([1, 3]);
    expect(basculerVote(basculerVote([], 7), 7)).toEqual([]);
  });

  it("pour ou contre, jamais les deux", () => {
    expect(appliquerVote([1], [2], 3, "pour")).toEqual({ pour: [1, 3], contre: [2] });
    expect(appliquerVote([1, 3], [2], 3, "contre")).toEqual({ pour: [1], contre: [2, 3] });
    expect(appliquerVote([1], [2, 3], 3, "contre")).toEqual({ pour: [1], contre: [2] });
  });
});

describe("saisie d une idee", () => {
  it("exige un titre et un lien en http", () => {
    const base = { titre: "Reel coulisses", description: "", reseauxIds: [], formatIds: [], lienInspiration: "", matchLieId: null };
    expect(schemaIdee.safeParse(base).success).toBe(true);
    expect(schemaIdee.safeParse({ ...base, titre: "  " }).success).toBe(false);
    expect(schemaIdee.safeParse({ ...base, lienInspiration: "instagram.com/p/x" }).success).toBe(false);
    expect(schemaIdee.safeParse({ ...base, lienInspiration: "https://instagram.com/p/x" }).success).toBe(true);
  });
});
