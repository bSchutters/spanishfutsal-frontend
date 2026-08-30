import { unstable_cache } from "next/cache";
import { getPayloadClient } from "./payload";

export const SPONSOR_PLATFORMS = [
  "website",
  "facebook",
  "instagram",
  "linkedin",
  "tiktok",
  "youtube",
  "x",
  // En dernier : le pied de page retient le premier lien renseigne, et une
  // adresse e-mail y serait un repli, jamais un premier choix.
  "email",
] as const;

export type SponsorPlatform = (typeof SPONSOR_PLATFORMS)[number];

export type SponsorType = "sponsor" | "partner";

export type SponsorLink = {
  platform: SponsorPlatform;
  url: string;
};

export type Sponsor = {
  id: number;
  type: SponsorType;
  name: string;
  logo: string | null;
  logoOnLight: boolean;
  sector: string | null;
  description: string | null;
  links: SponsorLink[];
};

/**
 * Une adresse saisie sans protocole dans l'admin (« sofexia.com ») est lue par
 * Next comme un chemin interne : le lien pointait sur udasturiana.be/sofexia.com
 * et son prechargement remplissait la console d'une erreur 404.
 */
function externalUrl(value: string): string {
  // Deja un schema explicite : https:, http:, mailto:, tel:...
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return value;
  if (value.startsWith("//")) return `https:${value}`;
  return `https://${value}`;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/** Ne retient que les liens effectivement remplis, dans un ordre stable. */
export function sponsorLinks(group: unknown): SponsorLink[] {
  const links = (group ?? {}) as Record<string, unknown>;

  return SPONSOR_PLATFORMS.flatMap((platform) => {
    const value = text(links[platform]);
    if (!value) return [];

    const url =
      platform === "email" ? `mailto:${value}` : externalUrl(value);
    return [{ platform, url }];
  });
}

async function fetchSponsors(): Promise<Sponsor[]> {
  const payload = await getPayloadClient();

  const result = await payload.find({
    collection: "sponsors",
    where: { active: { equals: true } },
    // `orderable: true` expose `_order`, alimente par le glisser-deposer de l'admin.
    sort: "_order",
    limit: 200,
    depth: 1,
  });

  return result.docs.map((doc) => ({
    id: doc.id as number,
    type: doc.type === "partner" ? "partner" : "sponsor",
    name: doc.name,
    logo: typeof doc.logo === "object" && doc.logo?.url ? doc.logo.url : null,
    logoOnLight: Boolean(doc.logo_on_light),
    sector: text(doc.sector),
    description: text(doc.description),
    links: sponsorLinks(doc.links),
  }));
}

export const getSponsors = unstable_cache(fetchSponsors, ["sponsors"], {
  tags: ["sponsors"],
});
