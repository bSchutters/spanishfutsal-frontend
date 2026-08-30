import Link from "next/link";
import type { Player as PlayerType } from "@/lib/getPlayers";
import Player from "../player";
import { Button } from "../ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "../ui/carousel";

export default function Players({ players }: { players: PlayerType[] }) {
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
                (player.poste === "Joueur" || player.poste === "Gardien"),
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
