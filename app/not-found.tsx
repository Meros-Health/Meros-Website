import { ErrorScreen } from "@/components/ui/ErrorScreen";

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
