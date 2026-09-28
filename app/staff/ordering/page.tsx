import { pageMetadata } from "@/lib/seo";
import { OrderLog } from "@/components/staff/OrderLog";

// The ordering log, beside the inventory board at /staff. Same Cloudflare
// Access gate, same noindex, same absence from the nav and the sitemap: it
// carries what the store pays its suppliers, which is more sensitive than
// what is low on the shelf.
//
// A page rather than a tab on the board: the board's tabs are md:hidden,
// phones only, because desktop shows both of its sections at once.

export const metadata = pageMetadata({
  title: "Ordering - MERŌS",
  description: "Staff ordering log: what was ordered, at what cost, and how long it lasted.",
  path: "/staff/ordering",
  noindex: true,
});

export default function StaffOrderingPage() {
  return (
    <main className="bg-cream text-midnight">
      <OrderLog />
    </main>
  );
}
