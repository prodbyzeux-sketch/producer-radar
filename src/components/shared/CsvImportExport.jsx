import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Upload, Loader2, X, Check, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

// ─── CSV helpers ──────────────────────────────────────────────────────────────
function escapeCsvCell(val) {
  if (val === null || val === undefined) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCsv(rows, fields) {
  const header = fields.map(f => f.label).join(',');
  const body = rows.map(row => fields.map(f => escapeCsvCell(row[f.key])).join(','));
  return [header, ...body].join('\n');
}

function parseCsvLine(line) {
  const cells = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
      continue;
    }
    if (ch === ',' && !inQ) { cells.push(cur); cur = ''; continue; }
    cur += ch;
  }
  cells.push(cur);
  return cells;
}

function parseCsv(text) {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  const lines = normalized.split('\n');
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = parseCsvLine(lines[0]).map(h => h.trim());
  const rows = lines.slice(1).filter(l => l.trim()).map(line => {
    const cells = parseCsvLine(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (cells[i] || '').trim(); });
    return obj;
  });
  return { headers, rows };
}

// ─── Instagram normalization ──────────────────────────────────────────────────
/**
 * Extracts the username from any Instagram input format and returns
 * the canonical URL: https://instagram.com/USERNAME
 *
 * Handles:
 *   @username  →  https://instagram.com/username
 *   username   →  https://instagram.com/username
 *   instagram.com/username  →  https://instagram.com/username
 *   https://instagram.com/username/  →  https://instagram.com/username
 *   https://www.instagram.com/username  →  https://instagram.com/username
 */
