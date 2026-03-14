import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Music2, Loader2, Check, X, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const BATCH_SIZE = 5; // parallel links per batch

function placementScore(placementsText) {
  if (!placementsText) return 0;
  const t = placementsText.toLowerCase();
  const tier10 = ['drake', 'juice wrld', 'nba youngboy', 'lil baby', 'future', 'lil uzi'];
  const tier8 = ['polo g', 'rod wave', 'nocap', 'rylo rodriguez', 'fivio foreign', 'lil tjay'];
  const tier5 = ['yungbleu', 'toosii', 'jackboy', 'morray', 'big30', 'pooh shiesty'];
  if (tier10.some(a => t.includes(a))) return 10;
  if (tier8.some(a => t.includes(a))) return 8;
  if (tier5.some(a => t.includes(a))) return 5;
  if (t.length > 5) return 3;
  return 0;
}

function normalizeFollowers(f) {
  if (!f || f < 50) return 0;
  if (f < 1000) return 2;
  if (f < 5000) return 5;
  if (f < 10000) return 7;
  if (f < 15000) return 8;
  return 9;
}

function calculatePriority(producer) {
  const ps = placementScore(producer.highlights_placements);
  const fs = normalizeFollowers(producer.followers_ig);
  let base = ps * 0.8 + fs * 0.2;
  if (producer.instagram && producer.email) base += 0.8;
  else if (producer.instagram) base += 0.3;
  else base -= 0.5;
  return Math.min(10, Math.max(1, Math.round(base)));
}

// Extract producers from a single Genius URL via HTML content scan
async function extractFromGeniusUrl(url) {
  try {
    const result = await Promise.race([
      base44.integrations.Core.InvokeLLM({
        model: 'gemini_3_flash',
        add_context_from_internet: true,
        prompt: `Fetch this Genius page and extract producer credits: ${url}

Look specifically for the "Produced by" section in the song credits/metadata area of the page.
Extract ALL producer names listed there (there can be multiple producers per song).

Return:
- song_title: the song title from the page
- artist: the main performing artist
- producers: array of ALL producer names from "Produced by" section
- found: true if page loaded and had producer credits, false otherwise

Only return real data from the page. Do not invent producers.`,
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
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 20000)),
    ]);
    return { url, ...result };
  } catch {
    return { url, found: false, producers: [], song_title: '', artist: '' };
  }
}

// Enrich a single producer with contact info
async function enrichProducer(name, song, artist) {
  try {
    const info = await Promise.race([
      base44.integrations.Core.InvokeLLM({
        model: 'gemini_3_flash',
        add_context_from_internet: true,
        prompt: `Find contact info for music producer "${name}" who produced "${song}" by ${artist}.

Search: "${name} producer instagram" and "${name} beats" and "${name} genius"
1. Instagram handle and follower count
2. Contact email (from linktree, beacons, website)
3. Go to their Genius producer page (genius.com/producers/${name.replace(/\s+/g, '-')}) and extract the ARTIST NAMES they have worked with (NOT song titles). Only include well-known artists (rappers, singers). Return only artist names separated by commas, e.g. "Future, Lil Baby, Rod Wave". Do NOT include song names, dashes, or extra text. If they have no notable placements or no Genius page, return empty string.

Return only verified info. Leave empty if not found.`,
        response_json_schema: {
          type: 'object',
          properties: {
            instagram_handle: { type: 'string' },
            instagram_followers: { type: 'number' },
            email: { type: 'string' },
            highlights_placements: { type: 'string', description: 'Comma-separated artist names only, e.g. "Future, Lil Baby". No song titles.' },
          },
        },
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 15000)),
    ]);
    return info;
  } catch {
    return { instagram_handle: '', instagram_followers: 0, email: '', highlights_placements: '' };
  }
}

