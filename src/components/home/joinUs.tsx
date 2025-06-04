import React from "react";
import BoxModule from "../layout/boxModule";
import Link from "next/link";
import { Button } from "../ui/button";
import Image from "next/image";

export default function JoinUs() {
  const spanClasses = "font-bold text-spanish-accent font-marjorie italic";

  return (
    <section className="lg:container w-11/12 lg:mt-40 lg:mb-20 mb-10 mt-10">
      <BoxModule className="w-full flex p-10 relative">
        <div className="flex flex-col justify-between lg:gap-6 gap-4">
          <p className="font-bold font-marjorie italic lg:text-2xl">
            Rejoindre le club
          </p>
          <p className="lg:max-w-4/5  lg:text-lg text-sm">
            Rejoins la <span className={spanClasses}>famille</span> Spanish
            Futsal pour partager ta <span className={spanClasses}>passion</span>{" "}
            du futsal dans une équipe{" "}
            <span className={spanClasses}>soudée</span>, où l'amitié et le
            plaisir se mêlent à l'ambition de progresser ensemble.
          </p>
          <Link href="/contact" className="self-start">
            <Button>nous rejoindre</Button>
          </Link>
        </div>
        <div className="lg:absolute hidden lg:block lg:right-0 -right-8 bottom-0 ">
          <Image
            src="/assets/images/joueurs/olmo.webp"
            alt="Maillot Spanish Futsal"
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
