import Link from "next/link";

interface ErrorScreenProps {
  eyebrow: string;
  title: string;
  body: string;
  /** Rendered as the filled primary action. */
  primary: { label: string; href?: string; onClick?: () => void };
  secondary?: { label: string; href: string };
  /** Next's error digest, shown small so a report can be matched to a log line. */
  digest?: string;
}

const PRIMARY =
  "font-body-caps text-[10px] tracking-widest text-cream bg-midnight px-8 py-3 hover:opacity-85 transition-opacity duration-300";
const SECONDARY = "font-body-caps text-[10px] tracking-widest text-midnight px-8 py-3 transition-opacity hover:opacity-70";
const SECONDARY_STYLE = { border: "0.5px solid rgba(41,45,42,0.28)" };

export function ErrorScreen({ eyebrow, title, body, primary, secondary, digest }: ErrorScreenProps) {
  return (
    <main className="px-[7vw] pt-36 pb-24">
      <span className="font-body-caps text-midnight/50 text-[10px] tracking-[0.30em]">{eyebrow}</span>
      <h1
        className="font-headline text-midnight leading-[0.9] uppercase mt-2"
        style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)" }}
      >
        {title}
      </h1>
      <p className="font-body-mixed text-sm text-juniper mt-4 max-w-lg">{body}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        {primary.href ? (
          <Link href={primary.href} className={PRIMARY}>
            {primary.label}
          </Link>
        ) : (
          <button type="button" onClick={primary.onClick} className={PRIMARY}>
            {primary.label}
          </button>
        )}
        {secondary && (
          <Link href={secondary.href} className={SECONDARY} style={SECONDARY_STYLE}>
            {secondary.label}
          </Link>
        )}
      </div>
      {digest && (
        <p className="font-body-mixed text-[10px] text-midnight/40 mt-8">Reference: {digest}</p>
      )}
    </main>
  );
}
