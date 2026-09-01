"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ExternalLink, Play } from "lucide-react";

import { cn } from "@/lib/utils";

type Props = {
  videoId: string;
  url: string;
  thumbnail?: string | null;
  viewers?: number | null;
  title?: string | null;
  className?: string;
};

/**
 * Le match en direct, sur le site.
 *
 * Le lecteur de YouTube pese plus d'un megaoctet de JavaScript : le charger
 * d'entree couterait a l'accueil les cent points de performance gagnes cet
 * ete. Une facade tient donc sa place, et rien ne part chez Google tant que le
 * visiteur n'a pas clique, vignette comprise puisqu'elle passe par le proxy
 * d'images du site. Le domaine sans cookie est le seul appele ensuite.
 */
export default function LivePlayer({
  videoId,
  url,
  thumbnail,
  viewers,
  title,
  className,
}: Props) {
  const [playing, setPlaying] = useState(false);

  return (
    <section className={cn("flex w-full flex-col gap-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 rounded-md bg-red-600 px-2 py-1 text-sm font-bold uppercase italic text-white">
            <span className="relative flex h-2 w-2 items-center justify-center">
              <span className="absolute h-2 w-2 rounded-full bg-white" />
              <span className="absolute h-2 w-2 animate-ping rounded-full bg-white" />
            </span>
            en direct
          </span>

          {viewers !== null && viewers !== undefined && (
            <p className="text-sm">
              {new Intl.NumberFormat("fr-BE").format(viewers)}{" "}
              {viewers > 1 ? "spectateurs" : "spectateur"}
            </p>
          )}
        </div>

        {/* Sortie de secours : une chaine peut refuser l'integration, et le
            cadre n'affiche alors qu'un message d'erreur de YouTube. */}
        <Link
          href={url}
          target="_blank"
          className="flex items-center gap-2 rounded-md text-sm underline underline-offset-4 hover:text-spanish-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-spanish-accent"
        >
          Ouvrir sur YouTube
          <ExternalLink className="h-4 w-4" aria-hidden />
        </Link>
      </div>

      <div className="relative aspect-video w-full overflow-hidden rounded-xl border-2 border-red-600 bg-spanish-bg-dark">
        {playing ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
            title={title || "Diffusion en direct du match"}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            aria-label="Lancer la diffusion en direct du match"
            className="group absolute inset-0 flex cursor-pointer items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-spanish-accent"
          >
            {thumbnail && (
              <Image
                src={thumbnail}
                alt=""
                fill
                sizes="(min-width: 1024px) 60vw, 100vw"
                className="object-cover"
              />
            )}

            {/* Assombrit la vignette pour que le bouton reste lisible quelle
                que soit l'image renvoyee par YouTube. */}
            <span className="absolute inset-0 bg-spanish-bg-dark/50" />

            <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-spanish-accent-2 transition-transform duration-300 group-hover:scale-110">
              <Play
                className="h-7 w-7 translate-x-0.5 fill-spanish-bg text-spanish-bg"
                aria-hidden
              />
            </span>
          </button>
        )}
      </div>

      {title && <p className="text-sm text-spanish-accent">{title}</p>}
    </section>
  );
}
