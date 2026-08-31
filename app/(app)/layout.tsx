import Footer from "@/components/layout/footer";
import Nav from "@/components/layout/nav";
import SchemaMarkup from "@/components/schema-markup";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import type { Metadata, Viewport } from "next";

import { OG_IMAGE, SITE_URL } from "@/lib/site";
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  // Sans cela, Next resout og:image sur l hote de la requete. Les partages
  // faits depuis une preview pointaient alors sur l URL de la preview.
  metadataBase: new URL(SITE_URL),
  title: "UD Asturiana - Club de Futsal à Bruxelles",
  description: "Union Deportiva Asturiana, club de futsal passionné basé à Bruxelles. Rejoignez notre famille sportive pour vivre l'esprit d'équipe et la compétition.",
  keywords: "futsal, Bruxelles, club de sport, UD Asturiana, Union Deportiva Asturiana, football en salle, équipe, compétition, Belgique",
  authors: [{ name: "UD Asturiana" }],
  robots: "index, follow",
  openGraph: {
    title: "UD Asturiana - Club de Futsal à Bruxelles",
    description: "Union Deportiva Asturiana, club de futsal passionné basé à Bruxelles. Rejoignez notre famille sportive pour vivre l'esprit d'équipe et la compétition.",
    url: SITE_URL,
    images: [OG_IMAGE],
    siteName: "UD Asturiana",
    type: "website",
    locale: "fr_BE",
  },
  twitter: {
    card: "summary_large_image",
    title: "UD Asturiana - Club de Futsal à Bruxelles",
    description: "Union Deportiva Asturiana, club de futsal passionné basé à Bruxelles.",
    images: [OG_IMAGE],
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
    <html lang="fr" className="h-full" suppressHydrationWarning>
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
          "h-full bg-spanish-bg text-white font-nugros"
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Nav />
          <main>{children}</main>
          <Toaster />
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
