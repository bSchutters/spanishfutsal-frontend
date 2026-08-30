import BoxModule from "../layout/boxModule";
import { usePlayersStore } from "@/store/usePlayersStore";
import Link from "next/link";
import { useEffect } from "react";
import Player from "../player";
import { Button } from "../ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "../ui/carousel";

export default function Players() {
  const { players, isLoading, fetchPlayers } = usePlayersStore();

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  if (isLoading)
    return (
      <section className="mt-20 flex flex-col gap-8 lg:container w-11/12">
        <div className="w-full flex items-center justify-between">
          <p className="text-2xl font-marjorie italic font-bold">Nos joueurs</p>
        </div>
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="2xl:w-1/5 xl:w-1/4 lg:w-1/3 w-2/3 shrink-0 animate-pulse">
              <BoxModule className="flex flex-col items-center justify-center h-96">
                <div className="w-full flex justify-between px-4">
                  <div className="w-8 h-10 bg-spanish-bg-lighter rounded" />
                  <div className="w-12 h-5 bg-spanish-bg-lighter rounded" />
                </div>
                <div className="flex-1 w-32 h-48 bg-spanish-bg-lighter rounded-lg mt-4" />
                <div className="w-3/4 h-6 bg-spanish-bg-lighter rounded mt-4" />
              </BoxModule>
            </div>
          ))}
        </div>
      </section>
    );
  return (
    <section className="mt-20 flex flex-col gap-8 lg:container w-11/12">
      <div className="w-full flex items-center justify-between">
        <p className="text-2xl font-marjorie italic font-bold">Nos joueurs</p>
        <Button asChild>
          <Link href="/equipe">voir tous nos joueurs</Link>
        </Button>
      </div>

      <Carousel
        opts={{
          slidesToScroll: 1,
          loop: false,
          dragFree: true,
        }}
      >
        <CarouselContent>
          {players
            .filter(
              (player) =>
                player.actif === true &&
                (player.poste === "Joueur" || player.poste === "Gardien")
            )
            .sort((a, b) => {
              if (a.poste === "Gardien" && b.poste !== "Gardien") return -1;
              if (b.poste === "Gardien" && a.poste !== "Gardien") return 1;
              return (a.numero || 0) - (b.numero || 0);
            })
            .map((player) => (
              <CarouselItem
                key={player.id}
                className="2xl:basis-1/5 xl:basis-1/4 lg:basis-1/3  basis-2/3"
              >
                <Player
                  firstname={player.prenom}
                  lastname={player.nom}
                  photo={player.photo}
                  number={player.numero}
                  stats={player.stats}
                  active={player.actif}
                  poste={player.poste}
                />
              </CarouselItem>
            ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>

      <div className="flex gap-6 "></div>
    </section>
  );
}
