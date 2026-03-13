import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, X, ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const statuses = ['por contactar', 'contactado', 'follow up 1', 'follow up 2', 'follow up 3', 'follow up 4', 'follow up 5', 'archivado', 'eliminado'];
const styles = ['Juice WRLD', 'Polo G', 'Rod Wave', 'NBA YoungBoy', 'Melodic Trap', 'Emo Trap', 'Other'];

export default function BulkActionBar({ selectedCount, onClearSelection, onBulkUpdate, onBulkDelete, type = 'youtube' }) {
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkStyle, setBulkStyle] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (selectedCount === 0) return null;

  const applyStatus = () => {
    if (!bulkStatus) return;
    onBulkUpdate({ status: bulkStatus });
    setBulkStatus('');
  };

  const applyStyle = () => {
    if (!bulkStyle) return;
    onBulkUpdate({ style: bulkStyle });
    setBulkStyle('');
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="flex flex-wrap items-center gap-3 px-4 py-3 bg-[#1e1e22] border border-[#3b82f6]/30 rounded-xl"
      >
        {/* Count + clear */}
        <div className="flex items-center gap-2 mr-1">
          <div className="w-5 h-5 rounded bg-[#2563eb] flex items-center justify-center">
            <Check className="w-3 h-3 text-white" />
          </div>
          <span className="text-sm font-medium text-white">{selectedCount} selected</span>
          <button onClick={onClearSelection} className="text-[#71717a] hover:text-white ml-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="w-px h-5 bg-[#27272a]" />

        {/* Bulk status */}
        <div className="flex items-center gap-1.5">
          <Select value={bulkStatus} onValueChange={setBulkStatus}>
            <SelectTrigger className="h-8 bg-[#0f0f10] border-[#27272a] text-white text-xs w-[150px]">
              <SelectValue placeholder="Change status..." />
            </SelectTrigger>
            <SelectContent className="bg-[#1e1e22] border-[#27272a]">
              {statuses.map(s => <SelectItem key={s} value={s} className="text-white capitalize text-xs">{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={applyStatus} disabled={!bulkStatus}
            className="h-8 px-3 bg-[#27272a] hover:bg-[#3f3f46] text-white text-xs">
            Apply
          </Button>
        </div>

        {/* Bulk style */}
        <div className="flex items-center gap-1.5">
          <Select value={bulkStyle} onValueChange={setBulkStyle}>
            <SelectTrigger className="h-8 bg-[#0f0f10] border-[#27272a] text-white text-xs w-[140px]">
              <SelectValue placeholder="Change style..." />
            </SelectTrigger>
            <SelectContent className="bg-[#1e1e22] border-[#27272a]">
              {styles.map(s => <SelectItem key={s} value={s} className="text-white text-xs">{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={applyStyle} disabled={!bulkStyle}
            className="h-8 px-3 bg-[#27272a] hover:bg-[#3f3f46] text-white text-xs">
            Apply
          </Button>
        </div>

        <div className="flex-1" />

        {/* Delete */}
        {!confirmDelete ? (
          <Button size="sm" onClick={() => setConfirmDelete(true)}
            className="h-8 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs">
            <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete {selectedCount}
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-red-400">Confirm delete?</span>
            <Button size="sm" onClick={() => { onBulkDelete(); setConfirmDelete(false); }}
              className="h-8 bg-red-600 hover:bg-red-500 text-white text-xs px-3">Yes, delete</Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}
              className="h-8 text-[#a1a1aa] hover:text-white text-xs">Cancel</Button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}