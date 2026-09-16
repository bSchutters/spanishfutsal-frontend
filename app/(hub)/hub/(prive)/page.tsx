import { CalendarDays, ChevronRight } from "lucide-react";
import Link from "next/link";

import { Avis, EnTetePage, Etiquette, Ligne, Panneau, Pastille, Vide } from "@/components/hub/mise-en-page";
import InvitationInstallation from "@/components/hub/push/invitation-installation";
import { estAdmin, modulesAccessibles, niveauModule } from "@/hub/droits";
import { LIBELLES_NIVEAUX, MODULES } from "@/hub/modules";
import { exigerAccesHub } from "@/hub/session";
import { getPayloadClient } from "@/lib/payload";

const ICONES = { "calendar-days": CalendarDays } as const;

/** L'accueil du Hub : les modules ouverts a la personne, et son perimetre. */
export default async function AccueilHub({ searchParams }: { searchParams: Promise<{ refus?: string }> }) {
  const session = await exigerAccesHub();
  const { user } = session;
  const { refus } = await searchParams;
  const ouverts = new Set(modulesAccessibles(user));
  const modules = MODULES.filter((module) => ouverts.has(module.key));

  const payload = await getPayloadClient();
  const { docs: flux } = await payload.find({
    collection: "feeds",
    sort: "order",
    limit: 50,
    depth: 0,
    overrideAccess: false,
    user,
  });

  return (
    <>
      <EnTetePage titre="Accueil" description="Vos modules et votre périmètre dans le Hub." />

      {refus ? <Avis>Vous n&apos;avez pas le droit nécessaire sur ce module. Demandez à un administrateur.</Avis> : null}

      <InvitationInstallation />

      <Panneau titre="Modules">
        {modules.length === 0 ? (
          <div className="p-4">
            <Vide>Aucun module ne vous est ouvert. Un administrateur peut les activer depuis votre fiche.</Vide>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {modules.map((module) => {
              const Icone = ICONES[module.icone];
              const niveau = niveauModule(user, module.key);
              return (
                <li key={module.key}>
                  <Link
                    href={module.route}
                    className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-accent/40 focus-visible:bg-accent/40 focus-visible:outline-none"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-primary">
                      <Icone className="size-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{module.nom}</span>
                      <span className="block truncate text-xs text-muted-foreground">{module.description}</span>
                    </span>
                    {niveau ? <Etiquette>{LIBELLES_NIVEAUX[niveau]}</Etiquette> : null}
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Panneau>

      <Panneau titre="Périmètre" description="Ce que vous voyez dans le calendrier.">
        <dl className="divide-y divide-border">
          <Ligne libelle="Rôle">{estAdmin(user) ? "Administrateur, accès à tout" : "Membre"}</Ligne>
          <Ligne libelle="Flux">
            {flux.length === 0 ? (
              <span className="text-muted-foreground">Aucun flux ouvert.</span>
            ) : (
              <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
                {flux.map((f) => (
                  <li key={f.id} className="flex items-center gap-2">
                    <Pastille couleur={typeof f.color === "string" ? f.color : null} />
                    {String(f.name)}
                  </li>
                ))}
              </ul>
            )}
          </Ligne>
        </dl>
      </Panneau>
    </>
  );
}
