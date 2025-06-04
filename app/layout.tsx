import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import Nav from "@/components/layout/nav";
import ScreenSizeIndicator from "@/components/layout/screenSizeIndicator";
import Footer from "@/components/layout/footer";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Spanish Futsal",
  description: "Spanish Futsal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
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
          {children}
          <Toaster />
          <Footer />
          <ScreenSizeIndicator />
        </ThemeProvider>
      </body>
    </html>
  );
}
