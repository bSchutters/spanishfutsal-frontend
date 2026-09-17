"use client";

import { ShieldCheck, UserRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Etiquette, Pastille, Vide } from "@/components/hub/mise-en-page";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { enregistrerDroitsMembre } from "@/hub/actions/membres";
import { nomDuMembre, type FluxChoix, type Membre, type NiveauxParModule } from "@/hub/membres/schema";
import { LIBELLES_NIVEAUX, MODULES, NIVEAUX, type Niveau } from "@/hub/modules";
import { cn } from "@/lib/utils";

/** Les trois choix possibles sur un module, dans l'ordre du moins au plus ouvert. */
const CHOIX: Array<{ valeur: Niveau | null; libelle: string }> = [
  { valeur: null, libelle: "Aucun" },
  ...NIVEAUX.map((n) => ({ valeur: n as Niveau | null, libelle: LIBELLES_NIVEAUX[n] })),
];

function Avatar({ administrateur }: { administrateur: boolean }) {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
      {administrateur ? (
        <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
      ) : (
        <UserRound className="size-4 text-muted-foreground" aria-hidden="true" />
      )}
    </span>
  );
}

/** Ce qu'une ligne annonce : le role, ou les modules ouverts, ou l'absence d'acces. */
function Resume({ membre, flux }: { membre: Membre; flux: FluxChoix[] }) {
  if (membre.administrateur) return <span className="text-xs text-muted-foreground">Administrateur, accès à tout</span>;
  if (!membre.acces) return <span className="text-xs text-muted-foreground">Pas d&apos;accès au Hub</span>;

  const ouverts = MODULES.filter((m) => membre.niveaux[m.key]);
  const siens = flux.filter((f) => membre.fluxIds.includes(f.id));
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
      {ouverts.length === 0 ? (
        <span>Aucun module</span>
      ) : (
        ouverts.map((m) => (
          <span key={m.key}>
            {m.nom}, {LIBELLES_NIVEAUX[membre.niveaux[m.key] as Niveau].toLowerCase()}
          </span>
        ))
      )}
      <span className="flex items-center gap-1.5">
        {siens.length === 0 ? (
          "Aucun flux"
        ) : (
          <>
            {siens.map((f) => (
              <Pastille key={f.id} couleur={f.couleur} />
            ))}
            {siens.length} flux
          </>
        )}
      </span>
    </span>
  );
}

