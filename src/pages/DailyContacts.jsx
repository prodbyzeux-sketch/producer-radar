import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { MessageCircle, RefreshCw, Check, Instagram, Mail, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import PriorityBar from '@/components/shared/PriorityBar';
import StatusBadge from '@/components/shared/StatusBadge';
import { toast } from 'sonner';

const styleColors = {
  'Juice WRLD': 'text-purple-400','Polo G': 'text-sky-400','Rod Wave': 'text-teal-400',
  'NBA YoungBoy': 'text-red-400','Melodic Trap': 'text-indigo-400','Emo Trap': 'text-pink-400','Other': 'text-zinc-400',
};

function addDays(n) {
  const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().split('T')[0];
}

function formatFollowUpDate(dateStr) {
  if (!dateStr) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(dateStr); d.setHours(0,0,0,0);
  const diff = Math.round((d - today) / 86400000);
  if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, color: 'text-red-400' };
  if (diff === 0) return { label: 'Today', color: 'text-amber-400' };
  if (diff === 1) return { label: 'Tomorrow', color: 'text-emerald-400' };
  return { label: `in ${diff}d`, color: 'text-[#71717a]' };
}

export default function DailyContacts() {
  const queryClient = useQueryClient();

  const { data: ytProducers = [] } = useQuery({
    queryKey: ['youtube-producers'],
    queryFn: () => base44.entities.YouTubeProducer.list('-priority', 200),
  });
  const { data: plProducers = [] } = useQuery({
    queryKey: ['placement-producers'],
    queryFn: () => base44.entities.PlacementProducer.list('-priority', 200),
  });

  // Mark as contacted:
  // - si re_dms === 'no' → saltar a follow up 4 con next_follow_up = +7 días
  // - si no → status = 'contactado', next_follow_up = +1 día
  const markContactedYT = useMutation({
    mutationFn: ({ id, re_dms }) => {
      const today = new Date().toISOString().split('T')[0];
      if (re_dms === 'no') {
        return base44.entities.YouTubeProducer.update(id, {
          status: 'follow up 4',
          date_contacted: today,
          last_action: today,
          next_follow_up: addDays(7),
        });
      }
      return base44.entities.YouTubeProducer.update(id, {
        status: 'contactado',
        date_contacted: today,
        last_action: today,
        next_follow_up: addDays(1),
      });
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['youtube-producers'] });
      toast.success(vars.re_dms === 'no' ? 'Re-DMs no → Follow up 4 in 7 days' : 'Marked as contacted');
    },
  });

  const markContactedPL = useMutation({
    mutationFn: ({ id, re_dms }) => {
      const today = new Date().toISOString().split('T')[0];
      if (re_dms === 'no') {
        return base44.entities.PlacementProducer.update(id, {
          status: 'follow up 4',
          last_action: today,
          next_follow_up: addDays(7),
        });
      }
      return base44.entities.PlacementProducer.update(id, {
        status: 'contactado',
        last_action: today,
        next_follow_up: addDays(1),
      });
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['placement-producers'] });
      toast.success(vars.re_dms === 'no' ? 'Re-DMs no → Follow up 4 in 7 days' : 'Marked as contacted');
    },
  });

  // Advance follow up: siguiente paso, si re_dms=no y ya está en follow up 4+ → archivar
  const advanceFollowUpYT = useMutation({
    mutationFn: ({ id, currentStatus, re_dms }) => {
      const followUps = ['follow up 1','follow up 2','follow up 3','follow up 4','follow up 5'];
      const idx = followUps.indexOf(currentStatus);
      const nextStatus = idx < followUps.length - 1 ? followUps[idx + 1] : 'archivado';
      const finalStatus = (re_dms === 'no' && idx >= 3) ? 'archivado' : nextStatus;
      return base44.entities.YouTubeProducer.update(id, {
        status: finalStatus,
        last_action: new Date().toISOString().split('T')[0],
        next_follow_up: finalStatus === 'archivado' ? null : addDays(7),
      });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['youtube-producers'] }); toast.success('Follow up avanzado'); },
  });

  const advanceFollowUpPL = useMutation({
    mutationFn: ({ id, currentStatus, re_dms }) => {
      const followUps = ['follow up 1','follow up 2','follow up 3','follow up 4','follow up 5'];
      const idx = followUps.indexOf(currentStatus);
      const nextStatus = idx < followUps.length - 1 ? followUps[idx + 1] : 'archivado';
      const finalStatus = (re_dms === 'no' && idx >= 3) ? 'archivado' : nextStatus;
      return base44.entities.PlacementProducer.update(id, {
        status: finalStatus,
        last_action: new Date().toISOString().split('T')[0],
        next_follow_up: finalStatus === 'archivado' ? null : addDays(7),
      });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['placement-producers'] }); toast.success('Follow up avanzado'); },
  });

  const today = new Date(); today.setHours(0,0,0,0);

  // Daily DMs: solo por contactar, top por prioridad
  const dailyDMs = [
    ...ytProducers.filter(p => p.status === 'por contactar').map(p => ({ ...p, _type: 'yt' })),
    ...plProducers.filter(p => p.status === 'por contactar').map(p => ({ ...p, _type: 'pl' })),
  ].sort((a, b) => (b.priority || 0) - (a.priority || 0)).slice(0, 10);

  // Follow ups pendientes: contactado (24h espera) + follow up X con fecha <= hoy
  const followUpsDue = [
    ...ytProducers.filter(p => p.status?.startsWith('follow up') || p.status === 'contactado').map(p => ({ ...p, _type: 'yt' })),
    ...plProducers.filter(p => p.status?.startsWith('follow up') || p.status === 'contactado').map(p => ({ ...p, _type: 'pl' })),
  ].filter(p => {
    if (!p.next_follow_up) return true;
    const d = new Date(p.next_follow_up); d.setHours(0,0,0,0);
    return d <= today;
  }).sort((a, b) => {
    const da = a.next_follow_up ? new Date(a.next_follow_up) : new Date(0);
    const db = b.next_follow_up ? new Date(b.next_follow_up) : new Date(0);
    return da - db;
  });

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-white">Daily Outreach</h1>
        <p className="text-[#71717a] text-sm mt-1">DMs del día y follow ups pendientes</p>
      </div>

      {/* ── Follow Ups Pendientes ── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <RefreshCw className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-semibold text-white">Follow Ups Pendientes</h2>
          <span className="text-xs bg-amber-400/10 text-amber-400 border border-amber-400/20 px-2 py-0.5 rounded-full">
            {followUpsDue.length}
          </span>
        </div>

        {followUpsDue.length === 0 ? (
          <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-8 text-center text-[#3f3f46]">
            No hay follow ups pendientes para hoy 🎉
          </div>
        ) : (
          <div className="bg-[#18181b] border border-[#27272a] rounded-xl divide-y divide-[#27272a]">
            {followUpsDue.map(p => {
              const fu = formatFollowUpDate(p.next_follow_up);
              return (
                <div key={p.id} className="flex items-center justify-between px-5 py-3 hover:bg-white/[0.02]">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-white">{p.name}</p>
                      <StatusBadge status={p.status} />
                      {p.re_dms === 'no' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                          Re-DMs: NO
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      {p.instagram && <span className="text-xs text-[#71717a]">{p.instagram}</span>}
                      {fu && (
                        <span className={`text-xs ${fu.color} flex items-center gap-1`}>
                          <Clock className="w-3 h-3" />{fu.label}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <PriorityBar score={p.priority || 0} max={p._type === 'yt' ? 8 : 10} />
                    <Button size="sm" variant="ghost"
                      onClick={() => p._type === 'yt'
                        ? advanceFollowUpYT.mutate({ id: p.id, currentStatus: p.status, re_dms: p.re_dms })
                        : advanceFollowUpPL.mutate({ id: p.id, currentStatus: p.status, re_dms: p.re_dms })}
                      className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 whitespace-nowrap">
                      <Check className="w-4 h-4 mr-1" /> Hecho
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Daily DMs ── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <MessageCircle className="w-5 h-5 text-[#3b82f6]" />
          <h2 className="text-lg font-semibold text-white">Daily DMs</h2>
          <span className="text-xs bg-[#2563eb]/10 text-[#3b82f6] border border-[#2563eb]/20 px-2 py-0.5 rounded-full">
            Top {dailyDMs.length}
          </span>
        </div>

        {dailyDMs.length === 0 ? (
          <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-8 text-center text-[#3f3f46]">
            No hay productores pendientes. ¡Usa Discovery para encontrar nuevos!
          </div>
        ) : (
          <div className="grid gap-3">
            {dailyDMs.map((p, i) => (
              <motion.div key={p.id}
                initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                className="bg-[#18181b] border border-[#27272a] rounded-xl p-4 flex items-center gap-4 hover:border-[#3f3f46] transition-colors">
                <div className="w-8 h-8 rounded-lg bg-[#2563eb]/10 flex items-center justify-center text-sm font-bold text-[#3b82f6] flex-shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-white truncate">{p.name}</p>
                    {p.style && <span className={`text-xs ${styleColors[p.style?.split(',')[0]?.trim()] || 'text-zinc-400'}`}>{p.style.split(',')[0].trim()}</span>}
                    {p.re_dms === 'no' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                        Re-DMs: NO → FU4
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    {p.instagram && (
                      <a href={`https://instagram.com/${p.instagram.replace('@','')}`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-[#71717a] hover:text-[#3b82f6] transition-colors">
                        <Instagram className="w-3 h-3" />{p.instagram}
                      </a>
                    )}
                    {p.email && (
                      <a href={`mailto:${p.email}`} className="flex items-center gap-1 text-xs text-[#71717a] hover:text-[#3b82f6] transition-colors">
                        <Mail className="w-3 h-3" />{p.email}
                      </a>
                    )}
                    <span className="text-xs text-[#3f3f46]">
                      {p.followers_ig ? `${p.followers_ig.toLocaleString()} followers` : ''}
                    </span>
                  </div>
                </div>
                <PriorityBar score={p.priority || 0} max={p._type === 'yt' ? 8 : 10} />
                <Button size="sm" variant="ghost"
                  onClick={() => p._type === 'yt'
                    ? markContactedYT.mutate({ id: p.id, re_dms: p.re_dms })
                    : markContactedPL.mutate({ id: p.id, re_dms: p.re_dms })}
                  className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 whitespace-nowrap">
                  <Check className="w-4 h-4 mr-1" /> Enviado
                </Button>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}