function normalizeIg(val) {
  if (!val) return '';
  // Step 1-4: strip protocol, www, domain
  let s = val.trim();
  s = s.replace(/^https?:\/\//i, '');   // remove https:// or http://
  s = s.replace(/^www\./i, '');          // remove www.
  s = s.replace(/^instagram\.com\//i, ''); // remove instagram.com/
  // Step 5: strip leading/trailing slashes and query strings
  s = s.replace(/\?.*$/, '').replace(/#+.*$/, '').replace(/\/+$/, '').replace(/^\/+/, '');
  // Step 6: strip leading @
  s = s.replace(/^@/, '');
  s = s.trim();
  if (!s || s.includes(' ')) return '';
  return `https://instagram.com/${s}`;
}

/** Extract username from a normalized (or any) instagram value */
function usernameFromIg(val) {
  const normalized = normalizeIg(val);
  if (!normalized) return '';
  const m = normalized.match(/instagram\.com\/([^/?#\s]+)/);
  return m ? m[1] : '';
}

// ─── DB fields ────────────────────────────────────────────────────────────────
const YOUTUBE_FIELDS = [
  { key: 'name', label: 'Name' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'email', label: 'Email' },
  { key: 'followers_ig', label: 'Followers (IG)' },
  { key: 'youtube_channel', label: 'YouTube Channel' },
  { key: 'youtube_channel_url', label: 'YouTube URL' },
  { key: 'youtube_subscribers', label: 'YouTube Subscribers' },
  { key: 'video_url', label: 'Video URL' },
  { key: 'highlights_placements', label: 'Featured Placements' },
  { key: 'style', label: 'Style' },
  { key: 'status', label: 'Status' },
  { key: 'priority', label: 'Priority' },
  { key: 'phone', label: 'Phone' },
  { key: 'que_enviar', label: 'Que Enviar' },
  { key: 'donde_enviar', label: 'Donde Enviar' },
  { key: 'last_action', label: 'Last Action' },
  { key: 'next_follow_up', label: 'Next Follow Up' },
  { key: 'favorite', label: 'Favorite' },
  { key: 're_dms', label: 'Re DMs' },
  { key: 'notes', label: 'Notes' },
];

const PLACEMENT_FIELDS = [
  { key: 'name', label: 'Name' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'email', label: 'Email' },
  { key: 'followers_ig', label: 'Followers (IG)' },
  { key: 'phone', label: 'Phone' },
  { key: 'artist', label: 'Artist' },
  { key: 'song', label: 'Song' },
  { key: 'highlights_placements', label: 'Featured Placements' },
  { key: 'style', label: 'Style' },
  { key: 'status', label: 'Status' },
  { key: 'priority', label: 'Priority' },
  { key: 'que_enviar', label: 'Que Enviar' },
  { key: 'donde_enviar', label: 'Donde Enviar' },
  { key: 'youtube_channel', label: 'YouTube Channel' },
  { key: 'youtube_channel_url', label: 'YouTube URL' },
  { key: 'last_action', label: 'Last Action' },
  { key: 'next_follow_up', label: 'Next Follow Up' },
  { key: 'favorite', label: 'Favorite' },
  { key: 're_dms', label: 'Re DMs' },
  { key: 'notes', label: 'Notes' },
];

// Auto-detect mapping from CSV header to DB field key
const AUTO_ALIASES = {
  name: 'name', producer: 'name', producer_name: 'name', nombre: 'name',
  instagram: 'instagram', ig: 'instagram', ig_handle: 'instagram', instagram_handle: 'instagram',
  email: 'email', correo: 'email', mail: 'email',
  followers: 'followers_ig', followers_ig: 'followers_ig', ig_followers: 'followers_ig', seguidores: 'followers_ig',
  style: 'style', estilo: 'style',
  status: 'status', estado: 'status',
  placements: 'highlights_placements', highlights: 'highlights_placements', highlights_placements: 'highlights_placements',
  artistas: 'highlights_placements', colaboraciones: 'highlights_placements',
  notes: 'notes', notas: 'notes',
  priority: 'priority', priority_score: 'priority', prioridad: 'priority',
  que_enviar: 'que_enviar', what_to_send: 'que_enviar',
  donde_enviar: 'donde_enviar', where_to_send: 'donde_enviar',
  youtube_channel: 'youtube_channel', canal: 'youtube_channel',
  youtube_channel_url: 'youtube_channel_url',
  youtube_subscribers: 'youtube_subscribers', suscriptores: 'youtube_subscribers',
  video_url: 'video_url',
  artist: 'artist', artista: 'artist',
  song: 'song', cancion: 'song', tema: 'song',
  last_action: 'last_action', ultima_accion: 'last_action',
  next_follow_up: 'next_follow_up', proximo_followup: 'next_follow_up', next_fu: 'next_follow_up',
  favorite: 'favorite', favorito: 'favorite',
  re_dms: 're_dms', redms: 're_dms',
};

function autoDetect(header) {
  const key = header.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^\w]/g, '_');
  return AUTO_ALIASES[key] || null;
}

const NUMBER_FIELDS = new Set(['followers_ig', 'priority', 'youtube_subscribers']);
const BOOLEAN_FIELDS = new Set(['favorite']);
const DATE_FIELDS = new Set(['last_action', 'next_follow_up']);

// ─── Mapping UI ───────────────────────────────────────────────────────────────
function MappingModal({ headers, dbFields, initialMapping, existingProducers, rawRows, onConfirm, onCancel }) {
  const [mapping, setMapping] = useState(initialMapping);

  // Build preview: apply mapping to raw rows, normalize instagram, auto-generate name
  const previewRows = rawRows.slice(0, 50).map(rawRow => {
    const out = {};
    for (const [csvCol, dbKey] of Object.entries(mapping)) {
      if (dbKey === '__ignore__') continue;
      const val = rawRow[csvCol]?.trim();
      if (val) {
        if (NUMBER_FIELDS.has(dbKey)) out[dbKey] = parseInt(val) || 0;
        else if (BOOLEAN_FIELDS.has(dbKey)) out[dbKey] = val.toLowerCase() === 'true' || val === '1';
        else out[dbKey] = val;
      }
    }
    // Always normalize instagram
    if (out.instagram) out.instagram = normalizeIg(out.instagram);
    // Auto-generate name from instagram if missing
    if (!out.name && out.instagram) out.name = usernameFromIg(out.instagram);
    return out;
  });

  // Duplicate detection — Instagram is primary key only
  const existingIgSet = new Map(
    existingProducers.filter(p => p.instagram).map(p => [normalizeIg(p.instagram), true])
  );

  const isDupe = (row) => {
    if (!row.instagram) return false;
    return existingIgSet.has(normalizeIg(row.instagram));
  };

  const previewRowsWithNames = previewRows; // names already generated above

  const dupeCount = previewRowsWithNames.filter(isDupe).length;
  const newCount = previewRowsWithNames.filter(r => r.name && !isDupe(r)).length;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[70] flex items-center justify-center p-4" onClick={onCancel}>
      <div
        className="bg-[#18181b] border border-[#27272a] rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#27272a]">
          <div>
            <h2 className="text-base font-semibold text-white">Map CSV Columns</h2>
            <p className="text-xs text-[#71717a] mt-0.5">{rawRows.length} rows · {headers.length} columns detected</p>
          </div>
          <button onClick={onCancel} className="text-[#71717a] hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mapping table */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          <div className="space-y-2">
            <p className="text-xs font-medium text-[#71717a] uppercase tracking-wider">Column Mapping</p>
            <div className="bg-[#0f0f10] border border-[#27272a] rounded-lg overflow-hidden">
              <div className="grid grid-cols-2 gap-0 text-[10px] font-medium text-[#52525b] uppercase tracking-wider px-4 py-2 border-b border-[#27272a]">
                <span>CSV Column</span>
                <span>Maps to Database Field</span>
              </div>
              {headers.map(h => (
                <div key={h} className="grid grid-cols-2 items-center gap-4 px-4 py-2 border-b border-[#1e1e22] last:border-b-0">
                  <span className="text-sm text-[#a1a1aa] font-mono truncate">{h}</span>
                  <select
                    value={mapping[h] || '__ignore__'}
                    onChange={e => setMapping(m => ({ ...m, [h]: e.target.value }))}
                    className="bg-[#18181b] border border-[#27272a] text-white text-xs rounded-md px-2 py-1.5 outline-none focus:border-[#3f3f46]"
                  >
                    <option value="__ignore__">— Ignore —</option>
                    {dbFields.map(f => (
                      <option key={f.key} value={f.key}>{f.label}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-[#71717a] uppercase tracking-wider">
                Preview (first {Math.min(rawRows.length, 50)} rows)
              </p>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-green-400">{newCount} new</span>
                {dupeCount > 0 && <span className="text-amber-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{dupeCount} dupes</span>}
              </div>
            </div>
            <div className="bg-[#0f0f10] border border-[#27272a] rounded-lg overflow-hidden max-h-48 overflow-y-auto">
              {previewRowsWithNames.filter(r => r.name).slice(0, 20).map((row, i) => {
                const dupe = isDupe(row);
                const autoName = !previewRows[i]?.name && row.name;
                return (
                  <div key={i} className={`flex items-center gap-3 px-4 py-2 border-b border-[#1e1e22] last:border-b-0 ${dupe ? 'opacity-50' : ''}`}>
                    {dupe
                      ? <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                      : <Check className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />}
                    <span className="text-sm text-white font-medium">
                      {row.name}
                      {autoName && <span className="text-[10px] text-blue-400 ml-1">(auto)</span>}
                    </span>
                    {row.instagram && <span className="text-xs text-[#71717a] truncate max-w-[200px]">{row.instagram}</span>}
                    {row.status && <span className="text-xs text-[#52525b]">{row.status}</span>}
                    {dupe && <span className="text-[10px] text-amber-500 ml-auto">duplicate</span>}
                  </div>
                );
              })}
              {previewRowsWithNames.filter(r => r.name).length === 0 && (
                <p className="text-center text-[#52525b] text-sm py-4">Map the Name or Instagram column to preview rows</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-[#27272a]">
          <p className="text-xs text-[#71717a]">
            {rawRows.length} total rows · {newCount} will be imported · {dupeCount} will be updated
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onCancel} className="text-[#a1a1aa] hover:text-white">Cancel</Button>
            <Button size="sm" onClick={() => onConfirm(mapping)}
              className="bg-[#2563eb] hover:bg-[#3b82f6] text-white"
              disabled={!Object.values(mapping).some(v => v === 'name' || v === 'instagram')}>
              Import {rawRows.length} Rows
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CsvImportExport({ producers, entity, type = 'youtube', onImportComplete }) {
  const fileRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const [mappingState, setMappingState] = useState(null); // { headers, rows, initialMapping }

  const dbFields = type === 'youtube' ? YOUTUBE_FIELDS : PLACEMENT_FIELDS;
  const defaultSource = type === 'youtube' ? 'YouTube' : 'Placements';

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExport = () => {
    const csv = toCsv(producers, dbFields);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}-producers-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${producers.length} producers`);
  };

  // ── File picked → parse → show mapping modal ─────────────────────────────
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const text = await file.text();
    const { headers, rows } = parseCsv(text);
    if (!rows.length) { toast.error('No data found in CSV'); return; }

    // Auto-detect mapping
    const initialMapping = {};
    for (const h of headers) {
      initialMapping[h] = autoDetect(h) || '__ignore__';
    }

    setMappingState({ headers, rows, initialMapping });
  };

  // ── Confirmed mapping → import ────────────────────────────────────────────
  const handleConfirmImport = async (mapping) => {
    setMappingState(null);
    setImporting(true);

    const { rows } = mappingState;

    // Normalize instagram to full URL: https://instagram.com/username
    const normalizeIg = (val) => {
      if (!val) return '';
      val = val.trim().replace(/\/+$/, ''); // strip trailing slashes
      // Already a full URL
      const urlMatch = val.match(/instagram\.com\/([^/?#\s]+)/i);
      if (urlMatch) return `https://instagram.com/${urlMatch[1]}`;
      // Handle or @handle
      const handle = val.replace(/^@/, '').trim();
      if (!handle || handle.includes(' ')) return '';
      return `https://instagram.com/${handle}`;
    };

    // Extract username from normalized instagram URL
    const nameFromIg = (ig) => {
      if (!ig) return '';
      const match = ig.match(/instagram\.com\/([^/?#]+)/);
      return match ? match[1] : '';
    };

    // Apply mapping to rows
    const mapped = rows.map(rawRow => {
      const out = {};
      for (const [csvCol, dbKey] of Object.entries(mapping)) {
        if (dbKey === '__ignore__') continue;
        const val = rawRow[csvCol]?.trim();
        if (val) {
          if (NUMBER_FIELDS.has(dbKey)) out[dbKey] = parseInt(val) || 0;
          else if (BOOLEAN_FIELDS.has(dbKey)) out[dbKey] = val.toLowerCase() === 'true' || val === '1';
          else out[dbKey] = val;
        }
      }
      // Normalize instagram to full URL
      if (out.instagram) out.instagram = normalizeIg(out.instagram);
      // If name is empty, always derive from instagram handle
      if (!out.name && out.instagram) {
        out.name = nameFromIg(out.instagram);
      }
      return out;
    }).filter(r => r.name || r.instagram); // keep rows with at least a name or instagram

    // Final pass: ensure every row has a name
    for (const row of mapped) {
      if (!row.name && row.instagram) row.name = nameFromIg(row.instagram);
    }

    const importable = mapped.filter(r => r.name);

    if (!importable.length) {
      toast.error('No importable rows found — make sure Name or Instagram is mapped');
      setImporting(false);
      return;
    }

    // Load existing for dupe detection
    const existing = await entity.list('-created_date', 5000);
    // Index by normalized instagram URL (primary) and name (secondary)
    const igToRecord = new Map(
      existing.filter(p => p.instagram).map(p => [normalizeIg(p.instagram), p])
    );
    const nameToRecord = new Map(existing.map(p => [p.name?.toLowerCase(), p]));

    let created = 0, updated = 0;
    const CHUNK = 100;
    const total = importable.length;

    for (let i = 0; i < total; i += CHUNK) {
      const chunk = importable.slice(i, i + CHUNK);

      // Show progress before processing this chunk
      toast.loading(`Importing producers… ${Math.min(i + CHUNK, total)} / ${total}`, { id: 'csv-import-progress' });

      for (const row of chunk) {
        // Instagram is primary key — always normalize before lookup
        const igKey = row.instagram ? normalizeIg(row.instagram) : '';
        const matchByIg = igKey ? igToRecord.get(igKey) : null;
        // Only fall back to name if no instagram present
        const matchByName = !igKey ? nameToRecord.get(row.name?.toLowerCase()) : null;
        const match = matchByIg || matchByName;

        if (match) {
          const updates = {};
          for (const [k, v] of Object.entries(row)) {
            if (v !== '' && v !== null && v !== undefined) updates[k] = v;
          }
          await entity.update(match.id, updates);
          updated++;
        } else {
          const newRecord = { source: defaultSource, status: 'por contactar', ...row };
          await entity.create(newRecord);
          if (row.name) nameToRecord.set(row.name.toLowerCase(), newRecord);
          if (igKey) igToRecord.set(igKey, newRecord);
          created++;
        }
      }

      // Yield to browser to prevent UI freeze on large imports
      await new Promise(r => setTimeout(r, 0));
    }

    toast.dismiss('csv-import-progress');
    toast.success(`Import done — ${created} created, ${updated} updated`);
    setImporting(false);
    onImportComplete?.();
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          onClick={handleExport}
          disabled={producers.length === 0}
          variant="outline"
          size="sm"
          className="border-[#27272a] text-[#a1a1aa] hover:text-white hover:bg-[#27272a] gap-1.5"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </Button>
        <Button
          onClick={() => fileRef.current?.click()}
          disabled={importing}
          variant="outline"
          size="sm"
          className="border-[#27272a] text-[#a1a1aa] hover:text-white hover:bg-[#27272a] gap-1.5"
        >
          {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          Import Producers from CSV
        </Button>
        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
      </div>

      <AnimatePresence>
        {mappingState && (
          <MappingModal
            headers={mappingState.headers}
            dbFields={dbFields}
            initialMapping={mappingState.initialMapping}
            existingProducers={producers}
            rawRows={mappingState.rows}
            onConfirm={handleConfirmImport}
            onCancel={() => setMappingState(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}