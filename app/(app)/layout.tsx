import Footer from "@/components/layout/footer";
import Nav from "@/components/layout/nav";
import SchemaMarkup from "@/components/schema-markup";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "UD Asturiana - Club de Futsal à Bruxelles",
  description: "Union Deportiva Asturiana, club de futsal passionné basé à Bruxelles. Rejoignez notre famille sportive pour vivre l'esprit d'équipe et la compétition.",
  keywords: "futsal, Bruxelles, club de sport, UD Asturiana, Union Deportiva Asturiana, football en salle, équipe, compétition, Belgique",
  authors: [{ name: "UD Asturiana" }],
  robots: "index, follow",
  openGraph: {
    title: "UD Asturiana - Club de Futsal à Bruxelles",
    description: "Union Deportiva Asturiana, club de futsal passionné basé à Bruxelles. Rejoignez notre famille sportive pour vivre l'esprit d'équipe et la compétition.",
    url: "https://udasturiana.be",
    siteName: "UD Asturiana",
    type: "website",
    locale: "fr_BE",
  },
  twitter: {
    card: "summary_large_image",
    title: "UD Asturiana - Club de Futsal à Bruxelles",
    description: "Union Deportiva Asturiana, club de futsal passionné basé à Bruxelles.",
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
