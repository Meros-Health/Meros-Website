import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface DonutChartProps {
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
}

export default function DonutChart({ protein, carbs, fat, calories }: DonutChartProps) {
  const [displayedCalories, setDisplayedCalories] = useState(calories);

  // Animate calorie counter
  useEffect(() => {
    const start = displayedCalories;
    const end = calories;
    const duration = 400;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out quad
      const eased = 1 - (1 - progress) * (1 - progress);
      setDisplayedCalories(Math.round(start + (end - start) * eased));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [calories]);

  const total = protein + carbs + fat;
  const radius = 80;
  const strokeWidth = 16;
  const circumference = 2 * Math.PI * radius;

  // Calculate segment lengths
  const proteinLength = total > 0 ? (protein / total) * circumference : 0;
  const carbsLength = total > 0 ? (carbs / total) * circumference : 0;
  const fatLength = total > 0 ? (fat / total) * circumference : 0;

  // Calculate offsets
  const proteinOffset = 0;
  const carbsOffset = proteinLength;
  const fatOffset = proteinLength + carbsLength;

  return (
    <div style={{ position: 'relative', width: '200px', height: '200px' }}>
      <svg
        width="200"
        height="200"
        viewBox="0 0 200 200"
        style={{ transform: 'rotate(-90deg)' }}
      >
        {/* Background circle */}
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke="rgba(28, 46, 30, 0.08)"
          strokeWidth={strokeWidth}
        />

        {/* Protein segment (Forest) */}
        <motion.circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke="var(--forest)"
          strokeWidth={strokeWidth}
          strokeLinecap="butt"
          initial={{ strokeDasharray: `0 ${circumference}` }}
          animate={{
            strokeDasharray: `${proteinLength} ${circumference - proteinLength}`,
            strokeDashoffset: -proteinOffset,
          }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        />

        {/* Carbs segment (Terracotta) */}
        <motion.circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke="var(--terracotta)"
          strokeWidth={strokeWidth}
          strokeLinecap="butt"
          initial={{ strokeDasharray: `0 ${circumference}` }}
          animate={{
            strokeDasharray: `${carbsLength} ${circumference - carbsLength}`,
            strokeDashoffset: -carbsOffset,
          }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        />

        {/* Fat segment (Warm Grey) */}
        <motion.circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke="var(--warm-grey)"
          strokeWidth={strokeWidth}
          strokeLinecap="butt"
          initial={{ strokeDasharray: `0 ${circumference}` }}
          animate={{
            strokeDasharray: `${fatLength} ${circumference - fatLength}`,
            strokeDashoffset: -fatOffset,
          }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        />
      </svg>

      {/* Center content */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <motion.span
          key={displayedCalories}
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-xl)',
            color: 'var(--forest)',
            fontWeight: 300,
            lineHeight: 1,
          }}
        >
          {displayedCalories}
        </motion.span>
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-xs)',
            color: 'var(--warm-grey)',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            marginTop: '4px',
          }}
        >
          Calories
        </span>
      </div>
    </div>
  );
}
