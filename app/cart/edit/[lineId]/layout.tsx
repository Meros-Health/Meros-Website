import { pageMetadata } from "@/lib/seo";

// page.tsx is a client component. The route is keyed by a cart line id that
// exists in one browser, so it is disallowed in robots.txt and noindex here;
// without this it inherited the home page's title.
export const metadata = pageMetadata({
  title: "Edit Your Bowl - MERŌS",
  description: "Change the base, fruit, nuts and finishes of a bowl in your cart.",
  path: "/cart/edit",
  noindex: true,
});

export default function EditBowlLayout({ children }: { children: React.ReactNode }) {
  return children;
}
