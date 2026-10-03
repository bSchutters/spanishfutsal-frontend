"use client";

import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, Shirt } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import type { Photo } from "@/hub/pack/schema";
import { cn } from "@/lib/utils";

/**
 * Les photos d'une couleur en diaporama : on glisse du doigt, on clique sur
 * les fleches, ou on vise un point. Fond blanc, comme les visuels Joma, et
 * image entiere sans recadrage. Une seule photo : ni fleches ni points.
 */
export default function DiaporamaPhotos({ photos, legende }: { photos: Photo[]; legende: string }) {
  const plusieurs = photos.length > 1;
  const [viewport, api] = useEmblaCarousel({ loop: plusieurs, active: plusieurs });
  const [courante, setCourante] = useState(0);

  const suivre = useCallback(() => {
    if (api) setCourante(api.selectedScrollSnap());
  }, [api]);

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
      className="relative bg-white"
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
              className="aspect-square min-w-0 shrink-0 grow-0 basis-full"
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
            className="absolute top-1/2 left-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white transition-colors hover:bg-black/65 focus-visible:outline-2 focus-visible:outline-primary"
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Photo suivante"
            onClick={() => api?.scrollNext()}
            className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white transition-colors hover:bg-black/65 focus-visible:outline-2 focus-visible:outline-primary"
          >
            <ChevronRight className="size-5" aria-hidden="true" />
          </button>
          <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
            {photos.map((p, rang) => (
              <button
                key={p.id}
                type="button"
                aria-label={`Photo ${rang + 1} sur ${photos.length}`}
                aria-current={rang === courante ? "true" : undefined}
                onClick={() => api?.scrollTo(rang)}
                className={cn(
                  "h-1.5 rounded-full transition-[width,background-color]",
                  rang === courante ? "w-5 bg-black/70" : "w-1.5 bg-black/25 hover:bg-black/45",
                )}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
