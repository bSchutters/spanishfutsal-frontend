import Image from "next/image";
import Link from "next/link";
import BoxModule from "../layout/boxModule";
import { Button } from "../ui/button";

export default function JoinUs() {
  const spanClasses = "font-bold text-spanish-accent-2 font-marjorie italic";

  return (
    <section className="lg:container w-11/12 lg:mt-40 lg:mb-20 mb-10 mt-10">
      <BoxModule className="w-full flex p-10 relative">
        <div className="flex flex-col justify-between lg:gap-6 gap-4">
          <p className="font-bold font-marjorie italic lg:text-2xl">
            Soutenir le club
          </p>
          <p className="xl:max-w-4/5 lg:max-w-4/6  lg:text-lg text-sm">
            Rejoignez la <span className={spanClasses}>famille</span> Furia Roja
            Futsal en devenant <span className={spanClasses}>sponsor</span> et
            apportez votre <span className={spanClasses}>soutien</span> à notre
            projet. Grâce à vous, nous pourrons allier{" "}
            <span className={spanClasses}>ambition</span> et esprit d’équipe,
            pour grandir ensemble sur et en dehors du terrain.
          </p>
          <Link href="/contact" className="self-start">
            <Button>nous rejoindre</Button>
          </Link>
        </div>
        <div className="lg:absolute hidden lg:block lg:right-0 -right-8 bottom-0 ">
          <Image
            src="/assets/images/joueurs/olmo.webp"
            alt="Maillot Furia Roja"
            width={0}
            height={0}
            sizes="100vw"
            className="w-96 h-auto rounded-lg object-cover"
          />
        </div>
      </BoxModule>
    </section>
  );
}
