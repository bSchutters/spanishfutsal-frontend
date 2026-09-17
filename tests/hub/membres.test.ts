import { describe, expect, it } from "vitest";

import { MODULE_KEYS, type ModuleKey } from "@/hub/modules";
import {
  depuisLignesModules,
  membreDe,
  nettoyerSelonAcces,
  nomDuMembre,
  schemaDroitsMembre,
  versLignesModules,
} from "@/hub/membres/schema";

/**
 * Les droits d'un compte, regles depuis le Hub : la traduction entre l'ecran
 * et la collection Users, et ce qu'une saisie accepte.
 *
 * Les attentes se construisent depuis le registre des modules, jamais d'une
 * liste recopiee : un module de plus ne doit pas casser ces tests, c'est
 * justement ce que cette page sert a ouvrir aux gens.
 */

/** Tous les modules a null, sauf ceux qu'on precise. */
const niveauxAttendus = (precises: Partial<Record<ModuleKey, string>> = {}) =>
  Object.fromEntries(MODULE_KEYS.map((cle) => [cle, precises[cle] ?? null]));

describe("l ecran vers la collection", () => {
  it("une ligne par module accorde, dans l ordre du registre", () => {
    expect(versLignesModules({ players: "read", calendar: "edit" })).toEqual([
      { module: "calendar", level: "edit" },
      { module: "players", level: "read" },
    ]);
  });

  it("un module sans niveau, inconnu ou mal renseigne ne donne aucune ligne", () => {
    expect(versLignesModules({ calendar: null, players: undefined })).toEqual([]);
    expect(versLignesModules({ tresorerie: "edit" } as Record<string, never>)).toEqual([]);
    expect(versLignesModules({})).toEqual([]);
  });
});

describe("la collection vers l ecran", () => {
  it("chaque module du registre recoit son niveau, ou null", () => {
    expect(depuisLignesModules([{ module: "calendar", level: "edit" }])).toEqual(niveauxAttendus({ calendar: "edit" }));
  });

  it("ignore une ligne vide, un module inconnu ou un niveau invente", () => {
    expect(depuisLignesModules([null, { module: "tresorerie", level: "edit" }, { module: "players", level: "chef" }])).toEqual(
      niveauxAttendus(),
    );
    expect(depuisLignesModules(null)).toEqual(niveauxAttendus());
  });
});

describe("acces au Hub", () => {
  const saisie = { id: 2, acces: true, niveaux: { calendar: "edit" as const }, fluxIds: [1, 2] };

  it("sans acces, les modules et les flux sont effaces", () => {
    expect(nettoyerSelonAcces({ ...saisie, acces: false })).toEqual({ id: 2, acces: false, niveaux: {}, fluxIds: [] });
  });

  it("avec acces, la saisie passe telle quelle", () => {
    expect(nettoyerSelonAcces(saisie)).toBe(saisie);
  });

  it("refuse un identifiant absent ou un niveau invente", () => {
    expect(schemaDroitsMembre.safeParse(saisie).success).toBe(true);
    expect(schemaDroitsMembre.safeParse({ ...saisie, id: 0 }).success).toBe(false);
    expect(schemaDroitsMembre.safeParse({ ...saisie, niveaux: { calendar: "chef" } }).success).toBe(false);
    expect(schemaDroitsMembre.safeParse({ ...saisie, niveaux: { calendar: null } }).success).toBe(true);
    expect(schemaDroitsMembre.safeParse({ ...saisie, fluxIds: ["un"] }).success).toBe(false);
  });
});

describe("une fiche de compte", () => {
  it("traduit un document de la collection", () => {
    const doc = {
      id: "5",
      email: "test-hub@udasturiana.be",
      first_name: " Test ",
      last_name: "Hub",
      role: "manager",
      hub: { access: true, modules: [{ module: "calendar", level: "edit" }], feeds: [10, { id: 11 }], push_enabled: true },
      createdAt: "2026-09-16T10:00:00.000Z",
    };
    expect(membreDe(doc)).toEqual({
      id: 5,
      prenom: "Test",
      nom: "Hub",
      email: "test-hub@udasturiana.be",
      administrateur: false,
      acces: true,
      niveaux: niveauxAttendus({ calendar: "edit" }),
      fluxIds: [10, 11],
      pushActif: true,
      creeLe: "2026-09-16T10:00:00.000Z",
    });
  });

  it("un administrateur a l acces sans que la case soit cochee", () => {
    const admin = membreDe({ id: 1, email: "bryan@exemple.be", role: "admin" });
    expect(admin.administrateur).toBe(true);
    expect(admin.acces).toBe(true);
  });

  it("un compte sans bloc Hub n a ni acces ni module", () => {
    const seul = membreDe({ id: 3, email: "nouveau@exemple.be", role: "manager" });
    expect(seul.acces).toBe(false);
    expect(seul.niveaux).toEqual(niveauxAttendus());
    expect(seul.fluxIds).toEqual([]);
  });

  it("le nom tombe sur le debut de l adresse quand il manque", () => {
    expect(nomDuMembre({ prenom: "Bryan", nom: "Schutters", email: "b@x.be" })).toBe("Bryan Schutters");
    expect(nomDuMembre({ prenom: "Bryan", nom: "", email: "b@x.be" })).toBe("Bryan");
    expect(nomDuMembre({ prenom: "", nom: "", email: "comite@x.be" })).toBe("comite");
  });
});
