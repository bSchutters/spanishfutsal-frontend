"use client";

import { KeyRound, Plus, ShieldCheck, UserRound, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import BoutonCopier from "@/components/hub/bouton-copier";
import { Etiquette, Pastille, Vide } from "@/components/hub/mise-en-page";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { creerMembre, enregistrerDroitsMembre } from "@/hub/actions/membres";
import {
  nomDuMembre,
  SAISIE_NOUVEAU_MEMBRE_VIDE,
  type FluxChoix,
  type Membre,
  type NiveauxParModule,
} from "@/hub/membres/schema";
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

export type EtatPanneau = { mode: "modifier"; membre: Membre } | { mode: "creer" };

/**
 * Le panneau d'un compte : son identite quand il se cree, puis l'acces au
 * Hub, le niveau de chaque module et les flux.
 */
function Fiche({
  etat,
  flux,
  onFermer,
  onEnregistre,
  onCree,
}: {
  etat: EtatPanneau;
  flux: FluxChoix[];
  onFermer: () => void;
  onEnregistre: (membre: Membre) => void;
  onCree: (membre: Membre, motDePasse: string) => void;
}) {
  const creation = etat.mode === "creer";
  const depart = creation ? SAISIE_NOUVEAU_MEMBRE_VIDE : etat.membre;
  const [prenom, setPrenom] = useState(creation ? "" : etat.membre.prenom);
  const [nom, setNom] = useState(creation ? "" : etat.membre.nom);
  const [email, setEmail] = useState(creation ? "" : etat.membre.email);
  const [acces, setAcces] = useState(depart.acces);
  const [niveaux, setNiveaux] = useState<NiveauxParModule>(creation ? {} : etat.membre.niveaux);
  const [fluxIds, setFluxIds] = useState<number[]>(creation ? [] : etat.membre.fluxIds);
  const [enCours, setEnCours] = useState(false);

  const enregistrer = async () => {
    setEnCours(true);
    if (creation) {
      const r = await creerMembre({ prenom, nom, email, acces, niveaux, fluxIds });
      setEnCours(false);
      if (!r.ok || !r.donnees) return void toast.error(r.ok ? "Créé, mais impossible à relire." : r.erreur);
      onCree(r.donnees.membre, r.donnees.motDePasse);
      return;
    }
    const r = await enregistrerDroitsMembre({ id: etat.membre.id, acces, niveaux, fluxIds });
    setEnCours(false);
    if (!r.ok || !r.donnees) return void toast.error(r.ok ? "Enregistré, mais impossible à relire." : r.erreur);
    toast.success(`Droits de ${nomDuMembre(r.donnees)} enregistrés.`);
    onEnregistre(r.donnees);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-4">
        {creation ? (
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm">
                Prénom
                <Input value={prenom} onChange={(e) => setPrenom(e.target.value)} disabled={enCours} autoComplete="off" autoFocus />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                Nom
                <Input value={nom} onChange={(e) => setNom(e.target.value)} disabled={enCours} autoComplete="off" />
              </label>
            </div>
            <label className="flex flex-col gap-1.5 text-sm">
              Adresse e-mail
              <Input
                type="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={enCours}
                autoComplete="off"
                placeholder="prenom@exemple.be"
              />
              <span className="text-xs text-muted-foreground">
                Elle sert à se connecter. Le mot de passe est tiré au hasard et s&apos;affiche une fois, à lui transmettre.
              </span>
            </label>
          </div>
        ) : null}

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
          {enCours ? "Enregistrement…" : creation ? "Créer le compte" : "Enregistrer"}
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
  const [ouvert, setOuvert] = useState<{ etat: EtatPanneau | null; visible: boolean; cle: number }>({
    etat: null,
    visible: false,
    cle: 0,
  });
  // Le mot de passe d'un compte tout juste cree : il ne se relit jamais.
  const [nouveau, setNouveau] = useState<{ membre: Membre; motDePasse: string } | null>(null);

  const ouvrir = (etat: EtatPanneau) => setOuvert((o) => ({ etat, visible: true, cle: o.cle + 1 }));
  const fermer = () => setOuvert((o) => ({ ...o, visible: false }));

  const enregistre = (membre: Membre) => {
    setMembres((liste) => liste.map((m) => (m.id === membre.id ? membre : m)));
    fermer();
  };

  const cree = (membre: Membre, motDePasse: string) => {
    setMembres((liste) => [...liste, membre]);
    setNouveau({ membre, motDePasse });
    fermer();
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Touchez une personne pour régler ses droits.</p>
        <Button type="button" variant="hub" size="sm" onClick={() => ouvrir({ mode: "creer" })}>
          <Plus aria-hidden="true" />
          Ajouter un membre
        </Button>
      </div>

      {nouveau ? (
        <div className="rounded-lg border border-primary/40 bg-primary/5 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <p className="flex items-center gap-2 text-sm font-medium">
              <KeyRound className="size-4 shrink-0 text-primary" aria-hidden="true" />
              Compte créé pour {nomDuMembre(nouveau.membre)}
            </p>
            <button
              type="button"
              onClick={() => setNouveau(null)}
              aria-label="Masquer le mot de passe"
              className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Ce mot de passe ne se relit pas. Transmettez-le à la personne, elle pourra le changer.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="rounded-md border border-border bg-background px-3 py-1.5 font-mono text-sm">{nouveau.motDePasse}</code>
            <BoutonCopier
              valeur={nouveau.motDePasse}
              libelle="Copier"
              libelleCopie="Copié"
              className="h-9 w-auto px-3"
            />
          </div>
        </div>
      ) : null}

      {membres.length === 0 ? (
        <Vide>Aucun compte pour le moment.</Vide>
      ) : (
        <section className="rounded-lg border border-border bg-card">
          <ul className="divide-y divide-border">
            {membres.map((membre) => (
              <li key={membre.id}>
                <button
                  type="button"
                  disabled={membre.administrateur}
                  onClick={() => ouvrir({ mode: "modifier", membre })}
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
      )}

      <p className="text-xs text-muted-foreground">
        Un compte créé ici est un membre. Le rôle d&apos;administrateur se donne dans l&apos;administration Payload.
      </p>

      {/* Le panneau garde sa derniere fiche le temps de se refermer. */}
      <Sheet open={ouvert.visible} onOpenChange={(o) => !o && fermer()}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <SheetHeader className="shrink-0 border-b border-border px-5 py-4">
            <SheetTitle>
              {ouvert.etat?.mode === "modifier" ? nomDuMembre(ouvert.etat.membre) : "Nouveau membre"}
            </SheetTitle>
            <SheetDescription>
              {ouvert.etat?.mode === "modifier"
                ? ouvert.etat.membre.email
                : "Son compte, et ce qu'il pourra faire dans le Hub."}
            </SheetDescription>
          </SheetHeader>
          {ouvert.etat ? (
            <Fiche
              key={ouvert.cle}
              etat={ouvert.etat}
              flux={flux}
              onFermer={fermer}
              onEnregistre={enregistre}
              onCree={cree}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
