import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Payload } from "payload";

import { limiteAtteinte, verifierLimite } from "@/hub/limiteur";

/** Un magasin cle-valeur en memoire, la meme forme que celui de Payload. */
function fauxPayload() {
  const store = new Map<string, unknown>();
  return {
    kv: {
      get: async <T>(cle: string) => (store.get(cle) as T | undefined) ?? null,
      set: async (cle: string, valeur: unknown) => {
        store.set(cle, valeur);
      },
    },
  } as unknown as Payload;
}

describe("limite de debit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-15T20:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("laisse passer jusqu'a la limite, puis refuse", async () => {
    const payload = fauxPayload();
    const limite = { max: 3, fenetreMs: 60_000 };

    expect(await verifierLimite(payload, "ip", limite)).toEqual({ ok: true, restant: 2 });
    expect(await verifierLimite(payload, "ip", limite)).toEqual({ ok: true, restant: 1 });
    expect(await verifierLimite(payload, "ip", limite)).toEqual({ ok: true, restant: 0 });
    expect(await verifierLimite(payload, "ip", limite)).toEqual({ ok: false, restant: 0 });
  });

  it("repart de zero une fois la fenetre passee", async () => {
    const payload = fauxPayload();
    const limite = { max: 1, fenetreMs: 60_000 };

    expect((await verifierLimite(payload, "ip", limite)).ok).toBe(true);
    expect((await verifierLimite(payload, "ip", limite)).ok).toBe(false);

    vi.advanceTimersByTime(60_001);
    expect((await verifierLimite(payload, "ip", limite)).ok).toBe(true);
  });

  it("lit la limite sans compter d'essai, pour ne compter que les echecs", async () => {
    const payload = fauxPayload();
    const limite = { max: 2, fenetreMs: 60_000 };

    // Lire autant qu'on veut ne rapproche pas de la limite.
    for (let i = 0; i < 5; i++) expect(await limiteAtteinte(payload, "ip", limite)).toBe(false);
    await verifierLimite(payload, "ip", limite);
    expect(await limiteAtteinte(payload, "ip", limite)).toBe(false);
    await verifierLimite(payload, "ip", limite);
    expect(await limiteAtteinte(payload, "ip", limite)).toBe(true);

    vi.advanceTimersByTime(60_001);
    expect(await limiteAtteinte(payload, "ip", limite)).toBe(false);
  });

  it("compte chaque cle a part", async () => {
    const payload = fauxPayload();
    const limite = { max: 1, fenetreMs: 60_000 };

    expect((await verifierLimite(payload, "a", limite)).ok).toBe(true);
    expect((await verifierLimite(payload, "b", limite)).ok).toBe(true);
    expect((await verifierLimite(payload, "a", limite)).ok).toBe(false);
  });
});
