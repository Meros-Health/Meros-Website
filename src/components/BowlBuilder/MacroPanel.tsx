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
  // expanded state removed — compact panel is always open

  // Compact mobile version — single-row layout: calories | donut | macros
  if (compact) {
    return (
      <div className="macro-panel-compact">
        <div className="macro-panel-compact__row">
          {/* Left: Calories */}
          <div className="macro-panel-compact__calories">
            <span className="macro-panel-compact__cal-value">
              <AnimatedNumber value={totals.calories} />
            </span>
            <span className="macro-panel-compact__cal-unit">cal</span>
          </div>

          {/* Center: Mini donut */}
          <div className="macro-panel-compact__chart">
            <MiniDonut
              protein={totals.protein}
              carbs={totals.carbs}
              fat={totals.fat}
            />
          </div>

          {/* Right: Macro breakdown */}
          <div className="macro-panel-compact__macros">
            <div className="macro-panel-compact__macro">
              <span className="macro-panel-compact__dot macro-panel-compact__dot--protein" />
              <span className="macro-panel-compact__macro-value">
                <AnimatedNumber value={totals.protein} suffix="g" />
              </span>
              <span className="macro-panel-compact__macro-label">Protein</span>
            </div>
            <div className="macro-panel-compact__macro">
              <span className="macro-panel-compact__dot macro-panel-compact__dot--carbs" />
              <span className="macro-panel-compact__macro-value">
                <AnimatedNumber value={totals.carbs} suffix="g" />
              </span>
              <span className="macro-panel-compact__macro-label">Carbs</span>
            </div>
            <div className="macro-panel-compact__macro">
              <span className="macro-panel-compact__dot macro-panel-compact__dot--fat" />
              <span className="macro-panel-compact__macro-value">
                <AnimatedNumber value={totals.fat} suffix="g" />
              </span>
              <span className="macro-panel-compact__macro-label">Fat</span>
            </div>
          </div>

          {/* Save button */}
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

        <style>{`
          .macro-panel-compact {
            background: rgba(250, 250, 247, 0.98);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
          }

          .macro-panel-compact__row {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.625rem 1rem;
          }

          .macro-panel-compact__calories {
            display: flex;
            flex-direction: column;
            align-items: center;
            min-width: 3rem;
          }

          .macro-panel-compact__cal-value {
            font-family: var(--font-display);
            font-size: 1.375rem;
            font-weight: 300;
            color: var(--forest);
            line-height: 1;
          }

          .macro-panel-compact__cal-unit {
            font-family: var(--font-body);
            font-size: 0.5625rem;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            color: var(--warm-grey);
          }

          .macro-panel-compact__chart {
            flex-shrink: 0;
          }

          .macro-panel-compact__chart svg {
            width: 56px;
            height: 56px;
          }

          .macro-panel-compact__macros {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 0.1875rem;
          }

          .macro-panel-compact__macro {
            display: flex;
            align-items: center;
            gap: 0.375rem;
          }

          .macro-panel-compact__dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            flex-shrink: 0;
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

          .macro-panel-compact__macro-value {
            font-family: var(--font-display);
            font-size: 0.75rem;
            color: var(--forest);
            line-height: 1;
            min-width: 1.75rem;
          }

          .macro-panel-compact__macro-label {
            font-family: var(--font-body);
            font-size: 0.5625rem;
            letter-spacing: 0.05em;
            text-transform: uppercase;
            color: var(--warm-grey);
          }

          .macro-panel-compact__save {
            padding: 0.5rem 0.875rem;
            font-family: var(--font-body);
            font-size: 0.625rem;
            letter-spacing: 0.15em;
            text-transform: uppercase;
            color: var(--white);
            background-color: var(--terracotta);
            border: none;
            border-radius: 4px;
            white-space: nowrap;
            flex-shrink: 0;
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
