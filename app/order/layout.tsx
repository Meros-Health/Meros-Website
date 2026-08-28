import { pageMetadata } from "@/lib/seo";

// page.tsx is a client component and cannot export metadata, so the route's
// title and canonical live here. The agency site had this page at /our-menu,
// which now 308s here, so the title matches what that URL ranked for.
export const metadata = pageMetadata({
  title: "Our Menu - MERŌS",
  description: "Signature bowls and smoothies, strained and built in-house. Yaletown, Vancouver.",
  path: "/order",
});

export default function OrderLayout({ children }: { children: React.ReactNode }) {
  return children;
}
