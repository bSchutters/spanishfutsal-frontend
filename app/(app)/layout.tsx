import BandeauMesure from "@/components/layout/bandeau-mesure";
import Footer from "@/components/layout/footer";
import LiveDialog from "@/components/live/live-dialog";
import LiveSpacer from "@/components/live/live-spacer";
import Nav from "@/components/layout/nav";
import SchemaMarkup from "@/components/schema-markup";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";

import { OG_IMAGE, SITE_URL } from "@/lib/site";

/**
 * Les polices du site, servies par next/font : memes fichiers qu'avant, mais
 * Next calcule pour chacune une police de repli aux metriques ajustees
 * (size-adjust, ascent, descent). Le texte se dessine d'abord dans ce repli,
 * puis la vraie police le remplace sans que les lignes ne se recomposent :
 * c'etait 0,08 de CLS sur la page A propos, et un peu partout ailleurs.
 *
 * Pas de prechargement : les faces partaient en meme temps que l'image du LCP
 * et a la meme priorite sur mobile, et lui prenaient sa bande passante.
 */
const nugros = localFont({
  src: [
    { path: "../../public/assets/fonts/nugros/Nugros-Regular.woff2", weight: "400" },
    { path: "../../public/assets/fonts/nugros/Nugros-Medium.woff2", weight: "500" },
    { path: "../../public/assets/fonts/nugros/Nugros-SemiBold.woff2", weight: "600" },
    { path: "../../public/assets/fonts/nugros/Nugros-Bold.woff2", weight: "700" },
    { path: "../../public/assets/fonts/nugros/Nugros-ExtraBold.woff2", weight: "800" },
    { path: "../../public/assets/fonts/nugros/Nugros-Black.woff2", weight: "900" },
  ],
  variable: "--font-nugros-nf",
  display: "swap",
  preload: false,
});

// Deux faces variables, declarees sans graisse comme avant : le gras des
// titres reste celui que le navigateur synthetise, l'aspect ne change pas.
const marjorie = localFont({
  src: [
    { path: "../../public/assets/fonts/marjorie2/MarjorieVariable-Regular.woff2", style: "normal" },
    { path: "../../public/assets/fonts/marjorie2/MarjorieVariableItalic-Italic.woff2", style: "italic" },
  ],
  variable: "--font-marjorie-nf",
  display: "swap",
  preload: false,
});
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  // Sans cela, Next resout og:image sur l hote de la requete. Les partages
  // faits depuis une preview pointaient alors sur l URL de la preview.
  metadataBase: new URL(SITE_URL),
  title: "UD Asturiana - Club de Futsal à Bruxelles",
  description:
    "Union Deportiva Asturiana, club de futsal passionné basé à Bruxelles. Rejoignez notre famille sportive pour vivre l'esprit d'équipe et la compétition.",
  keywords:
    "futsal, Bruxelles, club de sport, UD Asturiana, Union Deportiva Asturiana, football en salle, équipe, compétition, Belgique",
  authors: [{ name: "UD Asturiana" }],
  robots: "index, follow",
  openGraph: {
    title: "UD Asturiana - Club de Futsal à Bruxelles",
    description:
      "Union Deportiva Asturiana, club de futsal passionné basé à Bruxelles. Rejoignez notre famille sportive pour vivre l'esprit d'équipe et la compétition.",
    url: SITE_URL,
    images: [OG_IMAGE],
    siteName: "UD Asturiana",
    type: "website",
    locale: "fr_BE",
  },
  twitter: {
    card: "summary_large_image",
    title: "UD Asturiana - Club de Futsal à Bruxelles",
    description:
      "Union Deportiva Asturiana, club de futsal passionné basé à Bruxelles.",
    images: [OG_IMAGE],
  },
  // Nom affiche quand la page est ajoutee a l ecran d accueil sur iOS.
  // Rend <meta name="apple-mobile-web-app-title" content="UDA">.
  appleWebApp: {
    title: "UDA",
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
};

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={cn("h-full", nugros.variable, marjorie.variable)}
      suppressHydrationWarning
    >
      <head>
        {/*
          Pas de prechargement de polices ici. Il avait ete ajoute pour
          raccourcir une chaine critique de 182 ms que Lighthouse signalait sur
          bureau, ou elle ne coutait rien au score. Sur mobile en revanche, les
          trois faces prechargees, 88 Ko, partaient en meme temps que l image du
          LCP et a la meme priorite : elles lui prenaient sa bande passante. Les
          retirer fait tomber le LCP mobile de 2343 a 1246 ms en local, pour
          18 ms de FCP. `font-display: swap` affiche de toute facon le texte
          immediatement dans la police de repli.
        */}
        <SchemaMarkup />
      </head>
      <body
        className={cn(
          "antialiased",
          "h-full bg-spanish-bg text-white font-nugros",
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Nav />
          <LiveSpacer />
          {/*
            `flow-root` : chaque page pose sa marge haute (`my-30`) sur son
            premier bloc pour passer sous la barre fixe. Sans contexte de
            formatage sur `main`, cette marge fusionne a travers `main` et
            `body`, et c'est `body` qui descend de 120 px. Chrome dessine une
            premiere fois avant d'avoir lu `main` (body en haut), puis le
            deplace : 0,146 de CLS sur chaque page, mesure en production, sans
            qu'aucun element visible ne bouge. Avec `flow-root`, la marge reste
            dans `main` et `body` ne bouge plus. Rien ne change a l'ecran.
          */}
          <main className="flow-root">{children}</main>
          <Toaster />
          <Footer />
          <LiveDialog />
          <BandeauMesure />
        </ThemeProvider>
      </body>
    </html>
  );
}
