import React from 'react';
import { cn } from '@/lib/utils';

export default function PriorityBar({ score = 0, max = 10 }) {
  const percentage = (score / max) * 100;
  const color = score >= 8 ? 'bg-emerald-500' : score >= 5 ? 'bg-amber-500' : 'bg-red-500';
  
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-[#27272a] rounded-full overflow-hidden max-w-[60px]">
        <div className={cn("h-full rounded-full transition-all", color)} 
          style={{ width: `${percentage}%` }} />
      </div>
      <span className="text-xs text-[#a1a1aa] font-medium tabular-nums">{score}</span>
    </div>
  );
}