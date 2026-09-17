import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import CourbeAudience from "@/components/hub/direct/courbe-audience";
import { EnTetePage, Panneau, Vide } from "@/components/hub/mise-en-page";
import { formaterDate, formaterHeure } from "@/hub/dates";
import {
  evolution,
  listerLesDiffusions,
  precedente,
  type Diffusion,
} from "@/hub/direct/donnees";
import { exigerModule } from "@/hub/session";

export const metadata: Metadata = { title: "Diffusion" };

const LIBELLES: Record<string, string> = {
  direct: "lien direct",
  facebook: "Facebook",
  instagram: "Instagram",
  recherche: "recherche",
  autre: "autre site",
  interne: "navigation interne",
  telephone: "téléphone",
  tablette: "tablette",
  ordinateur: "ordinateur",
};

const nombre = (valeur: number) => valeur.toLocaleString("fr-BE");

/** Un chiffre mis en avant, avec sa comparaison quand elle existe. */
function Chiffre({
  valeur,
  libelle,
  precision,
  ecart,
}: {
  valeur: string;
  libelle: string;
  precision?: string;
  ecart?: number | null;
}) {
  return (
    <div className="px-4 py-3">
      <p className="text-2xl font-semibold tabular-nums">{valeur}</p>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {libelle}
      </p>
      {precision ? (
        <p className="mt-1 text-xs text-muted-foreground">{precision}</p>
      ) : null}
      {typeof ecart === "number" ? (
        <p
          className={
            ecart >= 0
              ? "mt-1 text-xs font-medium text-emerald-600 dark:text-emerald-400"
              : "mt-1 text-xs font-medium text-red-600 dark:text-red-400"
          }
        >
          {ecart >= 0 ? "+" : ""}
          {ecart} % par rapport à la diffusion précédente
        </p>
      ) : null}
    </div>
  );
}

/** Un decompte par categorie, du plus grand au plus petit. */
function Repartition({ compte }: { compte: Record<string, number> }) {
  const lignes = Object.entries(compte).sort((a, b) => b[1] - a[1]);
  if (!lignes.length) return <Vide>Rien à afficher.</Vide>;

  const total = lignes.reduce((somme, [, n]) => somme + n, 0);

  return (
    <ul className="divide-y divide-border">
      {lignes.map(([cle, n]) => (
        <li key={cle} className="flex items-center gap-3 px-4 py-2.5">
          <span className="min-w-0 flex-1 truncate text-sm">
            {LIBELLES[cle] ?? cle}
          </span>
          <span className="shrink-0 text-sm font-medium tabular-nums">{n}</span>
          <span className="w-12 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
            {total ? Math.round((n / total) * 100) : 0} %
          </span>
        </li>
      ))}
    </ul>
  );
}

