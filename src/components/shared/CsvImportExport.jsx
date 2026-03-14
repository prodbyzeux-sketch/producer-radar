import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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
  const body = rows.map(row =>
    fields.map(f => escapeCsvCell(row[f.key])).join(',')
  );
  return [header, ...body].join('\n');
}

function parseCsvLine(line) {
  const cells = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; } // escaped quote
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
  // Normalize line endings
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  const lines = normalized.split('\n');
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map(h => h.trim().toLowerCase()
    .replace(/\s+/g, '_')   // spaces to underscores
    .replace(/[^\w]/g, '_') // remove special chars
  );

  return lines.slice(1)
    .filter(l => l.trim())
    .map(line => {
      const cells = parseCsvLine(line);
      const obj = {};
      headers.forEach((h, i) => { obj[h] = (cells[i] || '').trim(); });
      return obj;
    });
}

// Normalize CSV header → entity field key
const FIELD_ALIASES = {
  name: 'name', producer: 'name', producer_name: 'name',
  instagram: 'instagram', ig: 'instagram', ig_handle: 'instagram',
  email: 'email',
  followers: 'followers_ig', followers_ig: 'followers_ig', ig_followers: 'followers_ig',
  style: 'style',
  status: 'status',
  placements: 'highlights_placements', highlights: 'highlights_placements', highlights_placements: 'highlights_placements', featured_placements: 'highlights_placements',
  notes: 'notes',
  priority: 'priority_score', priority_score: 'priority_score',
  que_enviar: 'que_enviar', what_to_send: 'que_enviar',
  donde_enviar: 'donde_enviar', where_to_send: 'donde_enviar',
  youtube_channel: 'youtube_channel',
  youtube_channel_url: 'youtube_channel_url',
  youtube_subscribers: 'youtube_subscribers',
  video_url: 'video_url',
  artist: 'artist',
  song: 'song',
};

function mapCsvRow(row) {
  const out = {};
  for (const [rawKey, val] of Object.entries(row)) {
    const key = FIELD_ALIASES[rawKey.toLowerCase().replace(/\s+/g, '_')] || rawKey;
    if (val !== '') out[key] = val;
  }
  if (out.followers_ig) out.followers_ig = parseInt(out.followers_ig) || 0;
  if (out.priority_score) out.priority_score = parseInt(out.priority_score) || 0;
  if (out.youtube_subscribers) out.youtube_subscribers = parseInt(out.youtube_subscribers) || 0;
  return out;
}

// ─── Component ────────────────────────────────────────────────────────────────
const YOUTUBE_FIELDS = [
  { key: 'name', label: 'Name' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'email', label: 'Email' },
  { key: 'followers_ig', label: 'Followers' },
  { key: 'youtube_channel', label: 'YouTube Channel' },
  { key: 'youtube_channel_url', label: 'YouTube Channel URL' },
  { key: 'youtube_subscribers', label: 'YouTube Subscribers' },
  { key: 'video_url', label: 'Video URL' },
  { key: 'highlights_placements', label: 'Featured Placements' },
  { key: 'style', label: 'Style' },
  { key: 'status', label: 'Status' },
  { key: 'priority_score', label: 'Priority Score' },
  { key: 'que_enviar', label: 'Que Enviar' },
  { key: 'donde_enviar', label: 'Donde Enviar' },
  { key: 'notes', label: 'Notes' },
];

const PLACEMENT_FIELDS = [
  { key: 'name', label: 'Name' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'email', label: 'Email' },
  { key: 'followers_ig', label: 'Followers' },
  { key: 'artist', label: 'Artist' },
  { key: 'song', label: 'Song' },
  { key: 'highlights_placements', label: 'Featured Placements' },
  { key: 'style', label: 'Style' },
  { key: 'status', label: 'Status' },
  { key: 'priority_score', label: 'Priority Score' },
  { key: 'que_enviar', label: 'Que Enviar' },
  { key: 'donde_enviar', label: 'Donde Enviar' },
  { key: 'youtube_channel', label: 'YouTube Channel' },
  { key: 'youtube_channel_url', label: 'YouTube Channel URL' },
  { key: 'notes', label: 'Notes' },
];

export default function CsvImportExport({ producers, entity, type = 'youtube', onImportComplete }) {
  const fileRef = useRef(null);
  const [importing, setImporting] = useState(false);

  const fields = type === 'youtube' ? YOUTUBE_FIELDS : PLACEMENT_FIELDS;

  // ── Export ─────────────────────────────────────────────────────────────────
  const handleExport = () => {
    const csv = toCsv(producers, fields);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}-producers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${producers.length} producers`);
  };

  // ── Import ─────────────────────────────────────────────────────────────────
  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setImporting(true);

    const text = await file.text();
    const rows = parseCsv(text);
    if (!rows.length) { toast.error('No data found in CSV'); setImporting(false); return; }

    // Load existing for dupe detection
    const existing = await entity.list('-created_date', 2000);
    const byName = new Map(existing.map(p => [p.name?.toLowerCase(), p]));
    const byIg = new Map(existing.filter(p => p.instagram).map(p => [p.instagram.toLowerCase().replace('@', ''), p]));

    let created = 0, updated = 0, skipped = 0;

    for (const rawRow of rows) {
      const row = mapCsvRow(rawRow);
      if (!row.name) { skipped++; continue; }

      const igKey = row.instagram?.replace('@', '').toLowerCase();
      const existing_byIg = igKey ? byIg.get(igKey) : null;
      const existing_byName = byName.get(row.name.toLowerCase());
      const match = existing_byIg || existing_byName;

      if (match) {
        // Update — merge, don't overwrite with empty values
        const updates = {};
        for (const [k, v] of Object.entries(row)) {
          if (v !== '' && v !== null && v !== undefined) updates[k] = v;
        }
        await entity.update(match.id, updates);
        updated++;
      } else {
        await entity.create({ source: type === 'youtube' ? 'YouTube' : 'Placements', status: 'por contactar', ...row });
        byName.set(row.name.toLowerCase(), row);
        if (igKey) byIg.set(igKey, row);
        created++;
      }
    }

    toast.success(`Import done — ${created} created, ${updated} updated${skipped > 0 ? `, ${skipped} skipped` : ''}`);
    setImporting(false);
    onImportComplete?.();
  };

  return (
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
        Import CSV
      </Button>
      <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
    </div>
  );
}