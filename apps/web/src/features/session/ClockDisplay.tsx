import { formatClockTime } from '@et-chess/config';
import { Timer } from 'lucide-react';

export interface ClockDisplayProps {
  timeMs: number;
  isActive: boolean;
  color?: 'white' | 'black';
  label?: string;
}

export function ClockDisplay({ timeMs, isActive, color = 'white', label }: ClockDisplayProps) {
  const isLowTime = timeMs <= 20000 && timeMs > 0;
  const isVeryLow = timeMs <= 10000 && timeMs > 0;
  const isZero = timeMs <= 0;

  return (
    <div
      data-testid={`clock-display-${color}`}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono font-bold text-base transition-all duration-150 border select-none ${
        isZero
          ? 'bg-red-950/70 border-red-500 text-red-300'
          : isVeryLow && isActive
            ? 'bg-red-900/60 border-red-500 text-red-200 animate-pulse ring-2 ring-red-500/50'
            : isLowTime && isActive
              ? 'bg-amber-900/40 border-amber-500 text-amber-200'
              : isActive
                ? 'bg-surface-accent border-brand-green text-text-primary shadow-sm ring-1 ring-brand-green/30'
                : 'bg-surface-card border-surface-border text-text-muted opacity-80'
      }`}
    >
      <Timer
        className={`w-4 h-4 ${
          isActive
            ? isVeryLow
              ? 'text-red-400 animate-bounce'
              : 'text-brand-green animate-pulse'
            : 'text-text-muted'
        }`}
      />
      <div className="flex flex-col items-end">
        {label && <span className="text-[9px] uppercase tracking-wider opacity-75">{label}</span>}
        <span data-testid={`clock-time-${color}`} className="tracking-tight">
          {formatClockTime(timeMs)}
        </span>
      </div>
    </div>
  );
}

export default ClockDisplay;