/** Le panneau d'un compte : l'acces au Hub, le niveau de chaque module, les flux. */
function Fiche({
  membre,
  flux,
  onFermer,
  onEnregistre,
}: {
  membre: Membre;
  flux: FluxChoix[];
  onFermer: () => void;
  onEnregistre: (membre: Membre) => void;
}) {
  const [acces, setAcces] = useState(membre.acces);
  const [niveaux, setNiveaux] = useState<NiveauxParModule>(membre.niveaux);
  const [fluxIds, setFluxIds] = useState<number[]>(membre.fluxIds);
  const [enCours, setEnCours] = useState(false);

  const enregistrer = async () => {
    setEnCours(true);
    const r = await enregistrerDroitsMembre({ id: membre.id, acces, niveaux, fluxIds });
    setEnCours(false);
    if (!r.ok || !r.donnees) return void toast.error(r.ok ? "Enregistré, mais impossible à relire." : r.erreur);
    toast.success(`Droits de ${nomDuMembre(r.donnees)} enregistrés.`);
    onEnregistre(r.donnees);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-4">
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm">
          <Checkbox checked={acces} onCheckedChange={(c) => setAcces(c === true)} disabled={enCours} className="mt-0.5" />
          <span>
            <span className="font-medium">Accès au Hub</span>
            <span className="block text-xs text-muted-foreground">Sans cette case, aucune page du Hub ne s&apos;ouvre.</span>
          </span>
        </label>

        {acces ? (
          <>
            <section className="rounded-lg border border-border bg-card">
              <div className="border-b border-border px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Modules
              </div>
              <ul className="divide-y divide-border">
                {MODULES.map((module) => (
                  <li
                    key={module.key}
                    // Le nom a gauche, les trois choix a droite et toujours a
                    // la meme place : une largeur fixe, sinon chaque ligne se
                    // casse ou elle veut et la colonne n'existe plus.
                    className="flex flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                  >
                    <span className="min-w-0 text-sm font-medium">{module.nom}</span>
                    <div className="grid shrink-0 grid-cols-3 gap-1 rounded-md border border-border p-0.5 sm:w-52">
                      {CHOIX.map((choix) => {
                        const actif = (niveaux[module.key] ?? null) === choix.valeur;
                        return (
                          <button
                            key={choix.libelle}
                            type="button"
                            disabled={enCours}
                            aria-pressed={actif}
                            onClick={() => setNiveaux((avant) => ({ ...avant, [module.key]: choix.valeur }))}
                            className={cn(
                              "rounded px-2 py-1 text-center text-xs transition-colors disabled:opacity-50",
                              actif ? "bg-primary font-medium text-primary-foreground" : "text-muted-foreground hover:bg-accent",
                            )}
                          >
                            {choix.libelle}
                          </button>
                        );
                      })}
                    </div>
                  </li>
                ))}
              </ul>
              <p className="border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
                Lecture : consulter, voter et commenter. Édition : créer, modifier et supprimer.
              </p>
            </section>

            <section className="rounded-lg border border-border bg-card">
              <div className="border-b border-border px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Flux autorisés
              </div>
              <ul className="divide-y divide-border">
                {flux.map((f) => (
                  <li key={f.id}>
                    <label className="flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm">
                      <Checkbox
                        checked={fluxIds.includes(f.id)}
                        disabled={enCours}
                        onCheckedChange={(coche) =>
                          setFluxIds((avant) => (coche ? [...avant, f.id] : avant.filter((id) => id !== f.id)))
                        }
                      />
                      <Pastille couleur={f.couleur} />
                      {f.nom}
                    </label>
                  </li>
                ))}
              </ul>
              <p className="border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
                Cette personne ne voit que les événements rattachés à au moins un de ces flux.
              </p>
            </section>
          </>
        ) : null}
      </div>

      <div className="flex shrink-0 justify-end gap-2 border-t border-border bg-background px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <Button type="button" variant="hubSecondary" onClick={onFermer} disabled={enCours}>
          Annuler
        </Button>
        <Button type="button" variant="hub" onClick={enregistrer} disabled={enCours}>
          {enCours ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </div>
  );
}

/**
 * Les comptes du club et ce qu'ils peuvent faire dans le Hub. Un clic sur une
 * ligne ouvre ses droits : l'acces, le niveau de chaque module, les flux. Un
 * administrateur a tout sans reglage, sa ligne ne s'ouvre pas. Les comptes se
 * creent dans l'administration Payload, avec leur mot de passe : ici, on ne
 * regle que les droits.
 */
export default function TableauMembres({ membres: initiaux, flux }: { membres: Membre[]; flux: FluxChoix[] }) {
  const [membres, setMembres] = useState(initiaux);
  const [ouvert, setOuvert] = useState<{ membre: Membre | null; visible: boolean; cle: number }>({
    membre: null,
    visible: false,
    cle: 0,
  });

  if (membres.length === 0) return <Vide>Aucun compte. Ils se créent dans l&apos;administration Payload.</Vide>;

  const enregistre = (membre: Membre) => {
    setMembres((liste) => liste.map((m) => (m.id === membre.id ? membre : m)));
    setOuvert((o) => ({ ...o, visible: false }));
  };

  return (
    <>
      <section className="rounded-lg border border-border bg-card">
        <ul className="divide-y divide-border">
          {membres.map((membre) => (
            <li key={membre.id}>
              <button
                type="button"
                disabled={membre.administrateur}
                onClick={() => setOuvert((o) => ({ membre, visible: true, cle: o.cle + 1 }))}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                  !membre.administrateur && "hover:bg-accent/40 focus-visible:bg-accent/40 focus-visible:outline-none",
                  !membre.acces && "opacity-60",
                )}
              >
                <Avatar administrateur={membre.administrateur} />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 text-sm font-medium">
                    {nomDuMembre(membre)}
                    {membre.administrateur ? <Etiquette>Admin</Etiquette> : null}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">{membre.email}</span>
                  <Resume membre={membre} flux={flux} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-xs text-muted-foreground">
        Les comptes se créent dans l&apos;administration Payload, avec leur mot de passe. Ici se règlent seulement les droits sur
        le Hub.
      </p>

      {/* Le panneau garde sa derniere fiche le temps de se refermer. */}
      <Sheet open={ouvert.visible} onOpenChange={(o) => !o && setOuvert((avant) => ({ ...avant, visible: false }))}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <SheetHeader className="shrink-0 border-b border-border px-5 py-4">
            <SheetTitle>{ouvert.membre ? nomDuMembre(ouvert.membre) : "Droits"}</SheetTitle>
            <SheetDescription>{ouvert.membre?.email}</SheetDescription>
          </SheetHeader>
          {ouvert.membre ? (
            <Fiche
              key={ouvert.cle}
              membre={ouvert.membre}
              flux={flux}
              onFermer={() => setOuvert((avant) => ({ ...avant, visible: false }))}
              onEnregistre={enregistre}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
