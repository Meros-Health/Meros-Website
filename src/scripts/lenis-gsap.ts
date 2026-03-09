import Lenis from '@studio-freight/lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initScrollReveals } from './scroll-reveal';
import { initParallax } from './parallax';

gsap.registerPlugin(ScrollTrigger);

gsap.ticker.lagSmoothing(0);

const lenis = new Lenis({
  duration: 1.4,
  easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
});

lenis.on('scroll', ScrollTrigger.update);

gsap.ticker.add((time: number) => {
  lenis.raf(time * 1000);
});

window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });

declare global {
  interface Window {
    lenis: Lenis;
  }
}
window.lenis = lenis;

function init(): void {
  initScrollReveals();
  initParallax();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

document.addEventListener('click', (e) => {
  const target = (e.target as HTMLElement).closest('a[href^="#"]');
  if (!target || !target.getAttribute('href') || target.getAttribute('href') === '#') return;
  const id = target.getAttribute('href')!.slice(1);
  const el = document.getElementById(id);
  if (el) {
    e.preventDefault();
    lenis.scrollTo(el, { offset: 0, duration: 1.4 });
  }
});
