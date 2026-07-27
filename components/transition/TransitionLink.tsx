"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { forwardRef } from "react";
import { useTransitionRouter } from "./TransitionProvider";

type NextLinkProps = React.ComponentPropsWithoutRef<typeof Link>;

export interface TransitionLinkProps extends Omit<NextLinkProps, "href"> {
  href: string;
}

function isModifiedClick(e: React.MouseEvent) {
  return e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0;
}

// Thin next/link wrapper that routes internal left-clicks through the page
// transition. Everything else (modified clicks, new-tab targets, external
// hrefs, same-route clicks, hash links) falls through to native behavior.
export const TransitionLink = forwardRef<HTMLAnchorElement, TransitionLinkProps>(
  function TransitionLink({ href, onClick, target, ...rest }, ref) {
    const pathname = usePathname();
    const { push } = useTransitionRouter();

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
      onClick?.(e);
      if (e.defaultPrevented) return;
      if (isModifiedClick(e)) return;
      if (target && target !== "_self") return;
      if (!href.startsWith("/")) return;
      if (href.split(/[?#]/)[0] === pathname) return;
      e.preventDefault();
      push(href);
    };

    return <Link ref={ref} href={href} target={target} onClick={handleClick} {...rest} />;
  }
);
