"use client";

import PlayerLoader from "@/components/loaders/playerLoader";
import Player from "@/components/player";
import { Separator } from "@/components/ui/separator";
import { usePlayersStore } from "@/store/usePlayersStore";
import { useEffect } from "react";
import MetadataHead from "@/components/metadata-head";
import JsonLd from "@/components/json-ld";
import { equipeMetadata } from "./metadata";

export default function Equipe() {
  const { players, isLoading, fetchPlayers } = usePlayersStore();

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  if (isLoading)
    return (
      <div className="my-30 container mx-auto flex flex-col gap-8 md:px-0 px-6 animate-pulse">
        <h1 className="text-4xl font-marjorie italic font-bold">Nos joueurs</h1>
        <div className="grid 2xl:grid-cols-5 xl:grid-cols-4 md:grid-cols-3 grid-cols-2 gap-4 ">
          {Array.from({ length: 10 }).map((_, index) => (
            <PlayerLoader key={index} />
          ))}
        </div>
      </div>
    );
  const teamSchema = {
    "@context": "https://schema.org",
    "@type": "SportsTeam",
    "name": "Union Deportiva Asturiana",
    "sport": "Futsal",
    "memberOf": {
      "@type": "SportsOrganization",
      "name": "LFFS",
    },
    "athlete": players.filter(p => p.actif && (p.poste === "Joueur" || p.poste === "Gardien")).map(player => ({
      "@type": "Person",
      "name": `${player.prenom} ${player.nom}`,
      "jobTitle": player.poste,
    })),
  };

  return (
    <>
      <MetadataHead metadata={equipeMetadata} />
      <JsonLd data={teamSchema} />
      <div className="my-30 container mx-auto flex flex-col gap-8 md:px-0 px-6">
      <h1 className="text-4xl font-marjorie italic font-bold">Nos joueurs</h1>
      <div className="grid 2xl:grid-cols-5 xl:grid-cols-4 md:grid-cols-3 sm:grid-cols-2 grid-cols-1 gap-4 ">
        {players
          .filter(
            (player) =>
              (player.actif === true && player.poste === "Joueur") ||
              player.poste === "Gardien"
          )
          .sort((a, b) => (a.numero || 0) - (b.numero || 0))
          .map((player) => (
            <Player
              key={player.id}
              firstname={player.prenom}
              lastname={player.nom}
              photo={player.photo}
              number={player.numero}
              stats={player.stats[0]}
              active={player.actif}
              poste={player.poste}
            />
          ))}
      </div>

      {players.some((player) => player.actif === false) && (
        <>
          <Separator className="bg-spanish-bg-dark w-full" />
          <h2 className="text-4xl font-marjorie italic font-bold">
            Nos anciens joueurs
          </h2>
          <div className="grid 2xl:grid-cols-5 xl:grid-cols-4 md:grid-cols-3 grid-cols-2 gap-4 ">
            {players
              .filter((player) => player.actif === false)
              .sort((a, b) => (a.numero || 0) - (b.numero || 0))
              .map((player) => (
                <Player
                  key={player.id}
                  firstname={player.prenom}
                  lastname={player.nom}
                  photo={player.photo}
                  number={player.numero}
                  stats={player.stats[0]}
                  poste={player.poste}
                  active={player.actif}
                />
              ))}
          </div>
        </>
      )}
      {players.some(
        (player) => player.poste !== "Joueur" && player.poste !== "Gardien"
      ) && (
        <>
          <Separator className="bg-spanish-bg-dark w-full" />
          <h2 className="text-4xl font-marjorie italic font-bold">Notre staff</h2>
          <div className="grid 2xl:grid-cols-5 xl:grid-cols-4 md:grid-cols-3 sm:grid-cols-2 grid-cols-1 gap-4 ">
            {players
              .filter(
                (player) =>
                  player.poste !== "Gardien" && player.poste !== "Joueur"
              )
              .map((player) => (
                <Player
                  key={player.id}
                  firstname={player.prenom}
                  lastname={player.nom}
                  photo={player.photo}
                  number={player.numero}
                  stats={player.stats[0]}
                  active={player.actif}
                  poste={player.poste}
                />
              ))}
          </div>
        </>
      )}
      </div>
    </>
  );
}
