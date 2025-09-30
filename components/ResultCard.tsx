'use client';

import clsx from 'clsx';
import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface ResultCardProps {
  label: string;
  value: number | string | null;
  unit?: string;
  description?: string;
  icon?: ReactNode;
  isLoading?: boolean;
  accentFrom?: string;
  accentTo?: string;
}

const formatValue = (value: number | string | null): string => {
  if (value === null || value === undefined) return '--';
  if (typeof value === 'number') {
    if (Number.isNaN(value)) return '--';
    return value >= 100 ? value.toFixed(0) : value.toFixed(2);
  }
  return value;
};

export default function ResultCard({
  label,
  value,
  unit,
  description,
  icon,
  isLoading,
  accentFrom = '#38bdf8',
  accentTo = '#6366f1'
}: ResultCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={clsx(
        'glass glass-light flex h-full flex-col justify-between overflow-hidden p-6 text-slate-900',
        'shadow-2xl shadow-sky-500/10',
        'bg-gradient-to-br from-white/10 via-white/5 to-white/10 dark:text-slate-100 dark:from-white/5 dark:via-white/10 dark:to-white/5'
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-widest text-slate-700/70 dark:text-slate-300/60">{label}</p>
          <motion.p
            key={String(value)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="mt-3 text-4xl font-semibold md:text-5xl"
          >
            <span>
              {formatValue(isLoading ? null : value)}
              {unit ? <span className="ml-1 text-xl font-medium text-slate-500 dark:text-slate-300">{unit}</span> : null}
            </span>
          </motion.p>
        </div>
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br"
          style={{ backgroundImage: `linear-gradient(135deg, ${accentFrom}, ${accentTo})` }}
        >
          <div className="text-white">{icon}</div>
        </div>
      </div>
      {description ? (
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-300/80">{description}</p>
      ) : null}
    </motion.div>
  );
}
