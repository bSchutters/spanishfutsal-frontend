"use client";

import useBreakpoint from "@/hooks/useBreakpoints";
import { cn } from "@/lib/utils";
import { ArrowRight, Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "../ui/button";

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

  return (
    <header
      className={cn(
        "bg-spanish-bg-dark  z-50 font-bold fixed top-0 left-0 w-full transition-all duration-700 ease-in-out",
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
            {isMobileMenuOpen ? (
              <X strokeWidth={3} />
            ) : (
              <Menu strokeWidth={3} />
            )}
          </Button>

          <nav
            // Libelle distinct de celui du menu bureau : deux landmarks de
            // navigation portant le meme nom sont signales comme une violation,
            // meme lorsqu'un seul est expose a la fois.
            aria-label="Menu mobile"
            // `inert` plutot que `aria-hidden` : il retire aussi les liens de
            // l'ordre de tabulation, la ou `aria-hidden` les y laisserait.
            inert={!isMobileMenuOpen}
            className={cn(
              "absolute top-16 right-0 bg-spanish-bg-dark w-full flex flex-col items-start p-8 transition-all duration-700",
              isMobileMenuOpen
                ? "opacity-100 translate-y-0 h-dvh pointer-events-auto"
                : "opacity-0 -translate-y-4 h-full pointer-events-none"
            )}
          >
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "hover:text-spanish-accent-2 transition-all flex items-center justify-between w-full border-b border-spanish-bg py-4 last:border-b-0",
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
                "hover:text-spanish-accent-2 transition-all",
                pathname === link.href ? "text-spanish-accent-2" : ""
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
};

export default Nav;
