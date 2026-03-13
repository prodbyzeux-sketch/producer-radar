import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import StatusBadge from './StatusBadge';
import PriorityBar from './PriorityBar';
import { Instagram, Youtube } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const styleColors = {
  'Juice WRLD': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  'Polo G': 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  'Rod Wave': 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  'NBA YoungBoy': 'bg-red-500/10 text-red-400 border-red-500/20',
  'Melodic Trap': 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  'Emo Trap': 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  'Other': 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
};

export default function ProducerTable({ producers, onRowClick, showArtist = false, selectedIds, onToggleSelect, onToggleAll }) {
  const allSelected = producers.length > 0 && producers.every(p => selectedIds?.has(p.id));
  const someSelected = producers.some(p => selectedIds?.has(p.id));
  const multiSelectMode = !!selectedIds;

  return (
    <div className="bg-[#18181b] border border-[#27272a] rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-[#27272a] hover:bg-transparent">
              {multiSelectMode && (
                <TableHead className="w-10 pl-4">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                    onChange={() => onToggleAll?.()}
                    className="w-4 h-4 rounded border-[#3f3f46] bg-[#0f0f10] accent-[#2563eb] cursor-pointer"
                  />
                </TableHead>
              )}
              <TableHead className="text-[#71717a] text-xs font-medium">Name</TableHead>
              <TableHead className="text-[#71717a] text-xs font-medium">Instagram</TableHead>
              <TableHead className="text-[#71717a] text-xs font-medium">Followers</TableHead>
              <TableHead className="text-[#71717a] text-xs font-medium">Style</TableHead>
              {showArtist && <TableHead className="text-[#71717a] text-xs font-medium">Artist</TableHead>}
              <TableHead className="text-[#71717a] text-xs font-medium">YouTube</TableHead>
              <TableHead className="text-[#71717a] text-xs font-medium">Priority</TableHead>
              <TableHead className="text-[#71717a] text-xs font-medium">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence>
              {producers.map((producer, idx) => {
                const isSelected = selectedIds?.has(producer.id);
                return (
                  <motion.tr
                    key={producer.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    className={`border-[#27272a] cursor-pointer transition-colors ${
                      isSelected ? 'bg-[#2563eb]/5' : 'hover:bg-white/[0.02]'
                    }`}
                    onClick={() => {
                      if (multiSelectMode) onToggleSelect?.(producer.id);
                      else onRowClick?.(producer);
                    }}
                  >
                    {multiSelectMode && (
                      <TableCell className="pl-4" onClick={e => { e.stopPropagation(); onToggleSelect?.(producer.id); }}>
                        <input
                          type="checkbox"
                          checked={isSelected || false}
                          onChange={() => onToggleSelect?.(producer.id)}
                          className="w-4 h-4 rounded border-[#3f3f46] bg-[#0f0f10] accent-[#2563eb] cursor-pointer"
                        />
                      </TableCell>
                    )}
                    <TableCell className="text-white font-medium text-sm">{producer.name}</TableCell>
                    <TableCell>
                      {producer.instagram ? (
                        <a
                          href={`https://instagram.com/${producer.instagram.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-[#a1a1aa] hover:text-[#3b82f6] transition-colors text-sm"
                          onClick={e => e.stopPropagation()}
                        >
                          <Instagram className="w-3.5 h-3.5" />
                          {producer.instagram}
                        </a>
                      ) : (
                        <span className="text-[#3f3f46] text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-[#a1a1aa] text-sm tabular-nums">
                      {producer.followers_ig ? producer.followers_ig.toLocaleString() : '—'}
                    </TableCell>
                    <TableCell>
                      {producer.style ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${styleColors[producer.style] || styleColors.Other}`}>
                          {producer.style}
                        </span>
                      ) : '—'}
                    </TableCell>
                    {showArtist && (
                      <TableCell className="text-[#a1a1aa] text-sm">{producer.artist || '—'}</TableCell>
                    )}
                    <TableCell>
                      {producer.youtube_channel_url ? (
                        <a
                          href={producer.youtube_channel_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-[#a1a1aa] hover:text-red-400 transition-colors text-sm"
                          onClick={e => e.stopPropagation()}
                          title={producer.youtube_channel || 'YouTube Channel'}
                        >
                          <Youtube className="w-3.5 h-3.5" />
                          <span className="max-w-[80px] truncate text-xs">{producer.youtube_channel || 'Channel'}</span>
                        </a>
                      ) : (
                        <span className="text-[#3f3f46] text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <PriorityBar score={producer.priority_score || 0} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={producer.status || 'por contactar'} />
                    </TableCell>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
            {producers.length === 0 && (
              <TableRow className="border-[#27272a]">
                <TableCell colSpan={showArtist ? 9 : 8} className="text-center py-12 text-[#3f3f46]">
                  No producers found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}