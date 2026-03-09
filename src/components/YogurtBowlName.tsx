import { motion } from 'framer-motion';

interface Props {
  name: string;
  delay?: number;
}

export default function YogurtBowlName({ name, delay = 0 }: Props) {
  return (
    <motion.h3
      className="yogurt__card-name"
      initial={{ opacity: 0.08, filter: 'blur(10px)' }}
      whileInView={{ opacity: 1, filter: 'blur(0px)' }}
      viewport={{ once: true, amount: 0.6 }}
      transition={{
        duration: 0.4,
        delay,
        ease: [0.25, 0.1, 0.25, 1],
      }}
    >
      {name}
    </motion.h3>
  );
}
