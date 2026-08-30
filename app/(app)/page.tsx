import About from "@/components/home/about";
import Banner from "@/components/home/banner";
import JoinUs from "@/components/home/joinUs";
import NextMatch from "@/components/home/next-match";
import Players from "@/components/home/players";
import ResultAndStanding from "@/components/home/resultAndStanding";
import { getMatchs } from "@/lib/getMatchs";
import { getPlayersForDisplay } from "@/lib/getPlayers";
import { getRankings } from "@/lib/getRankings";

/**
 * Composant serveur : les trois blocs alimentes par des donnees les recevaient
 * chacun de son cote, apres l'hydratation. Ils sont desormais servis d'un seul
 * chargement, en parallele, et arrivent avec le HTML.
 */
export default async function Home() {
  const [matchs, rankings, players] = await Promise.all([
    getMatchs(),
    getRankings(),
    getPlayersForDisplay(),
  ]);

  return (
    <div className="flex flex-col items-center">
      <Banner />

      <NextMatch matchs={matchs} />

      <ResultAndStanding matchs={matchs} rankings={rankings} />

      <About />

      <Players players={players} />

      <JoinUs />
    </div>
  );
}
