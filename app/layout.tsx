import Footer from "@/components/layout/footer";
import Nav from "@/components/layout/nav";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UD Asturiana",
  description: "UD Asturiana - Club de futsal à Bruxelles",
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
          {/* <ScreenSizeIndicator /> */}
        </ThemeProvider>
      </body>
    </html>
  );
}
