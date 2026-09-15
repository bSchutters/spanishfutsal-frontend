import "./hub.css";

import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

/**
 * Le gabarit racine du Hub : son propre <html>, sans le menu, le pied de
 * page ni le bandeau du direct du site public. Memes polices que le site,
 * declarees une seconde fois parce que next/font les attache au gabarit qui
 * les appelle.
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

const marjorie = localFont({
  src: [
    { path: "../../public/assets/fonts/marjorie2/MarjorieVariable-Regular.woff2", style: "normal" },
    { path: "../../public/assets/fonts/marjorie2/MarjorieVariableItalic-Italic.woff2", style: "italic" },
  ],
  variable: "--font-marjorie-nf",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: { default: "Hub UDA", template: "%s · Hub UDA" },
  applicationName: "Hub UDA",
  // Espace prive : aucun moteur n'a rien a y faire, en plus de robots.txt et
  // de l'en-tete X-Robots-Tag poses dans next.config.ts.
  robots: { index: false, follow: false, nocache: true },
  appleWebApp: { title: "Hub UDA", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#122642",
};

export default function HubLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={cn("hub h-full", nugros.variable, marjorie.variable)} suppressHydrationWarning>
      <body className="min-h-full bg-background font-nugros text-foreground antialiased">
        <ThemeProvider attribute="class" forcedTheme="dark" enableSystem={false} disableTransitionOnChange>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
