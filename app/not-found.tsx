import type { Metadata } from "next";
import { ErrorScreen } from "@/components/ui/ErrorScreen";

// Without this a missing page inherits the root layout's title and claims to
// be the home page.
export const metadata: Metadata = {
  title: "Page Not Found - MERŌS",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <ErrorScreen
      eyebrow="404"
      title="Page Not Found"
      body="There is nothing at this address. The menu and the bowl builder are one click away."
      primary={{ label: "Our Menu", href: "/order" }}
      secondary={{ label: "Home", href: "/" }}
    />
  );
}
