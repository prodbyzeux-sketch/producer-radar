import React, { useState, useRef, useEffect } from 'react';
import { X, Instagram, Mail, Youtube, Save, Trash2, Plus, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import PriorityBar from './PriorityBar';
import StarRating from './StarRating';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Persistent option stores (in-memory, per session) ───────────────────────
const optionStores = {
  status: ['por contactar', 'contactado', 'follow up 1', 'follow up 2', 'follow up 3', 'follow up 4', 'follow up 5', 'archivado', 'eliminado'],
  style: ['Juice WRLD', 'Polo G', 'Rod Wave', 'NBA YoungBoy', 'Melodic Trap', 'Emo Trap', 'Other'],
  que_enviar: ['loops', 'starters', 'beats', 'loops + starters', 'loops + beats', 'starters + beats', 'all'],
  donde_enviar: ['IG', 'email', 'telegram', 'iMessage', 'IG + email', 'multiple'],
};

// ─── Single-select with dynamic option creation (Notion-style) ───────────────
function DynamicSelect({ label, value, storeKey, onValueChange }) {
  const [options, setOptions] = useState([...optionStores[storeKey]]);
  const [inputVal, setInputVal] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = inputVal
    ? options.filter(o => o.toLowerCase().includes(inputVal.toLowerCase()))
    : options;

  const selectOption = (opt) => {
    onValueChange(opt);
    setInputVal('');
    setOpen(false);
  };

  const createAndSelect = () => {
    const trimmed = inputVal.trim();
    if (!trimmed) return;
    if (!options.includes(trimmed)) {
      const newOpts = [...options, trimmed];
      setOptions(newOpts);
      optionStores[storeKey] = newOpts;
    }
    selectOption(trimmed);
  };

  const showCreate = inputVal.trim() && !options.includes(inputVal.trim());

  return (
    <div ref={ref}>
      {label && <label className="text-xs text-[#71717a] mb-1.5 block">{label}</label>}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="w-full h-9 px-3 flex items-center justify-between bg-[#0f0f10] border border-[#27272a] rounded-md text-sm text-white hover:border-[#3f3f46] transition-colors"
        >
          <span className={value ? 'text-white capitalize' : 'text-[#3f3f46]'}>{value || 'Select...'}</span>
          <span className="text-[#52525b] text-xs">▾</span>
        </button>
        {open && (
          <div className="absolute top-full left-0 mt-1 w-full bg-[#1e1e22] border border-[#27272a] rounded-lg shadow-xl z-20 overflow-hidden">
            <div className="p-2 border-b border-[#27272a]">
              <input
                autoFocus
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); showCreate ? createAndSelect() : filtered[0] && selectOption(filtered[0]); } }}
                placeholder="Search or create..."
                className="w-full bg-[#0f0f10] border border-[#27272a] rounded-md px-2 py-1.5 text-sm text-white outline-none placeholder:text-[#3f3f46]"
              />
            </div>
            <div className="max-h-48 overflow-y-auto py-1">
              {filtered.map(opt => (
                <button key={opt} type="button" onMouseDown={() => selectOption(opt)}
                  className={`w-full text-left px-3 py-1.5 text-sm capitalize transition-colors ${value === opt ? 'text-white bg-[#27272a]' : 'text-[#a1a1aa] hover:text-white hover:bg-[#27272a]'}`}>
                  {opt}
                </button>
              ))}
              {showCreate && (
                <button type="button" onMouseDown={createAndSelect}
                  className="w-full text-left px-3 py-1.5 text-sm text-[#3b82f6] hover:bg-[#27272a] flex items-center gap-1.5">
                  <Plus className="w-3 h-3" /> Create "{inputVal.trim()}"
                </button>
              )}
              {filtered.length === 0 && !showCreate && (
                <p className="px-3 py-2 text-xs text-[#3f3f46]">No options found</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Multi-select tag input with dynamic creation (Notion-style) ─────────────
function MultiTagSelect({ label, value, storeKey, onChange }) {
  const tags = value ? value.split(',').map(t => t.trim()).filter(Boolean) : [];
  const [options, setOptions] = useState([...optionStores[storeKey]]);
  const [inputVal, setInputVal] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = inputVal
    ? options.filter(o => o.toLowerCase().includes(inputVal.toLowerCase()) && !tags.includes(o))
    : options.filter(o => !tags.includes(o));

  const addTag = (tag) => {
    const trimmed = tag.trim();
    if (!trimmed || tags.includes(trimmed)) return;
    if (!options.includes(trimmed)) {
      const newOpts = [...options, trimmed];
      setOptions(newOpts);
      optionStores[storeKey] = newOpts;
    }
    onChange([...tags, trimmed].join(', '));
    setInputVal('');
  };

  const removeTag = (tag) => onChange(tags.filter(t => t !== tag).join(', '));

  const showCreate = inputVal.trim() && !options.includes(inputVal.trim());

  return (
    <div ref={ref}>
      {label && <label className="text-xs text-[#71717a] mb-1.5 block">{label}</label>}
      <div
        className="bg-[#0f0f10] border border-[#27272a] rounded-md px-3 py-2 min-h-[38px] cursor-text hover:border-[#3f3f46] transition-colors"
        onClick={() => setOpen(true)}
      >
        <div className="flex flex-wrap gap-1.5 mb-1">
          {tags.map(tag => (
            <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-[#27272a] text-[#a1a1aa] rounded text-xs font-medium">
              {tag}
              <button type="button" onMouseDown={e => { e.stopPropagation(); removeTag(tag); }}
                className="text-[#52525b] hover:text-white ml-0.5">×</button>
            </span>
          ))}
        </div>
        <div className="relative">
          <input
            value={inputVal}
            onChange={e => { setInputVal(e.target.value); setOpen(true); }}
            onKeyDown={e => {
              if ((e.key === 'Enter' || e.key === ',') && inputVal.trim()) { e.preventDefault(); addTag(inputVal); }
              if (e.key === 'Backspace' && !inputVal && tags.length > 0) removeTag(tags[tags.length - 1]);
            }}
            onFocus={() => setOpen(true)}
            placeholder={tags.length === 0 ? 'Add...' : ''}
            className="w-full bg-transparent text-white text-sm outline-none placeholder:text-[#3f3f46]"
          />
          {open && (filtered.length > 0 || showCreate) && (
            <div className="absolute top-full left-0 mt-1 w-full bg-[#1e1e22] border border-[#27272a] rounded-lg shadow-xl z-20 overflow-hidden max-h-40 overflow-y-auto">
              {filtered.map(opt => (
                <button key={opt} type="button" onMouseDown={() => addTag(opt)}
                  className="w-full text-left px-3 py-1.5 text-sm text-[#a1a1aa] hover:text-white hover:bg-[#27272a] transition-colors">
                  {opt}
                </button>
              ))}
              {showCreate && (
                <button type="button" onMouseDown={() => addTag(inputVal)}
                  className="w-full text-left px-3 py-1.5 text-sm text-[#3b82f6] hover:bg-[#27272a] flex items-center gap-1.5">
                  <Plus className="w-3 h-3" /> Create "{inputVal.trim()}"
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Known artist tags for highlights ────────────────────────────────────────
const KNOWN_ARTISTS = [
  'Juice WRLD', 'Drake', 'Lil Baby', 'NBA YoungBoy', 'Rod Wave', 'Polo G',
  'NoCap', 'Future', 'Lil Uzi Vert', 'Rylo Rodriguez', 'Lil Tjay', 'Toosii',
  'Morray', 'Pooh Shiesty', 'Big30', 'Fivio Foreign', 'Lil Durk', 'Gunna',
  'YoungBoy', 'SleazyWorld Go', 'Yungbleu', 'Jackboy',
];

function HighlightsInput({ value, onChange }) {
  const tags = value ? value.split(',').map(t => t.trim()).filter(Boolean) : [];
  const [inputVal, setInputVal] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const suggestions = KNOWN_ARTISTS.filter(a =>
    inputVal.length > 0 && a.toLowerCase().includes(inputVal.toLowerCase()) && !tags.includes(a)
  );

  const addTag = (tag) => {
    const trimmed = tag.trim();
    if (trimmed && !tags.includes(trimmed)) onChange([...tags, trimmed].join(', '));
    setInputVal('');
    setShowSuggestions(false);
  };

  const removeTag = (tag) => onChange(tags.filter(t => t !== tag).join(', '));

  return (
    <div className="bg-[#0f0f10] border border-[#27272a] rounded-md px-3 py-2 min-h-[38px]">
      <div className="flex flex-wrap gap-1.5 mb-1.5">
        {tags.map(tag => (
          <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-[#2563eb]/15 border border-[#2563eb]/30 text-[#60a5fa] rounded text-xs font-medium">
            {tag}
            <button onClick={() => removeTag(tag)} className="text-[#60a5fa]/60 hover:text-[#60a5fa] ml-0.5">×</button>
          </span>
        ))}
      </div>
      <div className="relative">
        <input value={inputVal}
          onChange={e => { setInputVal(e.target.value); setShowSuggestions(true); }}
          onKeyDown={e => {
            if ((e.key === 'Enter' || e.key === ',') && inputVal.trim()) { e.preventDefault(); addTag(inputVal); }
            if (e.key === 'Backspace' && !inputVal && tags.length > 0) removeTag(tags[tags.length - 1]);
          }}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          onFocus={() => setShowSuggestions(true)}
          placeholder={tags.length === 0 ? 'Add artist placements...' : 'Add more...'}
          className="w-full bg-transparent text-white text-sm outline-none placeholder:text-[#3f3f46]"
        />
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 mt-1 w-full bg-[#1e1e22] border border-[#27272a] rounded-lg shadow-xl z-10 overflow-hidden">
            {suggestions.slice(0, 6).map(s => (
              <button key={s} onMouseDown={() => addTag(s)}
                className="w-full text-left px-3 py-2 text-sm text-[#a1a1aa] hover:text-white hover:bg-[#27272a] transition-colors">
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
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
                <a href={`https://instagram.com/${edited.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-1.5 bg-[#27272a] rounded-lg text-sm text-[#a1a1aa] hover:text-white transition-colors">
                  <Instagram className="w-4 h-4" /> @{edited.instagram.replace('@', '')}
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
                  className="flex items-center gap-2 px-3 py-1.5 bg-[#27272a] rounded-lg text-sm text-[#a1a1aa] hover:text-red-400 transition-colors">
                  <Youtube className="w-4 h-4" /> Channel
                </a>
              )}
              {edited.video_url && (
                <a href={edited.video_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-1.5 bg-[#27272a] rounded-lg text-sm text-[#a1a1aa] hover:text-red-400 transition-colors">
                  <ExternalLink className="w-4 h-4" /> Video
                </a>
              )}
            </div>

            {/* Contact fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-[#71717a] mb-1.5 block">Instagram</label>
                <Input value={edited.instagram || ''} onChange={e => setEdited({ ...edited, instagram: e.target.value })}
                  className="bg-[#0f0f10] border-[#27272a] text-white text-sm" placeholder="@handle" />
              </div>
              <div>
                <label className="text-xs text-[#71717a] mb-1.5 block">Email</label>
                <Input value={edited.email || ''} onChange={e => setEdited({ ...edited, email: e.target.value })}
                  className="bg-[#0f0f10] border-[#27272a] text-white text-sm" placeholder="email@example.com" />
              </div>
              <div>
                <label className="text-xs text-[#71717a] mb-1.5 block">Followers</label>
                <Input type="number" value={edited.followers_ig || ''} onChange={e => setEdited({ ...edited, followers_ig: parseInt(e.target.value) || 0 })}
                  className="bg-[#0f0f10] border-[#27272a] text-white text-sm" />
              </div>
              <div>
                <label className="text-xs text-[#71717a] mb-1.5 block">Priority Score</label>
                <div className="flex items-center gap-3">
                  <Input type="number" min={1} max={10} value={edited.priority_score || ''} onChange={e => setEdited({ ...edited, priority_score: parseInt(e.target.value) || 0 })}
                    className="bg-[#0f0f10] border-[#27272a] text-white text-sm w-20" />
                  <PriorityBar score={edited.priority_score || 0} />
                </div>
              </div>
            </div>

            {/* Notion-style selects */}
            <div className="grid grid-cols-2 gap-4">
              <DynamicSelect
                label="Status"
                value={edited.status}
                storeKey="status"
                onValueChange={v => setEdited({ ...edited, status: v })}
              />
              <MultiTagSelect
                label="Style"
                value={edited.style}
                storeKey="style"
                onChange={v => setEdited({ ...edited, style: v })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <MultiTagSelect
                label="Qué enviar"
                value={edited.que_enviar}
                storeKey="que_enviar"
                onChange={v => setEdited({ ...edited, que_enviar: v })}
              />
              <MultiTagSelect
                label="Dónde enviar"
                value={edited.donde_enviar}
                storeKey="donde_enviar"
                onChange={v => setEdited({ ...edited, donde_enviar: v })}
              />
            </div>

            {type === 'youtube' && (
              <div>
                <label className="text-xs text-[#71717a] mb-1.5 block">Relación</label>
                <StarRating value={edited.relacion || 0} onChange={v => setEdited({ ...edited, relacion: v })} />
              </div>
            )}

            {type === 'youtube' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-[#71717a] mb-1.5 block">YouTube Channel URL</label>
                  <Input value={edited.youtube_channel_url || ''} onChange={e => setEdited({ ...edited, youtube_channel_url: e.target.value })}
                    className="bg-[#0f0f10] border-[#27272a] text-white text-sm" placeholder="https://youtube.com/@..." />
                </div>
                <div>
                  <label className="text-xs text-[#71717a] mb-1.5 block">Video URL</label>
                  <Input value={edited.video_url || ''} onChange={e => setEdited({ ...edited, video_url: e.target.value })}
                    className="bg-[#0f0f10] border-[#27272a] text-white text-sm" placeholder="https://youtube.com/watch?v=..." />
                </div>
                <div>
                  <label className="text-xs text-[#71717a] mb-1.5 block">YouTube Subscribers</label>
                  <Input type="number" value={edited.youtube_subscribers || ''} onChange={e => setEdited({ ...edited, youtube_subscribers: parseInt(e.target.value) || 0 })}
                    className="bg-[#0f0f10] border-[#27272a] text-white text-sm" placeholder="0" />
                </div>
              </div>
            )}

            {type === 'placement' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-[#71717a] mb-1.5 block">YouTube Channel</label>
                  <Input value={edited.youtube_channel || ''} onChange={e => setEdited({ ...edited, youtube_channel: e.target.value })}
                    className="bg-[#0f0f10] border-[#27272a] text-white text-sm" placeholder="Channel name" />
                </div>
                <div>
                  <label className="text-xs text-[#71717a] mb-1.5 block">YouTube URL</label>
                  <Input value={edited.youtube_channel_url || ''} onChange={e => setEdited({ ...edited, youtube_channel_url: e.target.value })}
                    className="bg-[#0f0f10] border-[#27272a] text-white text-sm" placeholder="https://youtube.com/@..." />
                </div>
              </div>
            )}

            <div>
              <label className="text-xs text-[#71717a] mb-1.5 block">Highlights / Placements</label>
              <HighlightsInput value={edited.highlights_placements || ''} onChange={v => setEdited({ ...edited, highlights_placements: v })} />
            </div>

            <div>
              <label className="text-xs text-[#71717a] mb-1.5 block">Notes</label>
              <Textarea value={edited.notes || ''} onChange={e => setEdited({ ...edited, notes: e.target.value })}
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