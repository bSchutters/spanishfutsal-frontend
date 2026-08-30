import Image from "next/image";
import Link from "next/link";
import BoxModule from "../layout/boxModule";
import { Button } from "../ui/button";

export default function JoinUs() {
  const spanClasses = "font-bold text-spanish-accent font-marjorie italic";

  return (
    <section className="lg:container w-11/12 lg:mt-40 lg:mb-20 mb-10 mt-10">
      <BoxModule className="w-full flex p-10 relative">
        <div className="flex flex-col justify-between lg:gap-6 gap-4">
          <p className="font-bold font-marjorie italic lg:text-2xl">
            Soutenir le club
          </p>
          <p className="2xl:max-w-4/5 xl:max-w-3/5 lg:max-w-4/6  lg:text-lg text-sm">
            Rejoignez la <span className={spanClasses}>famille</span> UD
            Asturiana Futsal en devenant{" "}
            <span className={spanClasses}>sponsor</span> et apportez votre{" "}
            <span className={spanClasses}>soutien</span> à notre projet. Grâce à
            vous, nous pourrons allier{" "}
            <span className={spanClasses}>ambition</span> et esprit d’équipe,
            pour grandir ensemble sur et en dehors du terrain.
          </p>
          <Button asChild className="self-start">
            <Link href="/contact">nous soutenir</Link>
          </Button>
        </div>
        <div className="lg:absolute hidden lg:block lg:right-0 -right-8 bottom-0 ">
          <Image
            src="/assets/images/joueurs/alex.webp"
            alt="Maillot UD Asturiana"
            width={0}
            height={0}
            // `w-96` fige l emplacement a 384 px, il ne depend pas de la fenetre.
            // La source ne fait de toute facon que 635 px de large.
            sizes="384px"
            className="w-96 h-96 rounded-lg object-contain"
          />
        </div>
      </BoxModule>
    </section>
  );
}
