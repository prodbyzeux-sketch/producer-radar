import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Music2, Loader2, Check, X, Plus, Zap, Instagram, Star, Users } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const BATCH_SIZE = 4;
const EXTRACT_TIMEOUT = 20000;
const ENRICH_TIMEOUT = 20000;

const TIER10 = ['drake', 'juice wrld', 'nba youngboy', 'lil baby', 'future', 'lil uzi vert', 'travis scott', 'post malone', 'kendrick lamar', 'j. cole', 'cardi b', 'nicki minaj'];
const TIER8 = ['polo g', 'rod wave', 'nocap', 'rylo rodriguez', 'fivio foreign', 'lil tjay', 'sleazyworld go', 'gunna', 'lil durk', 'pooh shiesty', 'big30', 'morray'];
const TIER5 = ['yungbleu', 'toosii', 'jackboy', 'toosii', 'yfn lucci', 'mozzy', 'dame d.o.l.l.a', 'kevin gates', 'yo gotti'];

function calculatePriority(producer) {
  const t = (producer.highlights_placements || '').toLowerCase();
  const collabs = (producer.top_collaborators || '').toLowerCase();
  const combined = `${t} ${collabs}`;

  let ps = 0;
  if (TIER10.some(a => combined.includes(a))) ps = 10;
  else if (TIER8.some(a => combined.includes(a))) ps = 8;
  else if (TIER5.some(a => combined.includes(a))) ps = 5;
  else if (combined.length > 10) ps = 3;

  // Bonus for having many collaborators
  const collabCount = (producer.top_collaborators || '').split(',').filter(Boolean).length;
  if (collabCount >= 4) ps = Math.min(10, ps + 1);

  const f = producer.followers_ig || 0;
  const fs = f < 50 ? 0 : f < 1000 ? 2 : f < 5000 ? 5 : f < 10000 ? 7 : f < 15000 ? 8 : 9;
  let base = ps * 0.75 + fs * 0.25;
  if (producer.instagram && producer.email) base += 0.8;
  else if (producer.instagram) base += 0.3;
  return Math.min(10, Math.max(1, Math.round(base)));
}

// Stage 1: Deep extraction — never skip, always try to find producers
async function extractFromGeniusUrl(url) {
  try {
    const result = await Promise.race([
      base44.integrations.Core.InvokeLLM({
        model: 'gemini_3_flash',
        add_context_from_internet: true,
        prompt: `Fetch and thoroughly analyze this Genius page: ${url}

You MUST extract producer information. Do NOT skip this page.

Search the ENTIRE page for:
1. "Produced by" section in credits
2. "Producer" credits anywhere on the page
3. Song metadata / credits section
4. Any mention of producers in annotations or descriptions
5. Co-producers, additional producers, executive producers

Also look for:
- The song title and main artist
- Up to 5 collaborators (artists, co-producers, writers that appear in credits)
- Any Instagram handles mentioned on the page (@handle format)
- Any AKA or alternate names for the producers

If the page is an artist page (not a song), extract:
- The artist/producer name
- Any collaborators mentioned
- Any Instagram handles visible
- Notable songs or placements listed

IMPORTANT: Even if you only find one piece of information, return it. Do not return found=false unless the page completely fails to load.
Return found=true if you got ANY useful information from the page.`,
        response_json_schema: {
          type: 'object',
          properties: {
            song_title: { type: 'string' },
            artist: { type: 'string' },
            producers: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  aka: { type: 'string' },
                  instagram: { type: 'string' },
                  collaborators: { type: 'array', items: { type: 'string' } },
                }
              }
            },
            found: { type: 'boolean' },
            page_type: { type: 'string' }, // 'song', 'artist', 'album', 'other'
          },
        },
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), EXTRACT_TIMEOUT)),
    ]);
    return { url, ...result };
  } catch {
    return { url, found: false, producers: [], song_title: '', artist: '' };
  }
}

