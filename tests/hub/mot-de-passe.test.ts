import { describe, expect, it } from "vitest";

import { LONGUEUR_MINIMALE, schemaChangementMotDePasse } from "@/hub/profil/mot-de-passe";

/**
 * Le changement de mot de passe du profil : ce que la saisie accepte avant
 * que le serveur ne verifie l'actuel.
 */

const nouveau = "x".repeat(LONGUEUR_MINIMALE);
const premierMessage = (saisie: unknown) => {
  const lecture = schemaChangementMotDePasse.safeParse(saisie);
  return lecture.success ? null : lecture.error.issues[0]?.message;
};

describe("changement de mot de passe", () => {
  it("accepte un nouveau mot de passe assez long, confirme et different", () => {
    expect(premierMessage({ actuel: "ancien", nouveau, confirmation: nouveau })).toBeNull();
  });

  it("exige le mot de passe actuel", () => {
    expect(premierMessage({ actuel: "", nouveau, confirmation: nouveau })).toBe("Entrez votre mot de passe actuel.");
  });

  it("refuse un nouveau mot de passe trop court", () => {
    const court = "x".repeat(LONGUEUR_MINIMALE - 1);
    expect(premierMessage({ actuel: "ancien", nouveau: court, confirmation: court })).toMatch(/au moins/);
  });

  it("refuse une confirmation differente", () => {
    expect(premierMessage({ actuel: "ancien", nouveau, confirmation: `${nouveau}!` })).toBe(
      "Les deux saisies du nouveau mot de passe sont différentes.",
    );
  });

  it("refuse de reprendre le mot de passe actuel", () => {
    expect(premierMessage({ actuel: nouveau, nouveau, confirmation: nouveau })).toBe(
      "Le nouveau mot de passe doit être différent de l'actuel.",
    );
  });
});
