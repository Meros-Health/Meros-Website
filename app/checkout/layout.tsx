import type { Metadata } from "next";

// Transactional, and there is nothing here worth a search result. robots.txt
// disallows /checkout already; this is the second lock, for crawlers that
// reach the URL from a link rather than from the crawl.
export const metadata: Metadata = {
  title: "Checkout - MERŌS",
  robots: { index: false, follow: false },
  alternates: { canonical: "/checkout" },
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
