import React from 'react';
import { cn } from '@/lib/utils';

const statusColors = {
  'por contactar': 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  'contactado': 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  'follow up 1': 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  'follow up 2': 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  'follow up 3': 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  'follow up 4': 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  'follow up 5': 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  'connection': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 font-semibold shadow-[0_0_8px_rgba(52,211,153,0.25)]',
  'archivado': 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
  'eliminado': 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
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