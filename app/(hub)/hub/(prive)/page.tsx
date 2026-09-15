import { ArrowRight, CalendarDays } from "lucide-react";
import Link from "next/link";

import { modulesAccessibles, niveauModule } from "@/hub/droits";
import { LIBELLES_NIVEAUX, MODULES } from "@/hub/modules";
import { exigerAccesHub, nomAffiche } from "@/hub/session";

const ICONES = { "calendar-days": CalendarDays } as const;

/** L'accueil du Hub : les modules ouverts a la personne, et rien d'autre. */
export default async function AccueilHub({ searchParams }: { searchParams: Promise<{ refus?: string }> }) {
  const session = await exigerAccesHub();
  const { refus } = await searchParams;
  const ouverts = new Set(modulesAccessibles(session.user));
  const modules = MODULES.filter((module) => ouverts.has(module.key));

  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="text-sm text-muted-foreground">Bonjour {nomAffiche(session.user)}</p>
        <h1 className="font-marjorie text-3xl font-black uppercase italic text-spanish-accent-2">Hub UDA</h1>
      </header>

      {refus ? (
        <p role="status" className="rounded-md border border-border bg-card px-4 py-3 text-sm">
          Vous n&apos;avez pas le droit nécessaire sur ce module. Demandez à un administrateur.
        </p>
      ) : null}

      {modules.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-6 py-10 text-center text-muted-foreground">
          Aucun module ne vous est ouvert pour le moment. Un administrateur peut les activer depuis votre fiche.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {modules.map((module) => {
            const Icone = ICONES[module.icone];
            const niveau = niveauModule(session.user, module.key);
            return (
              <li key={module.key}>
                <Link
                  href={module.route}
                  className="group flex h-full flex-col gap-3 rounded-xl border border-border bg-card p-5 transition-colors hover:border-spanish-accent focus-visible:border-spanish-accent focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <div className="flex items-center justify-between">
                    <Icone className="size-7 text-spanish-accent" aria-hidden="true" />
                    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">
                      {niveau ? LIBELLES_NIVEAUX[niveau] : ""}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold">{module.nom}</h2>
                  <p className="text-sm text-muted-foreground">{module.description}</p>
                  <span className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-spanish-accent-2">
                    Ouvrir
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
