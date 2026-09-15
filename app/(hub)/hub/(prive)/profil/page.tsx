import type { Metadata } from "next";

import BoutonDeconnexion from "@/components/hub/bouton-deconnexion";
import { estAdmin, idDe, modulesAccessibles, niveauModule } from "@/hub/droits";
import { LIBELLES_NIVEAUX, MODULES } from "@/hub/modules";
import { exigerAccesHub, nomAffiche } from "@/hub/session";
import { getPayloadClient } from "@/lib/payload";

export const metadata: Metadata = { title: "Profil" };

/**
 * Ce que la personne est dans le Hub : ses modules, ses flux, et la sortie.
 * Les notifications et l'installation sur l'ecran d'accueil viendront ici.
 */
export default async function PageProfil() {
  const session = await exigerAccesHub();
  const { user } = session;
  const payload = await getPayloadClient();

  // Les flux sont lus avec les droits de la personne : un administrateur les
  // voit tous, les autres ne recoivent que les leurs.
  const { docs: flux } = await payload.find({
    collection: "feeds",
    sort: "order",
    limit: 50,
    depth: 0,
    overrideAccess: false,
    user,
  });
  const notifies = new Set((user.hub?.notified_feeds ?? []).map((f) => String(idDe(f))));

  const modules = MODULES.filter((module) => modulesAccessibles(user).includes(module.key));

  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="text-sm text-muted-foreground">Profil</p>
        <h1 className="font-marjorie text-3xl font-black uppercase italic text-spanish-accent-2">
          {nomAffiche(user)}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {user.email}
          {estAdmin(user) ? " · administrateur" : ""}
        </p>
      </header>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 text-base font-bold">Modules</h2>
        {modules.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun module ouvert.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {modules.map((module) => {
              const niveau = niveauModule(user, module.key);
              return (
                <li key={module.key} className="flex items-center justify-between text-sm">
                  <span>{module.nom}</span>
                  <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold">
                    {niveau ? LIBELLES_NIVEAUX[niveau] : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 text-base font-bold">Flux</h2>
        {flux.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun flux ne vous est ouvert.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {flux.map((f) => (
              <li key={f.id} className="flex items-center gap-3 text-sm">
                <span
                  className="size-3 shrink-0 rounded-full border border-white/20"
                  style={{ backgroundColor: typeof f.color === "string" && f.color ? f.color : "transparent" }}
                  aria-hidden="true"
                />
                <span className="flex-1">{String(f.name)}</span>
                {notifies.has(String(f.id)) ? (
                  <span className="text-xs text-muted-foreground">rappels actifs</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Les notifications et le choix des flux notifiés se régleront ici, avec l&apos;installation sur l&apos;écran
          d&apos;accueil.
        </p>
      </section>

      <div>
        <BoutonDeconnexion />
      </div>
    </div>
  );
}
