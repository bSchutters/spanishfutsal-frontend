import Link from "next/link";
import React from "react";
import { Button } from "../ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "../ui/carousel";
import Player from "../player";
import players from "@/mocks/playersOld.json";

export default function Players() {
  return (
    <section className="mt-20 flex flex-col gap-8 lg:container w-11/12">
      <div className="w-full flex items-center justify-between">
        <p className="text-2xl font-marjorie italic font-bold">nos joueurs</p>
        <Link href="/equipe">
          <Button>voir tous nos joueurs</Button>
        </Link>
      </div>

      <Carousel
        opts={{
          slidesToScroll: 2,
          loop: false,
          dragFree: true,
        }}
      >
        <CarouselContent>
          {players
            .filter((player) => player.actif === true)
            .map((player) => (
              <CarouselItem
                key={player.id}
                className="2xl:basis-1/5 xl:basis-1/4 lg:basis-1/3  basis-1/2"
              >
                <Player
                  firstname={player.prenom}
                  lastname={player.nom}
                  photo={player.photo}
                  number={player.numero}
                  stats={player.stats}
                  active={player.actif}
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
