import React from 'react';
import { cn } from '@/lib/utils';

const statusColors = {
  'por contactar': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'contactado': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'follow up 1': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'follow up 2': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'follow up 3': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  'follow up 4': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  'follow up 5': 'bg-red-500/10 text-red-400 border-red-500/20',
  'archivado': 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  'eliminado': 'bg-red-500/10 text-red-500 border-red-500/20',
  'running': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'completed': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'failed': 'bg-red-500/10 text-red-400 border-red-500/20',
};

export default function StatusBadge({ status }) {
  const colors = statusColors[status] || 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border capitalize",
      colors
    )}>
      {status}
    </span>
  );
}