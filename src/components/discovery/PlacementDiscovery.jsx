import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Music2, Loader2, Check, X, Plus, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const BATCH_SIZE = 5;
const EXTRACT_TIMEOUT = 5000;  // 5s for extraction
const ENRICH_TIMEOUT = 15000;  // 15s for enrichment

function calculatePriority(producer) {
  const t = (producer.highlights_placements || '').toLowerCase();
  const tier10 = ['drake', 'juice wrld', 'nba youngboy', 'lil baby', 'future', 'lil uzi'];
  const tier8 = ['polo g', 'rod wave', 'nocap', 'rylo rodriguez', 'fivio foreign', 'lil tjay'];
  const tier5 = ['yungbleu', 'toosii', 'jackboy', 'morray', 'big30', 'pooh shiesty'];
  let ps = 0;
  if (tier10.some(a => t.includes(a))) ps = 10;
  else if (tier8.some(a => t.includes(a))) ps = 8;
  else if (tier5.some(a => t.includes(a))) ps = 5;
  else if (t.length > 5) ps = 3;

  const f = producer.followers_ig || 0;
  const fs = f < 50 ? 0 : f < 1000 ? 2 : f < 5000 ? 5 : f < 10000 ? 7 : f < 15000 ? 8 : 9;
  let base = ps * 0.8 + fs * 0.2;
  if (producer.instagram && producer.email) base += 0.8;
  else if (producer.instagram) base += 0.3;
  else base -= 0.5;
  return Math.min(10, Math.max(1, Math.round(base)));
}

