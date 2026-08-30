import Image from "next/image";
import Link from "next/link";
import { Separator } from "../ui/separator";
import { getSponsors, sponsorLinks } from "@/lib/getSponsors";

/**
 * Composant serveur : les logos sont dans le HTML des la premiere frame. En
 * composant client, la requete ne pouvait partir qu'apres l'hydratation, et le
 * bandeau restait a l'etat de squelette pendant tout ce temps, sur chaque page.
 */
export default async function Footer() {
  const sponsors = await getSponsors();

  return (
    <footer className="bg-spanish-bg-dark text-white lg:py-16 py-10 w-full flex flex-col lg:gap-8 gap-6">
      <div className="container mx-auto flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-0">
        <Link href="/" className="flex items-center gap-4">
          <div>
            <Image
              src="/assets/images/svg/logo-asturiana.svg"
              alt="Logo"
              width={0}
              height={0}
              className="w-20 h-20"
            />
          </div>
          <div className="text-spanish-accent-2 text-2xl">
            <p className=" font-black">UD ASTURIANA</p>
            <p className="tracking-[0.2em] -mt-2 font-semibold">FUTSAL</p>
          </div>
        </Link>
        <div className="flex flex-col lg:items-end items-center gap-4 lg:gap-2 max-w-full w-full lg:w-auto">
          {/* Le bandeau montre sponsors et partenaires confondus : l'intitule
              doit couvrir les deux. Il reprend celui de la page /sponsors. */}
          <p className="font-bold font-marjorie italic">Ils nous soutiennent</p>
          {/* Grille sur mobile plutot que `flex-wrap` : les logos ont des largeurs
              tres inegales, et le retour a la ligne libre laissait un orphelin
              seul sur la derniere rangee. Rangees de trois, puis ligne unique
              alignee a droite des le grand ecran. */}
          <div className="grid w-full grid-cols-3 place-items-center gap-x-4 gap-y-5 lg:flex lg:w-auto lg:flex-wrap lg:justify-end lg:gap-x-8 lg:gap-y-4 lg:items-center lg:min-h-12">
            {sponsors.length > 0
              ? sponsors.map((sponsor) => {
                  // Le bandeau n'affiche qu'un lien : le site s'il existe,
                  // sinon le premier reseau renseigne.
                  const href = sponsorLinks(sponsor.links)[0]?.url ?? null;
                  const logoEl = sponsor.logo ? (
                    <Image
                      src={sponsor.logo}
                      alt={sponsor.name}
                      width={120}
                      height={40}
                      className="h-9 sm:h-10 max-w-full lg:max-w-[120px] w-auto object-contain opacity-40 hover:opacity-100 transition-opacity"
                    />
                  ) : (
                    <span className="text-sm opacity-40 hover:opacity-100 transition-opacity">
                      {sponsor.name}
                    </span>
                  );

                  return href ? (
                    <Link
                      key={sponsor.id}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {logoEl}
                    </Link>
                  ) : (
                    <div key={sponsor.id}>{logoEl}</div>
                  );
                })
              : null}
          </div>
        </div>
      </div>
      <Separator className="container mx-auto bg-spanish-bg-lighter" />
      <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-white/70">
        <p className="text-center md:text-left">
          &copy; {new Date().getFullYear()}{" "}
          <Link
            href="/admin"
            className="text-inherit no-underline cursor-default"
          >
            UD Asturiana
          </Link>
          . Tous droits réservés.
        </p>

        <div className="flex gap-4">
          <Link
            href="https://instagram.com/asturiana_ud"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-spanish-accent-dark transition-colors"
          >
            Instagram
          </Link>
          <Link
            href="https://www.youtube.com/@UDAsturiana"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-spanish-accent-dark transition-colors"
          >
            Youtube
          </Link>
        </div>
      </div>
    </footer>
  );
}