// Normalize Instagram: always return full URL or empty string
function normalizeInstagram(raw) {
  if (!raw) return '';
  raw = raw.trim();
  // Already a full URL
  if (raw.startsWith('https://instagram.com/') || raw.startsWith('https://www.instagram.com/')) {
    return raw.replace('https://www.instagram.com/', 'https://instagram.com/');
  }
  // Strip @ or @ prefix
  const handle = raw.replace(/^@/, '').replace(/^instagram\.com\//, '');
  if (!handle) return '';
  return `https://instagram.com/${handle}`;
}

// Stage 2: Deep enrichment — Instagram search via multiple strategies, collaborators, aliases
async function enrichProducer(name, song, artist, aka, existingCollabs) {
  try {
    const info = await Promise.race([
      base44.integrations.Core.InvokeLLM({
        model: 'gemini_3_flash',
        add_context_from_internet: true,
        prompt: `Find detailed information for music producer "${name}"${aka ? ` (also known as "${aka}")` : ''} who produced "${song || 'unknown song'}" by ${artist || 'unknown artist'}.

Search these sources in STRICT priority order and stop at the first reliable result:
1. Genius artist page for "${name}" — check External Links section for Instagram URL
2. Genius song credits page — check bio or credits for Instagram links
3. Producer bio on Genius — look for any Instagram mention
4. Official website of "${name}" — look for Instagram link
5. Search "${name} producer instagram" on Google

CRITICAL Instagram rules:
- Return the FULL Instagram URL: https://instagram.com/handle (NOT @handle)
- If you only find a handle like @prodname, convert it to https://instagram.com/prodname
- The Genius External Links section is the most reliable source

Also find:
- Top 5 collaborators: artists this producer has worked with most
- Notable placements: comma separated artist names only
- Instagram follower count (number only)
- Contact email if publicly available
- Any AKA / alternate producer names

IMPORTANT: Only include producers with under 30,000 Instagram followers. If follower count is unavailable, set instagram_followers to -1 (unknown).

${existingCollabs ? `Already known collaborators: ${existingCollabs}` : ''}

Return the best Instagram FULL URL you find. Leave empty string only if truly not found.`,
        response_json_schema: {
          type: 'object',
          properties: {
            instagram_handle: { type: 'string' },
            instagram_followers: { type: 'number' },
            email: { type: 'string' },
            highlights_placements: { type: 'string' },
            top_collaborators: { type: 'string' },
            aka: { type: 'string' },
          },
        },
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ENRICH_TIMEOUT)),
    ]);
    return info;
  } catch {
    return { instagram_handle: '', instagram_followers: 0, email: '', highlights_placements: '', top_collaborators: '', aka: '' };
  }
}

// Preview card for a single producer before saving
function ProducerPreviewCard({ producer, selected, onToggle }) {
  const score = calculatePriority(producer);
  const collabs = producer.top_collaborators ? producer.top_collaborators.split(',').map(s => s.trim()).filter(Boolean) : [];

  return (
    <div
      onClick={onToggle}
      className={`cursor-pointer rounded-lg border p-3 transition-all ${
        selected
          ? 'border-purple-500/50 bg-purple-500/5'
          : 'border-[#27272a] bg-[#0f0f10] opacity-60'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-4 h-4 rounded-sm flex-shrink-0 flex items-center justify-center border transition-colors ${selected ? 'bg-purple-500 border-purple-500' : 'border-[#3f3f46]'}`}>
            {selected && <Check className="w-2.5 h-2.5 text-white" />}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-semibold truncate">{producer.name}</p>
            {producer.aka && <p className="text-[#71717a] text-[11px]">aka {producer.aka}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${score >= 8 ? 'bg-emerald-500/10 text-emerald-400' : score >= 5 ? 'bg-amber-500/10 text-amber-400' : 'bg-[#27272a] text-[#71717a]'}`}>
            PS {score}
          </span>
        </div>
      </div>

      {producer.song && (
        <p className="text-[#71717a] text-[11px] mt-1.5 truncate">
          🎵 {producer.song}{producer.artist ? ` — ${producer.artist}` : ''}
        </p>
      )}

      {producer.instagram && (
        <p className="text-purple-400 text-[11px] mt-1 flex items-center gap-1">
          <Instagram className="w-3 h-3" /> {producer.instagram}
          {producer.followers_ig > 0 && <span className="text-[#71717a]">({producer.followers_ig.toLocaleString()} followers)</span>}
        </p>
      )}

      {collabs.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {collabs.slice(0, 5).map(c => (
            <span key={c} className="px-1.5 py-0.5 bg-[#27272a] text-[#a1a1aa] rounded text-[10px]">{c}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PlacementDiscovery() {
  const [links, setLinks] = useState('');
  const [phase, setPhase] = useState('idle'); // idle | extracting | enriching | preview | saving | done
  const [stats, setStats] = useState({ processed: 0, total: 0, detected: 0, added: 0, skipped: 0 });
  const [previewProducers, setPreviewProducers] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [enrichStatus, setEnrichStatus] = useState('');
  const [enrichDone, setEnrichDone] = useState(false);
  const queryClient = useQueryClient();
  const savedIds = useRef([]);

  const toggleSelect = (name) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === previewProducers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(previewProducers.map(p => p.name)));
    }
  };

  const run = async () => {
    const geniusLinks = links
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.includes('genius.com'));

    if (geniusLinks.length === 0) {
      toast.error('Paste at least one Genius link');
      return;
    }

    setPhase('extracting');
    setEnrichStatus('');
    setEnrichDone(false);
    savedIds.current = [];
    setStats({ processed: 0, total: geniusLinks.length, detected: 0, added: 0, skipped: 0 });

    // ── Stage 1: Deep parallel extraction ──────────────────────────────────────
    const producerMap = new Map(); // name.lower → { name, aka, song, artist, instagram, collaborators }
    let processed = 0, skipped = 0;

    for (let i = 0; i < geniusLinks.length; i += BATCH_SIZE) {
      const batch = geniusLinks.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(batch.map(url => extractFromGeniusUrl(url)));

      for (const res of results) {
        processed++;
        if (!res.found) {
          skipped++;
          continue;
        }

        // Even if no structured producers array, try to use artist as producer for artist pages
        const producers = res.producers?.length > 0
          ? res.producers
          : res.page_type === 'artist' && res.artist
            ? [{ name: res.artist, collaborators: [] }]
            : [];

        if (producers.length === 0) {
          skipped++;
          continue;
        }

        for (const p of producers) {
          if (!p.name?.trim()) continue;
          const key = p.name.toLowerCase().trim();
          const collabs = (p.collaborators || []).filter(Boolean);

          if (!producerMap.has(key)) {
            producerMap.set(key, {
              name: p.name.trim(),
              aka: p.aka || '',
              song: res.song_title || '',
              artist: res.artist || '',
              instagram: p.instagram || '',
              top_collaborators: collabs.join(', '),
            });
          } else {
            const ex = producerMap.get(key);
            if (res.song_title && !ex.song.includes(res.song_title)) {
              ex.song = ex.song ? `${ex.song}, ${res.song_title}` : res.song_title;
            }
            // Merge collaborators
            if (collabs.length > 0) {
              const existingCollabs = ex.top_collaborators ? ex.top_collaborators.split(', ') : [];
              const merged = [...new Set([...existingCollabs, ...collabs])].slice(0, 5);
              ex.top_collaborators = merged.join(', ');
            }
            if (!ex.instagram && p.instagram) ex.instagram = p.instagram;
            if (!ex.aka && p.aka) ex.aka = p.aka;
          }
        }
      }

      setStats(s => ({ ...s, processed, detected: producerMap.size, skipped }));
    }

    const rawProducers = [...producerMap.values()];
    if (rawProducers.length === 0) {
      toast.error('No producers found in those Genius pages');
      setPhase('idle');
      return;
    }

    // ── Stage 2: Enrich ALL producers before showing preview ───────────────────
    setPhase('enriching');
    const enriched = [];

    for (let i = 0; i < rawProducers.length; i += BATCH_SIZE) {
      const batch = rawProducers.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(batch.map(async (p) => {
        const info = await enrichProducer(p.name, p.song, p.artist, p.aka, p.top_collaborators);

        // Merge extracted Instagram with enriched — always return full URL
        let ig = normalizeInstagram(info.instagram_handle || p.instagram || '');

        let placements = info.highlights_placements?.trim() || '';
        placements = placements.split(',').map(s => s.split(/\s*[-–]\s*/)[0].trim()).filter(Boolean).join(', ');

        // Merge collaborators
        const enrichedCollabs = info.top_collaborators
          ? info.top_collaborators.split(',').map(s => s.trim()).filter(Boolean)
          : [];
        const existingCollabs = p.top_collaborators
          ? p.top_collaborators.split(',').map(s => s.trim()).filter(Boolean)
          : [];
        const mergedCollabs = [...new Set([...existingCollabs, ...enrichedCollabs])].slice(0, 5).join(', ');

        return {
          ...p,
          instagram: ig,
          followers_ig: info.instagram_followers > 0 ? Math.round(info.instagram_followers) : 0,
          email: info.email?.trim() || '',
          highlights_placements: placements,
          top_collaborators: mergedCollabs,
          aka: info.aka || p.aka || '',
        };
      }));

      enriched.push(...results);
      setStats(s => ({ ...s, detected: rawProducers.length }));
      setEnrichStatus(`Enriching ${Math.min(i + BATCH_SIZE, rawProducers.length)} / ${rawProducers.length}`);
    }

    // ── Stage 3: Show preview ──────────────────────────────────────────────────
    const withScores = enriched.map(p => ({ ...p, _score: calculatePriority(p) }));
    withScores.sort((a, b) => b._score - a._score);
    setPreviewProducers(withScores);
    setSelectedIds(new Set(withScores.map(p => p.name))); // all selected by default
    setPhase('preview');
    setEnrichStatus('');
  };

  const saveSelected = async () => {
    setPhase('saving');
    const toSave = previewProducers.filter(p => selectedIds.has(p.name));

    const existing = await base44.entities.PlacementProducer.list('-created_date', 500);
    const existingNames = new Set(existing.map(p => p.name?.toLowerCase()));

    let added = 0, dupes = 0;
    for (const p of toSave) {
      if (existingNames.has(p.name.toLowerCase())) { dupes++; continue; }

      const record = {
        name: p.name,
        song: p.song || '',
        artist: p.artist || '',
        source: 'Placements',
        status: 'por contactar',
        priority_score: p._score || calculatePriority(p),
        top_collaborators: p.top_collaborators || '',
        highlights_placements: p.highlights_placements || '',
        notes: p.aka ? `AKA: ${p.aka}` : '',
      };
      if (p.instagram) record.instagram = p.instagram;
      if (p.followers_ig > 0) record.followers_ig = p.followers_ig;
      if (p.email) record.email = p.email;

      await base44.entities.PlacementProducer.create(record);
      existingNames.add(p.name.toLowerCase());
      added++;
    }

    setStats(s => ({ ...s, added, skipped: s.skipped + dupes }));
    queryClient.invalidateQueries({ queryKey: ['placement-producers'] });
    toast.success(`Added ${added} producers${dupes > 0 ? ` (${dupes} dupes skipped)` : ''}`);
    setPhase('done');
    setEnrichDone(true);
  };

  const reset = () => {
    setPhase('idle');
    setLinks('');
    setStats({ processed: 0, total: 0, detected: 0, added: 0, skipped: 0 });
    setEnrichStatus('');
    setEnrichDone(false);
    setPreviewProducers([]);
    setSelectedIds(new Set());
    savedIds.current = [];
  };

  return (
    <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
          <Music2 className="w-4 h-4 text-purple-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white">Placement Discovery</h2>
          <p className="text-xs text-[#71717a]">Deep extraction from Genius — collaborators, Instagram, preview before saving</p>
        </div>
      </div>

      {/* INPUT */}
      {phase === 'idle' && (
        <div className="space-y-3">
          <Textarea
            value={links}
            onChange={e => setLinks(e.target.value)}
            placeholder={"Paste Genius links, one per line:\nhttps://genius.com/artist-song-lyrics\nhttps://genius.com/artist-song2-lyrics"}
            className="bg-[#0f0f10] border-[#27272a] text-white text-sm min-h-[120px] placeholder:text-[#3f3f46]"
          />
          <Button
            onClick={run}
            disabled={!links.trim()}
            className="bg-purple-600 hover:bg-purple-500 text-white w-full"
            size="sm"
          >
            <Zap className="w-4 h-4 mr-2" /> Extract & Enrich Producers
          </Button>
        </div>
      )}

      {/* EXTRACTING PROGRESS */}
      {(phase === 'extracting' || phase === 'enriching' || phase === 'saving') && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Links processed', value: `${stats.processed} / ${stats.total}` },
              { label: 'Producers found', value: stats.detected },
              { label: 'Links skipped', value: stats.skipped },
              { label: phase === 'enriching' ? 'Enriching...' : phase === 'saving' ? 'Saving...' : 'Scanning...', value: enrichStatus || '...' },
            ].map(s => (
              <div key={s.label} className="bg-[#0f0f10] border border-[#27272a] rounded-lg px-3 py-2 text-center">
                <p className="text-lg font-bold text-white truncate">{s.value}</p>
                <p className="text-[10px] text-[#71717a] mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-purple-500/5 border border-purple-500/20 rounded-lg">
            <Loader2 className="w-4 h-4 animate-spin text-purple-400 flex-shrink-0" />
            <span className="text-sm text-purple-300">
              {phase === 'extracting'
                ? `Deep scanning ${BATCH_SIZE} links in parallel... (${stats.processed}/${stats.total})`
                : phase === 'enriching'
                  ? `Enriching producers — searching Instagram, collaborators... ${enrichStatus}`
                  : 'Saving to database...'}
            </span>
          </div>
        </div>
      )}

      {/* PREVIEW */}
      {phase === 'preview' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium text-white">{previewProducers.length} producers found</span>
              <span className="text-xs text-[#71717a]">— {selectedIds.size} selected</span>
            </div>
            <button onClick={toggleAll} className="text-xs text-purple-400 hover:text-purple-300 transition-colors">
              {selectedIds.size === previewProducers.length ? 'Deselect all' : 'Select all'}
            </button>
          </div>

          <div className="max-h-[360px] overflow-y-auto space-y-2 pr-1">
            <AnimatePresence>
              {previewProducers.map((p, i) => (
                <motion.div key={p.name} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                  <ProducerPreviewCard
                    producer={p}
                    selected={selectedIds.has(p.name)}
                    onToggle={() => toggleSelect(p.name)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={reset} className="text-[#a1a1aa] hover:text-white border border-[#27272a]">
              <X className="w-4 h-4 mr-1.5" /> Cancel
            </Button>
            <Button
              size="sm"
              onClick={saveSelected}
              disabled={selectedIds.size === 0}
              className="flex-1 bg-purple-600 hover:bg-purple-500 text-white"
            >
              <Check className="w-4 h-4 mr-1.5" /> Save {selectedIds.size} Producer{selectedIds.size !== 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      )}

      {/* DONE */}
      {phase === 'done' && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Links processed', value: `${stats.processed} / ${stats.total}` },
              { label: 'Added to DB', value: stats.added },
              { label: 'Skipped', value: stats.skipped },
            ].map(s => (
              <div key={s.label} className="bg-[#0f0f10] border border-[#27272a] rounded-lg px-3 py-2 text-center">
                <p className="text-lg font-bold text-white">{s.value}</p>
                <p className="text-[10px] text-[#71717a] mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 px-3 py-2 bg-green-500/5 border border-green-500/20 rounded-lg">
            <Check className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
            <span className="text-xs text-green-400">Producers saved with collaborators, Instagram & placement scores</span>
          </div>

          <Button variant="ghost" size="sm" onClick={reset}
            className="w-full text-[#a1a1aa] hover:text-white border border-[#27272a]">
            <Plus className="w-4 h-4 mr-1.5" /> Discover More
          </Button>
        </div>
      )}
    </div>
  );
}