"use client";

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

  useEffect(() => {
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
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const links = [
    { href: "/", label: "ACCEUIL" },
    { href: "/a-propos", label: "À PROPOS" },
    { href: "/equipe", label: "ÉQUIPE" },
    { href: "/classement", label: "CLASSEMENT" },
    { href: "/matchs", label: "MATCHS" },
    // {href: "/galerie", label: "GALERIE"},
    // {href: "/actualites", label: "ACTUALITÉS"},
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
              src="/assets/images/svg/logo_rounded.svg"
              alt="Logo Spanish Futsal"
              fill
              className="h-full w-full object-contain"
            />
          </div>
          <div className="ml-24 flex flex-col text-spanish-accent">
            <p className="font-black">SPANISH</p>
            <p className="tracking-[0.2em] -mt-2 font-semibold">FUTSAL</p>
          </div>
        </Link>

        {/* Navigation Mobile*/}
        <nav className="flex md:hidden">
          <Button
            variant="ghostSpanish"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            size="icon"
          >
            {isMobileMenuOpen ? (
              <X strokeWidth={3} />
            ) : (
              <Menu strokeWidth={3} />
            )}
          </Button>

          <div
            className={cn(
              "absolute top-16 right-0 bg-spanish-bg-dark w-full flex flex-col items-start p-8 transition-all duration-700",
              isMobileMenuOpen
                ? "opacity-100 translate-y-0 h-screen pointer-events-auto"
                : "opacity-0 -translate-y-4 h-full pointer-events-none"
            )}
          >
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "hover:text-spanish-accent transition-all flex items-center justify-between w-full border-b border-spanish-bg py-4 last:border-b-0",
                  pathname === link.href ? "text-spanish-accent" : ""
                )}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.label}
                <ArrowRight className="w-5" />
              </Link>
            ))}
          </div>
        </nav>

        {/* Navigation Desktop*/}
        <nav className="items-center gap-8 text-white lg:text-sm text-xs md:flex hidden">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "hover:text-spanish-accent transition-all",
                pathname === link.href ? "text-spanish-accent" : ""
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
