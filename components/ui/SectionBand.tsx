interface SectionBandProps {
  children: React.ReactNode;
  className?: string;
}

export function SectionBand({ children, className = "" }: SectionBandProps) {
  return (
    <div
      className={[
        "flex h-48 w-full items-center justify-center bg-cream px-section-x",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <p className="font-body-caps text-midnight text-center text-[11px] sm:text-xs tracking-[0.28em] sm:tracking-[0.32em]">
        {children}
      </p>
    </div>
  );
}
