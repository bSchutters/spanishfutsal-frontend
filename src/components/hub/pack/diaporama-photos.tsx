"use client";

import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, Shirt } from "lucide-react";
import { Fragment, useCallback, useEffect, useState, type ReactNode } from "react";

import type { Photo } from "@/hub/pack/schema";
import { cn } from "@/lib/utils";

/** Les fleches des cartes : petites, et seulement au survol de la souris ou au clavier. */
const FLECHE_COMPACTE =
  "size-7 opacity-0 [@media(hover:hover)]:group-hover/diapo:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:hidden";

/**
 * Les photos d'une couleur en diaporama : on glisse du doigt, on clique sur
 * les fleches, ou on vise un point. Fond blanc, comme les visuels Joma, et
 * image entiere sans recadrage. Une seule photo : ni fleches ni points.
 *
 * `allerA` amene le diaporama sur une photo (la vue de dos quand on active le
 * flocage) ; `calques` posent un contenu par-dessus des photos (le logo sur
 * la face avant, l'apercu du flocage sur le dos). `onPhoto` repond a un
 * toucher sur la photo, jamais a un glisser : Embla retient le clic qui suit
 * un glisser. `compact`, pour les cartes de la liste : fleches plus petites,
 * montrees au survol de la souris seulement (au doigt, on glisse), et points
 * sans arret au clavier.
 */
export default function DiaporamaPhotos({
  photos,
  legende,
  allerA = null,
  calques = [],
  onPhoto,
  compact = false,
}: {
  photos: Photo[];
  legende: string;
  allerA?: number | null;
  calques?: { index: number; contenu: ReactNode }[];
  onPhoto?: () => void;
  compact?: boolean;
}) {
  const plusieurs = photos.length > 1;
  const [viewport, api] = useEmblaCarousel({ loop: plusieurs, active: plusieurs });
  const [courante, setCourante] = useState(0);

  const suivre = useCallback(() => {
    if (api) setCourante(api.selectedScrollSnap());
  }, [api]);

  useEffect(() => {
    if (api && allerA !== null && allerA >= 0) api.scrollTo(allerA);
  }, [api, allerA]);

  useEffect(() => {
    if (!api) return;
    api.on("select", suivre);
    api.on("reInit", suivre);
    return () => {
      api.off("select", suivre);
      api.off("reInit", suivre);
    };
  }, [api, suivre]);

  if (photos.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center bg-white/5">
        <Shirt className="size-10 text-muted-foreground" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div
      className="group/diapo relative bg-white"
      role="region"
      aria-roledescription="diaporama"
      aria-label={`Photos, ${legende}`}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") api?.scrollPrev();
        if (e.key === "ArrowRight") api?.scrollNext();
      }}
    >
      <div ref={viewport} className="overflow-hidden">
        <div className="flex touch-pan-y">
          {photos.map((p, rang) => (
            <div
              key={p.id}
              className={cn("relative aspect-square min-w-0 shrink-0 grow-0 basis-full", onPhoto && "cursor-pointer")}
              onClick={onPhoto}
              role="group"
              aria-roledescription="photo"
              aria-label={`${rang + 1} sur ${photos.length}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.url}
                alt={rang === 0 ? legende : ""}
                loading={rang === 0 ? "eager" : "lazy"}
                draggable={false}
                className="size-full select-none object-contain"
              />
              {calques.map((calque, n) => (calque.index === rang ? <Fragment key={n}>{calque.contenu}</Fragment> : null))}
            </div>
          ))}
        </div>
      </div>

      {plusieurs ? (
        <>
          <button
            type="button"
            aria-label="Photo précédente"
            onClick={() => api?.scrollPrev()}
            className={cn(
              "absolute top-1/2 start-2 flex -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white transition-[background-color,opacity] hover:bg-black/65 focus-visible:outline-2 focus-visible:outline-primary",
              compact ? FLECHE_COMPACTE : "size-8",
            )}
          >
            <ChevronLeft className={compact ? "size-4" : "size-5"} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Photo suivante"
            onClick={() => api?.scrollNext()}
            className={cn(
              "absolute top-1/2 end-2 flex -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white transition-[background-color,opacity] hover:bg-black/65 focus-visible:outline-2 focus-visible:outline-primary",
              compact ? FLECHE_COMPACTE : "size-8",
            )}
          >
            <ChevronRight className={compact ? "size-4" : "size-5"} aria-hidden="true" />
          </button>
          <div className={cn("absolute inset-x-0 flex justify-center", compact ? "bottom-1.5 gap-1" : "bottom-2 gap-1.5")}>
            {photos.map((p, rang) => (
              <button
                key={p.id}
                type="button"
                aria-label={`Photo ${rang + 1} sur ${photos.length}`}
                aria-current={rang === courante ? "true" : undefined}
                tabIndex={compact ? -1 : undefined}
                onClick={() => api?.scrollTo(rang)}
                className={cn(
                  "rounded-full transition-[width,background-color]",
                  compact ? "h-1" : "h-1.5",
                  rang === courante ? (compact ? "w-3.5 bg-black/70" : "w-5 bg-black/70") : cn(compact ? "w-1" : "w-1.5", "bg-black/25 hover:bg-black/45"),
                )}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
