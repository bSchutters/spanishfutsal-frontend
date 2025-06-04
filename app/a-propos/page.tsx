import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { soccerBall } from "@lucide/lab";
import { ChevronsUp, Icon, Trophy } from "lucide-react";
import Image from "next/image";

export default function Apropos() {
  return (
    <div className="flex flex-col items-center ">
      <div className="lg:h-[650px] h-96 w-full relative ">
        <div className="absolute w-full h-full bg-spanish-bg/80 z-10" />
        <div className="w-full h-full mask-b-from-100%">
          <Image
            src="/assets/images/webp/comiteSpanish.webp"
            alt="Spain Picture"
            fill
            className="object-cover "
          />
        </div>
      </div>
      <div className="bg-spanish-bg-light z-10 lg:py-20 py-14 lg:px-0 px-10 rounded-2xl lg:container md:max-w-2xl sm:max-w-xl max-w-md mx-auto lg:-mt-20 -mt-30 mb-20">
        <div className="flex flex-col item-center max-w-4xl mx-auto gap-10">
          <p className="font-bold italic text-4xl text-center font-marjorie">
            A propos
          </p>
          <Separator className="mx-auto bg-spanish-bg rounded-2xl" />
          <div className="flex flex-col gap-2">
            <p className="font-bold lg:text-2xl text-lg">
              Une histoire de famille, une passion commune
            </p>
            <p className="lg:text-lg text-base">
              Spanish Futsal est un club fondé en 2024 par trois cousins, Bryan,
              Enrique et Valadi, dans le but de retrouver l’ambiance, la
              cohésion et la passion que leurs parents vivaient autrefois
              ensemble sur les terrains. Le nom du club est d’ailleurs un
              hommage direct à cette époque, puisqu’il reprend celui de l’une
              des équipes dans laquelle leurs aînés ont évolué.
            </p>
            <Image
              src="/assets/images/webp/oldPic.webp"
              alt="Papas de bryan et Enrique"
              width={0}
              height={0}
              className="w-full h-auto rounded-2xl mt-6"
              sizes="100vw"
            />
          </div>
          <Separator className="mx-auto bg-spanish-bg rounded-2xl" />
          <div className="flex flex-col gap-2 ">
            <p className="font-bold lg:text-2xl text-lg">Nos valeurs </p>
            <p className="lg:text-lg text-base">
              Chez Spanish Futsal, l’état d’esprit compte autant que la
              performance. Notre équipe repose sur des valeurs fortes qui
              façonnent notre identité:
            </p>
            <div className="grid lg:grid-cols-6 md:grid-cols-3 grid-cols-2 gap-4 mt-2 font-marjorie italic font-bold">
              <p className="py-2 w-full flex items-center justify-center bg-spanish-accent rounded-lg text-spanish-bg">
                dévouement
              </p>
              <p className="py-2 w-full flex items-center justify-center bg-spanish-accent rounded-lg text-spanish-bg">
                convivialité
              </p>
              <p className="py-2 w-full flex items-center justify-center bg-spanish-accent rounded-lg text-spanish-bg">
                amitié
              </p>
              <p className="py-2 w-full flex items-center justify-center bg-spanish-accent rounded-lg text-spanish-bg">
                motivation
              </p>
              <p className="py-2 w-full flex items-center justify-center bg-spanish-accent rounded-lg text-spanish-bg">
                respect
              </p>
              <p className="py-2 w-full flex items-center justify-center bg-spanish-accent rounded-lg text-spanish-bg">
                compétition
              </p>
            </div>
            <p className="mt-4 text-base lg:text-lg">
              Ici, chacun trouve sa place dans un cadre bienveillant, structuré
              et exigeant, où le plaisir de jouer va de pair avec la volonté de
              progresser ensemble.
            </p>
            <Image
              src="/assets/images/webp/playing/11.webp"
              alt="Papas de bryan et Enrique"
              width={0}
              height={0}
              className="w-full h-auto rounded-2xl mt-6"
              sizes="100vw"
            />
          </div>
          <Separator className="mx-auto bg-spanish-bg rounded-2xl" />
          <div className="flex flex-col gap-2">
            <p className="font-bold lg:text-2xl text-lg">
              Une ambition claire: monter mais ensembles
            </p>
            <p className="lg:text-lg text-base">
              Pour notre toute première saison officielle, nous avons commencé
              en P5. Malgré un départ difficile, nous avons su rebondir pour
              terminer à la 4e place, synonyme de montée en P4. Ce n’est que le
              début. Nous visons la P1 à court/moyen terme, avec comme ligne de
              mire une montée en division nationale, tout en structurant
              progressivement le club sur les plans sportif, logistique et
              humain. Notre ambition est grande, mais elle reste fidèle à ce que
              nous sommes : un club accessible, authentique et profondément
              humain.
            </p>
            <Image
              src="/assets/images/webp/team.webp"
              alt="Papas de bryan et Enrique"
              width={0}
              height={0}
              className="w-full h-auto rounded-2xl mt-6"
              sizes="100vw"
            />
          </div>
          <Separator className="mx-auto bg-spanish-bg rounded-2xl" />
          <div className="flex flex-col gap-4">
            <p className="font-bold lg:text-2xl text-lg">Palmarès</p>

            <div className="grid md:grid-cols-3 grid-cols-1 gap-4">
              <div className="p-4 w-full bg-spanish-accent text-spanish-bg rounded-lg flex flex-col items-center justify-center">
                <p className="text-4xl font-marjorie italic font-bold">24</p>
                <div className="lg:text-2xl font-bold uppercase flex lg:gap-2 gap-1 items-center justify-center">
                  <Icon
                    iconNode={soccerBall}
                    className="lg:w-6 lg:h-6 w-5 h-5"
                  />
                  <p>matchs</p>
                </div>
              </div>
              <div className="p-4 w-full bg-spanish-accent text-spanish-bg rounded-lg flex flex-col items-center justify-center">
                <p className="text-4xl font-marjorie italic font-bold">01</p>
                <div className="lg:text-2xl font-bold uppercase flex gap-2 items-center justify-center">
                  <ChevronsUp className="lg:w-6 lg:h-6 w-5 h-5" />
                  <p>montée</p>
                </div>
              </div>
              <div className="p-4 w-full bg-spanish-accent text-spanish-bg rounded-lg flex flex-col items-center justify-center">
                <p className="text-4xl font-marjorie italic font-bold">01</p>
                <div className="lg:text-2xl font-bold uppercase flex gap-2 items-center justify-center">
                  <Trophy className="lg:w-6 lg:h-6 w-5 h-5" />
                  <p>trophés</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
