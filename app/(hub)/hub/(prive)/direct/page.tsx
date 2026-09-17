import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

import { EnTetePage, Panneau, Vide } from "@/components/hub/mise-en-page";
import { formaterDateCourte, formaterHeure } from "@/hub/dates";
import { listerLesDiffusions, type Diffusion } from "@/hub/direct/donnees";
import { exigerModule } from "@/hub/session";

export const metadata: Metadata = { title: "Direct" };

/**
 * La liste des diffusions, la plus recente en haut.
 *
 * Une ligne par soiree, avec les deux chiffres qui la resument : combien de
 * personnes en tout, et combien au meilleur moment. Le reste est dans le
 * detail, pour qui veut savoir.
 */
function Ligne({ diffusion }: { diffusion: Diffusion }) {
  return (
    <li>
      <Link
        href={`/hub/direct/${diffusion.id}`}
        className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/40 focus-visible:bg-accent/40 focus-visible:outline-none"
      >
        <span className="w-24 shrink-0 text-xs text-muted-foreground">
          {diffusion.debut ? (
            <>
              <span className="block">
                {formaterDateCourte(diffusion.debut)}
              </span>
              <span className="block">{formaterHeure(diffusion.debut)}</span>
            </>
          ) : (
            <span className="block">Sans date</span>
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">
            {diffusion.affiche}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {diffusion.uniques} spectateur{diffusion.uniques > 1 ? "s" : ""}
            {diffusion.dureeMoyenne > 0
              ? ` · ${diffusion.dureeMoyenne.toLocaleString("fr-BE")} min en moyenne`
              : ""}
          </span>
        </span>

        <span className="shrink-0 text-right">
          <span className="block text-sm font-semibold tabular-nums">
            {diffusion.pointe}
          </span>
          <span className="block text-[0.65rem] uppercase tracking-wide text-muted-foreground">
            en même temps
          </span>
        </span>

        <ChevronRight
          className="size-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
      </Link>
    </li>
  );
}

/** Les diffusions passees et ce qu'elles ont rassemble. */
export default async function PageDirect() {
  await exigerModule("live");
  const diffusions = await listerLesDiffusions();

  return (
    <>
      <EnTetePage
        titre="Direct"
        description="Ce que chaque diffusion a rassemblé, soirée par soirée."
      />

      <Panneau
        titre="Diffusions"
        description={
          diffusions.length
            ? "La plus récente en haut. Une ligne par soirée."
            : undefined
        }
      >
        {diffusions.length ? (
          <ul className="divide-y divide-border">
            {diffusions.map((diffusion) => (
              <Ligne key={diffusion.id} diffusion={diffusion} />
            ))}
          </ul>
        ) : (
          <Vide>
            Aucune diffusion pour le moment. Le rapport d&apos;une soirée
            s&apos;écrit tout seul à la fin du direct.
          </Vide>
        )}
      </Panneau>
    </>
  );
}
