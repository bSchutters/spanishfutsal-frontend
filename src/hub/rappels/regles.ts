import { composerDateHeure, formaterHeure, versChampDate } from "@/hub/dates";
import { idDe } from "@/hub/droits";

/**
 * Les regles des rappels push, sans base ni reseau : quand rappeler un
 * evenement, a qui, avec quel texte. Le job d'envoi et les tests s'appuient
 * dessus.
 */

export type TypeRappel = "morning" | "before";

export type ReglagesRappels = {
  /** « 09:00 » : l'heure du rappel du matin, a Bruxelles. */
  heureRappelMatin: string;
  delaiRappelAvantMinutes: number;
};

export type EvenementARappeler = {
  id: number;
  titre: string;
  categorie: "post" | "match" | "training" | "other";
  journeeEntiere: boolean;
  annule: boolean;
  pasDeRappel: boolean;
  statut: string | null;
  fluxIds: number[];
  formats: string[];
  reseaux: string[];
};

export type Rappel = {
  evenementId: number;
  /** L'instant de l'occurrence : ce qui distingue deux seances d'une recurrence. */
  occurrence: string;
  type: TypeRappel;
  /** L'instant auquel envoyer, en ISO UTC. */
  instant: string;
};

export type DestinatairePotentiel = {
  id: number;
  accesHub: boolean;
  pushActif: boolean;
  fluxNotifiesIds: number[];
  /** Le nombre d'appareils abonnes. */
  abonnements: number;
};

/** Un evenement qui ne merite aucun rappel : annule, sans rappel, ou post deja publie ou annule. */
export function estExclu(ev: Pick<EvenementARappeler, "annule" | "pasDeRappel" | "categorie" | "statut">): boolean {
  if (ev.annule || ev.pasDeRappel) return true;
  return ev.categorie === "post" && (ev.statut === "published" || ev.statut === "cancelled");
}

/**
 * Les rappels d'une occurrence. Le matin a l'heure reglee, et un peu avant
 * le debut. Si le debut tombe moins d'une heure apres l'heure du matin,
 * seul le rappel avant ; une journee entiere n'a que le rappel du matin.
 */
export function rappelsDe(ev: EvenementARappeler, debutOccurrence: Date, reglages: ReglagesRappels): Rappel[] {
  if (estExclu(ev)) return [];
  const occurrence = debutOccurrence.toISOString();
  const matin = composerDateHeure(versChampDate(debutOccurrence), reglages.heureRappelMatin);
  const rappelMatin: Rappel | null = matin
    ? { evenementId: ev.id, occurrence, type: "morning", instant: matin.toISOString() }
    : null;

  if (ev.journeeEntiere) return rappelMatin ? [rappelMatin] : [];

  const avant: Rappel = {
    evenementId: ev.id,
    occurrence,
    type: "before",
    instant: new Date(debutOccurrence.getTime() - reglages.delaiRappelAvantMinutes * 60_000).toISOString(),
  };
  const tropTot = !matin || debutOccurrence.getTime() < matin.getTime() + 60 * 60_000;
  return tropTot || !rappelMatin ? [avant] : [rappelMatin, avant];
}

/** Les rappels dont l'instant tombe dans la fenetre, bornes comprises. */
export function dansLaFenetre(rappels: Rappel[], fenetre: { de: Date; a: Date }): Rappel[] {
  return rappels.filter((r) => {
    const t = new Date(r.instant).getTime();
    return t >= fenetre.de.getTime() && t <= fenetre.a.getTime();
  });
}

/** La fenetre du job : de dix minutes en arriere jusqu'a maintenant, pour absorber un redemarrage. */
export function fenetreDuJob(maintenant: Date, toleranceMinutes = 10): { de: Date; a: Date } {
  return { de: new Date(maintenant.getTime() - toleranceMinutes * 60_000), a: maintenant };
}

/**
 * Qui recoit : acces au Hub, push actif, au moins un appareil, et au moins
 * un flux de l'evenement parmi ses flux notifies.
 */
export function destinataires<T extends DestinatairePotentiel>(ev: Pick<EvenementARappeler, "fluxIds">, personnes: T[]): T[] {
  return personnes.filter(
    (p) => p.accesHub && p.pushActif && p.abonnements > 0 && p.fluxNotifiesIds.some((id) => ev.fluxIds.includes(id)),
  );
}

/** Le texte de la notification, selon la categorie et le moment. */
export function messageDe(
  ev: Pick<EvenementARappeler, "id" | "titre" | "categorie" | "journeeEntiere" | "formats" | "reseaux">,
  type: TypeRappel,
  debutOccurrence: Date,
  delaiMinutes: number,
): { title: string; body: string; url: string; tag: string } {
  const dans = delaiMinutes === 60 ? "1 h" : delaiMinutes % 60 === 0 ? `${delaiMinutes / 60} h` : `${delaiMinutes} min`;
  const title =
    ev.categorie === "post"
      ? type === "morning"
        ? "À publier aujourd'hui"
        : `À publier dans ${dans}`
      : type === "morning"
        ? "Aujourd'hui"
        : `Dans ${dans}`;
  const morceaux = [ev.titre];
  if (!ev.journeeEntiere) morceaux.push(formaterHeure(debutOccurrence));
  if (ev.categorie === "post") {
    const diffusion = [...ev.formats, ...ev.reseaux].join(", ");
    if (diffusion) morceaux.push(diffusion);
  }
  return {
    title,
    body: morceaux.join(" · "),
    url: `/hub/calendrier/evenements/${ev.id}`,
    tag: `rappel-${ev.id}-${type}-${debutOccurrence.toISOString()}`,
  };
}

/** Un utilisateur Payload, tel que la collection le rend, en destinataire potentiel. */
export function destinataireDepuisUtilisateur(
  doc: Record<string, unknown> & { id: number | string },
  abonnements: number,
): DestinatairePotentiel {
  const hub = (doc.hub ?? {}) as { access?: boolean; push_enabled?: boolean; notified_feeds?: unknown };
  const admin = doc.role === "admin";
  return {
    id: Number(doc.id),
    accesHub: admin || hub.access === true,
    pushActif: hub.push_enabled === true,
    fluxNotifiesIds: Array.isArray(hub.notified_feeds)
      ? hub.notified_feeds.map((f) => Number(idDe(f as never))).filter((n) => !Number.isNaN(n))
      : [],
    abonnements,
  };
}