// Stage 1: Fast extraction only — names, song, artist
async function extractFromGeniusUrl(url) {
  try {
    const result = await Promise.race([
      base44.integrations.Core.InvokeLLM({
        model: 'gemini_3_flash',
        add_context_from_internet: true,
        prompt: `Fetch this Genius page and extract ONLY the producer credits: ${url}

Look for the "Produced by" section in the song credits.
Return:
- song_title: the song title
- artist: the main performing artist  
- producers: array of ALL producer names from "Produced by" section
- found: true if page loaded and had producer credits

Only return real names from the page. Do not invent anything.`,
        response_json_schema: {
          type: 'object',
          properties: {
            song_title: { type: 'string' },
            artist: { type: 'string' },
            producers: { type: 'array', items: { type: 'string' } },
            found: { type: 'boolean' },
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

// Stage 2: Background enrichment for a single producer
async function enrichProducer(name, song, artist) {
  try {
    const info = await Promise.race([
      base44.integrations.Core.InvokeLLM({
        model: 'gemini_3_flash',
        add_context_from_internet: true,
        prompt: `Find contact info for music producer "${name}" who produced "${song}" by ${artist}.
Search: "${name} producer instagram" and "${name} beats"
1. Instagram handle and follower count
2. Contact email if publicly available
3. Notable artist placements (artist names only, comma-separated)
Return only verified info. Leave empty if not found.`,
        response_json_schema: {
          type: 'object',
          properties: {
            instagram_handle: { type: 'string' },
            instagram_followers: { type: 'number' },
            email: { type: 'string' },
            highlights_placements: { type: 'string' },
          },
        },
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ENRICH_TIMEOUT)),
    ]);
    return info;
  } catch {
    return { instagram_handle: '', instagram_followers: 0, email: '', highlights_placements: '' };
  }
}

export default function PlacementDiscovery() {
  const [links, setLinks] = useState('');
  const [phase, setPhase] = useState('idle'); // idle | extracting | saving | done
  const [stats, setStats] = useState({ processed: 0, total: 0, detected: 0, added: 0, skipped: 0 });
  const [enrichStatus, setEnrichStatus] = useState(''); // background enrichment status
  const [enrichDone, setEnrichDone] = useState(false);
  const queryClient = useQueryClient();
  const savedIds = useRef([]); // track saved record IDs for enrichment updates

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

    // ── Stage 1: Fast parallel extraction ────────────────────────────────────
    const producerMap = new Map(); // name.lower → { name, song, artist }
    let processed = 0, skipped = 0;

    for (let i = 0; i < geniusLinks.length; i += BATCH_SIZE) {
      const batch = geniusLinks.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(batch.map(url => extractFromGeniusUrl(url)));

      for (const res of results) {
        processed++;
        if (!res.found || !res.producers?.length) {
          skipped++;
        } else {
          for (const pName of res.producers) {
            const key = pName.toLowerCase().trim();
            if (!producerMap.has(key)) {
              producerMap.set(key, { name: pName, song: res.song_title, artist: res.artist });
            } else {
              const ex = producerMap.get(key);
              if (res.song_title) ex.song = `${ex.song}, ${res.song_title}`;
            }
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

    // ── Stage 1 save: immediately add to DB with defaults ─────────────────────
    setPhase('saving');
    const existing = await base44.entities.PlacementProducer.list('-created_date', 500);
    const existingIGs = new Set(existing.map(p => p.instagram?.toLowerCase().replace('@', '')).filter(Boolean));
    const existingNames = new Set(existing.map(p => p.name?.toLowerCase()));

    let added = 0, dupes = 0;
    for (const p of rawProducers) {
      if (existingNames.has(p.name.toLowerCase())) { dupes++; continue; }
      const record = await base44.entities.PlacementProducer.create({
        name: p.name,
        song: p.song,
        artist: p.artist,
        source: 'Placements',
        status: 'por contactar',
        priority_score: 5,
      });
      savedIds.current.push({ id: record.id, ...p });
      existingNames.add(p.name.toLowerCase());
      added++;
    }

    setStats(s => ({ ...s, added, skipped: s.skipped + dupes }));
    queryClient.invalidateQueries({ queryKey: ['placement-producers'] });
    toast.success(`Added ${added} producers${dupes > 0 ? ` (${dupes} dupes skipped)` : ''}`);
    setPhase('done');

    // ── Stage 2: Background enrichment (non-blocking) ─────────────────────────
    if (savedIds.current.length > 0) {
      setEnrichStatus(`Enriching 0 / ${savedIds.current.length}...`);
      (async () => {
        const toEnrich = [...savedIds.current];
        for (let i = 0; i < toEnrich.length; i += BATCH_SIZE) {
          const batch = toEnrich.slice(i, i + BATCH_SIZE);
          await Promise.all(batch.map(async (rec) => {
            const info = await enrichProducer(rec.name, rec.song, rec.artist);
            if (!info.instagram_handle && !info.email && !info.instagram_followers) return;

            let placements = info.highlights_placements?.trim() || '';
            placements = placements.split(',').map(s => s.split(/\s*[-–]\s*/)[0].trim()).filter(Boolean).join(', ');

            const updates = {};
            if (info.instagram_handle) updates.instagram = `@${info.instagram_handle.replace(/^@/, '')}`;
            if (info.instagram_followers > 0) updates.followers_ig = Math.round(info.instagram_followers);
            if (info.email?.trim()) updates.email = info.email.trim();
            if (placements) updates.highlights_placements = placements;

            if (Object.keys(updates).length > 0) {
              updates.priority_score = calculatePriority({ ...updates });
              await base44.entities.PlacementProducer.update(rec.id, updates);
            }
          }));

          setEnrichStatus(`Enriching ${Math.min(i + BATCH_SIZE, toEnrich.length)} / ${toEnrich.length}...`);
          queryClient.invalidateQueries({ queryKey: ['placement-producers'] });
        }

        setEnrichStatus('');
        setEnrichDone(true);
        toast.success('Background enrichment complete');
        queryClient.invalidateQueries({ queryKey: ['placement-producers'] });
      })();
    }
  };

  const reset = () => {
    setPhase('idle');
    setLinks('');
    setStats({ processed: 0, total: 0, detected: 0, added: 0, skipped: 0 });
    setEnrichStatus('');
    setEnrichDone(false);
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
          <p className="text-xs text-[#71717a]">Extract producers from Genius — fast save, background enrichment</p>
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
            <Zap className="w-4 h-4 mr-2" /> Extract & Save Producers
          </Button>
        </div>
      )}

      {/* PROGRESS */}
      {(phase === 'extracting' || phase === 'saving') && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Links processed', value: `${stats.processed} / ${stats.total}` },
              { label: 'Producers detected', value: stats.detected },
              { label: 'Links skipped', value: stats.skipped },
              { label: phase === 'saving' ? 'Saving...' : 'Scanning...', value: phase === 'saving' ? stats.added : '...' },
            ].map(s => (
              <div key={s.label} className="bg-[#0f0f10] border border-[#27272a] rounded-lg px-3 py-2 text-center">
                <p className="text-lg font-bold text-white">{s.value}</p>
                <p className="text-[10px] text-[#71717a] mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-purple-500/5 border border-purple-500/20 rounded-lg">
            <Loader2 className="w-4 h-4 animate-spin text-purple-400 flex-shrink-0" />
            <span className="text-sm text-purple-300">
              {phase === 'extracting'
                ? `Scanning ${BATCH_SIZE} links in parallel... (${stats.processed}/${stats.total})`
                : 'Saving producers to database...'}
            </span>
          </div>
        </div>
      )}

      {/* DONE */}
      {phase === 'done' && (
        <div className="space-y-3">
          {/* Summary */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Links processed', value: `${stats.processed} / ${stats.total}` },
              { label: 'Producers detected', value: stats.detected },
              { label: 'Added to DB', value: stats.added },
              { label: 'Skipped', value: stats.skipped },
            ].map(s => (
              <div key={s.label} className="bg-[#0f0f10] border border-[#27272a] rounded-lg px-3 py-2 text-center">
                <p className="text-lg font-bold text-white">{s.value}</p>
                <p className="text-[10px] text-[#71717a] mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Enrichment status */}
          <AnimatePresence>
            {enrichStatus && !enrichDone && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 px-3 py-2 bg-[#1e1e22] border border-[#27272a] rounded-lg"
              >
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#71717a] flex-shrink-0" />
                <span className="text-xs text-[#71717a]">Background enrichment: {enrichStatus}</span>
              </motion.div>
            )}
            {enrichDone && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 px-3 py-2 bg-green-500/5 border border-green-500/20 rounded-lg"
              >
                <Check className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                <span className="text-xs text-green-400">Enrichment complete — contact info updated</span>
              </motion.div>
            )}
          </AnimatePresence>

          <Button variant="ghost" size="sm" onClick={reset}
            className="w-full text-[#a1a1aa] hover:text-white border border-[#27272a]">
            <Plus className="w-4 h-4 mr-1.5" /> Discover More
          </Button>
        </div>
      )}
    </div>
  );
}