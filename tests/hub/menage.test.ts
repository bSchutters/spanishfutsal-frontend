import { describe, expect, it } from "vitest";

import { visuelsAEffacer, type PostAvecVisuels } from "@/hub/visuels/menage";

const maintenant = new Date("2026-10-01T12:00:00.000Z");
const post = (extra: Partial<PostAvecVisuels>): PostAvecVisuels => ({
  id: 1,
  statut: "published",
  debut: "2026-09-10T16:00:00.000Z",
  visuelIds: [1],
  ...extra,
});

describe("menage des visuels", () => {
  it("efface les visuels d un post publie depuis quinze jours", () => {
    expect(visuelsAEffacer([post({})], maintenant)).toEqual([1]);
    expect(visuelsAEffacer([post({ debut: "2026-09-16T12:00:00.000Z" })], maintenant)).toEqual([1]);
    expect(visuelsAEffacer([post({ debut: "2026-09-16T12:00:01.000Z" })], maintenant)).toEqual([]);
  });

  it("garde ceux d un post non publie, ou publie trop recemment", () => {
    expect(visuelsAEffacer([post({ statut: "ready" })], maintenant)).toEqual([]);
    expect(visuelsAEffacer([post({ debut: "2026-09-28T16:00:00.000Z" })], maintenant)).toEqual([]);
  });

  it("un visuel partage n est efface que si tous ses posts sont perimes", () => {
    const posts = [post({ id: 1, visuelIds: [1, 2] }), post({ id: 2, statut: "to_create", visuelIds: [2] })];
    expect(visuelsAEffacer(posts, maintenant)).toEqual([1]);
  });
});
