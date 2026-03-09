import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import DonutChart from './DonutChart';
import { dailyGoals } from './ingredients';

interface MacroPanelProps {
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  onSave: () => void;
  hasSelection: boolean;
}

function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    const start = displayValue;
    const end = value;
    const duration = 350;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - (1 - progress) * (1 - progress);
      setDisplayValue(Math.round(start + (end - start) * eased));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value]);

  return <span>{displayValue}{suffix}</span>;
}

export default function MacroPanel({ totals, onSave, hasSelection }: MacroPanelProps) {
  const calorieProgress = Math.min((totals.calories / dailyGoals.calories) * 100, 100);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      style={{
        background: 'rgba(250, 250, 247, 0.9)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: '12px',
        padding: '2rem',
        border: '1px solid rgba(28, 46, 30, 0.08)',
      }}
    >
      {/* Donut Chart */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '2rem',
        }}
      >
        <DonutChart
          protein={totals.protein}
          carbs={totals.carbs}
          fat={totals.fat}
          calories={totals.calories}
        />
      </div>

      {/* Macro Legend */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '1.5rem',
          marginBottom: '2rem',
          paddingBottom: '1.5rem',
          borderBottom: '1px solid rgba(28, 46, 30, 0.08)',
        }}
      >
        <LegendItem color="var(--forest)" label="Protein" />
        <LegendItem color="var(--terracotta)" label="Carbs" />
        <LegendItem color="var(--warm-grey)" label="Fat" />
      </div>

      {/* Stat Rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <StatRow
          label="Calories"
          value={<AnimatedNumber value={totals.calories} />}
          subtext={`/ ${dailyGoals.calories}`}
        />
        <StatRow
          label="Protein"
          value={<AnimatedNumber value={totals.protein} suffix="g" />}
          subtext={`/ ${dailyGoals.protein}g`}
        />
        <StatRow
          label="Carbs"
          value={<AnimatedNumber value={totals.carbs} suffix="g" />}
          subtext={`/ ${dailyGoals.carbs}g`}
        />
        <StatRow
          label="Fat"
          value={<AnimatedNumber value={totals.fat} suffix="g" />}
          subtext={`/ ${dailyGoals.fat}g`}
        />
      </div>

      {/* Daily Goal Progress */}
      <div style={{ marginTop: '1.5rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '0.5rem',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-xs)',
              color: 'var(--warm-grey)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            Daily Goal
          </span>
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-xs)',
              color: 'var(--forest)',
              fontWeight: 500,
            }}
          >
            {Math.round(calorieProgress)}%
          </span>
        </div>
        <div
          style={{
            height: '6px',
            borderRadius: '3px',
            backgroundColor: 'rgba(28, 46, 30, 0.08)',
            overflow: 'hidden',
          }}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${calorieProgress}%` }}
            transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
            style={{
              height: '100%',
              backgroundColor: 'var(--terracotta)',
              borderRadius: '3px',
            }}
          />
        </div>
      </div>

      {/* Save Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98, boxShadow: '0 2px 8px rgba(201, 106, 74, 0.2)' }}
        onClick={onSave}
        disabled={!hasSelection}
        style={{
          marginTop: '2rem',
          width: '100%',
          padding: '1rem 2rem',
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--text-sm)',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: hasSelection ? 'var(--white)' : 'var(--warm-grey)',
          backgroundColor: hasSelection ? 'var(--terracotta)' : 'rgba(28, 46, 30, 0.1)',
          border: 'none',
          borderRadius: '4px',
          cursor: hasSelection ? 'pointer' : 'not-allowed',
          transition: 'background-color 0.3s ease',
        }}
      >
        Save Bowl
      </motion.button>
    </motion.div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <div
        style={{
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          backgroundColor: color,
        }}
      />
      <span
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--text-xs)',
          color: 'var(--warm-grey)',
          letterSpacing: '0.05em',
        }}
      >
        {label}
      </span>
    </div>
  );
}

function StatRow({ label, value, subtext }: { label: string; value: React.ReactNode; subtext: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--text-sm)',
          color: 'var(--warm-grey)',
        }}
      >
        {label}
      </span>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-lg)',
            color: 'var(--forest)',
            fontWeight: 300,
          }}
        >
          {value}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-xs)',
            color: 'var(--warm-grey)',
          }}
        >
          {subtext}
        </span>
      </div>
    </div>
  );
}
