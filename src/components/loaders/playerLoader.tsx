import React from "react";
import BoxModule from "../layout/boxModule";
import { Skeleton } from "../ui/skeleton";
import Image from "next/image";

const PlayerLoader = () => {
  return (
    <BoxModule className="relative lg:w-72 flex flex-col items-center justify-center overflow-hidden">
      <div className="flex items-center  w-full justify-between">
        <Skeleton className="w-8 h-10 rounded-lg bg-spanish-bg" />
        <Skeleton className="w-12 h-5 rounded-sm bg-spanish-bg" />
      </div>
      <BoxModule className="absolute bottom-3 w-11/12 p-2 flex items-center justify-center rounded-lg z-10">
        <div className="flex items-center gap-2">
          <Skeleton className="w-24 h-6 rounded-sm bg-spanish-bg" />
          <Skeleton className="w-20 h-6 rounded-sm bg-spanish-bg" />
        </div>
      </BoxModule>
      <div className="-mb-4">
        <Image
          src="/assets/images/webp/placeholder.webp"
          alt="Placeholder Image"
          height={0}
          width={0}
          // Largeur reelle de l'emplacement (squelette de photo), et non celle de la fenetre.
          sizes="(min-width: 1536px) 20vw, (min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw"
          className="h-80 w-auto object-cover animate-pulse"
        />
      </div>
    </BoxModule>
  );
};

export default PlayerLoader;
