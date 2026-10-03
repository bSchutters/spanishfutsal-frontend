import { Cake, CalendarDays, ChevronRight, ClipboardList, Lightbulb, Radio, ShoppingBag, TriangleAlert } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Avis, EnTetePage, Etiquette, Panneau, Pastille, PastilleStatut, Vide } from "@/components/hub/mise-en-page";
import InvitationInstallation from "@/components/hub/push/invitation-installation";
import { chargerAccueil } from "@/hub/accueil/donnees";
import { COULEURS_STATUT, LIBELLES_STATUT } from "@/hub/calendrier/schema";
import { formaterDateCourte, formaterDateSansAnnee, formaterHeure } from "@/hub/dates";
import { exigerAccesHub } from "@/hub/session";
import { cn } from "@/lib/utils";

const LIEN =
  "flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/40 focus-visible:bg-accent/40 focus-visible:outline-none";

const majuscule = (texte: string) => texte.charAt(0).toUpperCase() + texte.slice(1);
const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;

/** Une ligne pour dire qu'un bloc n'a rien a montrer. */
function Rien({ children }: { children: ReactNode }) {
  return <p className="px-4 py-3 text-sm text-muted-foreground">{children}</p>;
}

/** Le lien discret en haut a droite d'un bloc, vers la page complete. */
function ToutVoir({ href, children = "Tout voir" }: { href: string; children?: ReactNode }) {
  return (
    <Link href={href} className="rounded-sm text-xs text-muted-foreground transition-colors hover:text-foreground">
      {children}
    </Link>
  );
}

/** L'icone carree en tete d'une ligne. */
function Icone({ children }: { children: ReactNode }) {
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-primary" aria-hidden="true">
      {children}
    </span>
  );
}

function Chevron() {
  return <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />;
}

/**
 * L'accueil du Hub : ce qui attend la personne, du plus urgent au moins
 * urgent. Chaque bloc n'apparait que si elle a le droit sur son module.
 */
