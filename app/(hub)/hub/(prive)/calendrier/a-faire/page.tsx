import type { Metadata } from "next";
import Link from "next/link";

import ActionsPost from "@/components/hub/calendrier/actions-post";
import { EnTetePage, Etiquette, Panneau, Pastille, Vide } from "@/components/hub/mise-en-page";
import { cn } from "@/lib/utils";
import { listerPostsAFaire } from "@/hub/calendrier/donnees";
import { peutEditer } from "@/hub/droits";
import { formaterDateCourte, formaterHeure } from "@/hub/dates";
import { exigerModule } from "@/hub/session";

export const metadata: Metadata = { title: "À faire" };

type Post = Awaited<ReturnType<typeof listerPostsAFaire>>[number];

function ListePosts({ posts, retard, edition }: { posts: Post[]; retard: boolean; edition: boolean }) {
  return (
    <ul className="divide-y divide-border">
      {posts.map((p) => {
        const diffusion = [...p.formats, ...p.reseaux].filter(Boolean).join(", ");
        return (
          <li key={p.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <Pastille couleur={p.couleur} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{p.titre}</p>
                <p className={cn("text-xs", retard ? "font-medium text-destructive" : "text-muted-foreground")}>
                  {formaterDateCourte(p.debut)} à {formaterHeure(p.debut)}
                  {retard ? " · en retard" : ""}
                  {diffusion ? ` · ${diffusion}` : ""}
                </p>
              </div>
            </div>
            <ActionsPost
              id={p.id}
              statut={p.statut}
              legende={p.legende}
              lienVisuels={p.lienVisuels}
              peutEditer={edition}
            />
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Les posts a creer ou a publier, du plus urgent au plus lointain. Un post
 * dont la date est passee sans etre publie est en retard : en rouge, en tete.
 */
export default async function PageAFaire({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const { user } = await exigerModule("calendar");
  const { mes } = await searchParams;
  const lesMiens = mes === "1";
  const posts = await listerPostsAFaire(user, lesMiens);
  const enRetard = posts.filter((p) => p.enRetard);
  const aVenir = posts.filter((p) => !p.enRetard);
  const edition = peutEditer(user, "calendar");

  return (
    <>
      <EnTetePage
        titre="À faire"
        description="Les posts à créer ou à publier, les retards en premier."
        actions={
          <div className="flex gap-1 rounded-md border border-border p-0.5 text-sm">
            <Link
              href="/hub/calendrier/a-faire"
              className={cn("rounded px-2.5 py-1", !lesMiens ? "bg-secondary font-medium" : "text-muted-foreground")}
            >
              Tous
            </Link>
            <Link
              href="/hub/calendrier/a-faire?mes=1"
              className={cn("rounded px-2.5 py-1", lesMiens ? "bg-secondary font-medium" : "text-muted-foreground")}
            >
              Mes posts
            </Link>
          </div>
        }
      />

      {posts.length === 0 ? (
        <Vide>{lesMiens ? "Aucun post ne vous attend." : "Rien à publier pour le moment."}</Vide>
      ) : (
        <>
          {enRetard.length > 0 ? (
            <Panneau titre="En retard" actions={<Etiquette className="text-destructive">{enRetard.length}</Etiquette>}>
              <ListePosts posts={enRetard} retard edition={edition} />
            </Panneau>
          ) : null}
          {aVenir.length > 0 ? (
            <Panneau titre="À venir" actions={<Etiquette>{aVenir.length}</Etiquette>}>
              <ListePosts posts={aVenir} retard={false} edition={edition} />
            </Panneau>
          ) : null}
        </>
      )}
    </>
  );
}
