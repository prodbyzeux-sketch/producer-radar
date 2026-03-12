import React, { useState } from 'react';
import { X, Instagram, Mail, Youtube, ExternalLink, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import StatusBadge from './StatusBadge';
import PriorityBar from './PriorityBar';
import StarRating from './StarRating';
import { motion, AnimatePresence } from 'framer-motion';

const statuses = ['por contactar', 'contactado', 'follow up 1', 'follow up 2', 'follow up 3', 'follow up 4', 'follow up 5', 'archivado', 'eliminado'];
const styles = ['Juice WRLD', 'Polo G', 'Rod Wave', 'NBA YoungBoy', 'Melodic Trap', 'Emo Trap', 'Other'];

export default function ProducerProfile({ producer, onClose, onSave, onDelete, type = 'youtube' }) {
  const [edited, setEdited] = useState({ ...producer });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(edited);
    setSaving(false);
  };

  if (!producer) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-[#18181b] border border-[#27272a] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[#27272a]">
            <div>
              <h2 className="text-xl font-bold text-white">{producer.name}</h2>
              <p className="text-sm text-[#71717a] mt-0.5">Producer Profile</p>
            </div>
            <button onClick={onClose} className="text-[#71717a] hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-5">
            {/* Quick Links */}
            <div className="flex gap-3 flex-wrap">
              {edited.instagram && (
                <a href={`https://instagram.com/${edited.instagram.replace('@','')}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-1.5 bg-[#27272a] rounded-lg text-sm text-[#a1a1aa] hover:text-white transition-colors">
                  <Instagram className="w-4 h-4" /> @{edited.instagram.replace('@','')}
                </a>
              )}
              {edited.email && (
                <a href={`mailto:${edited.email}`}
                  className="flex items-center gap-2 px-3 py-1.5 bg-[#27272a] rounded-lg text-sm text-[#a1a1aa] hover:text-white transition-colors">
                  <Mail className="w-4 h-4" /> {edited.email}
                </a>
              )}
              {edited.youtube_channel_url && (
                <a href={edited.youtube_channel_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-1.5 bg-[#27272a] rounded-lg text-sm text-[#a1a1aa] hover:text-white transition-colors">
                  <Youtube className="w-4 h-4" /> Channel
                </a>
              )}
            </div>

            {/* Grid fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-[#71717a] mb-1.5 block">Instagram</label>
                <Input value={edited.instagram || ''} onChange={e => setEdited({...edited, instagram: e.target.value})}
                  className="bg-[#0f0f10] border-[#27272a] text-white text-sm" placeholder="@handle" />
              </div>
              <div>
                <label className="text-xs text-[#71717a] mb-1.5 block">Email</label>
                <Input value={edited.email || ''} onChange={e => setEdited({...edited, email: e.target.value})}
                  className="bg-[#0f0f10] border-[#27272a] text-white text-sm" placeholder="email@example.com" />
              </div>
              <div>
                <label className="text-xs text-[#71717a] mb-1.5 block">Followers</label>
                <Input type="number" value={edited.followers_ig || ''} onChange={e => setEdited({...edited, followers_ig: parseInt(e.target.value) || 0})}
                  className="bg-[#0f0f10] border-[#27272a] text-white text-sm" />
              </div>
              <div>
                <label className="text-xs text-[#71717a] mb-1.5 block">Style</label>
                <Select value={edited.style || ''} onValueChange={v => setEdited({...edited, style: v})}>
                  <SelectTrigger className="bg-[#0f0f10] border-[#27272a] text-white text-sm">
                    <SelectValue placeholder="Select style" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1e1e22] border-[#27272a]">
                    {styles.map(s => <SelectItem key={s} value={s} className="text-white">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-[#71717a] mb-1.5 block">Status</label>
                <Select value={edited.status || 'por contactar'} onValueChange={v => setEdited({...edited, status: v})}>
                  <SelectTrigger className="bg-[#0f0f10] border-[#27272a] text-white text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1e1e22] border-[#27272a]">
                    {statuses.map(s => <SelectItem key={s} value={s} className="text-white capitalize">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-[#71717a] mb-1.5 block">Priority Score</label>
                <div className="flex items-center gap-3">
                  <Input type="number" min={1} max={10} value={edited.priority_score || ''} onChange={e => setEdited({...edited, priority_score: parseInt(e.target.value) || 0})}
                    className="bg-[#0f0f10] border-[#27272a] text-white text-sm w-20" />
                  <PriorityBar score={edited.priority_score || 0} />
                </div>
              </div>
            </div>

            {type === 'youtube' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-[#71717a] mb-1.5 block">Qué enviar</label>
                  <Select value={edited.que_enviar || ''} onValueChange={v => setEdited({...edited, que_enviar: v})}>
                    <SelectTrigger className="bg-[#0f0f10] border-[#27272a] text-white text-sm">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1e1e22] border-[#27272a]">
                      {['loops','starters','beats','loops + starters','loops + beats','starters + beats','all'].map(s => 
                        <SelectItem key={s} value={s} className="text-white capitalize">{s}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-[#71717a] mb-1.5 block">Dónde enviar</label>
                  <Select value={edited.donde_enviar || ''} onValueChange={v => setEdited({...edited, donde_enviar: v})}>
                    <SelectTrigger className="bg-[#0f0f10] border-[#27272a] text-white text-sm">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1e1e22] border-[#27272a]">
                      {['IG','email','telegram','iMessage','IG + email','multiple'].map(s => 
                        <SelectItem key={s} value={s} className="text-white">{s}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {type === 'youtube' && (
              <div>
                <label className="text-xs text-[#71717a] mb-1.5 block">Relación</label>
                <StarRating value={edited.relacion || 0} onChange={v => setEdited({...edited, relacion: v})} />
              </div>
            )}

            <div>
              <label className="text-xs text-[#71717a] mb-1.5 block">Highlights / Placements</label>
              <Input value={edited.highlights_placements || ''} onChange={e => setEdited({...edited, highlights_placements: e.target.value})}
                className="bg-[#0f0f10] border-[#27272a] text-white text-sm" placeholder="Notable placements..." />
            </div>

            <div>
              <label className="text-xs text-[#71717a] mb-1.5 block">Notes</label>
              <Textarea value={edited.notes || ''} onChange={e => setEdited({...edited, notes: e.target.value})}
                className="bg-[#0f0f10] border-[#27272a] text-white text-sm min-h-[80px]" placeholder="Add notes..." />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-[#27272a]">
            <Button variant="ghost" size="sm" onClick={() => onDelete(producer.id)}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
              <Trash2 className="w-4 h-4 mr-1.5" /> Delete
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={onClose} className="text-[#a1a1aa] hover:text-white">
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}
                className="bg-[#2563eb] hover:bg-[#3b82f6] text-white">
                <Save className="w-4 h-4 mr-1.5" /> {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}