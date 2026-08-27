"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { useReducedMotion } from "framer-motion";
import { usePreloadReady } from "@/components/ui/Preloader";
import { PageCover } from "./PageCover";
import { ROUTE_CRITICAL_ASSETS } from "@/lib/routeAssets";
import {
  ENTRANCE_MS,
  EXIT_MS,
  HOLD_MS,
  MENU_EXIT_COVER_MS,
  NAV_WATCHDOG_MS,
  REDUCED_MOTION_MS,
  preloadImage,
} from "@/lib/motion";

// Coordinated page transitions: exit cover over the outgoing page, navigate
// while covered, hold on the new page until its critical assets are ready,
// then lift the cover as entrance animations start. Mirrors Preloader's
// promise-gate + context-flag pattern, but per client-side navigation.
export type TransitionPhase = "idle" | "exiting" | "navigating" | "holding" | "entering";

// "menu-composed": the nav menu's own close animation acts as the visual
// exit; the cover stays invisible through the exit window, then snaps opaque
// right before navigation instead of double-animating a fade-in.
export type CoverMode = "default" | "menu-composed";

export interface TransitionNavigateOptions {
  coverMode?: CoverMode;
  preDelayMs?: number;
}

interface TransitionRouterValue {
  /** False when a transition is already in flight and the navigation was ignored. */
  push: (href: string, options?: TransitionNavigateOptions) => boolean;
  replace: (href: string, options?: TransitionNavigateOptions) => boolean;
}

// Default true so consumers outside a provider (or during unmount) never get
// stuck waiting on a gate that isn't there. Same contract as usePreloadReady.
const TransitionReadyContext = createContext(true);
const TransitionRouterContext = createContext<TransitionRouterValue | null>(null);

/** False while a new page sits covered (navigating/holding); entrance animations key off it. */
export function useTransitionReady() {
  return useContext(TransitionReadyContext);
}

/** Drop-in for useRouter().push/replace that plays the coordinated transition. Falls back to plain navigation outside a provider. */
export function useTransitionRouter(): TransitionRouterValue {
  const ctx = useContext(TransitionRouterContext);
  const router = useRouter();
  return useMemo(
    () =>
      ctx ?? {
        push: (href: string) => {
          router.push(href);
          return true;
        },
        replace: (href: string) => {
          router.replace(href);
          return true;
        },
      },
    [ctx, router]
  );
}

/** True once both the first-load preloader and any in-flight page transition have lifted. */
export function usePageReady() {
  const preloadReady = usePreloadReady();
  const transitionReady = useTransitionReady();
  return preloadReady && transitionReady;
}

function pathnameOf(href: string) {
  return href.split(/[?#]/)[0];
}

export function TransitionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const reducedMotion = useReducedMotion();

  const [phase, setPhase] = useState<TransitionPhase>("idle");
  const [coverMode, setCoverMode] = useState<CoverMode>("default");

  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;
  const reducedRef = useRef(false);
  reducedRef.current = !!reducedMotion;
  // Destination we pushed ourselves; null means any pathname change is external.
  const pendingRef = useRef<string | null>(null);
  // Bumped whenever a transition starts or is abandoned, so stale timers and
  // promise chains from a superseded transition can never advance the machine.
  const transitionIdRef = useRef(0);

  const releaseCover = useCallback((id: number) => {
    pendingRef.current = null;
    setPhase("entering");
    window.setTimeout(() => {
      if (transitionIdRef.current !== id) return;
      setPhase("idle");
    }, reducedRef.current ? REDUCED_MOTION_MS : ENTRANCE_MS);
  }, []);

  const navigate = useCallback(
    (href: string, options: TransitionNavigateOptions | undefined, method: "push" | "replace"): boolean => {
      const doNavigate = () => (method === "replace" ? router.replace(href) : router.push(href));

      // Transitions are atomic: ignore further navigation until idle again.
      if (phaseRef.current !== "idle") return false;

      // Same-pathname navigations (query/hash tweaks) get no choreography.
      if (pathnameOf(href) === pathnameRef.current) {
        doNavigate();
        return true;
      }

      const id = ++transitionIdRef.current;
      const composed = options?.coverMode === "menu-composed";
      const exitDelay = reducedRef.current
        ? REDUCED_MOTION_MS
        : composed
          ? options?.preDelayMs ?? MENU_EXIT_COVER_MS
          : EXIT_MS;

      pendingRef.current = pathnameOf(href);
      setCoverMode(composed ? "menu-composed" : "default");
      setPhase("exiting");

      window.setTimeout(() => {
        if (transitionIdRef.current !== id) return;
        setPhase("navigating");
        doNavigate();
      }, exitDelay);

      // Watchdog: if the navigation never lands (aborted, intercepted), fade
      // the cover back out rather than leaving the user behind it.
      window.setTimeout(() => {
        if (transitionIdRef.current !== id) return;
        if (phaseRef.current === "exiting" || phaseRef.current === "navigating") {
          releaseCover(id);
        }
      }, exitDelay + NAV_WATCHDOG_MS);

      return true;
    },
    [router, releaseCover]
  );

  const routerValue = useMemo<TransitionRouterValue>(
    () => ({
      push: (href, options) => navigate(href, options, "push"),
      replace: (href, options) => navigate(href, options, "replace"),
    }),
    [navigate]
  );

  // Runs on every route change. If it's the navigation we drove, move into the
  // covered hold; any pathname change we did not drive (back/forward, address
  // bar, a link that bypassed the system, a route's own guard redirect) simply
  // releases the cover from wherever it is. Never a stuck cover.
  useEffect(() => {
    if (phaseRef.current === "idle") return;

    if (phaseRef.current === "navigating" && pendingRef.current === pathname) {
      const id = transitionIdRef.current;
      pendingRef.current = null;
      setPhase("holding");

      const reduced = reducedRef.current;
      const assets = reduced ? [] : ROUTE_CRITICAL_ASSETS[pathname] ?? [];
      const holdTimer = new Promise<void>((resolve) =>
        window.setTimeout(resolve, reduced ? 0 : HOLD_MS)
      );
      Promise.all([...assets.map(preloadImage), holdTimer]).then(() => {
        if (transitionIdRef.current !== id) return;
        releaseCover(id);
      });
      return;
    }

    releaseCover(++transitionIdRef.current);
  }, [pathname, releaseCover]);

  const transitionReady = phase !== "navigating" && phase !== "holding";

  return (
    <TransitionRouterContext.Provider value={routerValue}>
      <TransitionReadyContext.Provider value={transitionReady}>
        {children}
        <PageCover phase={phase} coverMode={coverMode} />
      </TransitionReadyContext.Provider>
    </TransitionRouterContext.Provider>
  );
}
