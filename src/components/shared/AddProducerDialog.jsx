import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function AddProducerDialog({ type, onClose, onAdded }) {
  const maxPriority = type === 'youtube' ? 8 : 10;
  const [data, setData] = useState({ name: '', instagram: '', email: '', style: '', priority: 5 });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!data.name) { toast.error('Name is required'); return; }
    setSaving(true);
    if (type === 'youtube') {
      await base44.entities.YouTubeProducer.create({ ...data, source: 'Manual', status: 'por contactar' });
    } else {
      await base44.entities.PlacementProducer.create({ ...data, source: 'Manual', status: 'por contactar' });
    }
    toast.success('Producer added');
    onAdded();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-[#18181b] border border-[#27272a] rounded-2xl w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-[#27272a]">
          <h2 className="text-lg font-bold text-white">Add Producer</h2>
          <button onClick={onClose} className="text-[#71717a] hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs text-[#71717a] mb-1.5 block">Name *</label>
            <Input value={data.name} onChange={e => setData({...data, name: e.target.value})}
              className="bg-[#0f0f10] border-[#27272a] text-white text-sm" placeholder="Producer name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#71717a] mb-1.5 block">Instagram</label>
              <Input value={data.instagram} onChange={e => setData({...data, instagram: e.target.value})}
                className="bg-[#0f0f10] border-[#27272a] text-white text-sm" placeholder="@handle" />
            </div>
            <div>
              <label className="text-xs text-[#71717a] mb-1.5 block">Email</label>
              <Input value={data.email} onChange={e => setData({...data, email: e.target.value})}
                className="bg-[#0f0f10] border-[#27272a] text-white text-sm" placeholder="email" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#71717a] mb-1.5 block">Style / Artist</label>
              <Input value={data.style} onChange={e => setData({...data, style: e.target.value})}
                className="bg-[#0f0f10] border-[#27272a] text-white text-sm" placeholder="e.g. Juice WRLD, Rod Wave..." />
            </div>
            <div>
              <label className="text-xs text-[#71717a] mb-1.5 block">Priority (1–{maxPriority})</label>
              <Input type="number" min={1} max={maxPriority} value={data.priority}
                onChange={e => {
                  const val = parseInt(e.target.value) || 1;
                  setData({...data, priority: Math.min(val, maxPriority)});
                }}
                className="bg-[#0f0f10] border-[#27272a] text-white text-sm" />
            </div>
          </div>
          {type === 'placement' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#71717a] mb-1.5 block">Song</label>
                <Input value={data.song || ''} onChange={e => setData({...data, song: e.target.value})}
                  className="bg-[#0f0f10] border-[#27272a] text-white text-sm" placeholder="Song title" />
              </div>
              <div>
                <label className="text-xs text-[#71717a] mb-1.5 block">Artist</label>
                <Input value={data.artist || ''} onChange={e => setData({...data, artist: e.target.value})}
                  className="bg-[#0f0f10] border-[#27272a] text-white text-sm" placeholder="Artist name" />
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 p-5 border-t border-[#27272a]">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-[#a1a1aa]">Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="bg-[#2563eb] hover:bg-[#3b82f6] text-white">
            <Save className="w-4 h-4 mr-1.5" /> {saving ? 'Adding...' : 'Add Producer'}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}