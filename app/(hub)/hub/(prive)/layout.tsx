import BlocUtilisateur, { initiales } from "@/components/hub/bloc-utilisateur";
import Navigation, { type EntreeNavigation, type SectionNavigation } from "@/components/hub/navigation";
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
  const modules = MODULES.filter((module) => ouverts.has(module.key));

  const profil: EntreeNavigation = { nom: "Profil", route: "/hub/profil", icone: "user" };

  const sections: SectionNavigation[] = [
    { entrees: [{ nom: "Accueil", route: "/hub", icone: "house" }] },
    ...modules.map((module) => ({ titre: module.nom, entrees: [...module.navigation] })),
    { titre: "Compte", entrees: [profil] },
  ];

  // Sur mobile, l'accueil se rejoint par la marque en haut : les onglets vont
  // aux modules et au profil.
  const onglets: EntreeNavigation[] = [...modules.flatMap((module) => [...module.navigation]), profil];

  return (
    <>
      <Navigation
        sections={sections}
        onglets={onglets}
        blocUtilisateur={
          <BlocUtilisateur
            nom={nomAffiche(session.user)}
            email={session.user.email}
            lettres={initiales(session.user)}
          />
        }
      />
      <RafraichirSession exp={session.exp} />
      <div className="min-h-dvh pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0 md:pl-60">
        <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-5 sm:px-6 md:px-8 md:py-8">
          {children}
        </main>
      </div>
    </>
  );
}
