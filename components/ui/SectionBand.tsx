"use client";

import { useEffect, useRef, useState } from "react";

interface SectionBandProps {
  children: React.ReactNode;
  className?: string;
}

export function SectionBand({ children, className = "" }: SectionBandProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);

  // Plain IntersectionObserver instead of framer-motion's whileInView, because Lenis's
  // scroll handling confuses framer's own offset calculation and the reveal
  // silently never fires.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={[
        "flex h-48 w-full items-center justify-center bg-cream px-section-x",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div ref={ref} style={{ overflow: "hidden" }}>
        <p
          className="font-body-caps text-midnight text-center text-sm sm:text-base tracking-[0.28em] sm:tracking-[0.32em]"
          style={{
            clipPath: revealed ? "inset(0 0 0 0)" : "inset(0 100% 0 0)",
            transition: "clip-path 1.2s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          {children}
        </p>
      </div>
    </div>
  );
}
