import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

function parallaxFactor(): number {
  // Reduce parallax travel on narrow screens
  return window.innerWidth < 768 ? 0.35 : 1;
}

export function initParallax(): void {
  // ── Hero background drifts slower than the page scrolls ──
  const heroBg = document.querySelector<HTMLElement>('.hero__bg');
  if (heroBg) {
    const travel = 60;
    gsap.fromTo(
      heroBg,
      { y: 0 },
      {
        y: travel * parallaxFactor(),
        ease: 'none',
        scrollTrigger: {
          trigger: '.hero',
          start: 'top top',
          end: 'bottom top',
          scrub: true,
          invalidateOnRefresh: true,
          onRefresh: (self) => {
            const factor = parallaxFactor();
            gsap.set(heroBg, { y: self.progress * travel * factor });
          },
        },
      }
    );
  }

  // ── Section blob elements drift at a slower rate than scroll ──
  const blobs = document.querySelectorAll<HTMLElement>('[data-parallax-blob]');
  blobs.forEach((blob) => {
    const section = blob.closest<HTMLElement>('section');
    if (!section) return;

    const baseTravel = 55;

    gsap.fromTo(
      blob,
      { y: -baseTravel * parallaxFactor() },
      {
        y: baseTravel * parallaxFactor(),
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
          invalidateOnRefresh: true,
          onRefresh: (self) => {
            const factor = parallaxFactor();
            const travel = baseTravel * factor;
            gsap.set(blob, { y: gsap.utils.interpolate(-travel, travel, self.progress) });
          },
        },
      }
    );
  });

  // ── Per-section scroll-rate variation ──
  // All sections start at y:0 (natural position) so there is never a snap
  // when a trigger activates or deactivates. SmoothieMenu is excluded (has its own
  // GSAP pin). Footer is excluded — it is the last element and its bottom
  // can never reach 'bottom top', which causes erratic scroll-back behaviour.
  // Location uses 'bottom bottom' for the same reason (near page end).
  const layerSpeeds: { selector: string; to: number; end?: string }[] = [
    { selector: '.marquee',  to: -14 },
    { selector: '.about',    to: -20 },
    { selector: '.gallery',  to: -18 },
    { selector: '.location', to: -12, end: 'bottom bottom' },
  ];

  layerSpeeds.forEach(({ selector, to, end = 'bottom top' }) => {
    const el = document.querySelector<HTMLElement>(selector);
    if (!el) return;
    const f = parallaxFactor();
    gsap.fromTo(
      el,
      { y: 0 },
      {
        y: to * f,
        ease: 'none',
        scrollTrigger: {
          trigger: el,
          start: 'top bottom',
          end,
          scrub: true,
          invalidateOnRefresh: true,
        },
      }
    );
  });
}
