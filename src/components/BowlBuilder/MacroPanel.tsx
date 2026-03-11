import { motion, AnimatePresence } from 'framer-motion';
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
  compact?: boolean;
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

export default function MacroPanel({ totals, onSave, hasSelection, compact = false }: MacroPanelProps) {
  const calorieProgress = Math.min((totals.calories / dailyGoals.calories) * 100, 100);
  // expanded state removed — compact panel is always open

  // Compact mobile version — always expanded, no collapsible behaviour
  if (compact) {
    return (
      <div className="macro-panel-compact">
        {/* Summary bar with save button */}
        <div className="macro-panel-compact__bar">
          <div className="macro-panel-compact__summary">
            <div className="macro-panel-compact__calories">
              <AnimatedNumber value={totals.calories} />
              <span className="macro-panel-compact__unit">cal</span>
            </div>
            <div className="macro-panel-compact__macros">
              <span className="macro-panel-compact__macro macro-panel-compact__macro--protein">
                P: <AnimatedNumber value={totals.protein} suffix="g" />
              </span>
              <span className="macro-panel-compact__macro macro-panel-compact__macro--carbs">
                C: <AnimatedNumber value={totals.carbs} suffix="g" />
              </span>
              <span className="macro-panel-compact__macro macro-panel-compact__macro--fat">
                F: <AnimatedNumber value={totals.fat} suffix="g" />
              </span>
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onSave}
            disabled={!hasSelection}
            className="macro-panel-compact__save"
            style={{
              opacity: hasSelection ? 1 : 0.5,
              cursor: hasSelection ? 'pointer' : 'not-allowed',
            }}
          >
            Save
          </motion.button>
        </div>

        {/* Always-visible details */}
        <div className="macro-panel-compact__expanded">
          <div className="macro-panel-compact__details">
            {/* Mini donut */}
            <div className="macro-panel-compact__chart">
              <MiniDonut
                protein={totals.protein}
                carbs={totals.carbs}
                fat={totals.fat}
              />
            </div>

            {/* Macro breakdown */}
            <div className="macro-panel-compact__breakdown">
              <div className="macro-panel-compact__row">
                <span className="macro-panel-compact__label">
                  <span className="macro-panel-compact__dot macro-panel-compact__dot--protein" />
                  Protein
                </span>
                <span className="macro-panel-compact__value">
                  <AnimatedNumber value={totals.protein} suffix="g" />
                </span>
              </div>
              <div className="macro-panel-compact__row">
                <span className="macro-panel-compact__label">
                  <span className="macro-panel-compact__dot macro-panel-compact__dot--carbs" />
                  Carbs
                </span>
                <span className="macro-panel-compact__value">
                  <AnimatedNumber value={totals.carbs} suffix="g" />
                </span>
              </div>
              <div className="macro-panel-compact__row">
                <span className="macro-panel-compact__label">
                  <span className="macro-panel-compact__dot macro-panel-compact__dot--fat" />
                  Fat
                </span>
                <span className="macro-panel-compact__value">
                  <AnimatedNumber value={totals.fat} suffix="g" />
                </span>
              </div>
            </div>
          </div>
        </div>

        <style>{`
          .macro-panel-compact {
            background: rgba(250, 250, 247, 0.98);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
          }

          .macro-panel-compact__bar {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.75rem 1rem;
          }

          .macro-panel-compact__summary {
            flex: 1;
            display: flex;
            align-items: center;
            gap: 1rem;
          }

          .macro-panel-compact__calories {
            font-family: var(--font-display);
            font-size: 1.5rem;
            font-weight: 300;
            color: var(--forest);
            line-height: 1;
          }

          .macro-panel-compact__unit {
            font-family: var(--font-body);
            font-size: 0.625rem;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            color: var(--warm-grey);
            margin-left: 0.25rem;
          }

          .macro-panel-compact__macros {
            display: flex;
            gap: 0.75rem;
          }

          .macro-panel-compact__macro {
            font-family: var(--font-body);
            font-size: 0.6875rem;
            letter-spacing: 0.05em;
          }

          .macro-panel-compact__macro--protein {
            color: var(--forest);
          }

          .macro-panel-compact__macro--carbs {
            color: var(--terracotta);
          }

          .macro-panel-compact__macro--fat {
            color: var(--warm-grey);
          }

          .macro-panel-compact__save {
            padding: 0.625rem 1.25rem;
            font-family: var(--font-body);
            font-size: 0.6875rem;
            letter-spacing: 0.15em;
            text-transform: uppercase;
            color: var(--white);
            background-color: var(--terracotta);
            border: none;
            border-radius: 4px;
            white-space: nowrap;
          }

          .macro-panel-compact__expanded {
            overflow: hidden;
            border-top: 1px solid rgba(28, 46, 30, 0.08);
          }

          .macro-panel-compact__details {
            padding: 1rem;
            display: grid;
            grid-template-columns: auto 1fr;
            gap: 1rem;
            align-items: start;
          }

          .macro-panel-compact__chart {
            grid-row: span 2;
          }

          .macro-panel-compact__breakdown {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
          }

          .macro-panel-compact__row {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .macro-panel-compact__label {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-family: var(--font-body);
            font-size: 0.75rem;
            color: var(--warm-grey);
          }

          .macro-panel-compact__dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
          }

          .macro-panel-compact__dot--protein {
            background-color: var(--forest);
          }

          .macro-panel-compact__dot--carbs {
            background-color: var(--terracotta);
          }

          .macro-panel-compact__dot--fat {
            background-color: var(--warm-grey);
          }

          .macro-panel-compact__value {
            font-family: var(--font-display);
            font-size: 0.875rem;
            color: var(--forest);
          }

        `}</style>
      </div>
    );
  }

  // Full desktop version
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

function MiniDonut({ protein, carbs, fat }: { protein: number; carbs: number; fat: number }) {
  const total = protein + carbs + fat;
  const radius = 40;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;

  const proteinLength = total > 0 ? (protein / total) * circumference : 0;
  const carbsLength = total > 0 ? (carbs / total) * circumference : 0;
  const fatLength = total > 0 ? (fat / total) * circumference : 0;

  const proteinOffset = 0;
  const carbsOffset = proteinLength;
  const fatOffset = proteinLength + carbsLength;

  return (
    <svg width="100" height="100" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        stroke="rgba(28, 46, 30, 0.08)"
        strokeWidth={strokeWidth}
      />
      <motion.circle
        cx="50"
        cy="50"
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
        transition={{ duration: 0.4 }}
      />
      <motion.circle
        cx="50"
        cy="50"
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
        transition={{ duration: 0.4 }}
      />
      <motion.circle
        cx="50"
        cy="50"
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
        transition={{ duration: 0.4 }}
      />
    </svg>
  );
}
