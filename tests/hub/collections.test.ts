import { describe, expect, it } from "vitest";

import { Comments } from "@/payload/collections/hub/Comments";
import { Events } from "@/payload/collections/hub/Events";
import { EventTypes } from "@/payload/collections/hub/EventTypes";
import { Feeds, genererJeton } from "@/payload/collections/hub/Feeds";
import { Formats } from "@/payload/collections/hub/Formats";
import { Ideas } from "@/payload/collections/hub/Ideas";
import { Networks } from "@/payload/collections/hub/Networks";
import { NotificationLog } from "@/payload/collections/hub/NotificationLog";
import { PostTemplates } from "@/payload/collections/hub/PostTemplates";
import { PushSubscriptions } from "@/payload/collections/hub/PushSubscriptions";
import { HubSettings } from "@/payload/globals/HubSettings";

/**
 * Le critere d'acceptation du lot 1 : aucune collection du Hub ne se lit sans
 * session, et une personne en lecture ne peut rien modifier.
 */

const collections = [
  Feeds,
  EventTypes,
  Networks,
  Formats,
  Events,
  PostTemplates,
  Ideas,
  Comments,
  PushSubscriptions,
  NotificationLog,
];

const anonyme = { req: { user: null } } as never;

const lecteur = {
  req: {
    user: {
      id: 2,
      role: "manager",
      hub: { access: true, modules: [{ module: "calendar", level: "read" }], feeds: [10] },
    },
  },
} as never;

const editeur = {
  req: {
    user: {
      id: 3,
      role: "manager",
      hub: { access: true, modules: [{ module: "calendar", level: "edit" }], feeds: [10] },
    },
  },
} as never;

describe("collections du Hub sans session", () => {
  for (const collection of collections) {
    it(`${collection.slug} : ni lecture ni ecriture`, async () => {
      expect(await collection.access?.read?.(anonyme)).toBe(false);
      expect(await collection.access?.create?.(anonyme)).toBe(false);
      expect(await collection.access?.update?.(anonyme)).toBe(false);
      expect(await collection.access?.delete?.(anonyme)).toBe(false);
    });
  }

  it("les reglages du Hub non plus", async () => {
    expect(await HubSettings.access?.read?.(anonyme)).toBe(false);
    expect(await HubSettings.access?.update?.(anonyme)).toBe(false);
  });
});

describe("niveau lecture", () => {
  it("lit les evenements de ses flux, n'en cree ni n'en modifie", async () => {
    expect(await Events.access?.read?.(lecteur)).toEqual({ feeds: { in: [10] } });
    expect(await Events.access?.create?.(lecteur)).toBe(false);
    expect(await Events.access?.update?.(lecteur)).toBe(false);
    expect(await Events.access?.delete?.(lecteur)).toBe(false);
  });

  it("lit les idees et commente, sans creer d'idee", async () => {
    expect(await Ideas.access?.read?.(lecteur)).toBe(true);
    expect(await Ideas.access?.create?.(lecteur)).toBe(false);
    expect(await Comments.access?.create?.(lecteur)).toBe(true);
  });

  it("ne touche pas aux reglages", async () => {
    for (const collection of [Feeds, EventTypes, Networks, Formats, PostTemplates]) {
      expect(await collection.access?.create?.(editeur)).toBe(false);
      expect(await collection.access?.update?.(editeur)).toBe(false);
      expect(await collection.access?.delete?.(editeur)).toBe(false);
    }
    expect(await HubSettings.access?.update?.(editeur)).toBe(false);
  });

  it("ne modifie que ses propres commentaires", async () => {
    expect(await Comments.access?.update?.(lecteur)).toEqual({ author: { equals: 2 } });
    expect(await Comments.access?.delete?.(lecteur)).toEqual({ author: { equals: 2 } });
  });
});

describe("niveau edition", () => {
  it("cree et modifie les evenements de ses flux", async () => {
    expect(await Events.access?.create?.(editeur)).toBe(true);
    expect(await Events.access?.update?.(editeur)).toEqual({ feeds: { in: [10] } });
    expect(await Events.access?.delete?.(editeur)).toEqual({ feeds: { in: [10] } });
  });

  it("cree des idees", async () => {
    expect(await Ideas.access?.create?.(editeur)).toBe(true);
  });
});

describe("jeton de flux", () => {
  it("fait trente-deux octets, en base64 sans caractere a encoder dans une URL", () => {
    const jeton = genererJeton();
    expect(jeton).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(genererJeton()).not.toBe(jeton);
  });
});
