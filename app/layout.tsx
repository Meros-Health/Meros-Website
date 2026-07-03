import type { Metadata } from "next";
import "./globals.css";
import { montageSerif, aetheria, dmSans } from "@/lib/fonts";
import { LenisProvider } from "@/components/animation/LenisProvider";
import { Navbar } from "@/components/ui/Navbar";

export const metadata: Metadata = {
  title: "Meros — House of Yogurt",
  description: "Build your bowl. Yaletown, Vancouver.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${montageSerif.variable} ${aetheria.variable} ${dmSans.variable}`}>
      <body className="bg-cream text-midnight antialiased">
        <LenisProvider>
          <Navbar />
          {children}
        </LenisProvider>
      </body>
    </html>
  );
}
