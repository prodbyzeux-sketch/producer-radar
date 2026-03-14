import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Star, Instagram, Youtube, Clock, Users, Zap, Heart, Send, LayoutGrid, Youtube as YTIcon } from 'lucide-react';
import StatusBadge from '@/components/shared/StatusBadge';
import PriorityBar from '@/components/shared/PriorityBar';
import ProducerProfile from '@/components/shared/ProducerProfile';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const FOLLOW_UP_STATUSES = ['contactado', 'follow up 1', 'follow up 2', 'follow up 3', 'follow up 4', 'follow up 5'];
const SEND_PACK_CHANNELS = ['ig', 'instagram', 'facetime', 'email', 'whatsapp', 'phone'];

const VIEWS = [
  { id: 'all', label: 'All', icon: Users },
  { id: 'youtube', label: 'YouTube', icon: Youtube },
  { id: 'placement', label: 'Placement', icon: LayoutGrid },
  { id: 'followups', label: 'Follow Ups', icon: Clock },
  { id: 'sendpacks', label: 'Send Packs', icon: Send },
  { id: 'favorites', label: 'Favorites', icon: Star },
];

function formatFollowUp(dateStr) {
  if (!dateStr) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(dateStr); d.setHours(0,0,0,0);
  const diff = Math.round((d - today) / 86400000);
  if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, color: 'text-red-400' };
  if (diff === 0) return { label: 'Today', color: 'text-amber-400' };
  if (diff === 1) return { label: 'Tomorrow', color: 'text-emerald-400' };
  if (diff <= 7) return { label: `in ${diff}d`, color: 'text-[#71717a]' };
  return null;
}

function hasSendPackChannel(producer) {
  const donde = (producer.donde_enviar || '').toLowerCase();
  return SEND_PACK_CHANNELS.some(c => donde.includes(c));
}

