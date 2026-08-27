"use client";

import { useEffect } from "react";
import { ErrorScreen } from "@/components/ui/ErrorScreen";

// Route-level error boundary. Without one, any uncaught render error is a
// white screen. The cart lives in localStorage and survives; say so. The
// digest is what matches a customer report to the server log line.
export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[route error]", error.digest ?? "", error);
  }, [error]);

  return (
    <ErrorScreen
      eyebrow="Error"
      title="Something Went Wrong"
      body="This page could not be shown. Your cart is saved on this device."
      primary={{ label: "Try Again", onClick: reset }}
      secondary={{ label: "Our Menu", href: "/order" }}
      digest={error.digest}
    />
  );
}
