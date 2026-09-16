import { pageMetadata } from "@/lib/seo";
import { InventoryBoard } from "@/components/staff/InventoryBoard";

// The staff inventory board: every ingredient and supply the store runs
// through, each set to in stock, low, or out, shared live between whoever has
// it open. Like /source-menu it is staff-facing and linked from nowhere: not
// in the nav, not in the sitemap, disallowed in robots.txt and noindex here.
// Unlike /source-menu it can write, so Cloudflare Access will front it before
// it is enabled in production (lib/staff/runtime.ts gates that).

export const metadata = pageMetadata({
  title: "Inventory - MERŌS",
  description: "Staff inventory board: what is in stock, low, and out.",
  path: "/staff",
  noindex: true,
});

export default function StaffPage() {
  return (
    <main className="bg-cream text-midnight">
      <InventoryBoard />
    </main>
  );
}
