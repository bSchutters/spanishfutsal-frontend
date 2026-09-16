"use client";

import { CalendarDays, ChevronDown, House, Lightbulb, ListTodo, UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import { abonnerReplis, basculerRepli, lireReplisMemorises, replisServeur } from "./replis";

export type IconeNavigation = "house" | "calendar-days" | "list-todo" | "lightbulb" | "user";

export type EntreeNavigation = {
  nom: string;
  route: string;
  icone: IconeNavigation;
  /** Un compte a signaler, par exemple les idees sans son vote. */
  badge?: number;
};

function Badge({ nombre }: { nombre?: number }) {
  if (!nombre) return null;
  return (
    <span className="ml-auto rounded-full bg-primary px-1.5 text-[11px] font-semibold leading-4 text-primary-foreground">
      {nombre > 99 ? "99+" : nombre}
    </span>
  );
}

export type SectionNavigation = {
  /** Vide pour les entrees sans intitule de section. */
  titre?: string;
  entrees: EntreeNavigation[];
};

const ICONES: Record<IconeNavigation, typeof House> = {
  house: House,
  "calendar-days": CalendarDays,
  "list-todo": ListTodo,
  lightbulb: Lightbulb,
  user: UserRound,
};

function couvre(pathname: string, route: string) {
  return route === "/hub" ? pathname === route : pathname === route || pathname.startsWith(`${route}/`);
}

/**
 * L'entree active est la plus precise qui couvre la page : sur la vue
 * « A faire », seule « A faire » s'allume, pas « Calendrier » au-dessus.
 */
function routeActive(pathname: string, entrees: EntreeNavigation[]): string | undefined {
  return entrees
    .filter((entree) => couvre(pathname, entree.route))
    .sort((a, b) => b.route.length - a.route.length)[0]?.route;
}

/** Une entree est enfant d'une autre de sa section quand sa route la prolonge. */
function estEnfant(entree: EntreeNavigation, section: EntreeNavigation[]) {
  return section.some((autre) => autre !== entree && entree.route.startsWith(`${autre.route}/`));
}

/**
 * La navigation du Hub, construite depuis le registre des modules filtre par
 * les droits. Sur grand ecran, une barre laterale avec ses sections et le
 * bloc de la personne connectee. Sur mobile, un en-tete qui nomme la page et
 * une barre d'onglets en bas, dans la zone sure du telephone.
 */
export default function Navigation({
  sections,
  onglets,
  blocUtilisateur,
}: {
  sections: SectionNavigation[];
  onglets: EntreeNavigation[];
  blocUtilisateur: ReactNode;
}) {
  const pathname = usePathname();
  // Les entrees repliees par la personne : leurs sous-entrees se cachent.
  const replies = useSyncExternalStore(abonnerReplis, lireReplisMemorises, replisServeur);
  const toutes = sections.flatMap((section) => section.entrees);
  const active = routeActive(pathname, toutes);
  const ongletActif = routeActive(pathname, onglets);
  // L'en-tete mobile nomme la page d'apres l'entree active, qu'elle vienne
  // des sections ou des seuls onglets, comme le profil.
  const courante = toutes.find((entree) => entree.route === active) ?? onglets.find((entree) => entree.route === ongletActif);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <Link href="/hub" className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-4">
          <Image src="/assets/images/svg/logo-asturiana.svg" alt="" width={28} height={28} className="size-7" />
          <span className="flex flex-col leading-tight">
            <span className="text-sm font-semibold text-sidebar-foreground">Hub UDA</span>
            <span className="text-[11px] text-muted-foreground">UD Asturiana</span>
          </span>
        </Link>

        <nav aria-label="Menu du Hub" className="flex-1 overflow-y-auto px-2 py-2">
          {sections.map((section, index) => (
            <div key={section.titre ?? index} className={cn(index > 0 && "mt-4")}>
              {section.titre ? (
                <p className="px-2 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {section.titre}
                </p>
              ) : null}
              <ul className="flex flex-col gap-0.5">
                {section.entrees
                  .filter((entree) => !estEnfant(entree, section.entrees))
                  .map((parent) => {
                    const Icone = ICONES[parent.icone];
                    const enfants = section.entrees.filter((entree) => entree.route.startsWith(`${parent.route}/`));
                    const replie = enfants.length > 0 && replies.has(parent.route);
                    return (
                      <li key={parent.route}>
                        <div
                          className={cn(
                            "flex h-9 items-center rounded-md pr-1 text-sm transition-colors",
                            parent.route === active
                              ? "bg-sidebar-accent font-medium text-sidebar-primary"
                              : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                          )}
                        >
                          <Link
                            href={parent.route}
                            aria-current={parent.route === active ? "page" : undefined}
                            className="flex h-full min-w-0 flex-1 items-center gap-2.5 px-2"
                          >
                            <Icone className="size-4 shrink-0" aria-hidden="true" />
                            <span className="truncate">{parent.nom}</span>
                            <Badge nombre={parent.badge} />
                          </Link>
                          {enfants.length > 0 ? (
                            <button
                              type="button"
                              onClick={() => basculerRepli(parent.route)}
                              aria-expanded={!replie}
                              aria-label={replie ? `Déplier ${parent.nom}` : `Replier ${parent.nom}`}
                              className="flex size-7 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/60 hover:bg-sidebar-border hover:text-sidebar-foreground"
                            >
                              <ChevronDown
                                className={cn("size-4 transition-transform", replie && "-rotate-90")}
                                aria-hidden="true"
                              />
                            </button>
                          ) : null}
                        </div>
                        {enfants.length > 0 && !replie ? (
                          <ul className="mb-1 ml-4 flex flex-col border-l border-sidebar-border pl-3">
                            {enfants.map((enfant) => (
                              <li key={enfant.route}>
                                <Link
                                  href={enfant.route}
                                  aria-current={enfant.route === active ? "page" : undefined}
                                  className={cn(
                                    "flex h-8 items-center rounded-md px-2 text-[13px] transition-colors",
                                    enfant.route === active
                                      ? "font-medium text-sidebar-primary"
                                      : "text-sidebar-foreground/65 hover:text-sidebar-foreground",
                                  )}
                                >
                                  <span className="truncate">{enfant.nom}</span>
                                  <Badge nombre={enfant.badge} />
                                </Link>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </li>
                    );
                  })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-sidebar-border p-2">{blocUtilisateur}</div>
      </aside>

      <header className="zone-sure-haute shrink-0 border-b border-sidebar-border bg-sidebar md:hidden">
        <div className="flex h-14 items-center gap-3 px-4">
          <Link href="/hub" className="flex shrink-0 items-center gap-2" aria-label="Accueil du Hub">
            <Image src="/assets/images/svg/logo-asturiana.svg" alt="" width={28} height={28} className="size-7" />
            <span className="text-sm font-semibold">Hub UDA</span>
          </Link>
          {courante && courante.route !== "/hub" ? (
            <span className="min-w-0 truncate border-l border-sidebar-border pl-3 text-sm text-muted-foreground">
              {courante.nom}
            </span>
          ) : null}
        </div>
      </header>

      <nav
        aria-label="Menu du Hub"
        className="zone-sure-basse fixed inset-x-0 bottom-0 z-40 border-t border-sidebar-border bg-sidebar md:hidden"
      >
        <ul className="grid" style={{ gridTemplateColumns: `repeat(${onglets.length}, minmax(0, 1fr))` }}>
          {onglets.map((entree) => {
            const Icone = ICONES[entree.icone];
            const estActive = entree.route === ongletActif;
            return (
              <li key={entree.route} className="min-w-0">
                <Link
                  href={entree.route}
                  aria-current={estActive ? "page" : undefined}
                  className={cn(
                    "flex h-14 flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium transition-colors",
                    estActive ? "text-sidebar-primary" : "text-sidebar-foreground/65",
                  )}
                >
                  <span className="relative">
                    <Icone className="size-5" aria-hidden="true" />
                    {entree.badge ? (
                      <span className="absolute -right-2.5 -top-1.5 rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-primary-foreground">
                        {entree.badge > 99 ? "99+" : entree.badge}
                      </span>
                    ) : null}
                  </span>
                  <span className="max-w-full truncate">{entree.nom}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
