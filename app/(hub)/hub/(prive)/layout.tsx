import BlocUtilisateur from "@/components/hub/bloc-utilisateur";
import Navigation, { type EntreeNavigation, type SectionNavigation } from "@/components/hub/navigation";
import RafraichirSession from "@/components/hub/rafraichir-session";
import { modulesAccessibles } from "@/hub/droits";
import { MODULES } from "@/hub/modules";
import { exigerAccesHub, initiales, nomAffiche } from "@/hub/session";

/**
 * Tout ce qui est sous /hub, sauf la connexion. La session est exigee ici,
 * et chaque page ou action verifie ensuite son propre droit : ce gabarit ne
 * suffit pas a proteger une action serveur appelee directement.
 *
 * La zone de contenu tient dans la hauteur de l'ecran et defile elle-meme :
 * une page peut ainsi occuper toute la hauteur, le calendrier par exemple,
 * sans que la fenetre n'ait a defiler.
 */
export default async function LayoutPrive({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await exigerAccesHub();
  const ouverts = new Set(modulesAccessibles(session.user));
  const modules = MODULES.filter((module) => ouverts.has(module.key));

  const profil: EntreeNavigation = { nom: "Profil", route: "/hub/profil", icone: "user" };

  // Sur grand ecran, le profil se rejoint par le menu du bloc utilisateur,
  // en bas de la barre laterale : il n'a pas de section a lui.
  const sections: SectionNavigation[] = [
    { entrees: [{ nom: "Accueil", route: "/hub", icone: "house" }] },
    ...modules.map((module) => ({ titre: module.nom, entrees: [...module.navigation] })),
  ];

  // Sur mobile, l'accueil se rejoint par la marque en haut : les onglets vont
  // aux modules et au profil.
  const onglets: EntreeNavigation[] = [...modules.flatMap((module) => [...module.navigation]), profil];

  return (
    <div className="flex h-dvh flex-col md:pl-60">
      {/* L'en-tete mobile est un enfant de cette colonne : sa hauteur compte
          dans les 100 dvh, et la page elle-meme n'a jamais rien a faire defiler. */}
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
      <main className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 pb-[calc(3.5rem+env(safe-area-inset-bottom)+1rem)] pt-5 sm:px-6 md:px-8 md:py-6">
        {children}
      </main>
    </div>
  );
}
