import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import ProducerTable from '@/components/shared/ProducerTable';
import ProducerProfile from '@/components/shared/ProducerProfile';
import { toast } from 'sonner';

// Connections: producers with status "connection" (active real relationship)

export default function Connections() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [selectedType, setSelectedType] = useState(null);

  const queryClient = useQueryClient();

  const { data: ytProducers = [] } = useQuery({
    queryKey: ['youtube-producers'],
    queryFn: () => base44.entities.YouTubeProducer.list('-last_action', 200),
  });
  const { data: plProducers = [] } = useQuery({
    queryKey: ['placement-producers'],
    queryFn: () => base44.entities.PlacementProducer.list('-last_action', 200),
  });

  const updateYT = useMutation({
    mutationFn: ({ id, data }) => base44.entities.YouTubeProducer.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['youtube-producers'] }); setSelected(null); toast.success('Updated'); },
  });
  const updatePL = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PlacementProducer.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['placement-producers'] }); setSelected(null); toast.success('Updated'); },
  });
  const deleteYT = useMutation({
    mutationFn: (id) => base44.entities.YouTubeProducer.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['youtube-producers'] }); setSelected(null); },
  });
  const deletePL = useMutation({
    mutationFn: (id) => base44.entities.PlacementProducer.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['placement-producers'] }); setSelected(null); },
  });

  const handleInstagramClick = (producer, type) => {
    const today = new Date().toISOString().split('T')[0];
    const nextFollowUp = new Date(); nextFollowUp.setDate(nextFollowUp.getDate() + 7);
    const nextFollowUpStr = nextFollowUp.toISOString().split('T')[0];
    const updateData = { last_action: today, next_follow_up: nextFollowUpStr };
    if (type === 'yt') {
      updateYT.mutate({ id: producer.id, data: updateData });
    } else {
      updatePL.mutate({ id: producer.id, data: updateData });
    }
  };

  const allConnections = [
    ...ytProducers.filter(p => p.status === 'connection').map(p => ({ ...p, _type: 'yt' })),
    ...plProducers.filter(p => p.status === 'connection').map(p => ({ ...p, _type: 'pl' })),
  ].filter(p => {
    const q = search.toLowerCase();
    return !search || p.name?.toLowerCase().includes(q) || p.instagram?.toLowerCase().includes(q);
  }).sort((a, b) => (b.priority || 0) - (a.priority || 0));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Connections</h1>
          <p className="text-[#71717a] text-sm mt-1">{allConnections.length} conexiones activas</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717a]" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search connections..."
            className="pl-10 bg-[#18181b] border-[#27272a] text-white text-sm" />
        </div>
      </div>

      <ProducerTable
        producers={allConnections}
        onRowClick={(p) => { setSelected(p); setSelectedType(p._type); }}
        columns={['name', 'type', 'instagram', 'phone', 'style', 'placements', 'last_action', 'next_follow_up', 'status']}
        producerType="mixed"
        onInstagramClick={(p) => handleInstagramClick(p, p._type)}
      />

      {selected && (
        <ProducerProfile
          producer={selected}
          type={selectedType === 'yt' ? 'youtube' : 'placement'}
          onClose={() => setSelected(null)}
          onSave={data => {
            if (selectedType === 'yt') updateYT.mutate({ id: data.id, data });
            else updatePL.mutate({ id: data.id, data });
          }}
          onDelete={id => {
            if (selectedType === 'yt') deleteYT.mutate(id);
            else deletePL.mutate(id);
          }}
        />
      )}
    </div>
  );
}