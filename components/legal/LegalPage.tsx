import type { ReactNode } from "react";

/**
 * Shared shell + typography for legal pages (/privacy, /terms).
 * Server components: no client JS needed here.
 */

export function LegalShell({
  title,
  effectiveDate,
  children,
}: {
  title: string;
  effectiveDate: string;
  children: ReactNode;
}) {
  return (
    <main className="px-[7vw] pt-36 pb-24">
      <div className="mx-auto max-w-3xl">
        <h1
          className="font-headline text-midnight leading-[0.9] uppercase"
          style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)" }}
        >
          {title}
        </h1>
        <p className="font-body-caps text-juniper text-[10px] tracking-[0.25em] mt-4">
          Effective {effectiveDate}
        </p>
        <div className="mt-12 flex flex-col gap-10">{children}</div>
      </div>
    </main>
  );
}

export function LegalSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-body-caps text-midnight text-[12px] tracking-[0.2em]">{heading}</h2>
      <div className="flex flex-col gap-3 font-body-mixed text-sm leading-relaxed text-midnight/80">
        {children}
      </div>
    </section>
  );
}

export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="flex flex-col gap-2 pl-5" style={{ listStyleType: "square" }}>
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}
