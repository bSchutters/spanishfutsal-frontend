import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";
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
] as const;

export type SponsorPlatform = (typeof SPONSOR_PLATFORMS)[number];

export type SponsorLink = {
  platform: SponsorPlatform;
  url: string;
};

export type Sponsor = {
  id: number;
  name: string;
  logo: string | null;
  logoOnLight: boolean;
  sector: string | null;
  description: string | null;
  links: SponsorLink[];
};

export type SponsorsPageSection = {
  id: string | null;
  title: string | null;
  content: SerializedEditorState | null;
};

export type SponsorsPageContent = {
  title: string;
  intro: SerializedEditorState | null;
  sections: SponsorsPageSection[];
  cta: {
    enabled: boolean;
    title: string | null;
    text: string | null;
    button_label: string | null;
    button_url: string | null;
  };
};

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/** Ne retient que les liens effectivement remplis, dans un ordre stable. */
export function sponsorLinks(group: unknown): SponsorLink[] {
  const links = (group ?? {}) as Record<string, unknown>;

  return SPONSOR_PLATFORMS.flatMap((platform) => {
    const url = text(links[platform]);
    return url ? [{ platform, url }] : [];
  });
}

async function fetchSponsorsPage(): Promise<{
  sponsors: Sponsor[];
  page: SponsorsPageContent;
}> {
  const payload = await getPayloadClient();

  const [sponsorsResult, global] = await Promise.all([
    payload.find({
      collection: "sponsors",
      where: { active: { equals: true } },
      // `orderable: true` expose `_order`, alimente par le glisser-deposer de l'admin.
      sort: "_order",
      limit: 200,
      depth: 1,
    }),
    payload.findGlobal({ slug: "sponsors-page" }),
  ]);

  const sponsors: Sponsor[] = sponsorsResult.docs.map((doc) => ({
    id: doc.id as number,
    name: doc.name,
    logo: typeof doc.logo === "object" && doc.logo?.url ? doc.logo.url : null,
    logoOnLight: Boolean(doc.logo_on_light),
    sector: text(doc.sector),
    description: text(doc.description),
    links: sponsorLinks(doc.links),
  }));

  const page = global as Record<string, unknown>;
  const cta = (page.cta ?? {}) as Record<string, unknown>;
  const sections = (page.sections ?? []) as Record<string, unknown>[];

  return {
    sponsors,
    page: {
      title: text(page.title) ?? "Nos sponsors",
      intro: (page.intro as SerializedEditorState) ?? null,
      sections: sections.map((section) => ({
        id: text(section.id),
        title: text(section.title),
        content: (section.content as SerializedEditorState) ?? null,
      })),
      cta: {
        enabled: cta.enabled !== false,
        title: text(cta.title),
        text: text(cta.text),
        button_label: text(cta.button_label),
        button_url: text(cta.button_url),
      },
    },
  };
}

export const getSponsorsPage = unstable_cache(
  fetchSponsorsPage,
  ["sponsors-page"],
  { tags: ["sponsors", "sponsors-page"] },
);
