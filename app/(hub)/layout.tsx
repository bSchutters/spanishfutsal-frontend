import "./hub.css";

import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";

import RapporteurErreurs from "@/components/hub/rapporteur-erreurs";
import ToasterHub from "@/components/hub/toaster";
import { cn } from "@/lib/utils";

/**
 * Le gabarit racine du Hub : son propre <html>, sans le menu, le pied de
 * page ni le bandeau du direct du site public. Le Hub est un outil, pas une
 * vitrine : une seule police de travail, servie par next/font, qui remplit la
 * variable --font-geist-sans que le theme du site declare deja.
 *
 * Pas de fournisseur de theme ici : le Hub est sombre, point. La classe est
 * posee en dur sur <html>, sans script d'initialisation.
 */
const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Hub UDA", template: "%s · Hub UDA" },
  applicationName: "Hub UDA",
  // Espace prive : aucun moteur n'a rien a y faire, en plus de robots.txt et
  // de l'en-tete X-Robots-Tag poses dans next.config.ts.
  robots: { index: false, follow: false, nocache: true },
  appleWebApp: { title: "Hub UDA", statusBarStyle: "black-translucent" },
  // Le manifeste propre au Hub : « Sur l'ecran d'accueil » installe le Hub, pas le site.
  manifest: "/hub/manifest.webmanifest",
  icons: { apple: "/hub/icone/180?fond=1" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0d1c2e",
};

export default function HubLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={cn("hub dark h-full", geist.variable)}>
      <body className="min-h-full bg-background font-sans text-sm text-foreground antialiased">
        {process.env.NODE_ENV !== "production" ? <RapporteurErreurs /> : null}
        {children}
        <ToasterHub />
      </body>
    </html>
  );
}
