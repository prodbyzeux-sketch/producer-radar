import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Music2, Loader2, Check, X, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

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

function normalizeFollowers(followers) {
  if (!followers || followers < 50) return 0;
  if (followers < 1000) return 2;
  if (followers < 5000) return 5;
  if (followers < 10000) return 7;
  if (followers < 15000) return 8;
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

export default function PlacementDiscovery() {
  const [links, setLinks] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [progress, setProgress] = useState('');
  const [preview, setPreview] = useState(null); // array of producers to confirm
  const [selected, setSelected] = useState(new Set());
  const [saving, setSaving] = useState(false);
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

    setExtracting(true);
    setPreview(null);
    setProgress(`Extracting producers from ${geniusLinks.length} Genius page(s)...`);

    // Step 1: Extract producer names from Genius pages
    const extractResult = await base44.integrations.Core.InvokeLLM({
      model: 'gemini_3_flash',
      add_context_from_internet: true,
      prompt: `Visit each of these Genius song pages and extract the producers listed in the "Produced by" section.

URLs:
${geniusLinks.join('\n')}

For each page, return:
- song_title: the song title
- artist: the main artist
- producers: array of producer names listed in "Produced by"

Only include producers explicitly listed on the page. Do not invent any.`,
      response_json_schema: {
        type: 'object',
        properties: {
          songs: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                song_title: { type: 'string' },
                artist: { type: 'string' },
                genius_url: { type: 'string' },
                producers: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
      },
    });

    const songs = extractResult.songs || [];
    // Flatten all producers with their song context, dedupe by name
    const producerMap = new Map();
    for (const song of songs) {
      for (const pName of (song.producers || [])) {
        const key = pName.toLowerCase().trim();
        if (!producerMap.has(key)) {
          producerMap.set(key, {
            name: pName,
            song: song.song_title,
            artist: song.artist,
          });
        } else {
          // Append additional placements
          const existing = producerMap.get(key);
          existing.song = `${existing.song}, ${song.song_title}`;
        }
      }
    }

    const rawProducers = [...producerMap.values()];
    if (rawProducers.length === 0) {
      toast.error('No producers found in those Genius pages');
      setExtracting(false);
      setProgress('');
      return;
    }

    setExtracting(false);
    setEnriching(true);
    setProgress(`Found ${rawProducers.length} producers — enriching contact info...`);

    // Step 2: Enrich each producer with IG + email
    const enriched = [];
    for (let i = 0; i < rawProducers.length; i++) {
      const p = rawProducers[i];
      setProgress(`[${i + 1}/${rawProducers.length}] Searching contacts for ${p.name}...`);

      const info = await base44.integrations.Core.InvokeLLM({
        model: 'gemini_3_flash',
        add_context_from_internet: true,
        prompt: `Search the internet for contact information for music producer "${p.name}" who produced "${p.song}" by ${p.artist}.

Search:
1. Instagram: search "${p.name} producer instagram" — find their real IG handle and follower count
2. Email: check their website, linktree, beacons, or producer pages
3. Any other notable placements or artist collabs they have

Return only real verified information. Leave fields empty if not found.`,
        response_json_schema: {
          type: 'object',
          properties: {
            instagram_handle: { type: 'string' },
            instagram_followers: { type: 'number' },
            email: { type: 'string' },
            highlights_placements: { type: 'string' },
          },
        },
      });

      enriched.push({
        name: p.name,
        song: p.song,
        artist: p.artist,
        instagram: info?.instagram_handle ? `@${info.instagram_handle.replace(/^@/, '')}` : '',
        followers_ig: info?.instagram_followers > 0 ? Math.round(info.instagram_followers) : 0,
        email: info?.email?.trim() || '',
        highlights_placements: `${p.artist} - ${p.song}${info?.highlights_placements ? ', ' + info.highlights_placements : ''}`,
      });
    }

    setEnriching(false);
    setProgress('');
    setPreview(enriched);
    setSelected(new Set(enriched.map((_, i) => i)));
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

    // Load existing placement producers for dupe check
    const existing = await base44.entities.PlacementProducer.list('-created_date', 500);
    const existingIGs = new Set(
      existing.map(p => p.instagram?.toLowerCase().replace('@', '')).filter(Boolean)
    );
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
      existingIGs.add(igClean);
      existingNames.add(p.name.toLowerCase());
      added++;
    }

    queryClient.invalidateQueries({ queryKey: ['placement-producers'] });
    toast.success(`Saved ${added} producers${dupes > 0 ? ` (${dupes} duplicates skipped)` : ''}`);
    setSaving(false);
    setPreview(null);
    setLinks('');
    setSelected(new Set());
  };

  return (
    <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
          <Music2 className="w-4 h-4 text-purple-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white">Placement Discovery</h2>
          <p className="text-xs text-[#71717a]">Extract producers from Genius song pages</p>
        </div>
      </div>

      {!preview ? (
        <div className="space-y-3">
          <Textarea
            value={links}
            onChange={e => setLinks(e.target.value)}
            placeholder={"Paste Genius links, one per line:\nhttps://genius.com/artist-song-lyrics\nhttps://genius.com/artist-song2-lyrics"}
            className="bg-[#0f0f10] border-[#27272a] text-white text-sm min-h-[120px] placeholder:text-[#3f3f46]"
          />
          <Button
            onClick={extractProducers}
            disabled={extracting || enriching || !links.trim()}
            className="bg-purple-600 hover:bg-purple-500 text-white w-full"
            size="sm"
          >
            {(extracting || enriching) ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" /> {progress}</>
            ) : (
              <><Plus className="w-4 h-4 mr-2" /> Extract Placement Producers</>
            )}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-white font-medium">{preview.length} producers found — select which to save:</p>
            <div className="flex gap-2">
              <button onClick={() => setSelected(new Set(preview.map((_, i) => i)))}
                className="text-xs text-[#a1a1aa] hover:text-white transition-colors">Select all</button>
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
                  transition={{ delay: i * 0.03 }}
                  onClick={() => toggleSelect(i)}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selected.has(i)
                      ? 'bg-purple-500/10 border-purple-500/30'
                      : 'bg-[#0f0f10] border-[#27272a] opacity-50'
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
                      {p.instagram && (
                        <span className="text-xs text-[#a1a1aa]">📷 {p.instagram}</span>
                      )}
                      {p.followers_ig > 0 && (
                        <span className="text-xs text-[#a1a1aa]">{p.followers_ig.toLocaleString()} followers</span>
                      )}
                      {p.email && (
                        <span className="text-xs text-[#a1a1aa]">✉️ {p.email}</span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              variant="ghost" size="sm"
              onClick={() => { setPreview(null); }}
              className="text-[#a1a1aa] hover:text-white border border-[#27272a]"
            >
              <X className="w-4 h-4 mr-1.5" /> Cancel
            </Button>
            <Button
              onClick={saveProducers}
              disabled={saving || selected.size === 0}
              className="bg-purple-600 hover:bg-purple-500 text-white flex-1"
              size="sm"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving...</>
              ) : (
                <>Save {selected.size} Producer{selected.size !== 1 ? 's' : ''}</>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}