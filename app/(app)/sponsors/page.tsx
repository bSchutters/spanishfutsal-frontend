import { RichText } from "@payloadcms/richtext-lexical/react";
import {
  Facebook,
  Globe,
  Instagram,
  Linkedin,
  Music2,
  Twitter,
  Youtube,
} from "lucide-react";
import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import BoxModule from "@/components/layout/boxModule";
import { Button } from "@/components/ui/button";
import {
  getSponsorsPage,
  type Sponsor,
  type SponsorPlatform,
} from "@/lib/getSponsorsPage";

export const metadata: Metadata = {
  title: "Sponsors | UD Asturiana - Nos partenaires",
  description:
    "Découvrez les entreprises qui soutiennent UD Asturiana, club de futsal bruxellois. Merci à nos sponsors et partenaires.",
  openGraph: {
    title: "Sponsors | UD Asturiana - Nos partenaires",
    description:
      "Découvrez les entreprises qui soutiennent UD Asturiana, club de futsal bruxellois.",
    url: "https://udasturiana.be/sponsors",
  },
};

const PLATFORM_META: Record<
  SponsorPlatform,
  { label: string; Icon: typeof Globe }
> = {
  website: { label: "Site web", Icon: Globe },
  facebook: { label: "Facebook", Icon: Facebook },
  instagram: { label: "Instagram", Icon: Instagram },
  linkedin: { label: "LinkedIn", Icon: Linkedin },
  tiktok: { label: "TikTok", Icon: Music2 },
  youtube: { label: "YouTube", Icon: Youtube },
  x: { label: "X", Icon: Twitter },
};

function SponsorCard({ sponsor }: { sponsor: Sponsor }) {
  return (
    <BoxModule className="flex flex-col gap-4 h-full">
      <div className="flex items-center justify-center h-24 bg-spanish-bg rounded-lg p-4">
        {sponsor.logo ? (
          <Image
            src={sponsor.logo}
            alt={`Logo ${sponsor.name}`}
            width={0}
            height={0}
            sizes="100vw"
            className="max-h-16 w-auto object-contain"
          />
        ) : (
          <p className="font-marjorie italic font-bold text-xl">
            {sponsor.name}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2 grow">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-marjorie italic font-bold text-lg uppercase">
            {sponsor.name}
          </p>
          {sponsor.sector && (
            <span className="text-xs uppercase font-bold px-2 py-1 rounded bg-spanish-accent-2-light/10 text-spanish-accent-2">
              {sponsor.sector}
            </span>
          )}
        </div>

        {sponsor.description && (
          <p className="text-sm text-spanish-bg-lighter-plus leading-relaxed">
            {sponsor.description}
          </p>
        )}
      </div>

      {sponsor.links.length > 0 && (
        <div className="flex flex-wrap gap-3 pt-2 border-t-2 border-spanish-bg-lighter">
          {sponsor.links.map(({ platform, url }) => {
            const { label, Icon } = PLATFORM_META[platform];
            return (
              <Link
                key={platform}
                href={url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                aria-label={`${sponsor.name} — ${label}`}
                title={label}
                className="text-spanish-bg-lighter-plus hover:text-spanish-accent-2 transition-colors"
              >
                <Icon className="w-5 h-5" />
              </Link>
            );
          })}
        </div>
      )}
    </BoxModule>
  );
}

export default async function Sponsors() {
  const { sponsors, page } = await getSponsorsPage();
  const cta = page.cta;

  return (
    <div className="container mx-auto flex flex-col lg:gap-16 gap-10 lg:py-20 py-12 px-4">
      <header className="flex flex-col gap-4 max-w-3xl">
        <h1 className="font-marjorie italic font-bold lg:text-5xl text-3xl uppercase">
          {page.title}
        </h1>
        {page.intro && (
          <div className="text-spanish-bg-lighter-plus leading-relaxed flex flex-col gap-3">
            <RichText data={page.intro} />
          </div>
        )}
      </header>

      {sponsors.length > 0 ? (
        <div className="grid lg:grid-cols-3 sm:grid-cols-2 grid-cols-1 gap-6">
          {sponsors.map((sponsor) => (
            <SponsorCard key={sponsor.id} sponsor={sponsor} />
          ))}
        </div>
      ) : (
        <p className="text-spanish-bg-lighter-plus">
          Les sponsors seront annoncés très prochainement.
        </p>
      )}

      {page.sections?.map((section, index) => (
        <section
          key={section.id ?? index}
          className="flex flex-col gap-4 max-w-3xl"
        >
          {section.title && (
            <h2 className="font-marjorie italic font-bold lg:text-3xl text-2xl uppercase">
              {section.title}
            </h2>
          )}
          {section.content && (
            <div className="text-spanish-bg-lighter-plus leading-relaxed flex flex-col gap-3">
              <RichText data={section.content} />
            </div>
          )}
        </section>
      ))}

      {cta?.enabled && (
        <BoxModule className="flex flex-col items-center text-center gap-4 lg:p-10 p-6">
          {cta.title && (
            <h2 className="font-marjorie italic font-bold lg:text-3xl text-2xl uppercase">
              {cta.title}
            </h2>
          )}
          {cta.text && (
            <p className="text-spanish-bg-lighter-plus max-w-2xl leading-relaxed">
              {cta.text}
            </p>
          )}
          {cta.button_label && cta.button_url && (
            <Button asChild>
              <Link href={cta.button_url}>{cta.button_label}</Link>
            </Button>
          )}
        </BoxModule>
      )}
    </div>
  );
}
