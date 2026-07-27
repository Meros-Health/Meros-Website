import type { Metadata } from "next";
import "./globals.css";
import { montageSerif, aetheria, dmSans } from "@/lib/fonts";
import { LenisProvider } from "@/components/animation/LenisProvider";
import { Navbar } from "@/components/ui/Navbar";
import { RouteScroll } from "@/components/ui/RouteScroll";
import { Footer } from "@/components/ui/Footer";
import { Preloader } from "@/components/ui/Preloader";
import { CartDrawer } from "@/components/ui/CartDrawer";
import { TransitionProvider } from "@/components/transition/TransitionProvider";

export const metadata: Metadata = {
  title: "Meros — House of Yogurt",
  description: "Build your bowl. Yaletown, Vancouver.",
  icons: {
    icon: "/logos/logo-terracotta.png",
    shortcut: "/logos/logo-terracotta.png",
    apple: "/logos/logo-terracotta.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${montageSerif.variable} ${aetheria.variable} ${dmSans.variable}`} suppressHydrationWarning>
      <body className="bg-cream text-midnight antialiased" suppressHydrationWarning>
        <LenisProvider>
          <RouteScroll />
          <Preloader>
            <TransitionProvider>
              <Navbar />
              {children}
              <Footer />
              <CartDrawer />
            </TransitionProvider>
          </Preloader>
        </LenisProvider>
      </body>
    </html>
  );
}
