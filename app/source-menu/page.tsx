import { pageMetadata } from "@/lib/seo";
import { SourceMenu } from "@/components/menu/SourceMenu";

// The whole menu on one page, read straight from lib/menu/menu.json: every
// ingredient, what each signature is made of, the Stacks, and how the store
// menu differs from the delivery one. It is the reference staff and the
// kitchen share, reachable by its URL and linked from nowhere: not in the nav,
// not in the sitemap, disallowed in robots.txt and marked noindex here. It
// holds nothing sensitive, so a customer who finds it sees an honest page.

export const metadata = pageMetadata({
  title: "Menu Reference - MERŌS",
  description: "Every ingredient MERŌS carries and what each signature bowl and smoothie is made of.",
  path: "/source-menu",
  noindex: true,
});

export default function SourceMenuPage() {
  return (
    <main className="bg-cream text-midnight">
      <SourceMenu />
    </main>
  );
}
