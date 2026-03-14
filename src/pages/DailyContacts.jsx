import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Users, Check, Instagram, Mail, Clock, AlertTriangle } from 'lucide-react';
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

  const markContactedYT = useMutation({
    mutationFn: (id) => base44.entities.YouTubeProducer.update(id, {
      status: 'contactado',
      date_contacted: new Date().toISOString().split('T')[0],
      last_action: new Date().toISOString().split('T')[0],
      next_follow_up: addDays(1),
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['youtube-producers'] }); toast.success('Marked as contacted — follow up in 24h'); },
  });

  const markContactedPL = useMutation({
    mutationFn: (id) => base44.entities.PlacementProducer.update(id, {
      status: 'contactado',
      last_action: new Date().toISOString().split('T')[0],
      next_follow_up: addDays(1),
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['placement-producers'] }); toast.success('Marked as contacted — follow up in 24h'); },
  });

  const advanceFollowUpYT = useMutation({
    mutationFn: ({ id, currentStatus, re_dms }) => {
      const followUps = ['follow up 1','follow up 2','follow up 3','follow up 4','follow up 5'];
      const idx = followUps.indexOf(currentStatus);
      const nextStatus = idx < followUps.length - 1 ? followUps[idx + 1] : 'archivado';
      // If ReDms = no, archive instead
      const finalStatus = re_dms === 'no' ? 'archivado' : nextStatus;
      return base44.entities.YouTubeProducer.update(id, {
        status: finalStatus,
        last_action: new Date().toISOString().split('T')[0],
        next_follow_up: finalStatus === 'archivado' ? null : addDays(7),
      });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['youtube-producers'] }); toast.success('Follow up advanced'); },
  });

  const advanceFollowUpPL = useMutation({
    mutationFn: ({ id, currentStatus, re_dms }) => {
      const followUps = ['follow up 1','follow up 2','follow up 3','follow up 4','follow up 5'];
      const idx = followUps.indexOf(currentStatus);
      const nextStatus = idx < followUps.length - 1 ? followUps[idx + 1] : 'archivado';
      const finalStatus = re_dms === 'no' ? 'archivado' : nextStatus;
      return base44.entities.PlacementProducer.update(id, {
        status: finalStatus,
        last_action: new Date().toISOString().split('T')[0],
        next_follow_up: finalStatus === 'archivado' ? null : addDays(7),
      });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['placement-producers'] }); toast.success('Follow up advanced'); },
  });

  const HIDDEN = ['archivado', 'eliminado'];
  const today = new Date(); today.setHours(0,0,0,0);

  // Top pending to contact
  const allPending = [
    ...ytProducers.filter(p => p.status === 'por contactar').map(p => ({ ...p, _type: 'yt' })),
    ...plProducers.filter(p => p.status === 'por contactar').map(p => ({ ...p, _type: 'pl' })),
  ].sort((a, b) => (b.priority || 0) - (a.priority || 0)).slice(0, 10);

  // Follow-ups due (next_follow_up <= today, or status startsWith follow up with overdue date)
  const followUpsDue = [
    ...ytProducers.filter(p => p.status?.startsWith('follow up') && !HIDDEN.includes(p.status)).map(p => ({ ...p, _type: 'yt' })),
    ...plProducers.filter(p => p.status?.startsWith('follow up') && !HIDDEN.includes(p.status)).map(p => ({ ...p, _type: 'pl' })),
  ].filter(p => {
    if (!p.next_follow_up) return true; // no date set = show anyway
    const d = new Date(p.next_follow_up); d.setHours(0,0,0,0);
    return d <= new Date(today.getTime() + 2 * 86400000); // due within 2 days
  }).sort((a, b) => {
    const da = a.next_follow_up ? new Date(a.next_follow_up) : new Date(0);
    const db = b.next_follow_up ? new Date(b.next_follow_up) : new Date(0);
    return da - db;
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Daily Contacts</h1>
        <p className="text-[#71717a] text-sm mt-1">Top producers to reach out to today</p>
      </div>

      {/* Follow-ups due — shown first if any */}
      {followUpsDue.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-white">Follow Ups Due</h2>
            <span className="text-xs bg-amber-400/10 text-amber-400 border border-amber-400/20 px-2 py-0.5 rounded-full">{followUpsDue.length}</span>
          </div>
          <div className="bg-[#18181b] border border-[#27272a] rounded-xl divide-y divide-[#27272a]">
            {followUpsDue.map(p => {
              const fu = formatFollowUpDate(p.next_follow_up);
              return (
                <div key={p.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white">{p.name}</p>
                      <StatusBadge status={p.status} />
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      {p.instagram && <span className="text-xs text-[#71717a]">{p.instagram}</span>}
                      {fu && <span className={`text-xs ${fu.color} flex items-center gap-1`}><Clock className="w-3 h-3" />{fu.label}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <PriorityBar score={p.priority || 0} max={p._type === 'yt' ? 8 : 10} />
                    <Button size="sm" variant="ghost" onClick={() => p._type === 'yt'
                      ? advanceFollowUpYT.mutate({ id: p.id, currentStatus: p.status, re_dms: p.re_dms })
                      : advanceFollowUpPL.mutate({ id: p.id, currentStatus: p.status, re_dms: p.re_dms })}
                      className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10">
                      <Check className="w-4 h-4 mr-1" /> Done
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Today's Top 10 to contact */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-[#3b82f6]" />
          <h2 className="text-lg font-semibold text-white">Today's Top 10</h2>
        </div>
        <div className="grid gap-3">
          {allPending.length === 0 && (
            <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-8 text-center text-[#3f3f46]">
              No producers pending. Run discovery to find new producers!
            </div>
          )}
          {allPending.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
              className="bg-[#18181b] border border-[#27272a] rounded-xl p-4 flex items-center gap-4 hover:border-[#3f3f46] transition-colors">
              <div className="w-8 h-8 rounded-lg bg-[#2563eb]/10 flex items-center justify-center text-sm font-bold text-[#3b82f6] flex-shrink-0">{i + 1}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-white truncate">{p.name}</p>
                  {p.style && <span className={`text-xs ${styleColors[p.style?.split(',')[0]?.trim()] || 'text-zinc-400'}`}>{p.style.split(',')[0].trim()}</span>}
                </div>
                <div className="flex items-center gap-3 mt-1">
                  {p.instagram && (
                    <a href={`https://instagram.com/${p.instagram.replace('@','')}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-[#71717a] hover:text-[#3b82f6] transition-colors">
                      <Instagram className="w-3 h-3" />{p.instagram}
                    </a>
                  )}
                  {p.email && <a href={`mailto:${p.email}`} className="flex items-center gap-1 text-xs text-[#71717a] hover:text-[#3b82f6] transition-colors"><Mail className="w-3 h-3" />{p.email}</a>}
                  <span className="text-xs text-[#3f3f46]">{p.followers_ig ? `${p.followers_ig.toLocaleString()} followers` : 'No IG data'}</span>
                </div>
              </div>
              <PriorityBar score={p.priority || 0} max={p._type === 'yt' ? 8 : 10} />
              <Button size="sm" variant="ghost"
                onClick={() => p._type === 'yt' ? markContactedYT.mutate(p.id) : markContactedPL.mutate(p.id)}
                className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10">
                <Check className="w-4 h-4 mr-1" /> Contacted
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}