import type { Metadata } from "next";

import BoutonDeconnexion from "@/components/hub/bouton-deconnexion";
import { EnTetePage, Etiquette, Ligne, Panneau, Pastille } from "@/components/hub/mise-en-page";
import NotificationsProfil from "@/components/hub/push/notifications-profil";
import { estAdmin, idDe, modulesAccessibles, niveauModule } from "@/hub/droits";
import { LIBELLES_NIVEAUX, MODULES } from "@/hub/modules";
import { exigerAccesHub, nomAffiche } from "@/hub/session";
import { getPayloadClient } from "@/lib/payload";

export const metadata: Metadata = { title: "Profil" };

/**
 * Le compte de la personne dans le Hub : ses modules, ses flux, ses
 * notifications avec l'installation sur l'ecran d'accueil, et la sortie.
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
  const { totalDocs: appareils } = await payload.count({
    collection: "push-subscriptions",
    where: { user: { equals: user.id } },
  });

  const nomComplet = [user.first_name, user.last_name]
    .map((v) => v?.trim())
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <EnTetePage titre="Profil" description={nomAffiche(user)} />

      <Panneau titre="Compte">
        <dl className="divide-y divide-border">
          <Ligne libelle="Nom">
            {nomComplet || <span className="text-muted-foreground">Non renseigné, à compléter dans l&apos;admin.</span>}
          </Ligne>
          <Ligne libelle="E-mail">{user.email}</Ligne>
          <Ligne libelle="Rôle">{estAdmin(user) ? "Administrateur" : "Membre"}</Ligne>
        </dl>
      </Panneau>

      <Panneau titre="Modules" description="Lecture : consulter, voter, commenter. Édition : créer et modifier.">
        {modules.length === 0 ? (
          <p className="px-4 py-3 text-sm text-muted-foreground">Aucun module ouvert.</p>
        ) : (
          <ul className="divide-y divide-border">
            {modules.map((module) => {
              const niveau = niveauModule(user, module.key);
              return (
                <li key={module.key} className="flex items-center justify-between gap-4 px-4 py-3">
                  <span className="text-sm">{module.nom}</span>
                  {niveau ? <Etiquette>{LIBELLES_NIVEAUX[niveau]}</Etiquette> : null}
                </li>
              );
            })}
          </ul>
        )}
      </Panneau>

      <Panneau titre="Flux" description="Les publics dont vous voyez les événements.">
        {flux.length === 0 ? (
          <p className="px-4 py-3 text-sm text-muted-foreground">Aucun flux ouvert.</p>
        ) : (
          <ul className="divide-y divide-border">
            {flux.map((f) => (
              <li key={f.id} className="flex items-center gap-3 px-4 py-3">
                <Pastille couleur={typeof f.color === "string" ? f.color : null} />
                <span className="flex-1 text-sm">{String(f.name)}</span>
                {notifies.has(String(f.id)) ? <Etiquette>Rappels</Etiquette> : null}
              </li>
            ))}
          </ul>
        )}
      </Panneau>

      <Panneau titre="Notifications" description="Les rappels du matin et d'avant l'événement, sur cet appareil.">
        <NotificationsProfil
          flux={flux.map((f) => ({ id: Number(f.id), nom: String(f.name), couleur: typeof f.color === "string" ? f.color : null }))}
          fluxNotifiesIds={[...notifies].map(Number)}
          pushActif={user.hub?.push_enabled === true}
          appareils={appareils}
        />
      </Panneau>

      <Panneau titre="Session">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <p className="text-sm text-muted-foreground">Connecté sur cet appareil. La session dure sept jours sans visite.</p>
          <BoutonDeconnexion />
        </div>
      </Panneau>
    </>
  );
}
