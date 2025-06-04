"use client";

import Banner from "@/components/home/banner";
import ResultAndStanding from "@/components/home/resultAndStanding";
import About from "@/components/home/about";
import Players from "@/components/home/players";
import JoinUs from "@/components/home/joinUs";
import NextMatch from "@/components/home/next-match";

export default function Home() {
  return (
    <div className="flex flex-col items-center">
      {/* Banner section */}
      <Banner />

      {/* Next match section */}
      <NextMatch />

      {/* Result and standing section */}
      <ResultAndStanding />

      {/* About section */}
      <About />

      {/* Players section */}
      <Players />

      {/* Join us Section */}
      <JoinUs />
    </div>
  );
}
