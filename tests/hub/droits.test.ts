import { describe, expect, it } from "vitest";

import {
  aAccesHub,
  champAdmin,
  champSoiOuAdmin,
  editionModuleParFlux,
  filtreParFlux,
  idsFluxAutorises,
  lectureDesFlux,
  lectureModuleParFlux,
  modulesAccessibles,
  niveauModule,
  peutEditer,
  peutLire,
  type UtilisateurHub,
} from "@/hub/droits";

const admin: UtilisateurHub = { id: 1, role: "admin" };

const lecteur: UtilisateurHub = {
  id: 2,
  role: "manager",
  hub: { access: true, modules: [{ module: "calendar", level: "read" }], feeds: [10, { id: 11 }] },
};

const editeur: UtilisateurHub = {
  id: 3,
  role: "manager",
  hub: { access: true, modules: [{ module: "calendar", level: "edit" }], feeds: [10] },
};

const sansAcces: UtilisateurHub = {
  id: 4,
  role: "manager",
  hub: { access: false, modules: [{ module: "calendar", level: "edit" }], feeds: [10] },
};

const sansFlux: UtilisateurHub = {
  id: 5,
  role: "manager",
  hub: { access: true, modules: [{ module: "calendar", level: "read" }], feeds: [] },
};

const req = (user: UtilisateurHub | null) => ({ req: { user } }) as never;

describe("acces au Hub", () => {
  it("un administrateur a tout sans reglage", () => {
    expect(aAccesHub(admin)).toBe(true);
    expect(niveauModule(admin, "calendar")).toBe("edit");
    expect(idsFluxAutorises(admin)).toBeNull();
  });

  it("sans la case Acces au Hub, rien ne passe, meme avec des modules", () => {
    expect(aAccesHub(sansAcces)).toBe(false);
    expect(niveauModule(sansAcces, "calendar")).toBeNull();
    expect(modulesAccessibles(sansAcces)).toEqual([]);
    expect(idsFluxAutorises(sansAcces)).toEqual([]);
  });

  it("sans session, rien ne passe", () => {
    expect(aAccesHub(null)).toBe(false);
    expect(aAccesHub(undefined)).toBe(false);
    expect(peutLire(null, "calendar")).toBe(false);
  });

  it("la lecture ne donne pas l'edition", () => {
    expect(peutLire(lecteur, "calendar")).toBe(true);
    expect(peutEditer(lecteur, "calendar")).toBe(false);
    expect(peutEditer(editeur, "calendar")).toBe(true);
  });

  it("les flux se lisent peuples ou non", () => {
    expect(idsFluxAutorises(lecteur)).toEqual([10, 11]);
  });
});

describe("filtre par flux", () => {
  it("vaut vrai pour l'administrateur", () => {
    expect(filtreParFlux(admin)).toBe(true);
  });

  it("vaut faux sans aucun flux : les evenements n'existent pas pour cette personne", () => {
    expect(filtreParFlux(sansFlux)).toBe(false);
  });

  it("restreint aux flux autorises", () => {
    expect(filtreParFlux(lecteur)).toEqual({ feeds: { in: [10, 11] } });
    expect(filtreParFlux(lecteur, "id")).toEqual({ id: { in: [10, 11] } });
  });
});

describe("regles Payload", () => {
  it("lecture des evenements : niveau lecture et filtre par flux", () => {
    const regle = lectureModuleParFlux("calendar");
    expect(regle(req(lecteur))).toEqual({ feeds: { in: [10, 11] } });
    expect(regle(req(admin))).toBe(true);
    expect(regle(req(sansAcces))).toBe(false);
    expect(regle(req(null))).toBe(false);
  });

  it("edition des evenements : niveau edition et filtre par flux", () => {
    const regle = editionModuleParFlux("calendar");
    expect(regle(req(lecteur))).toBe(false);
    expect(regle(req(editeur))).toEqual({ feeds: { in: [10] } });
  });

  it("les flux eux-memes : chacun ne voit que les siens", () => {
    expect(lectureDesFlux(req(lecteur))).toEqual({ id: { in: [10, 11] } });
    expect(lectureDesFlux(req(admin))).toBe(true);
    expect(lectureDesFlux(req(null))).toBe(false);
  });

  it("champ reserve a l'administrateur", () => {
    expect(champAdmin({ req: { user: admin } } as never)).toBe(true);
    expect(champAdmin({ req: { user: editeur } } as never)).toBe(false);
  });

  it("champ modifiable par l'interesse ou l'administrateur", () => {
    expect(champSoiOuAdmin({ req: { user: lecteur }, id: 2 } as never)).toBe(true);
    expect(champSoiOuAdmin({ req: { user: lecteur }, id: "2" } as never)).toBe(true);
    expect(champSoiOuAdmin({ req: { user: lecteur }, id: 3 } as never)).toBe(false);
    expect(champSoiOuAdmin({ req: { user: admin }, id: 3 } as never)).toBe(true);
    expect(champSoiOuAdmin({ req: { user: lecteur } } as never)).toBe(false);
  });
});
