import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const statuses = ['por contactar', 'contactado', 'follow up 1', 'follow up 2', 'follow up 3', 'follow up 4', 'follow up 5', 'archivado', 'eliminado'];
const styles = ['Juice WRLD', 'Polo G', 'Rod Wave', 'NBA YoungBoy', 'Melodic Trap', 'Emo Trap', 'Emotional Guitars', 'Other'];

export default function BulkActionBar({ selectedCount, onClearSelection, onBulkUpdate, onBulkDelete }) {
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
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        className="flex flex-wrap items-center gap-2.5 px-4 py-2.5 bg-[#111113] border border-[#2a2a2d] rounded-xl"
      >
        {/* Count + clear */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-[#a1a1aa]">{selectedCount} selected</span>
          <button onClick={onClearSelection} className="text-[#52525b] hover:text-[#a1a1aa] transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="w-px h-4 bg-[#27272a]" />

        {/* Bulk status */}
        <div className="flex items-center gap-1">
          <Select value={bulkStatus} onValueChange={setBulkStatus}>
            <SelectTrigger className="h-7 bg-[#18181b] border-[#2a2a2d] text-[#a1a1aa] text-xs w-[140px] hover:border-[#3f3f46]">
              <SelectValue placeholder="Set status..." />
            </SelectTrigger>
            <SelectContent className="bg-[#18181b] border-[#27272a]">
              {statuses.map(s => <SelectItem key={s} value={s} className="text-[#a1a1aa] capitalize text-xs">{s}</SelectItem>)}
            </SelectContent>
          </Select>
          {bulkStatus && (
            <button onClick={applyStatus}
              className="h-7 px-2.5 bg-[#1e1e22] hover:bg-[#27272a] text-[#a1a1aa] hover:text-white rounded-md text-xs transition-colors border border-[#2a2a2d]">
              Apply
            </button>
          )}
        </div>

        {/* Bulk style */}
        <div className="flex items-center gap-1">
          <Select value={bulkStyle} onValueChange={setBulkStyle}>
            <SelectTrigger className="h-7 bg-[#18181b] border-[#2a2a2d] text-[#a1a1aa] text-xs w-[130px] hover:border-[#3f3f46]">
              <SelectValue placeholder="Set style..." />
            </SelectTrigger>
            <SelectContent className="bg-[#18181b] border-[#27272a]">
              {styles.map(s => <SelectItem key={s} value={s} className="text-[#a1a1aa] text-xs">{s}</SelectItem>)}
            </SelectContent>
          </Select>
          {bulkStyle && (
            <button onClick={applyStyle}
              className="h-7 px-2.5 bg-[#1e1e22] hover:bg-[#27272a] text-[#a1a1aa] hover:text-white rounded-md text-xs transition-colors border border-[#2a2a2d]">
              Apply
            </button>
          )}
        </div>

        <div className="flex-1" />

        {/* Delete */}
        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1 h-7 px-2.5 text-[#52525b] hover:text-red-400 text-xs transition-colors rounded-md hover:bg-red-500/5">
            <Trash2 className="w-3 h-3" /> Delete
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#71717a]">Delete {selectedCount}?</span>
            <button onClick={() => { onBulkDelete(); setConfirmDelete(false); }}
              className="h-7 px-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-md text-xs transition-colors border border-red-500/10">
              Confirm
            </button>
            <button onClick={() => setConfirmDelete(false)}
              className="h-7 px-2 text-[#52525b] hover:text-[#a1a1aa] text-xs transition-colors">
              Cancel
            </button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}