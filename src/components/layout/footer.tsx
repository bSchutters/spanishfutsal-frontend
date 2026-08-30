"use client";

import Image from "next/image";
import Link from "next/link";
import { Separator } from "../ui/separator";
import { useEffect, useState } from "react";

type Sponsor = {
  id: number;
  name: string;
  url: string | null;
  logo: string | null;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_STRAPI_API_URL || "";

export default function Footer() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [sponsorsLoading, setSponsorsLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/public/sponsors`)
      .then((res) => res.json())
      .then((json) => setSponsors(json.data || []))
      .catch(() => {})
      .finally(() => setSponsorsLoading(false));
  }, []);

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
        <div className="flex flex-col lg:items-end items-center gap-2 max-w-full">
          <p className="font-bold font-marjorie italic lg:block hidden">
            Sponsors
          </p>
          {/* `flex-wrap` et une hauteur minimale plutot que fixe : sans cela la
              rangee de logos deborde de l'ecran sur mobile et fait defiler toute
              la page horizontalement. */}
          <div className="flex flex-wrap justify-center lg:justify-end gap-x-6 gap-y-4 lg:gap-x-8 items-center min-h-12">
            {sponsorsLoading ? (
              <>
                <div className="w-24 h-8 bg-spanish-bg-lighter rounded animate-pulse" />
                <div className="w-24 h-8 bg-spanish-bg-lighter rounded animate-pulse" />
              </>
            ) : sponsors.length > 0 ? (
              sponsors.map((sponsor) => {
                const logoEl = sponsor.logo ? (
                  <Image
                    src={sponsor.logo}
                    alt={sponsor.name}
                    width={120}
                    height={40}
                    className="h-8 sm:h-10 max-w-[90px] sm:max-w-[120px] w-auto object-contain opacity-40 hover:opacity-100 transition-all"
                  />
                ) : (
                  <span className="text-sm opacity-40 hover:opacity-100 transition-all">
                    {sponsor.name}
                  </span>
                );

                return sponsor.url ? (
                  <Link key={sponsor.id} href={sponsor.url} target="_blank">
                    {logoEl}
                  </Link>
                ) : (
                  <div key={sponsor.id}>{logoEl}</div>
                );
              })
            ) : null}
          </div>
        </div>
      </div>
      <Separator className="container mx-auto bg-spanish-bg-lighter" />
      <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-spanish-bg-lighter-plus">
        <p className="text-center md:text-left">
          &copy; {new Date().getFullYear()}{" "}
          <Link href="/admin" className="text-inherit no-underline cursor-default">
            UD Asturiana
          </Link>
          . Tous droits réservés.
        </p>

        <div className="flex gap-4">
          <Link
            href="https://instagram.com/asturiana_ud"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-spanish-accent-dark transition-all"
          >
            Instagram
          </Link>
          <Link
            href="https://www.youtube.com/@UDAsturiana"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-spanish-accent-dark transition-all"
          >
            Youtube
          </Link>
        </div>
      </div>
    </footer>
  );
}
