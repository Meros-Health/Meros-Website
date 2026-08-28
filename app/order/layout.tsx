import { pageMetadata } from "@/lib/seo";
import { SITE_URL } from "@/lib/config";
import { breadcrumbSchema } from "@/lib/business";
import { JsonLd } from "@/components/seo/JsonLd";

// page.tsx is a client component and cannot export metadata, so the route's
// title and canonical live here. The agency site had this page at /our-menu,
// which now 308s here, so the title matches what that URL ranked for.
export const metadata = pageMetadata({
  title: "Our Menu - MERŌS",
  description: "Signature bowls and smoothies, strained and built in-house. Yaletown, Vancouver.",
  path: "/order",
});

export default function OrderLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={breadcrumbSchema(SITE_URL, "Our Menu", "/order")} />
      {children}
    </>
  );
}
