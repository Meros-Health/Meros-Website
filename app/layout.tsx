import type { Metadata } from "next";
import "./globals.css";
import { SITE_URL } from "@/lib/config";
import { OG_IMAGE, SITE_NAME } from "@/lib/seo";
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
//
// Deliberately no canonical, no og:url and no per-route title here. Metadata
// inherits down the tree, so anything set here is claimed by every route: a
// canonical would tell crawlers each page's canonical version is the home
// page. Routes build their own with pageMetadata() in lib/seo.ts. What stays
// is the fallback any route without its own metadata should still get.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  icons: {
    icon: "/logos/logo-terracotta.png",
    shortcut: "/logos/logo-terracotta.png",
    apple: "/logos/logo-terracotta.png",
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: TITLE,
    description: DESCRIPTION,
    locale: "en_CA",
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE.url],
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
