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

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getSponsors,
  type Sponsor,
  type SponsorPlatform,
} from "@/lib/getSponsors";

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

const GROUPS = [
  {
    type: "sponsor",
    // Sans « Nos » : le titre de page le porte deja.
    heading: "Sponsors",
    singular: "sponsor",
    plural: "sponsors",
  },
  {
    type: "partner",
    heading: "Partenaires",
    singular: "partenaire",
    plural: "partenaires",
  },
] as const;

function SponsorCard({ sponsor, index }: { sponsor: Sponsor; index: number }) {
  return (
    <article
      className="reveal-up group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-spanish-bg-dark/80 transition-[transform,border-color] duration-200 ease-[var(--ease-out-strong)] hover:-translate-y-1 hover:border-spanish-accent-2/40 hover:shadow-[0_18px_40px_-24px_rgba(0,0,0,0.9)]"
      style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
    >
      {/* La plupart des logos fournis sont blancs, donc dessines pour un fond
          sombre. Ceux qui sont fonces basculent sur une plaque claire via le
          reglage de la fiche, plutot que d'imposer un fond a tout le monde. */}
      <div
        className={cn(
          "flex h-32 items-center justify-center px-8 transition-colors duration-200 ease-[var(--ease-out-strong)]",
          sponsor.logoOnLight
            ? "bg-white/95 group-hover:bg-white"
            : "border-b border-white/5 bg-white/[0.03] group-hover:bg-white/[0.06]"
        )}
      >
        {sponsor.logo ? (
          <Image
            src={sponsor.logo}
            alt={`Logo ${sponsor.name}`}
            width={0}
            height={0}
            sizes="240px"
            // Bride la largeur plus que la hauteur : sans cela un logo-mot
            // occupe toute la plaque quand un pictogramme carre reste minuscule.
            className="max-h-14 w-auto max-w-[55%] object-contain"
          />
        ) : (
          <p
            className={cn(
              "font-marjorie text-xl font-bold italic",
              sponsor.logoOnLight ? "text-spanish-bg" : "text-white/80"
            )}
          >
            {sponsor.name}
          </p>
        )}
      </div>

      <div className="flex grow flex-col gap-3 p-6">
        <div className="flex flex-col gap-1">
          {sponsor.sector && (
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-spanish-accent-2">
              {sponsor.sector}
            </p>
          )}
          {/* Le logo porte deja le nom la plupart du temps. Sans description pour
              l'accompagner, le nom repasse en second plan plutot que de rivaliser
              avec lui, tout en restant lisible et indexable. */}
          <h3
            className={cn(
              "font-marjorie font-bold italic leading-tight",
              sponsor.description ? "text-xl" : "text-base text-white/60"
            )}
          >
            {sponsor.name}
          </h3>
        </div>

        {sponsor.description && (
          <p className="text-sm leading-relaxed text-pretty text-white/65">
            {sponsor.description}
          </p>
        )}

        {/* `mt-auto` : les rangees de liens s'alignent en bas de carte, quelle
            que soit la longueur des descriptions au-dessus. */}
        {sponsor.links.length > 0 && (
          <div className="mt-auto flex flex-wrap gap-2 pt-4">
            {sponsor.links.map(({ platform, url }) => {
              const { label, Icon } = PLATFORM_META[platform];

              return (
                <Link
                  key={platform}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  aria-label={`${sponsor.name}, ${label}`}
                  title={label}
                  className="flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 outline-none transition-[transform,color,background-color,border-color] duration-150 ease-[var(--ease-out-strong)] hover:border-spanish-accent-2/50 hover:bg-spanish-accent-2/10 hover:text-spanish-accent-2 focus-visible:ring-2 focus-visible:ring-spanish-accent-2 focus-visible:ring-offset-2 focus-visible:ring-offset-spanish-bg-dark active:scale-95"
                >
                  <Icon className="size-4" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </article>
  );
}

export default async function Sponsors() {
  const sponsors = await getSponsors();

  // Sponsors puis partenaires, chacun dans sa section. L'ordre defini par
  // glisser-deposer dans l'admin est conserve a l'interieur de chaque groupe.
  const groups = GROUPS.map((group) => ({
    ...group,
    items: sponsors.filter((sponsor) => sponsor.type === group.type),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="relative overflow-hidden">
      {/* Halo discret : de la profondeur plutot qu un aplat de couleur. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-40 h-[520px] bg-[radial-gradient(60%_60%_at_50%_0%,rgba(254,209,100,0.14),transparent_70%)]"
      />

      {/* `my-30` est l'espacement retenu par les autres pages pour degager la
          barre de navigation, qui est en position fixe. */}
      <div className="my-30 container relative mx-auto px-6 md:px-0">
        {/* `div` et non `header` : un `header` de premier niveau creerait un
            second landmark `banner` a cote de celui de la navigation. */}
        <div className="reveal-up flex max-w-3xl flex-col gap-5">
          {/* Pas de surtitre : les autres pages du site n'ont qu'un titre. */}
          <h1 className="font-marjorie text-4xl font-bold italic leading-tight text-balance lg:text-5xl">
            Ils nous soutiennent
          </h1>

          {/* Aucune mention des sponsors du moment : le texte reste valable
              quel que soit le panel, sans avoir a etre reecrit. */}
          <p className="text-base leading-relaxed text-pretty text-white/70 lg:text-lg">
            Un club ne se construit jamais seul. Derrière chaque match et
            chaque projet, il y a des partenaires qui choisissent de nous faire
            confiance. Leur soutien nous permet de continuer à grandir, sur le
            terrain comme en dehors. Merci à tous ceux qui font partie de
            l&apos;aventure UD Asturiana.
          </p>
        </div>

        {groups.length > 0 ? (
          groups.map((group) => (
            <section key={group.type} className="mt-12 lg:mt-16">
              <div className="reveal-up flex items-baseline gap-3">
                {/* Avec un seul groupe, le titre de page dit deja la meme chose :
                    on ne garde alors que le decompte, libelle en toutes lettres. */}
                {groups.length > 1 ? (
                  <h2 className="font-marjorie text-2xl font-bold italic text-balance lg:text-3xl">
                    {group.heading}
                  </h2>
                ) : (
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-white/50">
                    {group.items.length > 1 ? group.plural : group.singular}
                  </span>
                )}
                <span className="font-marjorie text-sm font-bold italic text-spanish-accent-2">
                  {group.items.length}
                </span>
                <span className="h-px grow bg-white/10" />
              </div>

              <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {group.items.map((sponsor, index) => (
                  <SponsorCard key={sponsor.id} sponsor={sponsor} index={index} />
                ))}
              </div>
            </section>
          ))
        ) : (
          <div className="reveal-up mt-12 flex flex-col items-start gap-4">
            <p className="text-white/70">
              Aucun sponsor pour le moment. La place est libre.
            </p>
            <Button asChild size="lg">
              <Link href="/contact">Devenir le premier</Link>
            </Button>
          </div>
        )}

        <section className="relative mt-20 overflow-hidden rounded-3xl border border-spanish-accent-2/20 bg-spanish-bg-dark px-6 py-12 lg:mt-28 lg:px-16 lg:py-16">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_120%_at_100%_0%,rgba(254,209,100,0.16),transparent_60%)]"
          />

          {/* Deux colonnes en desktop : sans cela le texte se tasse a gauche et
              laisse la moitie du bloc vide sur les grands ecrans. */}
          <div className="relative flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center lg:gap-16">
            <div className="flex flex-col gap-4 lg:max-w-xl">
              <h2 className="font-marjorie text-3xl font-bold italic leading-tight text-balance lg:text-4xl">
                Votre entreprise ici
              </h2>
              <p className="leading-relaxed text-pretty text-white/70">
  Le club reste ouvert à de nouveaux soutiens. Écrivez-nous et
                nous verrons ensemble ce qui a du sens pour votre entreprise.
              </p>
            </div>

            <Button
              asChild
              size="lg"
              className="shrink-0 transition-transform duration-150 ease-[var(--ease-out-strong)] active:scale-[0.97]"
            >
              <Link href="/contact">Devenir sponsor</Link>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
