"use client";

import Link from "next/link";

// Route-level error boundary. Without one, any uncaught render error is a
// white screen. The cart lives in localStorage and survives; say so.
export default function RouteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="px-[7vw] pt-36 pb-24">
      <span className="font-body-caps text-midnight/50 text-[10px] tracking-[0.30em]">Error</span>
      <h1
        className="font-headline text-midnight leading-[0.9] uppercase mt-2"
        style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)" }}
      >
        Something Went Wrong
      </h1>
      <p className="font-body-mixed text-sm text-juniper mt-4 max-w-lg">
        This page could not be shown. Your cart is saved on this device.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="font-body-caps text-[10px] tracking-widest text-cream bg-midnight px-8 py-3 hover:opacity-85 transition-opacity duration-300"
        >
          Try Again
        </button>
        <Link
          href="/order"
          className="font-body-caps text-[10px] tracking-widest text-midnight px-8 py-3 transition-opacity hover:opacity-70"
          style={{ border: "0.5px solid rgba(41,45,42,0.28)" }}
        >
          Our Menu
        </Link>
      </div>
    </main>
  );
}
