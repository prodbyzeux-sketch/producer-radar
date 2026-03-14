import React, { useRef } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import StatusBadge from './StatusBadge';
import PriorityBar from './PriorityBar';
import { Instagram, Youtube } from 'lucide-react';

const styleColors = {
  'Juice WRLD': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  'Polo G': 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  'Rod Wave': 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  'NBA YoungBoy': 'bg-red-500/10 text-red-400 border-red-500/20',
  'Melodic Trap': 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  'Emo Trap': 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  'Other': 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
};

// Parse comma-separated style string and render first tag only in table
function StyleTag({ value }) {
  if (!value) return <span className="text-[#3f3f46]">—</span>;
  const first = value.split(',')[0].trim();
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${styleColors[first] || styleColors.Other}`}>
      {first}
    </span>
  );
}

export default function ProducerTable({
  producers,
  onRowClick,
  showArtist = false,
  showPlacements = true,
  selectedIds,
  onToggleSelect,
  onToggleAll,
}) {
  const allSelected = producers.length > 0 && producers.every(p => selectedIds?.has(p.id));
  const someSelected = producers.some(p => selectedIds?.has(p.id));
  const lastClickedIdx = useRef(null);

  const handleCheckboxClick = (e, producerId, idx) => {
    e.stopPropagation();
    // Shift-click: select range
    if (e.shiftKey && lastClickedIdx.current !== null) {
      const start = Math.min(lastClickedIdx.current, idx);
      const end = Math.max(lastClickedIdx.current, idx);
      const rangeIds = producers.slice(start, end + 1).map(p => p.id);
      rangeIds.forEach(id => {
        if (!selectedIds?.has(id)) onToggleSelect?.(id);
      });
    } else {
      onToggleSelect?.(producerId);
    }
    lastClickedIdx.current = idx;
  };

  return (
    <div className="bg-[#18181b] border border-[#27272a] rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-[#27272a] hover:bg-transparent">
              <TableHead className="w-9 pl-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                  onChange={() => onToggleAll?.()}
                  className="w-3.5 h-3.5 rounded-sm cursor-pointer accent-[#3b82f6]"
                />
              </TableHead>
              <TableHead className="text-[#71717a] text-xs font-medium">Name</TableHead>
              <TableHead className="text-[#71717a] text-xs font-medium">Instagram</TableHead>
              <TableHead className="text-[#71717a] text-xs font-medium">Followers</TableHead>
              <TableHead className="text-[#71717a] text-xs font-medium">Style</TableHead>
              {showArtist && <TableHead className="text-[#71717a] text-xs font-medium">Artist</TableHead>}
              {showPlacements && <TableHead className="text-[#71717a] text-xs font-medium">Placements</TableHead>}
              <TableHead className="text-[#71717a] text-xs font-medium">Priority</TableHead>
              <TableHead className="text-[#71717a] text-xs font-medium">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {producers.map((producer, idx) => {
              const isSelected = selectedIds?.has(producer.id);
              // Placements: comma-separated artist names
              const placements = producer.highlights_placements
                ? producer.highlights_placements.split(',').map(t => t.trim()).filter(Boolean).slice(0, 3)
                : [];

              return (
                <tr
                  key={producer.id}
                  className={`border-b border-[#27272a] cursor-pointer transition-colors ${
                    isSelected ? 'bg-[#1e2a3a]' : 'hover:bg-white/[0.02]'
                  }`}
                  onClick={() => onRowClick?.(producer)}
                >
                  {/* Checkbox cell — click stops propagation */}
                  <td
                    className="pl-3 py-2.5 w-9"
                    onClick={e => handleCheckboxClick(e, producer.id, idx)}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected || false}
                      onChange={() => {}}
                      className="w-3.5 h-3.5 rounded-sm cursor-pointer accent-[#3b82f6]"
                    />
                  </td>

                  <td className="py-2.5 px-4 text-white font-medium text-sm whitespace-nowrap">
                    {producer.name}
                  </td>

                  <td className="py-2.5 px-4" onClick={e => e.stopPropagation()}>
                    {producer.instagram ? (
                      <a
                        href={`https://instagram.com/${producer.instagram.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-[#a1a1aa] hover:text-[#e1306c] transition-colors text-sm"
                      >
                        <Instagram className="w-3.5 h-3.5" />
                        {producer.instagram}
                      </a>
                    ) : (
                      <span className="text-[#3f3f46] text-sm">—</span>
                    )}
                  </td>

                  <td className="py-2.5 px-4 text-[#a1a1aa] text-sm tabular-nums whitespace-nowrap">
                    {producer.followers_ig ? producer.followers_ig.toLocaleString() : '—'}
                  </td>

                  <td className="py-2.5 px-4">
                    <StyleTag value={producer.style} />
                  </td>

                  {showArtist && (
                    <td className="py-2.5 px-4 text-[#a1a1aa] text-sm">{producer.artist || '—'}</td>
                  )}

                  {/* Placements: artist tags */}
                  {showPlacements && (
                    <td className="py-2.5 px-4">
                      {placements.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {placements.map(a => (
                            <span key={a} className="px-1.5 py-0.5 bg-[#27272a] text-[#a1a1aa] rounded text-[10px]">{a}</span>
                          ))}
                          {producer.highlights_placements?.split(',').length > 3 && (
                            <span className="px-1.5 py-0.5 text-[#52525b] text-[10px]">+{producer.highlights_placements.split(',').length - 3}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[#3f3f46] text-sm">—</span>
                      )}
                    </td>
                  )}

                  <td className="py-2.5 px-4">
                    <PriorityBar score={producer.priority_score || 0} />
                  </td>

                  <td className="py-2.5 px-4">
                    <StatusBadge status={producer.status || 'por contactar'} />
                  </td>
                </tr>
              );
            })}
            {producers.length === 0 && (
              <tr>
                <td colSpan={showArtist ? (showPlacements ? 9 : 8) : (showPlacements ? 8 : 7)} className="text-center py-12 text-[#3f3f46] text-sm">
                  No producers found
                </td>
              </tr>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}