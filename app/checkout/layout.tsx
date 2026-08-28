import { pageMetadata } from "@/lib/seo";

// Transactional, and there is nothing here worth a search result. robots.txt
// disallows /checkout already; noindex is the second lock, for crawlers that
// reach the URL from a link rather than from the crawl.
export const metadata = pageMetadata({
  title: "Checkout - MERŌS",
  description: "Review your order and check out.",
  path: "/checkout",
  noindex: true,
});

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
