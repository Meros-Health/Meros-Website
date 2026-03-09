import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

type RevealVariant = 'up' | 'fade' | 'clip' | 'stagger' | 'left' | 'right';

interface RevealConfig {
  from: gsap.TweenVars;
  to: gsap.TweenVars;
}

const REVEAL_CONFIGS: Record<RevealVariant, RevealConfig> = {
  up: {
    from: { opacity: 0, y: 64 },
    to: { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out' },
  },
  fade: {
    from: { opacity: 0 },
    to: { opacity: 1, duration: 1.4, ease: 'power2.out' },
  },
  clip: {
    from: { clipPath: 'inset(100% 0% 0% 0%)' },
    to: { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'power4.out' },
  },
  stagger: {
    from: { opacity: 0, y: 48 },
    to: { opacity: 1, y: 0, duration: 1.0, ease: 'power3.out' },
  },
  left: {
    from: { opacity: 0, x: -80 },
    to: { opacity: 1, x: 0, duration: 1.3, ease: 'power3.out' },
  },
  right: {
    from: { opacity: 0, x: 80 },
    to: { opacity: 1, x: 0, duration: 1.3, ease: 'power3.out' },
  },
};

export function initScrollReveals(): void {
  gsap.registerPlugin(ScrollTrigger);

  const elements = document.querySelectorAll<HTMLElement>('[data-reveal]');

  elements.forEach((el) => {
    const variant = (el.getAttribute('data-reveal') as RevealVariant) ?? 'fade';
    const delay = parseFloat(el.getAttribute('data-reveal-delay') ?? '0');
    const config = REVEAL_CONFIGS[variant] ?? REVEAL_CONFIGS.fade;

    if (variant === 'stagger') {
      const children = Array.from(el.children) as HTMLElement[];
      if (!children.length) return;
      gsap.set(children, config.from);
      ScrollTrigger.create({
        trigger: el,
        start: 'top 85%',
        once: true,
        onEnter: () => {
          gsap.to(children, {
            ...config.to,
            stagger: 0.14,
            delay,
          });
        },
      });
    } else {
      gsap.set(el, config.from);
      ScrollTrigger.create({
        trigger: el,
        start: 'top 85%',
        once: true,
        onEnter: () => {
          gsap.to(el, { ...config.to, delay });
        },
      });
    }
  });
}
