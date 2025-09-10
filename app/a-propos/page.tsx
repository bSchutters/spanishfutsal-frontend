import { Separator } from "@/components/ui/separator";
import Image from "next/image";

export default function Apropos() {
  const valeurs = [
    "dévouement",
    "convivialité",
    "amitié",
    "motivation",
    "respect",
    "compétition",
  ];

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
              En 2024, deux clubs partageant la même passion, la même histoire
              et les mêmes ambitions ont décidé d’unir leurs forces : Spanish
              Futsal et Sporting Roja deviennent aujourd’hui une seule et même
              famille,{" "}
              <span className="font-bold text-spanish-accent-2">
                Union Deportiva Asturiana{" "}
              </span>{" "}
              (UD Asturiana).
            </p>
            <Image
              src="/assets/images/webp/oldPic.webp"
              alt="Papas de bryan et Enrique"
              width={0}
              height={0}
              className="w-full h-auto rounded-2xl my-6"
              sizes="100vw"
            />

            <p className="lg:text-lg text-base">
              De part et d’autre, l’histoire était similaire : trois cousins
              réunis autour d’un rêve commun, celui de recréer l’esprit
              d’équipe, la convivialité et l’intensité que leurs parents
              vivaient dans les salles de sport. Cette passion transmise de
              génération en génération a donné naissance à deux clubs
              indépendants, mais animés par les mêmes valeurs humaines et
              sportives.
            </p>
          </div>
          <Separator className="mx-auto bg-spanish-bg rounded-2xl" />

          <div className="flex flex-col gap-2">
            <p className="font-bold lg:text-2xl text-lg">
              Une identité aussi forte que nos ambitions
            </p>
            <p className="lg:text-lg text-base">
              La fusion entre Spanish Futsal et Sporting Roja est née d’une
              volonté simple : aller plus loin, plus fort, et plus vite. En
              combinant nos effectifs, nos idées et notre énergie, nous posons
              les bases d’un projet ambitieux, structuré, et ancré dans une
              identité forte : celle des Asturies.
              <br />
              <br />
              Grâce à cette fusion, nos ambitions sont plus grandes que jamais.
              Après une première saison prometteuse conclue par une montée en P4
              pour nos deux clubs, nous visons désormais ensembles la P1 à
              court/moyen terme, avec pour objectif à long terme une accession
              aux divisions nationales. Au-delà des résultats, nous mettons tout
              en œuvre pour structurer le club de manière cohérente et durable,
              tant sur le plan sportif, que logistique et humain.
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
          <div className="flex flex-col gap-2 ">
            <p className="lg:text-lg text-base">
              Aujourd’hui, UD Asturiana incarne cette nouvelle ère. Plus qu’un
              club, c’est une famille élargie, un collectif déterminé à faire
              rayonner notre vision du futsal à travers le respect, la
              fraternité, l’engagement et la performance.
              <br />
              <br />
              Ici, chacun trouve sa place dans un cadre bienveillant, structuré
              et exigeant, où le plaisir de jouer va de pair avec la volonté de
              progresser ensemble.
            </p>

            <div className="flex gap-4 mt-2 uppercase italic font-bold">
              {valeurs.map((valeur, index) => (
                <p
                  key={index}
                  className="bg-spanish-accent-2-light/20 text-spanish-accent-2 px-3 py-1.5 rounded-lg"
                >
                  {valeur}
                </p>
              ))}
            </div>
            <Image
              src="/assets/images/webp/playing/11.webp"
              alt="Papas de bryan et Enrique"
              width={0}
              height={0}
              className="w-full h-auto rounded-2xl mt-6"
              sizes="100vw"
            />
          </div>

          {/* <Separator className="mx-auto bg-spanish-bg rounded-2xl" />
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
          </div> */}
        </div>
      </div>
    </div>
  );
}
