import { motion } from 'framer-motion';

const ease = [0.25, 0.1, 0.25, 1] as const;

const wordVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.09,
      delayChildren: 0.15,
    },
  },
};

const letterVariants = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 1.0, ease },
  },
};

const LETTERS = 'MEROS'.split('');

export default function HeroWordmark() {
  return (
    <div className="hero-wordmark">
      {/* Line 1: MEROS — letter-by-letter staggered reveal */}
      <motion.div
        className="hero-wordmark__line1"
        variants={wordVariants}
        initial="hidden"
        animate="visible"
        aria-label="MEROS"
      >
        {LETTERS.map((char, i) => (
          <motion.span
            key={i}
            variants={letterVariants}
            style={{ display: 'inline-block' }}
          >
            {char}
          </motion.span>
        ))}
      </motion.div>

      {/* Line 2: Smoothie and Yoghurt Bar — EB Garamond italic */}
      <motion.div
        className="hero-wordmark__line2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.4, ease, delay: 0.85 }}
      >
        Smoothie and Yogurt Bar
      </motion.div>

      {/* Line 3: Tagline — Jost 200 */}
      <motion.div
        className="hero-wordmark__line3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.4, ease, delay: 1.25 }}
      >
        Pure.&nbsp;&nbsp;Simple.&nbsp;&nbsp;Intentional.
      </motion.div>
    </div>
  );
}
