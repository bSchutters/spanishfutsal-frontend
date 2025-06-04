"use client";

import Player from "@/components/player";
import { Separator } from "@/components/ui/separator";
import { usePlayersStore } from "@/store/usePlayersStore";
import { useEffect } from "react";

export default function Equipe() {
  const { players, isLoading, fetchPlayers } = usePlayersStore();

  useEffect(() => {
    fetchPlayers();
  }, []);

  if (isLoading)
    return (
      <div className="flex justify-center items-center h-screen">
        Loading...
      </div>
    );
  return (
    <div className="my-30 container mx-auto flex flex-col gap-8 md:px-0 px-6">
      <p className="text-4xl font-marjorie italic font-bold">nos joueurs</p>
      <div className="grid 2xl:grid-cols-5 xl:grid-cols-4 md:grid-cols-3 grid-cols-2 gap-4 ">
        {players
          .filter((player) => player.actif === true)
          .map((player) => (
            <Player
              key={player.id}
              firstname={player.prenom}
              lastname={player.nom}
              photo={player.photo}
              number={player.numero}
              stats={player.stats[0]}
              active={player.actif}
            />
          ))}
      </div>

      {players.some((player) => player.actif === false) && (
        <>
          <Separator className="bg-spanish-bg-dark w-full" />
          <p className="text-4xl font-marjorie italic font-bold">
            nos anciens joueurs
          </p>
          <div className="grid 2xl:grid-cols-5 xl:grid-cols-4 md:grid-cols-3 grid-cols-2 gap-4 ">
            {players
              .filter((player) => player.actif === false)
              .map((player) => (
                <Player
                  key={player.id}
                  firstname={player.prenom}
                  lastname={player.nom}
                  photo={player.photo}
                  number={player.numero}
                  stats={player.stats[0]}
                  active={player.actif}
                />
              ))}
          </div>
        </>
      )}
    </div>
  );
}
