"use client";

import { motion } from "framer-motion";
import { useLenis } from "@/components/animation/LenisProvider";
import { glideToHash } from "@/lib/scroll";

// In-page anchors. CTAButton routes through TransitionLink, which is built for
// route changes; everything here only ever moves within /catering, so it
// glides through Lenis instead (lib/scroll.ts), on the same slow curve the
// home page's "Visit" CTA uses.

type Variant = "filled" | "light";

const THEME: Record<Variant, string> = {
  filled: "bg-midnight text-cream border border-midnight",
  light: "bg-cream text-midnight border border-cream",
};

const PRESS = {
  initial: { opacity: 1 },
  whileHover: { opacity: 0.72 },
  whileFocus: { opacity: 0.72 },
  whileTap: { opacity: 0.5 },
  transition: { duration: 0.2, ease: "easeInOut" as const },
} as const;

/**
 * Click handler shared by both shapes. The hash is written back with
 * replaceState so someone who landed on /cater and then moved can still
 * copy the URL of what they are reading, without stacking history entries.
 */
function useAnchorGlide(href: `#${string}`) {
  const lenis = useLenis();
  return (e: React.MouseEvent) => {
    e.preventDefault();
    glideToHash(lenis, href);
    history.replaceState(null, "", href);
  };
}

interface AnchorProps {
  href: `#${string}`;
  children: React.ReactNode;
}

export function AnchorButton({ href, variant, children }: AnchorProps & { variant: Variant }) {
  const onClick = useAnchorGlide(href);

  return (
    <motion.a
      href={href}
      onClick={onClick}
      className={`inline-flex items-center justify-center px-8 py-3.5 font-body tracking-body-caps uppercase focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current ${THEME[variant]}`}
      style={{ fontSize: "0.75rem", textDecoration: "none" }}
      {...PRESS}
    >
      {children}
    </motion.a>
  );
}
