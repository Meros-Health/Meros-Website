import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

const navLinks = [
  { href: '#menu', label: 'MENU' },
  { href: '/bowl-builder', label: 'BUILD' },
  { href: '#about', label: 'ABOUT' },
  { href: '#find-us', label: 'FIND US' },
];

export default function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false);

  const { scrollY } = useScroll();
  const navBgOpacity = useTransform(scrollY, [0, 120], [0, 1]);
  const navBlur = useTransform(scrollY, [0, 120], [0, 8]);
  const borderOpacity = useTransform(scrollY, [0, 120], [0, 1]);
  const textColor = useTransform(
    scrollY,
    [0, 120],
    ['rgba(250, 250, 247, 1)', 'rgb(28, 46, 30)']
  );

  function close() {
    setMenuOpen(false);
  }

  // Scroll-derived transforms (always called unconditionally)
  const scrollBg = useTransform(navBgOpacity, (v) => `rgba(250, 250, 247, ${v})`);
  const scrollBlur = useTransform(navBlur, (v) => `blur(${v}px)`);
  const scrollBorder = useTransform(borderOpacity, (v) => `rgba(28, 46, 30, ${v * 0.12})`);

  return (
    <>
      <motion.header
        className="nav"
        style={{
          backgroundColor: menuOpen ? 'rgba(250, 250, 247, 1)' : scrollBg,
          backdropFilter: menuOpen ? 'blur(8px)' : scrollBlur,
          WebkitBackdropFilter: menuOpen ? 'blur(8px)' : scrollBlur,
          borderBottomWidth: '1px',
          borderBottomStyle: 'solid',
          borderBottomColor: menuOpen ? 'rgba(28, 46, 30, 0.12)' : scrollBorder,
        }}
      >
        <motion.a
          href="/"
          className="nav__logo"
          style={{ color: menuOpen ? 'rgb(28, 46, 30)' : textColor }}
          aria-label="MEROS home"
        >
          MEROS
        </motion.a>

        {/* Desktop links */}
        <nav className="nav__links" aria-label="Main">
          {navLinks.map(({ href, label }) => (
            <motion.a key={href} href={href} className="nav__link" style={{ color: menuOpen ? 'rgb(28, 46, 30)' : textColor }}>
              {label}
            </motion.a>
          ))}
        </nav>

        {/* Mobile hamburger */}
        <motion.button
          className="nav__hamburger"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          style={{ color: menuOpen ? 'rgb(28, 46, 30)' : textColor }}
        >
          <motion.span
            className="nav__bar"
            animate={menuOpen ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }}
            transition={{ duration: 0.25 }}
          />
          <motion.span
            className="nav__bar"
            animate={menuOpen ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.2 }}
          />
          <motion.span
            className="nav__bar"
            animate={menuOpen ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }}
            transition={{ duration: 0.25 }}
          />
        </motion.button>
      </motion.header>

      {/* Mobile slide-down menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            className="nav__mobile-menu"
            key="mobile-menu"
            initial={{ y: '-100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '-100%', opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.25, 0.1, 0.25, 1] }}
            aria-label="Mobile navigation"
          >
            {navLinks.map(({ href, label }) => (
              <a key={href} href={href} className="nav__mobile-link" onClick={close}>
                {label}
              </a>
            ))}
          </motion.nav>
        )}
      </AnimatePresence>
    </>
  );
}