function ProducerCard({ producer, onClick, onToggleFavorite }) {
  const fu = formatFollowUp(producer.next_follow_up);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-[#18181b] border rounded-xl p-4 cursor-pointer hover:border-[#3f3f46] transition-all group ${producer.favorite ? 'border-amber-500/30' : 'border-[#27272a]'}`}
      onClick={() => onClick(producer)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-white truncate">{producer.name}</p>
            {producer._type === 'yt' && <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded">YT</span>}
            {producer._type === 'pl' && <span className="text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-1.5 py-0.5 rounded">PL</span>}
          </div>
          {producer.instagram && (
            <a href={`https://instagram.com/${producer.instagram.replace('@','')}`} target="_blank" rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="flex items-center gap-1 text-xs text-[#71717a] hover:text-[#e1306c] transition-colors mt-0.5">
              <Instagram className="w-3 h-3" />{producer.instagram}
            </a>
          )}
        </div>
        <button onClick={e => { e.stopPropagation(); onToggleFavorite(producer); }}
          className={`flex-shrink-0 transition-colors ml-2 ${producer.favorite ? 'text-amber-400' : 'text-[#3f3f46] hover:text-amber-400'}`}>
          <Star className={`w-4 h-4 ${producer.favorite ? 'fill-amber-400' : ''}`} />
        </button>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1">
          <PriorityBar score={producer.priority || 0} max={producer._type === 'yt' ? 8 : 10} />
        </div>
      </div>

      {producer.youtube_channel_url && (
        <a href={producer.youtube_channel_url} target="_blank" rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="flex items-center gap-1.5 text-xs text-[#71717a] hover:text-red-400 transition-colors mb-2">
          <Youtube className="w-3 h-3" />{producer.youtube_channel || 'YouTube Channel'}
        </a>
      )}

      <div className="flex items-center justify-between">
        <StatusBadge status={producer.status || 'por contactar'} />
        {fu && <span className={`text-xs ${fu.color}`}>{fu.label}</span>}
      </div>

      {/* Send pack channel hint */}
      {producer.donde_enviar && (
        <p className="text-[10px] text-[#52525b] mt-2 truncate">→ {producer.donde_enviar}</p>
      )}
    </motion.div>
  );
}

// Send Packs view: grouped by channel type
function SendPacksView({ producers, onClick, onToggleFavorite }) {
  const grouped = {};
  producers.forEach(p => {
    const donde = (p.donde_enviar || '').toLowerCase();
    let channel = 'other';
    if (donde.includes('ig') || donde.includes('instagram')) channel = 'Instagram';
    else if (donde.includes('facetime')) channel = 'FaceTime';
    else if (donde.includes('email')) channel = 'Email';
    else if (donde.includes('whatsapp')) channel = 'WhatsApp';
    else if (donde.includes('phone')) channel = 'Phone';
    else channel = p.donde_enviar || 'Other';
    if (!grouped[channel]) grouped[channel] = [];
    grouped[channel].push(p);
  });

  const channelColors = {
    Instagram: 'text-pink-400',
    FaceTime: 'text-green-400',
    Email: 'text-blue-400',
    WhatsApp: 'text-emerald-400',
    Phone: 'text-amber-400',
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#18181b] border border-amber-500/20 rounded-xl px-5 py-3 text-sm text-amber-400/80">
        📦 <span className="font-medium">Send Packs</span> — Productores con canal de envío definido. Revisa esta lista una vez a la semana.
      </div>
      {Object.entries(grouped).map(([channel, prods]) => (
        <div key={channel}>
          <h3 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${channelColors[channel] || 'text-[#71717a]'}`}>
            {channel} · {prods.length}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {prods.map(p => (
              <ProducerCard key={p.id} producer={p} onClick={onClick} onToggleFavorite={onToggleFavorite} />
            ))}
          </div>
        </div>
      ))}
      {producers.length === 0 && (
        <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-12 text-center text-[#3f3f46] text-sm">
          No producers with a send channel defined
        </div>
      )}
    </div>
  );
}

// Follow Ups view: grouped by status
function FollowUpsView({ producers, onClick, onToggleFavorite }) {
  const grouped = {};
  producers.forEach(p => {
    const s = p.status || 'contactado';
    if (!grouped[s]) grouped[s] = [];
    grouped[s].push(p);
  });

  const statusOrder = ['contactado', 'follow up 1', 'follow up 2', 'follow up 3', 'follow up 4', 'follow up 5'];

  return (
    <div className="space-y-6">
      {statusOrder.filter(s => grouped[s]?.length).map(s => (
        <div key={s}>
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 text-[#71717a] capitalize">
            {s} · {grouped[s].length}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {grouped[s].map(p => (
              <ProducerCard key={p.id} producer={p} onClick={onClick} onToggleFavorite={onToggleFavorite} />
            ))}
          </div>
        </div>
      ))}
      {producers.length === 0 && (
        <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-12 text-center text-[#3f3f46] text-sm">
          No follow ups pending
        </div>
      )}
    </div>
  );
}

export default function Contacts() {
  const [activeView, setActiveView] = useState('all');
  const [typeFilter, setTypeFilter] = useState('both'); // 'both' | 'yt' | 'pl'
  const [selected, setSelected] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const queryClient = useQueryClient();

  const { data: ytProducers = [] } = useQuery({
    queryKey: ['youtube-producers'],
    queryFn: () => base44.entities.YouTubeProducer.list('-priority', 500),
  });
  const { data: plProducers = [] } = useQuery({
    queryKey: ['placement-producers'],
    queryFn: () => base44.entities.PlacementProducer.list('-priority', 500),
  });

  const updateYT = useMutation({
    mutationFn: ({ id, data }) => base44.entities.YouTubeProducer.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['youtube-producers'] }),
  });
  const updatePL = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PlacementProducer.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['placement-producers'] }),
  });
  const deleteYT = useMutation({
    mutationFn: (id) => base44.entities.YouTubeProducer.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['youtube-producers'] }); setSelected(null); },
  });
  const deletePL = useMutation({
    mutationFn: (id) => base44.entities.PlacementProducer.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['placement-producers'] }); setSelected(null); },
  });

  const HIDDEN = ['archivado', 'eliminado'];

  const allProducers = [
    ...ytProducers.map(p => ({ ...p, _type: 'yt' })),
    ...plProducers.map(p => ({ ...p, _type: 'pl' })),
  ].filter(p => !HIDDEN.includes(p.status));

  // Apply type filter for views that support it
  const applyTypeFilter = (list) => {
    if (typeFilter === 'yt') return list.filter(p => p._type === 'yt');
    if (typeFilter === 'pl') return list.filter(p => p._type === 'pl');
    return list;
  };

  const views = {
    all: applyTypeFilter(allProducers),
    youtube: allProducers.filter(p => p._type === 'yt'),
    placement: allProducers.filter(p => p._type === 'pl'),
    followups: applyTypeFilter(allProducers.filter(p => FOLLOW_UP_STATUSES.includes(p.status)))
      .sort((a, b) => new Date(a.next_follow_up || '9999') - new Date(b.next_follow_up || '9999')),
    sendpacks: applyTypeFilter(allProducers.filter(p => hasSendPackChannel(p))),
    favorites: applyTypeFilter(allProducers.filter(p => p.favorite)),
  };

  const displayProducers = views[activeView] || [];

  const handleToggleFavorite = (producer) => {
    const newVal = !producer.favorite;
    if (producer._type === 'yt') updateYT.mutate({ id: producer.id, data: { favorite: newVal } });
    else updatePL.mutate({ id: producer.id, data: { favorite: newVal } });
    toast.success(newVal ? 'Added to favorites' : 'Removed from favorites');
  };

  const handleSave = (data) => {
    if (selectedType === 'yt') updateYT.mutate({ id: data.id, data });
    else updatePL.mutate({ id: data.id, data });
    toast.success('Saved');
    setSelected(null);
  };

  const handleDelete = (id) => {
    if (selectedType === 'yt') deleteYT.mutate(id);
    else deletePL.mutate(id);
  };

  const showTypeFilter = ['all', 'followups', 'sendpacks', 'favorites'].includes(activeView);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Contacts</h1>
        <p className="text-[#71717a] text-sm mt-1">{allProducers.length} active producers</p>
      </div>

      {/* View tabs */}
      <div className="flex flex-wrap gap-1 bg-[#18181b] border border-[#27272a] rounded-xl p-1 w-fit">
        {VIEWS.map(v => {
          const Icon = v.icon;
          const count = views[v.id]?.length || 0;
          return (
            <button key={v.id} onClick={() => setActiveView(v.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${activeView === v.id ? 'bg-[#27272a] text-white' : 'text-[#71717a] hover:text-[#a1a1aa]'}`}>
              <Icon className="w-3.5 h-3.5" />
              {v.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeView === v.id ? 'bg-[#3f3f46] text-white' : 'bg-[#27272a] text-[#52525b]'}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Type filter (only on mixed views) */}
      {showTypeFilter && (
        <div className="flex gap-2">
          {[['both', 'All types'], ['yt', 'YouTube only'], ['pl', 'Placement only']].map(([val, label]) => (
            <button key={val} onClick={() => setTypeFilter(val)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${typeFilter === val ? 'bg-[#27272a] border-[#3f3f46] text-white' : 'border-[#27272a] text-[#52525b] hover:text-[#71717a]'}`}>
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {activeView === 'followups' ? (
        <FollowUpsView producers={displayProducers} onClick={(prod) => { setSelected(prod); setSelectedType(prod._type); }} onToggleFavorite={handleToggleFavorite} />
      ) : activeView === 'sendpacks' ? (
        <SendPacksView producers={displayProducers} onClick={(prod) => { setSelected(prod); setSelectedType(prod._type); }} onToggleFavorite={handleToggleFavorite} />
      ) : displayProducers.length === 0 ? (
        <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-12 text-center text-[#3f3f46] text-sm">
          No producers in this view
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {displayProducers.map(p => (
            <ProducerCard key={p.id} producer={p}
              onClick={(prod) => { setSelected(prod); setSelectedType(prod._type); }}
              onToggleFavorite={handleToggleFavorite} />
          ))}
        </div>
      )}

      {selected && (
        <ProducerProfile
          producer={selected}
          type={selectedType === 'yt' ? 'youtube' : 'placement'}
          onClose={() => setSelected(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}