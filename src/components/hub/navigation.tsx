"use client";

import { CalendarDays, House, Lightbulb, ListTodo, UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export type EntreeNavigation = {
  nom: string;
  route: string;
  icone: "house" | "calendar-days" | "list-todo" | "lightbulb" | "user";
};

const ICONES = {
  house: House,
  "calendar-days": CalendarDays,
  "list-todo": ListTodo,
  lightbulb: Lightbulb,
  user: UserRound,
} as const;

/**
 * La navigation du Hub, construite depuis le registre des modules filtre par
 * les droits : barre basse sur mobile, barre laterale sur grand ecran. Les
 * deux affichent les memes entrees, dans le meme ordre.
 */
export default function Navigation({ entrees, nom }: { entrees: EntreeNavigation[]; nom: string }) {
  const pathname = usePathname();
  const estActive = (route: string) => (route === "/hub" ? pathname === route : pathname.startsWith(route));

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-sidebar-border bg-sidebar px-4 py-6 md:flex">
        <Link href="/hub" className="mb-8 flex items-center gap-3 px-2">
          <Image src="/assets/images/svg/logo-asturiana.svg" alt="" width={40} height={40} className="h-10 w-10" />
          <span className="font-marjorie text-xl font-black uppercase italic leading-none text-spanish-accent-2">
            Hub UDA
          </span>
        </Link>

        <nav aria-label="Menu du Hub" className="flex flex-1 flex-col gap-1">
          {entrees.map((entree) => {
            const Icone = ICONES[entree.icone];
            const active = estActive(entree.route);
            return (
              <Link
                key={entree.route}
                href={entree.route}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold transition-colors",
                  active
                    ? "bg-sidebar-accent text-spanish-accent-2"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                )}
              >
                <Icone className="size-5" aria-hidden="true" />
                {entree.nom}
              </Link>
            );
          })}
        </nav>

        <p className="truncate px-3 text-xs text-muted-foreground">{nom}</p>
      </aside>

      <nav
        aria-label="Menu du Hub"
        className="zone-sure-basse fixed inset-x-0 bottom-0 z-40 border-t border-sidebar-border bg-sidebar md:hidden"
      >
        <ul className="flex items-stretch justify-around">
          {entrees.map((entree) => {
            const Icone = ICONES[entree.icone];
            const active = estActive(entree.route);
            return (
              <li key={entree.route} className="min-w-0 flex-1">
                <Link
                  href={entree.route}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-[11px] font-semibold transition-colors",
                    active ? "text-spanish-accent-2" : "text-sidebar-foreground/70",
                  )}
                >
                  <Icone className="size-5" aria-hidden="true" />
                  <span className="truncate">{entree.nom}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