function Paliers({ diffusion }: { diffusion: Diffusion }) {
  const r = diffusion.detail.retention ?? {};

  const paliers: [string, number | undefined][] = [
    ["Plus de 5 minutes", r.cinq],
    ["Plus de 15 minutes", r.quinze],
    ["Plus de 30 minutes", r.trente],
    ["Plus de 45 minutes", r.quarantecinq],
    ["Jusqu'au bout", r.jusquauBout],
  ];

  return (
    <ul className="divide-y divide-border">
      {paliers.map(([libelle, valeur]) => (
        <li key={libelle} className="flex items-center gap-3 px-4 py-2.5">
          <span className="min-w-0 flex-1 truncate text-sm">{libelle}</span>
          <span className="shrink-0 text-sm font-medium tabular-nums">
            {valeur ?? 0}
          </span>
          <span className="w-12 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
            {diffusion.uniques
              ? Math.round(((valeur ?? 0) / diffusion.uniques) * 100)
              : 0}{" "}
            %
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Le detail d'une diffusion : ses chiffres, sa courbe, et d'où venaient les gens. */
export default async function PageDiffusion({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await exigerModule("live");

  const { id } = await params;
  const diffusions = await listerLesDiffusions();
  const diffusion = diffusions.find((d) => String(d.id) === id);

  if (!diffusion) notFound();

  const avant = precedente(diffusions, diffusion);
  const detail = diffusion.detail;

  const quand = diffusion.debut
    ? `${formaterDate(diffusion.debut)}, de ${formaterHeure(diffusion.debut)}${
        diffusion.fin ? ` à ${formaterHeure(diffusion.fin)}` : ""
      }`
    : undefined;

  return (
    <>
      <EnTetePage
        titre={diffusion.affiche}
        description={quand}
        actions={
          <Link
            href="/hub/direct"
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent/40"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Toutes les diffusions
          </Link>
        }
      />

      <Panneau titre="L'essentiel">
        <div className="grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-4 sm:divide-y-0">
          <Chiffre
            valeur={nombre(diffusion.pointe)}
            libelle="En même temps"
            precision={
              typeof detail.minutePointe === "number"
                ? `au plus fort, ${detail.minutePointe + 1}e minute`
                : undefined
            }
            ecart={avant ? evolution(avant.pointe, diffusion.pointe) : null}
          />
          <Chiffre
            valeur={nombre(diffusion.uniques)}
            libelle="Spectateurs"
            precision="personnes différentes"
            ecart={avant ? evolution(avant.uniques, diffusion.uniques) : null}
          />
          <Chiffre
            valeur={`${nombre(diffusion.dureeMoyenne)} min`}
            libelle="Temps regardé"
            precision={
              typeof detail.dureeMedianeMinutes === "number"
                ? `${nombre(detail.dureeMedianeMinutes)} min en médiane`
                : undefined
            }
          />
          <Chiffre
            valeur={`${nombre(detail.heuresVisionnees ?? 0)} h`}
            libelle="En tout"
            precision="toutes personnes confondues"
          />
        </div>
      </Panneau>

      <Panneau
        titre="La soirée"
        description="Le nombre de personnes présentes, minute par minute."
      >
        {diffusion.courbe.length > 1 ? (
          <div className="px-2 py-4 sm:px-4">
            <CourbeAudience courbe={diffusion.courbe} debut={diffusion.debut} />
          </div>
        ) : (
          <Vide>La diffusion a été trop courte pour dessiner une courbe.</Vide>
        )}
      </Panneau>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panneau titre="Combien sont restés">
          <Paliers diffusion={diffusion} />
        </Panneau>

        <Panneau titre="D'où ils venaient">
          <Repartition compte={detail.provenances ?? {}} />
        </Panneau>

        <Panneau titre="Sur quoi ils regardaient">
          <Repartition compte={detail.ecrans ?? {}} />
        </Panneau>

        <Panneau titre="Comment ça s'est passé">
          <ul className="divide-y divide-border">
            <li className="flex items-center gap-3 px-4 py-2.5">
              <span className="min-w-0 flex-1 text-sm">Son activé</span>
              <span className="shrink-0 text-sm font-medium tabular-nums">
                {detail.partSon ?? 0} %
              </span>
            </li>
            <li className="flex items-center gap-3 px-4 py-2.5">
              <span className="min-w-0 flex-1 text-sm">Plein écran</span>
              <span className="shrink-0 text-sm font-medium tabular-nums">
                {detail.partPleinEcran ?? 0} %
              </span>
            </li>
            <li className="flex items-center gap-3 px-4 py-2.5">
              <span className="min-w-0 flex-1 text-sm">
                Sans aucune coupure
              </span>
              <span className="shrink-0 text-sm font-medium tabular-nums">
                {detail.partSansCoupure ?? 0} %
              </span>
            </li>
            <li className="flex items-center gap-3 px-4 py-2.5">
              <span className="min-w-0 flex-1 text-sm">
                Coupures par personne
              </span>
              <span className="shrink-0 text-sm font-medium tabular-nums">
                {nombre(detail.coupuresMoyennes ?? 0)}
              </span>
            </li>
          </ul>
        </Panneau>
      </div>
    </>
  );
}
