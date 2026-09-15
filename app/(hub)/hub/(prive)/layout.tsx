import Navigation, { type EntreeNavigation } from "@/components/hub/navigation";
import RafraichirSession from "@/components/hub/rafraichir-session";
import { modulesAccessibles } from "@/hub/droits";
import { MODULES } from "@/hub/modules";
import { exigerAccesHub, nomAffiche } from "@/hub/session";

/**
 * Tout ce qui est sous /hub, sauf la connexion. La session est exigee ici,
 * et chaque page ou action verifie ensuite son propre droit : ce gabarit ne
 * suffit pas a proteger une action serveur appelee directement.
 */
export default async function LayoutPrive({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await exigerAccesHub();
  const ouverts = new Set(modulesAccessibles(session.user));

  const entrees: EntreeNavigation[] = [
    { nom: "Accueil", route: "/hub", icone: "house" },
    ...MODULES.filter((module) => ouverts.has(module.key)).flatMap((module) => [...module.navigation]),
    { nom: "Profil", route: "/hub/profil", icone: "user" },
  ];

  return (
    <>
      <Navigation entrees={entrees} nom={nomAffiche(session.user)} />
      <RafraichirSession exp={session.exp} />
      <div className="min-h-dvh pb-20 md:pb-0 md:pl-60">
        <main className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8 md:py-10">{children}</main>
      </div>
    </>
  );
}
