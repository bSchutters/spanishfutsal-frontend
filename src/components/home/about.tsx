import Image from "next/image";
import Link from "next/link";
import React from "react";
import { Button } from "../ui/button";

export default function About() {
  const spanClasses = "font-bold text-spanish-accent font-marjorie italic";

  return (
    <section className="mt-20 bg-spanish-bg-lighter w-full flex items-center justify-center lg:py-30 py-12 ">
      <div className="lg:container flex flex-col lg:flex-row gap-12 w-11/12">
        <div className="lg:w-1/2 w-full relative">
          <Image
            src="/assets/images/webp/comiteSpanish.webp"
            alt="Comité Spanish Futsal"
            width={0}
            height={0}
            sizes="100vw"
            className="w-full lg:h-96 h-46 rounded-lg grayscale object-cover"
          />
        </div>
        <div className="flex flex-col justify-between lg:w-1/2 w-full gap-6">
          <div className="flex flex-col lg:gap-6 gap-4">
            <p className="lg:text-3xl text-2xl font-marjorie font-bold italic">
              À propos
            </p>
            <p className="lg:text-xl">
              Spanish Futsal est bien plus qu’un simple club de mini foot. Fondé
              à Bruxelles en 2024, il rassemble une équipe de proches, composée
              d’
              <span className={spanClasses}>amis</span> et de{" "}
              <span className={spanClasses}>cousins</span> dont les liens
              dépassent le terrain. Pour beaucoup d'entre nous, nos parents ont
              eux-mêmes partagé les terrains de futsal, perpétuant ainsi une
              tradition familiale. Ici, le football est une affaire de
              <span className={spanClasses}> passion</span>, d’
              <span className={spanClasses}>héritage</span> et de
              <span className={spanClasses}> camaraderie</span>, où chaque match
              renforce nos liens.
            </p>
          </div>
          <Link href="/a-propos" className="self-end text-lg">
            <Button>en savoir plus</Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
