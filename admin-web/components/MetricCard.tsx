// components/MetricCard.tsx
'use client';

import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

interface MetricCardProps {
  title: string;
  value: number;
  prefix?: string;
  suffix?: string;
  isCurrency?: boolean;
  icon?: React.ReactNode;
  subtitle?: string;
  color?: 'emerald' | 'rose' | 'amber' | 'blue' | 'purple' | 'slate';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  prefix = '',
  suffix = '',
  isCurrency = false,
  icon,
  subtitle,
  color = 'slate',
}) => {
  const numberRef = useRef<HTMLSpanElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!numberRef.current) return;

    // Use GSAP strictly for numerical counter interpolation
    const obj = { val: 0 };
    const ctx = gsap.context(() => {
      gsap.to(obj, {
        val: value,
        duration: 1.2,
        ease: 'power2.out',
        onUpdate: () => {
          if (!numberRef.current) return;
          const currentVal = obj.val;
          if (isCurrency) {
            const formatted = new Intl.NumberFormat('en-PK', {
              maximumFractionDigits: currentVal % 1 !== 0 ? 2 : 0,
            }).format(currentVal);
            numberRef.current.textContent = `Rs. ${formatted}`;
          } else {
            numberRef.current.textContent = `${prefix}${Math.round(currentVal).toLocaleString()}${suffix}`;
          }
        },
      });
    }, cardRef);

    return () => ctx.revert();
  }, [value, prefix, suffix, isCurrency]);

  const colorClasses = {
    emerald: 'border-emerald-500/20 bg-emerald-950/10 text-emerald-400',
    rose: 'border-rose-500/20 bg-rose-950/10 text-rose-400',
    amber: 'border-amber-500/20 bg-amber-950/10 text-amber-400',
    blue: 'border-sky-500/20 bg-sky-950/10 text-sky-400',
    purple: 'border-purple-500/20 bg-purple-950/10 text-purple-400',
    slate: 'border-slate-800 bg-slate-900/50 text-slate-400',
  };

  return (
    <div
      ref={cardRef}
      className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md relative overflow-hidden transition-all duration-200 hover:border-slate-700/80 hover:shadow-lg hover:shadow-black/40"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
          {title}
        </span>
        {icon && (
          <div className={`p-2 rounded-xl border ${colorClasses[color]}`}>
            {icon}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-1">
        <span
          ref={numberRef}
          className="text-2xl lg:text-3xl font-bold font-mono text-slate-100 tracking-tight"
        >
          {isCurrency ? `Rs. ${value.toLocaleString()}` : `${prefix}${value}${suffix}`}
        </span>
      </div>

      {subtitle && (
        <p className="mt-2 text-xs text-slate-500 flex items-center gap-1.5">
          {subtitle}
        </p>
      )}
    </div>
  );
};
