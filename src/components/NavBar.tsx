import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

/** In-page scroll targets — hrefs must match section ids on the home page */
const SCROLL_LINKS = [
  { href: '#about', label: 'ABOUT' },
  { href: '#smoothies', label: 'SMOOTHIES' },
  { href: '#yogurt', label: 'YOGURT' },
  { href: '#contact', label: 'CONTACT' },
] as const;

/** Full-page navigation — never treated as a hash/scroll link */
const PAGE_LINKS = [{ href: '/bowl-builder', label: 'BUILD', isBuild: true }] as const;

const NAV_LINKS = [...SCROLL_LINKS, ...PAGE_LINKS];

export default function NavBar() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      <header className="nav">
        <a href="/" className="nav__logo" aria-label="MEROS home">
          MEROS
        </a>

        {/* Desktop links */}
        <nav className="nav__links" aria-label="Main navigation">
          {NAV_LINKS.map(({ href, label, isBuild }) => (
            <a
              key={href}
              href={href}
              className={isBuild ? 'nav__link nav__link--build' : 'nav__link'}
            >
              {label}
            </a>
          ))}
        </nav>

        {/* Mobile hamburger */}
        <button
          className="nav__hamburger"
          onClick={() => setOpen(o => !o)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
        >
          <motion.span
            className="nav__bar"
            animate={open ? { rotate: 45, y: 5.5 } : { rotate: 0, y: 0 }}
            transition={{ duration: 0.22 }}
          />
          <motion.span
            className="nav__bar"
            animate={open ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.18 }}
          />
          <motion.span
            className="nav__bar"
            animate={open ? { rotate: -45, y: -5.5 } : { rotate: 0, y: 0 }}
            transition={{ duration: 0.22 }}
          />
        </button>
      </header>

      {/* Mobile dropdown */}
      <AnimatePresence>
        {open && (
          <>
            <motion.button
              key="backdrop"
              className="nav__mobile-backdrop"
              type="button"
              onClick={close}
              aria-label="Close menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
            <motion.nav
              key="menu"
              className="nav__mobile-menu"
              aria-label="Mobile navigation"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.24, ease: [0.25, 0.1, 0.25, 1] }}
            >
              {NAV_LINKS.map(({ href, label, isBuild }) => (
                <a
                  key={href}
                  href={href}
                  className={isBuild ? 'nav__mobile-link nav__mobile-link--build' : 'nav__mobile-link'}
                  onClick={close}
                >
                  {label}
                </a>
              ))}
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
