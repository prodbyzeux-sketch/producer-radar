import React, { useRef } from 'react';
import { Table, TableBody, TableHead, TableHeader } from '@/components/ui/table';
import StatusBadge from './StatusBadge';
import { Instagram, Star, Youtube } from 'lucide-react';

const styleColors = {
  'Juice WRLD': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  'Polo G': 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  'Rod Wave': 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  'NBA YoungBoy': 'bg-red-500/10 text-red-400 border-red-500/20',
  'Melodic Trap': 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  'Emo Trap': 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  'Other': 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
};

function StyleTag({ value }) {
  if (!value) return <span className="text-[#3f3f46]">—</span>;
  const first = value.split(',')[0].trim();
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${styleColors[first] || styleColors.Other}`}>
      {first}
    </span>
  );
}

function formatFollowUp(dateStr) {
  if (!dateStr) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(dateStr); d.setHours(0,0,0,0);
  const diff = Math.round((d - today) / 86400000);
  if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, color: 'text-red-400' };
  if (diff === 0) return { label: 'Today', color: 'text-amber-400' };
  if (diff === 1) return { label: 'Tomorrow', color: 'text-emerald-400' };
  return { label: `in ${diff}d`, color: 'text-[#71717a]' };
}

function PriorityBadge({ score, max = 10 }) {
  if (!score) return <span className="text-[#3f3f46]">—</span>;
  const pct = score / max;
  const color = pct >= 0.75 ? 'text-emerald-400' : pct >= 0.5 ? 'text-amber-400' : 'text-[#71717a]';
  return <span className={`text-xs font-bold tabular-nums ${color}`}>{score}<span className="text-[#3f3f46] font-normal">/{max}</span></span>;
}

// columns: array of column keys to show
// Available: 'name', 'instagram', 'youtube', 'style', 'placements', 'priority', 'status', 'next_follow_up', 'type', 'last_action', 'phone'
export default function ProducerTable({
  producers,
  onRowClick,
  columns = ['name', 'instagram', 'style', 'priority', 'status'],
  producerType = 'youtube', // 'youtube' | 'placement' | 'mixed'
  selectedIds,
  onToggleSelect,
  onToggleAll,
  onToggleFavorite,
  onInstagramClick, // (producer) => void — called when IG link clicked
}) {
  const allSelected = producers.length > 0 && producers.every(p => selectedIds?.has(p.id));
  const someSelected = producers.some(p => selectedIds?.has(p.id));
  const lastClickedIdx = useRef(null);

  const handleCheckboxClick = (e, producerId, idx) => {
    e.stopPropagation();
    if (e.shiftKey && lastClickedIdx.current !== null) {
      const start = Math.min(lastClickedIdx.current, idx);
      const end = Math.max(lastClickedIdx.current, idx);
      producers.slice(start, end + 1).map(p => p.id).forEach(id => {
        if (!selectedIds?.has(id)) onToggleSelect?.(id);
      });
    } else {
      onToggleSelect?.(producerId);
    }
    lastClickedIdx.current = idx;
  };

  const maxPriority = producerType === 'youtube' ? 8 : 10;

  const colLabels = {
    name: 'Name',
    instagram: 'Instagram',
    youtube: 'YouTube',
    style: 'Style',
    placements: 'Placements',
    priority: 'Priority',
    status: 'Status',
    next_follow_up: 'Next FU',
    type: 'Type',
    last_action: 'Last Action',
    phone: 'Phone',
  };

  return (
    <div className="bg-[#18181b] border border-[#27272a] rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <tr className="border-b border-[#27272a]">
              <th className="w-9 pl-3 py-3">
                <input type="checkbox" checked={allSelected}
                  ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                  onChange={() => onToggleAll?.()}
                  className="w-3.5 h-3.5 rounded-sm cursor-pointer accent-[#3f3f46] opacity-40 hover:opacity-80 transition-opacity" />
              </th>
              <th className="w-7 py-3" />
              {columns.map(col => (
                <th key={col} className="text-[#71717a] text-xs font-medium px-4 py-3 text-left whitespace-nowrap">
                  {colLabels[col] || col}
                </th>
              ))}
            </tr>
          </TableHeader>
          <TableBody>
            {producers.map((producer, idx) => {
              const isSelected = selectedIds?.has(producer.id);
              const placements = producer.highlights_placements
                ? producer.highlights_placements.split(',').map(t => t.trim()).filter(Boolean).slice(0, 3)
                : [];
              const fu = formatFollowUp(producer.next_follow_up);
              const la = formatFollowUp(producer.last_action);
              // For mixed views, determine the per-row max
              const rowMax = producer._type === 'yt' || producerType === 'youtube' ? 8 : 10;

              return (
                <tr key={producer.id}
                  className={`border-b border-[#27272a] cursor-pointer transition-colors ${isSelected ? 'bg-[#1e2a3a]' : 'hover:bg-white/[0.02]'}`}
                  onClick={() => onRowClick?.(producer)}>

                  <td className="pl-3 py-2.5 w-9" onClick={e => handleCheckboxClick(e, producer.id, idx)}>
                    <input type="checkbox" checked={isSelected || false} onChange={() => {}}
                      className={`w-3.5 h-3.5 rounded-sm cursor-pointer transition-opacity ${isSelected ? 'accent-[#3b82f6] opacity-100' : 'accent-[#3f3f46] opacity-30 hover:opacity-70'}`} />
                  </td>

                  <td className="py-2.5 w-7" onClick={e => { e.stopPropagation(); onToggleFavorite?.(producer); }}>
                    <Star className={`w-3.5 h-3.5 transition-colors ${producer.favorite ? 'fill-amber-400 text-amber-400' : 'text-[#3f3f46] hover:text-amber-400'}`} />
                  </td>

                  {columns.map(col => (
                    <td key={col} className="py-2.5 px-4">
                      {col === 'name' && (
                        <span className="text-white font-medium text-sm whitespace-nowrap">{producer.name}</span>
                      )}
                      {col === 'instagram' && (() => {
                        const rawIg = producer.instagram || '';
                        const igUsername = rawIg
                          .replace(/^https?:\/\//i, '')
                          .replace(/^www\./i, '')
                          .replace(/^instagram\.com\//i, '')
                          .replace(/[/?#].*$/, '')
                          .replace(/^@/, '')
                          .trim();
                        return (
                          <span onClick={e => e.stopPropagation()}>
                            {igUsername ? (
                              <a
                                href={`https://instagram.com/${igUsername}`}
                                target="_blank" rel="noopener noreferrer"
                                onClick={() => onInstagramClick?.(producer)}
                                className="flex items-center gap-1.5 text-[#a1a1aa] hover:text-[#e1306c] transition-colors text-sm">
                                <Instagram className="w-3.5 h-3.5" />{igUsername}
                              </a>
                            ) : <span className="text-[#3f3f46] text-sm">—</span>}
                          </span>
                        );
                      })()}
                      {col === 'youtube' && (
                        <span onClick={e => e.stopPropagation()}>
                          {producer.youtube_channel_url ? (
                            <a href={producer.youtube_channel_url} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-[#a1a1aa] hover:text-red-400 transition-colors text-sm">
                              <Youtube className="w-3.5 h-3.5" />
                              <span className="truncate max-w-[120px]">{producer.youtube_channel || 'Channel'}</span>
                            </a>
                          ) : <span className="text-[#3f3f46] text-sm">—</span>}
                        </span>
                      )}
                      {col === 'style' && <StyleTag value={producer.style} />}
                      {col === 'placements' && (
                        placements.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {placements.map(a => <span key={a} className="px-1.5 py-0.5 bg-[#27272a] text-[#a1a1aa] rounded text-[10px]">{a}</span>)}
                            {producer.highlights_placements?.split(',').length > 3 && (
                              <span className="px-1.5 py-0.5 text-[#52525b] text-[10px]">+{producer.highlights_placements.split(',').length - 3}</span>
                            )}
                          </div>
                        ) : <span className="text-[#3f3f46] text-sm">—</span>
                      )}
                      {col === 'priority' && <PriorityBadge score={producer.priority} max={rowMax} />}
                      {col === 'status' && <StatusBadge status={producer.status || 'por contactar'} />}
                      {col === 'next_follow_up' && (
                        fu ? <span className={`text-xs ${fu.color}`}>{fu.label}</span> : <span className="text-[#3f3f46]">—</span>
                      )}
                      {col === 'last_action' && (
                        producer.last_action ? <span className="text-xs text-[#71717a]">{producer.last_action}</span> : <span className="text-[#3f3f46]">—</span>
                      )}
                      {col === 'type' && (
                        <span className={`text-xs px-2 py-0.5 rounded border ${producer._type === 'yt' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                          {producer._type === 'yt' ? 'YouTube' : 'Placement'}
                        </span>
                      )}
                      {col === 'phone' && (
                        <span className="text-sm text-[#a1a1aa]">{producer.phone || <span className="text-[#3f3f46]">—</span>}</span>
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
            {producers.length === 0 && (
              <tr><td colSpan={columns.length + 2} className="text-center py-12 text-[#3f3f46] text-sm">No producers found</td></tr>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}