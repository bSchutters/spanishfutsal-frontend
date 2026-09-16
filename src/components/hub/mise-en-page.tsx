import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** L'en-tete d'une page du Hub : le titre, une phrase, et les actions a droite. */
export function EnTetePage({
  titre,
  description,
  actions,
}: {
  titre: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    // Sur mobile, la barre du haut affiche deja le nom de la page : le titre
    // et la description ne restent que pour les lecteurs d'ecran, et les
    // actions eventuelles prennent leur place dans la colonne.
    <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 max-md:contents">
      <div className="min-w-0 max-md:sr-only">
        <h1 className="text-xl font-semibold tracking-tight">{titre}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/** Un panneau : un bloc de contenu avec son titre, sur le fond des cartes. */
export function Panneau({
  titre,
  description,
  actions,
  children,
  className,
}: {
  titre?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-lg border border-border bg-card", className)}>
      {titre ? (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">{titre}</h2>
            {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/** Une ligne libelle / valeur, empilee sur mobile, alignee sur grand ecran. */
export function Ligne({ libelle, children }: { libelle: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 px-4 py-3 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4">
      <dt className="text-xs font-medium text-muted-foreground sm:pt-0.5 sm:text-sm">{libelle}</dt>
      <dd className="min-w-0 text-sm">{children}</dd>
    </div>
  );
}

/** Une etiquette courte, pour un niveau ou un statut. */
export function Etiquette({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-md bg-secondary px-1.5 text-[11px] font-medium text-secondary-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Un etat vide : une phrase, sans decoration. */
export function Vide({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}

/** Un avis en tete de page, pour un refus ou une information. */
export function Avis({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="rounded-md border border-border bg-card px-4 py-3 text-sm">
      {children}
    </p>
  );
}

/** Une pastille de statut avec son libelle. */
export function PastilleStatut({ couleur, libelle }: { couleur: string; libelle: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-block size-2 shrink-0 rounded-full" style={{ backgroundColor: couleur }} aria-hidden="true" />
      {libelle}
    </span>
  );
}

/** Une pastille de la couleur d'un flux ou d'un type. */
export function Pastille({ couleur }: { couleur?: string | null }) {
  return (
    <span
      className="inline-block size-2.5 shrink-0 rounded-full border border-white/15"
      style={{ backgroundColor: couleur || "transparent" }}
      aria-hidden="true"
    />
  );
}
