import Image from "next/image";

export default function Banner() {
  return (
    <section className="lg:h-[650px] h-96 w-full font-marjorie italic flex items-center justify-center relative ">
      <div className="absolute w-full h-full bg-spanish-bg/75 z-10" />
      <div className="absolute w-full h-full mask-b-from-100%">
        <Image
          src="/assets/images/webp/imageHome.webp"
          alt="Spain Picture"
          fill
          // Image la plus grande du premier ecran : elle porte le LCP, donc elle
          // est prechargee au lieu d'etre differee.
          priority
          // Lighthouse signalait l'absence de fetchpriority sur le preload de
          // cette image, qui porte le LCP. On le pose explicitement.
          fetchPriority="high"
          className="object-cover object-top"
        />
      </div>
      <div className="flex flex-col items-center justify-center text-center lg:text-4xl text-2xl lg:gap-4 z-20">
        {/* `h1` et non `p` : la page d'accueil n'avait aucun titre de niveau un,
            ce qui prive lecteurs d'ecran et moteurs de son sujet principal. */}
        <h1>
          <span className="font-bold text-spanish-accent-2">Amitié </span> et
          <span className="font-bold text-spanish-accent-2"> passion</span>
        </h1>
        <p>générations après générations</p>
      </div>
    </section>
  );
}
