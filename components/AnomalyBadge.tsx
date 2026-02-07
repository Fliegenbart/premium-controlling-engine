'use client';

import { AlertTriangle, AlertCircle, Info } from 'lucide-react';

interface AnomalyBadgeProps {
  hint?: string;
  type?: 'seasonal' | 'outlier' | 'trend_break' | 'unusual_single';
  severity?: 'info' | 'warning' | 'critical';
}

export function AnomalyBadge({ hint, type, severity }: AnomalyBadgeProps) {
  if (!hint || !severity) return null;

  const config = {
    critical: {
      icon: AlertTriangle,
      bg: 'bg-red-500/20',
      text: 'text-red-400',
      border: 'border-red-500/30',
    },
    warning: {
      icon: AlertCircle,
      bg: 'bg-yellow-500/20',
      text: 'text-yellow-400',
      border: 'border-yellow-500/30',
    },
    info: {
      icon: Info,
      bg: 'bg-fuchsia-500/[0.15]',
      text: 'text-fuchsia-200',
      border: 'border-fuchsia-500/25',
    },
  };

  const { icon: Icon, bg, text, border } = config[severity];

  return (
    <div className="group relative inline-flex">
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${bg} ${text} ${border} border`}
      >
        <Icon className="w-3 h-3" />
        <span className="hidden sm:inline max-w-[120px] truncate">{hint}</span>
      </span>

      {/* Tooltip on hover */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
        <div className={`px-3 py-2 rounded-lg ${bg} ${text} ${border} border text-xs whitespace-nowrap shadow-lg`}>
          <div className="font-medium mb-1">
            {type === 'seasonal' && 'Saisonale Anomalie'}
            {type === 'outlier' && 'Statistischer Ausreißer'}
            {type === 'trend_break' && 'Trendbruch'}
            {type === 'unusual_single' && 'Auffällige Einzelposition'}
          </div>
          <div className="text-white/80">{hint}</div>
        </div>
        {/* Arrow */}
        <div className={`absolute left-1/2 -translate-x-1/2 top-full w-2 h-2 ${bg} rotate-45 -mt-1`} />
      </div>
    </div>
  );
}
