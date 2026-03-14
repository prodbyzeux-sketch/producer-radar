import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Star, Instagram, Youtube, Clock, Users, Zap, Heart } from 'lucide-react';
import StatusBadge from '@/components/shared/StatusBadge';
import PriorityBar from '@/components/shared/PriorityBar';
import ProducerProfile from '@/components/shared/ProducerProfile';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const VIEWS = [
  { id: 'active', label: 'Active', icon: Users },
  { id: 'favorites', label: 'Favorites', icon: Star },
  { id: 'followups', label: 'Follow Ups Due', icon: Clock },
  { id: 'highpriority', label: 'High Priority', icon: Zap },
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

function ProducerCard({ producer, onClick, onToggleFavorite }) {
  const fu = formatFollowUp(producer.next_follow_up);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-[#18181b] border rounded-xl p-4 cursor-pointer hover:border-[#3f3f46] transition-all group ${producer.favorite ? 'border-amber-500/30' : 'border-[#27272a]'}`}
      onClick={() => onClick(producer)}
    >
      {/* Top row */}
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

      {/* Scores row */}
      <div className="flex items-center gap-3 mb-3">
        {producer.youtube_priority && (
          <div className="text-center">
            <p className={`text-sm font-bold ${producer.youtube_priority >= 7 ? 'text-emerald-400' : producer.youtube_priority >= 5 ? 'text-amber-400' : 'text-[#71717a]'}`}>{producer.youtube_priority}</p>
            <p className="text-[9px] text-[#52525b]">YT</p>
          </div>
        )}
        {producer.placement_score && (
          <div className="text-center">
            <p className={`text-sm font-bold ${producer.placement_score >= 8 ? 'text-purple-400' : producer.placement_score >= 5 ? 'text-sky-400' : 'text-[#71717a]'}`}>{producer.placement_score}</p>
            <p className="text-[9px] text-[#52525b]">PS</p>
          </div>
        )}
        <div className="flex-1">
          <PriorityBar score={producer.priority_score || 0} />
        </div>
      </div>

      {/* YouTube channel */}
      {producer.youtube_channel_url && (
        <a href={producer.youtube_channel_url} target="_blank" rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="flex items-center gap-1.5 text-xs text-[#71717a] hover:text-red-400 transition-colors mb-2">
          <Youtube className="w-3 h-3" />{producer.youtube_channel || 'YouTube Channel'}
        </a>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <StatusBadge status={producer.status || 'por contactar'} />
        {fu && <span className={`text-xs ${fu.color}`}>{fu.label}</span>}
      </div>
    </motion.div>
  );
}

export default function Contacts() {
  const [activeView, setActiveView] = useState('active');
  const [selected, setSelected] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const queryClient = useQueryClient();

  const { data: ytProducers = [] } = useQuery({
    queryKey: ['youtube-producers'],
    queryFn: () => base44.entities.YouTubeProducer.list('-priority_score', 500),
  });
  const { data: plProducers = [] } = useQuery({
    queryKey: ['placement-producers'],
    queryFn: () => base44.entities.PlacementProducer.list('-priority_score', 500),
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
  const today = new Date(); today.setHours(0,0,0,0);

  const allProducers = [
    ...ytProducers.map(p => ({ ...p, _type: 'yt' })),
    ...plProducers.map(p => ({ ...p, _type: 'pl' })),
  ];

  const views = {
    active: allProducers.filter(p => !HIDDEN.includes(p.status)),
    favorites: allProducers.filter(p => p.favorite),
    followups: allProducers.filter(p => {
      if (!p.next_follow_up) return false;
      const d = new Date(p.next_follow_up); d.setHours(0,0,0,0);
      return d <= new Date(today.getTime() + 7 * 86400000);
    }).sort((a, b) => new Date(a.next_follow_up) - new Date(b.next_follow_up)),
    highpriority: allProducers.filter(p => (p.priority_score || 0) >= 7 && !HIDDEN.includes(p.status))
      .sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0)),
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Contacts</h1>
        <p className="text-[#71717a] text-sm mt-1">Visual producer browser — {allProducers.length} total producers</p>
      </div>

      {/* View tabs */}
      <div className="flex gap-1 bg-[#18181b] border border-[#27272a] rounded-xl p-1 w-fit">
        {VIEWS.map(v => {
          const Icon = v.icon;
          const count = views[v.id]?.length || 0;
          return (
            <button key={v.id} onClick={() => setActiveView(v.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeView === v.id ? 'bg-[#27272a] text-white' : 'text-[#71717a] hover:text-[#a1a1aa]'}`}>
              <Icon className="w-3.5 h-3.5" />
              {v.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeView === v.id ? 'bg-[#3f3f46] text-white' : 'bg-[#27272a] text-[#52525b]'}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Grid */}
      {displayProducers.length === 0 ? (
        <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-12 text-center text-[#3f3f46] text-sm">
          No producers in this view
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {displayProducers.map((p, i) => (
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