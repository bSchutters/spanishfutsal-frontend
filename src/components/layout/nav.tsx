"use client";

import useBreakpoint from "@/hooks/useBreakpoints";
import { cn } from "@/lib/utils";
import { ArrowRight, Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import LiveBanner from "../live/live-banner";

const Nav = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { isMobile } = useBreakpoint();

  useEffect(() => {
    // Sur mobile, le menu reste toujours visible
    if (isMobile) return;

    // Sur desktop, le menu disparaît au scroll vers le bas
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      lastScrollY = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      setIsVisible(true);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isMobile]);

  const links = [
    { href: "/", label: "ACCUEIL" },
    { href: "/a-propos", label: "À PROPOS" },
    { href: "/equipe", label: "ÉQUIPE" },
    { href: "/classement", label: "CLASSEMENT" },
    { href: "/matchs", label: "MATCHS" },
    // {href: "/galerie", label: "GALERIE"},
    // {href: "/actualites", label: "ACTUALITÉS"},
    { href: "/sponsors", label: "SPONSORS" },
    { href: "/contact", label: "CONTACT" },
  ];

  const icone =
    "transition-[opacity,scale,filter] duration-200 ease-[var(--ease-out-strong)]";
  const iconeCachee = "scale-50 opacity-0 blur-[2px]";

  return (
    // L'en-tete s'efface au defilement vers le bas et revient des qu'on
    // remonte : 250 ms, pas 700, sinon il arrive apres qu'on l'a cherche.
    <header
      className={cn(
        "bg-spanish-bg-dark  z-50 font-bold fixed top-0 left-0 w-full transition-transform duration-250 ease-[var(--ease-out-strong)]",
        isVisible ? "translate-y-0" : "-translate-y-[150%]"
      )}
    >
      <div className="flex items-center justify-between py-4 px-8">
        {/* Logo + Nom */}
        <Link href="/" className="flex items-center gap-3 relative">
          <div className="md:h-20 md:w-20 w-16 h-16 absolute md:-bottom-10 -bottom-6 z-20  outline-spanish-bg-dark md:outline-4 outline-2 rounded-full">
            <Image
              src="/assets/images/svg/logo-asturiana.svg"
              alt="Logo UD Asturiana"
              fill
              className="h-full w-full object-contain"
            />
          </div>
          <div className="md:ml-24 ml-20 flex flex-col text-spanish-accent-2">
            <p className="font-black">UD ASTURIANA</p>
            <p className="tracking-[0.2em] -mt-2 font-semibold">FUTSAL</p>
          </div>
        </Link>

        {/* Navigation Mobile : un simple conteneur, le landmark `nav` est porte
            par le panneau deroulant. Deux landmarks de navigation portant le
            meme nom sont signales comme une violation. */}
        <div className="flex md:hidden">
          <Button
            variant="ghostSpanish"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            size="icon"
            aria-label={isMobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={isMobileMenuOpen}
          >
            {/* Les deux icones sont superposees et se relaient en fondu, au
                lieu que la croix remplace le burger d'un coup. */}
            <span className="grid *:col-start-1 *:row-start-1" aria-hidden="true">
              <Menu
                strokeWidth={3}
                className={cn(icone, isMobileMenuOpen && iconeCachee)}
              />
              <X
                strokeWidth={3}
                className={cn(icone, !isMobileMenuOpen && iconeCachee)}
              />
            </span>
          </Button>

          <nav
            // Libelle distinct de celui du menu bureau : deux landmarks de
            // navigation portant le meme nom sont signales comme une violation,
            // meme lorsqu'un seul est expose a la fois.
            aria-label="Menu mobile"
            // `inert` plutot que `aria-hidden` : il retire aussi les liens de
            // l'ordre de tabulation, la ou `aria-hidden` les y laisserait.
            inert={!isMobileMenuOpen}
            // Le panneau se deroule de la barre vers le plein ecran par un
            // `clip-path`, qui ne recalcule pas la mise en page a chaque image
            // comme le faisait `height`. Il s'ouvre en 250 ms et se referme en
            // 200 : la duree est lue sur l'etat d'arrivee.
            className={cn(
              "absolute top-16 right-0 h-dvh bg-spanish-bg-dark w-full flex flex-col items-start p-8 transition-[opacity,clip-path] ease-[var(--ease-out-strong)]",
              isMobileMenuOpen
                ? "opacity-100 [clip-path:inset(0)] duration-250 pointer-events-auto"
                : "opacity-0 [clip-path:inset(0_0_100%_0)] duration-200 pointer-events-none"
            )}
          >
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "hover:text-spanish-accent-2 transition-colors flex items-center justify-between w-full border-b border-spanish-bg py-4 last:border-b-0",
                  pathname === link.href ? "text-spanish-accent-2" : ""
                )}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.label}
                <ArrowRight className="w-5" />
              </Link>
            ))}
          </nav>
        </div>

        {/* Navigation Desktop*/}
        <nav
          aria-label="Menu principal"
          className="items-center gap-8 text-white lg:text-sm text-xs md:flex hidden"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "hover:text-spanish-accent-2 transition-colors",
                pathname === link.href ? "text-spanish-accent-2" : ""
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

      <LiveBanner />
    </header>
  );
};

export default Nav;
