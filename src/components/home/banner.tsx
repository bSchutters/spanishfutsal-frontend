import Image from "next/image";
import React from "react";

export default function Banner() {
  return (
    <section className="lg:h-[650px] h-96 w-full font-marjorie italic flex items-center justify-center relative ">
      <div className="absolute w-full h-full bg-spanish-bg/90 z-10" />
      <div className="absolute w-full h-full mask-b-from-100%">
        <Image
          src="/assets/images/webp/spainPic.webp"
          alt="Spain Picture"
          fill
          className="object-cover blur-xs"
        />
      </div>
      <div className="flex flex-col items-center justify-center text-center lg:text-4xl text-2xl lg:gap-4 z-20">
        <p>
          <span className="font-bold text-spanish-accent">Amitié </span> et
          <span className="font-bold text-spanish-accent"> passion</span>
        </p>
        <p>générations après générations</p>
      </div>
    </section>
  );
}