export default function PlacementDiscovery() {
  const [links, setLinks] = useState('');
  const [phase, setPhase] = useState('idle'); // idle | extracting | enriching | preview
  const [stats, setStats] = useState({ processed: 0, total: 0, detected: 0, added: 0, skipped: 0 });
  const [preview, setPreview] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [enrichProgress, setEnrichProgress] = useState('');
  const queryClient = useQueryClient();

  const extractProducers = async () => {
    const geniusLinks = links
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.includes('genius.com'));

    if (geniusLinks.length === 0) {
      toast.error('Paste at least one Genius link');
      return;
    }

    setPhase('extracting');
    setStats({ processed: 0, total: geniusLinks.length, detected: 0, added: 0, skipped: 0 });

    // Phase 1: Parallel batch extraction
    const producerMap = new Map(); // name.lower → { name, song, artist }
    let processed = 0;
    let skipped = 0;

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

      setStats({ processed, total: geniusLinks.length, detected: producerMap.size, added: 0, skipped });
    }

    const rawProducers = [...producerMap.values()];
    if (rawProducers.length === 0) {
      toast.error('No producers found in those Genius pages');
      setPhase('idle');
      return;
    }

    // Phase 2: Parallel enrichment in batches
    setPhase('enriching');
    const enriched = new Array(rawProducers.length).fill(null);

    for (let i = 0; i < rawProducers.length; i += BATCH_SIZE) {
      const batch = rawProducers.slice(i, i + BATCH_SIZE);
      setEnrichProgress(`Enriching ${i + 1}–${Math.min(i + BATCH_SIZE, rawProducers.length)} of ${rawProducers.length}...`);

      const results = await Promise.all(
        batch.map((p, j) => enrichProducer(p.name, p.song, p.artist).then(info => ({ idx: i + j, p, info })))
      );

      for (const { idx, p, info } of results) {
        // Clean placements: only artist names, strip any "Artist - Song" patterns
        let placements = info?.highlights_placements?.trim() || '';
        // Remove anything after a dash (song names)
        placements = placements.split(',').map(s => s.split(/\s*[-–]\s*/)[0].trim()).filter(Boolean).join(', ');

        enriched[idx] = {
          name: p.name,
          song: p.song,
          artist: p.artist,
          instagram: info?.instagram_handle ? `@${info.instagram_handle.replace(/^@/, '')}` : '',
          followers_ig: info?.instagram_followers > 0 ? Math.round(info.instagram_followers) : 0,
          email: info?.email?.trim() || '',
          highlights_placements: placements,
        };
      }
    }

    setPhase('preview');
    setEnrichProgress('');
    setPreview(enriched.filter(Boolean));
    setSelected(new Set(enriched.filter(Boolean).map((_, i) => i)));
  };

  const toggleSelect = (i) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const saveProducers = async () => {
    const toSave = preview.filter((_, i) => selected.has(i));
    if (toSave.length === 0) { toast.error('Select at least one producer'); return; }

    setSaving(true);
    const existing = await base44.entities.PlacementProducer.list('-created_date', 500);
    const existingIGs = new Set(existing.map(p => p.instagram?.toLowerCase().replace('@', '')).filter(Boolean));
    const existingNames = new Set(existing.map(p => p.name?.toLowerCase()));

    let added = 0, dupes = 0;
    for (const p of toSave) {
      const igClean = p.instagram?.replace('@', '').toLowerCase();
      if (igClean && existingIGs.has(igClean)) { dupes++; continue; }
      if (existingNames.has(p.name.toLowerCase())) { dupes++; continue; }

      const producerData = {
        name: p.name,
        instagram: p.instagram,
        email: p.email,
        followers_ig: p.followers_ig,
        song: p.song,
        artist: p.artist,
        highlights_placements: p.highlights_placements,
        source: 'Placements',
        status: 'por contactar',
      };
      producerData.priority_score = calculatePriority(producerData);
      await base44.entities.PlacementProducer.create(producerData);
      existingIGs.add(igClean || '');
      existingNames.add(p.name.toLowerCase());
      added++;
    }

    queryClient.invalidateQueries({ queryKey: ['placement-producers'] });
    toast.success(`Saved ${added} producers${dupes > 0 ? ` (${dupes} skipped)` : ''}`);
    setSaving(false);
    setPhase('idle');
    setPreview(null);
    setLinks('');
    setSelected(new Set());
  };

  const reset = () => {
    setPhase('idle');
    setPreview(null);
    setSelected(new Set());
    setStats({ processed: 0, total: 0, detected: 0, added: 0, skipped: 0 });
    setEnrichProgress('');
  };

  return (
    <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
          <Music2 className="w-4 h-4 text-purple-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white">Placement Discovery</h2>
          <p className="text-xs text-[#71717a]">Extract producers from Genius song pages (parallel)</p>
        </div>
      </div>

      {/* INPUT PHASE */}
      {phase === 'idle' && (
        <div className="space-y-3">
          <Textarea
            value={links}
            onChange={e => setLinks(e.target.value)}
            placeholder={"Paste Genius links, one per line:\nhttps://genius.com/artist-song-lyrics\nhttps://genius.com/artist-song2-lyrics"}
            className="bg-[#0f0f10] border-[#27272a] text-white text-sm min-h-[120px] placeholder:text-[#3f3f46]"
          />
          <Button
            onClick={extractProducers}
            disabled={!links.trim()}
            className="bg-purple-600 hover:bg-purple-500 text-white w-full"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" /> Extract Placement Producers
          </Button>
        </div>
      )}

      {/* EXTRACTION PHASE */}
      {(phase === 'extracting' || phase === 'enriching') && (
        <div className="space-y-4">
          {/* Progress stats */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Links processed', value: `${stats.processed} / ${stats.total}` },
              { label: 'Producers detected', value: stats.detected },
              { label: 'Links skipped', value: stats.skipped },
              { label: phase === 'enriching' ? 'Enriching' : 'Scanning', value: phase === 'enriching' ? '...' : '...' },
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
                ? `Scanning ${BATCH_SIZE} links at a time... (${stats.processed}/${stats.total} done)`
                : enrichProgress || 'Enriching producers...'}
            </span>
          </div>
        </div>
      )}

      {/* PREVIEW PHASE */}
      {phase === 'preview' && preview && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-white font-medium">{preview.length} producers found — select which to save:</p>
            <div className="flex gap-2">
              <button onClick={() => setSelected(new Set(preview.map((_, i) => i)))}
                className="text-xs text-[#a1a1aa] hover:text-white transition-colors">All</button>
              <span className="text-[#3f3f46]">·</span>
              <button onClick={() => setSelected(new Set())}
                className="text-xs text-[#a1a1aa] hover:text-white transition-colors">None</button>
            </div>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            <AnimatePresence>
              {preview.map((p, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  onClick={() => toggleSelect(i)}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selected.has(i) ? 'bg-purple-500/10 border-purple-500/30' : 'bg-[#0f0f10] border-[#27272a] opacity-50'
                  }`}
                >
                  <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    selected.has(i) ? 'bg-purple-600' : 'border border-[#3f3f46]'
                  }`}>
                    {selected.has(i) && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{p.name}</p>
                    <p className="text-xs text-[#71717a] truncate">{p.artist} — {p.song}</p>
                    <div className="flex flex-wrap gap-3 mt-1.5">
                      {p.instagram && <span className="text-xs text-[#a1a1aa]">📷 {p.instagram}</span>}
                      {p.followers_ig > 0 && <span className="text-xs text-[#a1a1aa]">{p.followers_ig.toLocaleString()} followers</span>}
                      {p.email && <span className="text-xs text-[#a1a1aa]">✉️ {p.email}</span>}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={reset}
              className="text-[#a1a1aa] hover:text-white border border-[#27272a]">
              <X className="w-4 h-4 mr-1.5" /> Cancel
            </Button>
            <Button onClick={saveProducers} disabled={saving || selected.size === 0}
              className="bg-purple-600 hover:bg-purple-500 text-white flex-1" size="sm">
              {saving
                ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving...</>
                : <>Save {selected.size} Producer{selected.size !== 1 ? 's' : ''}</>}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}