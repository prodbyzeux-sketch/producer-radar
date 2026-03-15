import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, Plus } from 'lucide-react';
import ProducerTable from '@/components/shared/ProducerTable';
import Pagination from '@/components/shared/Pagination';
import ProducerProfile from '@/components/shared/ProducerProfile';
import AddProducerDialog from '@/components/shared/AddProducerDialog';
import BulkActionBar from '@/components/shared/BulkActionBar';
import CsvImportExport from '@/components/shared/CsvImportExport';
import { toast } from 'sonner';

const statuses = ['all', 'por contactar', 'contactado', 'follow up 1', 'follow up 2', 'follow up 3', 'follow up 4', 'follow up 5', 'archivado', 'eliminado'];
const styles = ['all', 'Juice WRLD', 'Polo G', 'Rod Wave', 'NBA YoungBoy', 'Melodic Trap', 'Emo Trap', 'Other'];

export default function YouTubeProducers() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [styleFilter, setStyleFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  const queryClient = useQueryClient();

  const { data: producers = [], isLoading } = useQuery({
    queryKey: ['youtube-producers'],
    queryFn: () => base44.entities.YouTubeProducer.list('-created_date', 200),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.YouTubeProducer.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['youtube-producers'] });
      setSelected(null);
      toast.success('Producer updated');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.YouTubeProducer.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['youtube-producers'] });
      setSelected(null);
      toast.success('Producer deleted');
    },
  });

  const HIDDEN = ['archivado', 'eliminado', 'contactado', 'follow up 1', 'follow up 2', 'follow up 3', 'follow up 4', 'follow up 5'];
  const filtered = producers.filter(p => {
    if (statusFilter === 'all' && HIDDEN.includes(p.status)) return false;
    const matchSearch = !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.instagram?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchStyle = styleFilter === 'all' || p.style === styleFilter;
    return matchSearch && matchStatus && matchStyle;
  });

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (filtered.every(p => selectedIds.has(p.id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(p => p.id)));
    }
  };

  const batchOp = async (ids, fn) => {
    const arr = [...ids];
    for (let i = 0; i < arr.length; i += 5) {
      await Promise.all(arr.slice(i, i + 5).map(id => fn(id)));
      if (i + 5 < arr.length) await new Promise(r => setTimeout(r, 300));
    }
  };

  const handleBulkUpdate = async (data) => {
    await batchOp(selectedIds, id => base44.entities.YouTubeProducer.update(id, data));
    queryClient.invalidateQueries({ queryKey: ['youtube-producers'] });
    toast.success(`Updated ${selectedIds.size} producers`);
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    await batchOp(selectedIds, id => base44.entities.YouTubeProducer.delete(id));
    queryClient.invalidateQueries({ queryKey: ['youtube-producers'] });
    toast.success(`Deleted ${selectedIds.size} producers`);
    setSelectedIds(new Set());
  };

  const handleRowClick = (producer) => {
    setSelected(producer);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">YouTube Producers</h1>
          <p className="text-[#71717a] text-sm mt-1">{producers.length} producers discovered</p>
        </div>
        <div className="flex items-center gap-2">
          <CsvImportExport
            producers={producers}
            entity={base44.entities.YouTubeProducer}
            type="youtube"
            onImportComplete={() => queryClient.invalidateQueries({ queryKey: ['youtube-producers'] })}
          />
          <Button onClick={() => setShowAdd(true)} className="bg-[#2563eb] hover:bg-[#3b82f6] text-white" size="sm">
            <Plus className="w-4 h-4 mr-1.5" /> Add Producer
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717a]" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or Instagram..."
            className="pl-10 bg-[#18181b] border-[#27272a] text-white text-sm" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px] bg-[#18181b] border-[#27272a] text-white text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-[#1e1e22] border-[#27272a]">
            {statuses.map(s => <SelectItem key={s} value={s} className="text-white capitalize">{s === 'all' ? 'All Statuses' : s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={styleFilter} onValueChange={setStyleFilter}>
          <SelectTrigger className="w-[160px] bg-[#18181b] border-[#27272a] text-white text-sm">
            <SelectValue placeholder="Style" />
          </SelectTrigger>
          <SelectContent className="bg-[#1e1e22] border-[#27272a]">
            {styles.map(s => <SelectItem key={s} value={s} className="text-white">{s === 'all' ? 'All Styles' : s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <BulkActionBar
        selectedCount={selectedIds.size}
        onClearSelection={() => setSelectedIds(new Set())}
        onBulkUpdate={handleBulkUpdate}
        onBulkDelete={handleBulkDelete}
        type="youtube"
      />

      <ProducerTable
        producers={filtered}
        columns={['name', 'instagram', 'youtube', 'style', 'status', 'priority']}
        producerType="youtube"
        onRowClick={handleRowClick}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        onToggleAll={toggleAll}
        onToggleFavorite={p => updateMutation.mutate({ id: p.id, data: { favorite: !p.favorite } })}
        onInstagramClick={p => {
          const today = new Date().toISOString().split('T')[0];
          const next = new Date(); next.setDate(next.getDate() + 7);
          updateMutation.mutate({ id: p.id, data: { last_action: today, next_follow_up: next.toISOString().split('T')[0] } });
        }}
      />

      {selected && (
        <ProducerProfile
          producer={selected}
          type="youtube"
          onClose={() => setSelected(null)}
          onSave={data => updateMutation.mutate({ id: data.id, data })}
          onDelete={id => deleteMutation.mutate(id)}
        />
      )}

      {showAdd && (
        <AddProducerDialog
          type="youtube"
          onClose={() => setShowAdd(false)}
          onAdded={() => {
            queryClient.invalidateQueries({ queryKey: ['youtube-producers'] });
            setShowAdd(false);
          }}
        />
      )}
    </div>
  );
}