"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const MotionLink = motion.create(Link);

type CTAVariant = "light" | "dark";

interface CTAButtonProps {
  children: React.ReactNode;
  /** Required — every CTA is explicitly light or dark. */
  variant: CTAVariant;
  href?: string;
  onClick?: () => void;
  className?: string;
}

const THEME = {
  dark: {
    fill: "bg-midnight",
    invert: "bg-cream",
    border: "border border-midnight",
    textRest: "text-cream",
    textHover: "text-midnight",
  },
  light: {
    fill: "bg-cream",
    invert: "bg-midnight",
    border: "border border-cream",
    textRest: "text-midnight",
    textHover: "text-cream",
  },
} as const;

/** Invert panel slides in from the left (rightward wipe). */
const slideVariants = {
  rest: { x: "-101%" },
  hover: { x: "0%" },
};

const textRestVariants = {
  rest: { opacity: 1 },
  hover: { opacity: 0 },
};

const textHoverVariants = {
  rest: { opacity: 0 },
  hover: { opacity: 1 },
};

const slideTransition = {
  duration: 0.52,
  ease: [0.16, 1, 0.3, 1] as number[],
};

const textTransition = {
  duration: 0.28,
  delay: 0.08,
  ease: "easeInOut" as const,
};

const interactionProps = {
  initial: "rest" as const,
  whileHover: "hover" as const,
  whileFocus: "hover" as const,
  animate: "rest" as const,
};

function ButtonInner({
  children,
  variant,
}: {
  children: React.ReactNode;
  variant: CTAVariant;
}) {
  const theme = THEME[variant];

  return (
    <>
      {/* Sliding invert fill — travels left → right */}
      <motion.span
        aria-hidden
        className={`pointer-events-none absolute inset-0 ${theme.invert}`}
        variants={slideVariants}
        transition={slideTransition}
      />

      {/* Dual-layer label: rest fades out, hover colour fades in */}
      <span className="relative z-10 grid font-body tracking-body-caps text-xs uppercase">
        <motion.span
          className={`col-start-1 row-start-1 ${theme.textRest}`}
          variants={textRestVariants}
          transition={textTransition}
        >
          {children}
        </motion.span>
        <motion.span
          aria-hidden
          className={`col-start-1 row-start-1 ${theme.textHover}`}
          variants={textHoverVariants}
          transition={textTransition}
        >
          {children}
        </motion.span>
      </span>
    </>
  );
}

export function CTAButton({
  children,
  variant,
  href,
  onClick,
  className = "",
}: CTAButtonProps) {
  const theme = THEME[variant];
  const base = [
    "cta",
    `cta-${variant}`,
    "relative inline-flex items-center justify-center overflow-hidden",
    "rounded-btn px-8 py-3.5",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
    variant === "dark"
      ? "focus-visible:outline-midnight"
      : "focus-visible:outline-cream",
    theme.fill,
    theme.border,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (href) {
    return (
      <MotionLink href={href} className={base} {...interactionProps}>
        <ButtonInner variant={variant}>{children}</ButtonInner>
      </MotionLink>
    );
  }

  return (
    <motion.button type="button" onClick={onClick} className={base} {...interactionProps}>
      <ButtonInner variant={variant}>{children}</ButtonInner>
    </motion.button>
  );
}
