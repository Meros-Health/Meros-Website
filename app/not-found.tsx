import Link from "next/link";

export default function NotFound() {
  return (
    <main className="px-[7vw] pt-36 pb-24">
      <span className="font-body-caps text-midnight/50 text-[10px] tracking-[0.30em]">404</span>
      <h1
        className="font-headline text-midnight leading-[0.9] uppercase mt-2"
        style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)" }}
      >
        Page Not Found
      </h1>
      <p className="font-body-mixed text-sm text-juniper mt-4 max-w-lg">
        There is nothing at this address. The menu and the bowl builder are one click away.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/order"
          className="font-body-caps text-[10px] tracking-widest text-cream bg-midnight px-8 py-3 hover:opacity-85 transition-opacity duration-300"
        >
          Our Menu
        </Link>
        <Link
          href="/"
          className="font-body-caps text-[10px] tracking-widest text-midnight px-8 py-3 transition-opacity hover:opacity-70"
          style={{ border: "0.5px solid rgba(41,45,42,0.28)" }}
        >
          Home
        </Link>
      </div>
    </main>
  );
}
