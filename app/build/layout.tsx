import { pageMetadata } from "@/lib/seo";
import { SITE_URL } from "@/lib/config";
import { breadcrumbSchema } from "@/lib/business";
import { JsonLd } from "@/components/seo/JsonLd";

// page.tsx is a client component. See app/order/layout.tsx for why this exists.
// The agency site had this page at /build-a-bowl, which now 308s here.
export const metadata = pageMetadata({
  title: "Build a Bowl - MERŌS",
  description: "Pick your base, fruit, nuts and finishes. Build a Greek yogurt bowl your way.",
  path: "/build",
});

export default function BuildLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={breadcrumbSchema(SITE_URL, "Build a Bowl", "/build")} />
      {children}
    </>
  );
}
