import type { Metadata } from "next";
import "./globals.css";
import { SITE_URL } from "@/lib/config";
import { montageSerif, aetheria, dmSans } from "@/lib/fonts";
import { LenisProvider } from "@/components/animation/LenisProvider";
import { Navbar } from "@/components/ui/Navbar";
import { RouteScroll } from "@/components/ui/RouteScroll";
import { Footer } from "@/components/ui/Footer";
import { Preloader } from "@/components/ui/Preloader";
import { CartDrawer } from "@/components/ui/CartDrawer";
import { SignatureEditModal } from "@/components/cart/SignatureEditModal";
import { CartSync } from "@/components/cart/CartSync";
import { TransitionProvider } from "@/components/transition/TransitionProvider";

const TITLE = "MERŌS - House of Yogurt";
const DESCRIPTION = "Greek yogurt bowls and smoothies, strained and built in-house. Yaletown, Vancouver.";

// metadataBase resolves every relative URL below to an absolute one. Without
// it, Open Graph tags ship relative paths, which no scraper follows, and a
// link to the site previews as a blank card everywhere it is shared.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  icons: {
    icon: "/logos/logo-terracotta.png",
    shortcut: "/logos/logo-terracotta.png",
    apple: "/logos/logo-terracotta.png",
  },
  openGraph: {
    type: "website",
    siteName: "MERŌS House of Yogurt",
    title: TITLE,
    description: DESCRIPTION,
    url: "/",
    locale: "en_CA",
    images: [
      {
        // Placeholder until a purpose-cropped 1200x630 exists: this is the
        // hero shot at 3:2, so social platforms crop the top and bottom.
        url: "/images-web/Hero/Gallery-8-hero-web.jpg",
        width: 2880,
        height: 1922,
        alt: "A Meros yogurt bowl",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/images-web/Hero/Gallery-8-hero-web.jpg"],
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
              {/* A sibling of the drawer, never a child: the drawer panel keeps a
                  transform, which would become the containing block for the
                  modal's fixed positioning. */}
              <SignatureEditModal />
              <CartSync />
            </TransitionProvider>
          </Preloader>
        </LenisProvider>
      </body>
    </html>
  );
}
