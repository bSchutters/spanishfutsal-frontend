"use client";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { libelleStaff, surLaFeuille, type Poste } from "@/lib/postes";
import BoxModule from "./layout/boxModule";
import { Badge } from "./ui/badge";

interface PlayerStats {
  matchesPlayed: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  cleanSheets: number;
}

interface PlayerProps {
  firstname: string;
  lastname: string;
  number: number;
  photo: string;
  stats?: PlayerStats;
  active: boolean;
  className?: string;
  poste?: Poste | null;
  /** Les premieres cartes de la page : leur photo part tout de suite. */
  priority?: boolean;
  /** La toute premiere : sa photo porte le LCP, elle passe devant tout. */
  fetchPriority?: "high" | "low" | "auto";
}

export default function Player({
  firstname,
  lastname,
  number,
  photo,
  stats,
  active,
  className,
  poste,
  priority,
  fetchPriority,
}: PlayerProps) {
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const panneauId = useId();
  const boutonStats = useRef<HTMLButtonElement>(null);
  const boutonFermer = useRef<HTMLButtonElement>(null);
  const auClavier = useRef(false);

  // Au clavier, le focus suit le panneau : il entre sur la croix a
  // l'ouverture et revient sur le bouton STATS a la fermeture, sans quoi il se
  // perdait sous un panneau devenu inerte. A la souris, il ne bouge pas : la
  // croix n'a pas a s'entourer d'un contour qu'on n'a pas demande.
  useEffect(() => {
    if (!auClavier.current) return;
    if (isStatsOpen) boutonFermer.current?.focus();
    else boutonStats.current?.focus();
  }, [isStatsOpen]);

  // Un clic dont `detail` vaut 0 vient du clavier (Entree ou Espace).
  function basculer(ouvrir: boolean, clavier: boolean) {
    auClavier.current = clavier;
    setIsStatsOpen(ouvrir);
  }

  function shortenName(name: string): string {
    if (!name) return "";
    return name.charAt(0).toUpperCase() + ".";
  }

  return (
    <BoxModule
      className={cn(
        "relative lg:w-72 flex flex-col items-center justify-center overflow-hidden",
        className,
      )}
    >
      {stats && (
        <div
          id={panneauId}
          role="region"
          aria-label={`Statistiques de ${firstname} ${lastname}`}
          // Ferme, le panneau reste dans la page pour son animation, mais
          // inerte : ni le clavier ni les lecteurs d'ecran n'y entrent, et
          // ses chiffres ne passent plus devant le nom du joueur.
          inert={!isStatsOpen}
          onKeyDown={(e) => {
            if (e.key === "Escape") basculer(false, true);
          }}
          // `translate` et non `transform` : Tailwind v4 pose les deplacements
          // sur la propriete CSS `translate`, qu une transition sur `transform`
          // n atteint pas. C est ce qui avait supprime le glissement du haut.
          className={cn(
            "absolute top-0 left-0 w-full h-full bg-spanish-bg-dark rounded-lg z-20 p-4 transition-[opacity,translate] duration-700 flex flex-col  justify-between",
            isStatsOpen
              ? "opacity-100 pointer-events-auto -translate-y-0"
              : "opacity-0 pointer-events-none -translate-y-10",
          )}
        >
          <div className="flex items-center justify-between w-full">
            <p className="">STATS</p>
            <button
              ref={boutonFermer}
              type="button"
              aria-label="Fermer les statistiques"
              onClick={(e) => basculer(false, e.detail === 0)}
              className="rounded-sm hover:cursor-pointer hover:text-spanish-accent-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <X aria-hidden="true" />
            </button>
          </div>

          {poste === "Gardien" ? (
            // Gardiens : Matchs/Clean Sheets, Cartons, Goals/Assists
            <div className="grid grid-cols-2 gap-4 items-center justify-center text-center">
              <div className="flex flex-col items-center justify-center">
                <p className="text-2xl font-marjorie font-bold italic">
                  {stats?.matchesPlayed}
                </p>
                <p className="text-xs uppercase">matchs joués</p>
              </div>
              <div className="flex flex-col items-center justify-center">
                <p className="text-2xl font-marjorie font-bold italic">
                  {stats?.cleanSheets}
                </p>
                <p className="text-xs uppercase">clean sheets</p>
              </div>
              <div className="flex flex-col items-center justify-center">
                <p className="text-2xl font-marjorie font-bold italic">
                  {stats?.yellowCards}
                </p>
                <p className="text-xs uppercase">carton jaune</p>
              </div>
              <div className="flex flex-col items-center justify-center">
                <p className="text-2xl font-marjorie font-bold italic">
                  {stats?.redCards}
                </p>
                <p className="text-xs uppercase">carton rouge</p>
              </div>
              <div className="flex flex-col items-center justify-center">
                <p className="text-2xl font-marjorie font-bold italic">
                  {stats?.goals}
                </p>
                <p className="text-xs uppercase">goals</p>
              </div>
              <div className="flex flex-col items-center justify-center">
                <p className="text-2xl font-marjorie font-bold italic">
                  {stats?.assists}
                </p>
                <p className="text-xs uppercase">assists</p>
              </div>
            </div>
          ) : (
            // Joueurs : Matchs (centré), Goals/Assists, Cartons
            <div className="grid grid-cols-2 gap-4 items-center justify-center text-center">
              <div className="col-span-2 flex flex-col items-center justify-center">
                <p className="text-2xl font-marjorie font-bold italic">
                  {stats?.matchesPlayed}
                </p>
                <p className="text-xs uppercase">matchs joués</p>
              </div>
              <div className="flex flex-col items-center justify-center">
                <p className="text-2xl font-marjorie font-bold italic">
                  {stats?.goals}
                </p>
                <p className="text-xs uppercase">goals</p>
              </div>
              <div className="flex flex-col items-center justify-center">
                <p className="text-2xl font-marjorie font-bold italic">
                  {stats?.assists}
                </p>
                <p className="text-xs uppercase">assists</p>
              </div>
              <div className="flex flex-col items-center justify-center">
                <p className="text-2xl font-marjorie font-bold italic">
                  {stats?.yellowCards}
                </p>
                <p className="text-xs uppercase">carton jaune</p>
              </div>
              <div className="flex flex-col items-center justify-center">
                <p className="text-2xl font-marjorie font-bold italic">
                  {stats?.redCards}
                </p>
                <p className="text-xs uppercase">carton rouge</p>
              </div>
            </div>
          )}
          <div className="w-full flex items-center justify-center gap-2 uppercase">
            {active && (
              <p className="font-bold italic font-marjorie text-xl">{number}</p>
            )}
            <p>
              {active && "/"} {lastname}{" "}
              <span className="font-bold"> {firstname} </span>
            </p>
          </div>
        </div>
      )}

      <div
        className={cn(
          "flex items-center  w-full",
          active ? "justify-between" : "justify-end",
        )}
      >
        {active && surLaFeuille(poste) && (
          <p className="font-bold font-marjorie italic text-3xl">{number}</p>
        )}

        {active && !surLaFeuille(poste) && (
          <p className="font-bold font-marjorie italic text-xl">{libelleStaff(poste)}</p>
        )}

        {stats &&
          stats.matchesPlayed > 0 &&
          surLaFeuille(poste) && (
            <Badge
              asChild
              className="hover:bg-spanish-accent-2-light/20 bg-spanish-accent-2-light/10  text-spanish-accent-2 hover:cursor-pointer transition-colors"
            >
              <button
                ref={boutonStats}
                type="button"
                aria-expanded={isStatsOpen}
                aria-controls={panneauId}
                aria-label={`Statistiques de ${firstname} ${lastname}`}
                onClick={(e) => basculer(true, e.detail === 0)}
              >
                STATS
              </button>
            </Badge>
          )}
      </div>
      <BoxModule className="absolute bottom-3 w-11/12 md:p-2 p-1 -mb-1 md:mb-0 flex items-center justify-center rounded-lg z-10">
        <p className="uppercase">
          {/* Les deux formes sont dans le HTML, le CSS choisit : decider
              d'apres la fenetre apres l'hydratation faisait bouger la carte. */}
          <span className="sm:hidden">{shortenName(lastname)}</span>
          <span className="max-sm:hidden">{lastname}</span>{" "}
          <span className="font-bold">{firstname}</span>
        </p>
      </BoxModule>
      <div className="-mb-4">
        <Image
          src={photo}
          alt={`${firstname} ${lastname}`}
          // Le ratio des photos (635 x 1080) : le navigateur reserve la place
          // avant qu'elles n'arrivent. En 0 x 0, les premieres cartes portaient
          // le LCP de la page tout en etant chargees en differe.
          width={635}
          height={1080}
          // L'emplacement ne depend pas de la fenetre : `h-80 w-auto` le fige a
          // 320 px de haut, soit 188 px de large pour un ratio 635x1080. Les
          // pourcentages de fenetre precedents faisaient telecharger la variante
          // 640 px la ou 376 px suffisent sur un ecran haute densite.
          sizes="188px"
          priority={priority}
          fetchPriority={fetchPriority}
          className={cn("h-80 w-auto object-cover", active ? "" : "grayscale")}
        />
      </div>
    </BoxModule>
  );
}