export default async function AccueilHub({ searchParams }: { searchParams: Promise<{ refus?: string }> }) {
  const { user } = await exigerAccesHub();
  const { refus } = await searchParams;
  const accueil = await chargerAccueil(user);
  const { blocs } = accueil;
  const aucunBloc = !Object.values(blocs).some(Boolean);

  return (
    <>
      <EnTetePage titre="Accueil" description="Ce qui vous attend dans le Hub." />

      {refus === "admin" ? (
        <Avis>Cette page est réservée aux administrateurs.</Avis>
      ) : refus ? (
        <Avis>Vous n&apos;avez pas le droit nécessaire sur ce module. Demandez à un administrateur.</Avis>
      ) : null}

      <InvitationInstallation />

      {aucunBloc ? (
        <Vide>Aucun module ne vous est ouvert. Un administrateur peut les activer depuis votre fiche.</Vide>
      ) : null}

      {blocs.calendrier && accueil.postsEnRetard > 0 ? (
        <Link
          href="/hub/calendrier/a-faire"
          className="flex items-center gap-3 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm transition-colors hover:bg-destructive/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destructive"
        >
          <TriangleAlert className="size-4 shrink-0 text-destructive" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="font-semibold text-destructive">{pluriel(accueil.postsEnRetard, "post")} en retard</span>
            {accueil.postsEnRetard > 1 ? " : leur date est passée" : " : sa date est passée"} sans publication.
          </span>
          <Chevron />
        </Link>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 md:items-start">
        {blocs.calendrier ? (
          <Panneau titre="Prochain match">
            {accueil.prochainMatch ? (
              <Link href={`/hub/calendrier/evenements/${accueil.prochainMatch.id}`} className={LIEN}>
                <Icone>
                  <CalendarDays className="size-4" />
                </Icone>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{accueil.prochainMatch.titre}</span>
                  <span className="block text-xs text-muted-foreground">
                    {majuscule(formaterDateSansAnnee(accueil.prochainMatch.debut))} à{" "}
                    {formaterHeure(accueil.prochainMatch.debut)}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {[
                      accueil.prochainMatch.domicile ? "Domicile" : "Extérieur",
                      accueil.prochainMatch.lieu,
                      accueil.prochainMatch.competition,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                <Chevron />
              </Link>
            ) : (
              <Rien>Aucun match à venir dans le calendrier.</Rien>
            )}
          </Panneau>
        ) : null}

        {blocs.calendrier ? (
          <Panneau titre="Mes posts à faire" actions={<ToutVoir href="/hub/calendrier/a-faire?mes=1" />}>
            {accueil.mesPosts.length > 0 ? (
              <ul className="divide-y divide-border">
                {accueil.mesPosts.map((p) => (
                  <li key={p.id}>
                    <Link href={`/hub/calendrier/evenements/${p.id}`} className={LIEN}>
                      <Pastille couleur={p.couleur} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{p.titre}</span>
                        <span
                          className={cn("block text-xs", p.enRetard ? "font-medium text-destructive" : "text-muted-foreground")}
                        >
                          {formaterDateCourte(p.debut)} à {formaterHeure(p.debut)}
                          {p.enRetard ? " · en retard" : ""}
                        </span>
                      </span>
                      <span className="text-xs">
                        <PastilleStatut couleur={COULEURS_STATUT[p.statut]} libelle={LIBELLES_STATUT[p.statut]} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <Rien>Aucun post ne vous attend.</Rien>
            )}
          </Panneau>
        ) : null}

        {blocs.saisieStats ? (
          <Panneau titre="Feuilles de stats à remplir" actions={<ToutVoir href="/hub/joueurs/stats" />}>
            {accueil.feuillesARemplir.length > 0 ? (
              <ul className="divide-y divide-border">
                {accueil.feuillesARemplir.map((m) => (
                  <li key={m.id}>
                    <Link href={`/hub/joueurs/stats/${m.id}`} className={LIEN}>
                      <Icone>
                        <ClipboardList className="size-4" />
                      </Icone>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {m.domicile ? "UDA" : m.adversaire} vs {m.domicile ? m.adversaire : "UDA"}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {formaterDateCourte(m.debut)} · {m.domicile ? "Domicile" : "Extérieur"}
                        </span>
                      </span>
                      {m.score ? <Etiquette className="tabular-nums">{m.score}</Etiquette> : null}
                      <Chevron />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <Rien>Toutes les feuilles des matchs joués sont remplies.</Rien>
            )}
          </Panneau>
        ) : null}

        {blocs.calendrier ? (
          <Panneau titre="Idées à voter">
            {accueil.ideesAVoter > 0 ? (
              <Link href="/hub/idees" className={LIEN}>
                <Icone>
                  <Lightbulb className="size-4" />
                </Icone>
                <span className="min-w-0 flex-1 text-sm">
                  {pluriel(accueil.ideesAVoter, "idée")} {accueil.ideesAVoter > 1 ? "attendent" : "attend"} votre avis
                </span>
                <Chevron />
              </Link>
            ) : (
              <Rien>Vous avez donné votre avis sur toutes les nouvelles idées.</Rien>
            )}
          </Panneau>
        ) : null}

        {blocs.joueurs ? (
          <Panneau titre="Anniversaires de la semaine" description="Aujourd'hui et les six jours suivants.">
            {accueil.anniversaires.length > 0 ? (
              <ul className="divide-y divide-border">
                {accueil.anniversaires.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 px-4 py-3">
                    <Icone>
                      <Cake className="size-4" />
                    </Icone>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {a.prenom} {a.nom}
                      </span>
                      <span className="block text-xs text-muted-foreground">{a.age} ans</span>
                    </span>
                    <span className={cn("shrink-0 text-xs", a.dansJours === 0 ? "font-semibold text-primary" : "text-muted-foreground")}>
                      {a.dansJours === 0
                        ? "Aujourd'hui"
                        : a.dansJours === 1
                          ? "Demain"
                          : majuscule(formaterDateSansAnnee(`${a.jour}T12:00:00Z`))}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <Rien>Aucun anniversaire cette semaine.</Rien>
            )}
          </Panneau>
        ) : null}

        {blocs.direct ? (
          <Panneau titre="Dernier direct" actions={<ToutVoir href="/hub/direct" />}>
            {accueil.dernierDirect ? (
              <Link href={`/hub/direct/${accueil.dernierDirect.id}`} className={LIEN}>
                <Icone>
                  <Radio className="size-4" />
                </Icone>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{accueil.dernierDirect.affiche}</span>
                  <span className="block text-xs text-muted-foreground">
                    {accueil.dernierDirect.debut ? formaterDateCourte(accueil.dernierDirect.debut) : "Sans date"} ·{" "}
                    {pluriel(accueil.dernierDirect.uniques, "spectateur")} · {accueil.dernierDirect.pointe} en même temps
                  </span>
                  {accueil.dernierDirect.evolutionUniques !== null ? (
                    <span className="block text-xs text-muted-foreground">
                      {accueil.dernierDirect.evolutionUniques > 0 ? "+" : ""}
                      {accueil.dernierDirect.evolutionUniques} % de spectateurs par rapport au direct précédent
                    </span>
                  ) : null}
                </span>
                <Chevron />
              </Link>
            ) : (
              <Rien>Aucune diffusion pour l&apos;instant.</Rien>
            )}
          </Panneau>
        ) : null}
        {blocs.pack ? (
          <Panneau titre="Pack" actions={<ToutVoir href="/hub/pack/commandes?statut=toutes" />}>
            {accueil.commandesRecues > 0 ? (
              <Link href="/hub/pack/commandes" className={LIEN}>
                <Icone>
                  <ShoppingBag className="size-4" />
                </Icone>
                <span className="min-w-0 flex-1 text-sm">
                  {pluriel(accueil.commandesRecues, "commande")} {accueil.commandesRecues > 1 ? "attendent" : "attend"} d&apos;être
                  passée{accueil.commandesRecues > 1 ? "s" : ""} chez Joma
                </span>
                <Chevron />
              </Link>
            ) : (
              <Rien>Aucune commande en attente.</Rien>
            )}
          </Panneau>
        ) : null}
      </div>
    </>
  );
}
