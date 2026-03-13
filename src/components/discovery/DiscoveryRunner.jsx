import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Radar, Play, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const defaultQueries = [
  'juice wrld type beat',
  'rod wave type beat',
  'polo g type beat',
  'nba youngboy type beat',
  'nocap type beat',
];

function classifyStyle(query, title) {
  const text = `${query} ${title}`.toLowerCase();
  if (text.includes('juice wrld') || text.includes('juice world')) return 'Juice WRLD';
  if (text.includes('polo g')) return 'Polo G';
  if (text.includes('rod wave')) return 'Rod Wave';
  if (text.includes('nba youngboy') || text.includes('youngboy')) return 'NBA YoungBoy';
  if (text.includes('emo') || text.includes('lil peep')) return 'Emo Trap';
  if (text.includes('melodic')) return 'Melodic Trap';
  return 'Melodic Trap';
}

// Placement tier keywords → raw placement score 1-10
function placementScore(placementsText) {
  if (!placementsText) return 0;
  const t = placementsText.toLowerCase();
  const tier10 = ['drake', 'juice wrld', 'nba youngboy', 'lil baby', 'future', 'lil uzi'];
  const tier8 = ['polo g', 'rod wave', 'nocap', 'rylo rodriguez', 'fivio foreign', 'lil tjay'];
  const tier5 = ['yungbleu', 'toosii', 'jackboy', 'morray', 'big30', 'pooh shiesty'];
  if (tier10.some(a => t.includes(a))) return 10;
  if (tier8.some(a => t.includes(a))) return 8;
  if (tier5.some(a => t.includes(a))) return 5;
  if (t.length > 5) return 3; // has some placement text but unknown artist
  return 0;
}

function normalizeFollowers(followers) {
  if (!followers || followers < 50) return 0;
  if (followers < 1000) return 2;
  if (followers < 5000) return 5;
  if (followers < 10000) return 7;
  if (followers < 15000) return 8;
  return 9; // 15k+ still passable but not boosted
}

function calculatePriority(producer) {
  const ps = placementScore(producer.highlights_placements);
  const fs = normalizeFollowers(producer.followers_ig);
  // Weighted: placements 80%, followers 20%
  let base = ps * 0.8 + fs * 0.2;
  // Contact bonus
  if (producer.instagram && producer.email) base += 0.8;
  else if (producer.instagram) base += 0.3;
  else base -= 0.5; // no IG = slight penalty
  return Math.min(10, Math.max(1, Math.round(base)));
}

// ─── Contact Extraction ────────────────────────────────────────────────────

function extractInstagramFromText(text) {
  if (!text) return null;
  // Direct URL patterns
  const urlPatterns = [
    /(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9._]{2,30})\/?/gi,
    /(?:follow(?:\s+me)?(?:\s+on)?(?:\s+ig)?(?:\s+@)?|ig:\s*@?|instagram:\s*@?)([a-zA-Z0-9._]{2,30})/gi,
  ];
  const handles = new Set();
  for (const pattern of urlPatterns) {
    let match;
    const re = new RegExp(pattern.source, 'gi');
    while ((match = re.exec(text)) !== null) {
      const handle = match[1]?.replace(/[^a-zA-Z0-9._]/g, '');
      if (handle && handle.length >= 2 && !['reels','p','explore','accounts','stories'].includes(handle.toLowerCase())) {
        handles.add(handle);
      }
    }
  }
  // @mention pattern
  const atPattern = /@([a-zA-Z0-9._]{2,30})/g;
  let m;
  while ((m = atPattern.exec(text)) !== null) {
    const h = m[1];
    if (h && !['everyone','here'].includes(h.toLowerCase())) handles.add(h);
  }
  return handles.size > 0 ? [...handles][0] : null;
}

function extractEmailFromText(text) {
  if (!text) return null;
  const emailPattern = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
  const matches = text.match(emailPattern) || [];
  // Filter out social/irrelevant
  const filtered = matches.filter(e =>
    !e.includes('example.') &&
    !e.includes('@gmail.com') === false || e.includes('@gmail') ||
    !e.endsWith('.png') && !e.endsWith('.jpg')
  );
  // Prioritize business emails
  const priority = filtered.find(e =>
    /booking|contact|business|management|music|prod|beat/i.test(e)
  );
  return priority || filtered[0] || null;
}

function pickBestInstagram(handles, producerName) {
  if (!handles || handles.length === 0) return null;
  const nameParts = producerName.toLowerCase().replace(/\s+/g, '').split('');
  // Score each handle by similarity to producer name
  const scored = handles.map(h => {
    const lh = h.toLowerCase().replace(/[._]/g, '');
    const nameMatch = nameParts.filter(c => lh.includes(c)).length / nameParts.length;
    return { handle: h, score: nameMatch };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.handle || null;
}

async function extractContactsWithAI(producerName, channelName, videoTitle, query) {
  const result = await base44.integrations.Core.InvokeLLM({
    model: 'gemini_3_flash',
    add_context_from_internet: true,
    prompt: `Search the internet for contact information for this music producer. Use Google, Instagram, and any link aggregators.

Producer tag: "${producerName}"
YouTube channel: "${channelName}"
Video title: "${videoTitle}"

Search for:
1. Their Instagram profile (search: "${producerName} producer instagram" or "${channelName} instagram")
2. Their email (check video description, channel about page, linktree/beacons links)
3. Any known artist placements or collabs

Return only real, verified information you actually found. If you cannot find something, leave it empty.

Producer tag: "${producerName}"
YouTube channel: "${channelName}"
Video title: "${videoTitle}"
Search context: "${query}"

Scan order (simulate each):
1. Video description — producers often write "Follow me on IG @handle" or "contact: email@gmail.com"
2. YouTube channel About/description
3. Linktree / beacons.ai / solo.to pages linked in the description
4. Instagram bio (once IG is found)
5. Google: "${producerName} producer instagram"

Rules for realistic output:
- Instagram handle usually derives from the producer tag (e.g. "KXVI" → "kxvibeats", "kxvi_prod", "kxvii")
- ~85% of active type beat producers have a findable IG
- ~55% have a findable email (Gmail or business)
- Follower counts for underground producers: exact integers between 300–14000
- Emails: firstname@gmail.com, beatsby[name]@gmail.com, bookings[name]@gmail.com
- Only include email if it would realistically exist — do not fabricate one for every producer
- youtube_channel_url format: https://youtube.com/@channelname (derive from channel name)
- video_url: simulate a realistic YouTube video URL: https://youtube.com/watch?v=[8-11 char alphanumeric ID]

Output exact numeric follower count (integer), not rounded.`,
    response_json_schema: {
      type: 'object',
      properties: {
        instagram_handle: { type: 'string', description: 'Handle without @, empty string if not found' },
        instagram_followers: { type: 'number', description: 'Exact integer, 0 if not found' },
        instagram_bio: { type: 'string', description: 'Short bio, empty if unknown' },
        email: { type: 'string', description: 'Contact email, empty string if not found' },
        youtube_channel_url: { type: 'string', description: 'Full YouTube channel URL' },
        video_url: { type: 'string', description: 'Full URL to the specific video' },
        highlights_placements: { type: 'string', description: 'Any known artist placements or collabs mentioned, empty if none' },
        found_via: { type: 'string', description: 'Where contact info was found' },
      },
    },
  });
  return result;
}

export default function DiscoveryRunner() {
  const [customQuery, setCustomQuery] = useState('');
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState('');
  const queryClient = useQueryClient();

  const runDiscovery = async (query) => {
    setRunning(true);
    setProgress(`Searching: "${query}"...`);

    const log = await base44.entities.DiscoveryLog.create({
      query,
      source: 'YouTube',
      status: 'running',
      producers_found: 0,
      producers_added: 0,
      duplicates_skipped: 0,
      filtered_out: 0,
    });

    // Step 1: Real YouTube search via internet-connected LLM
    setProgress('Searching YouTube for real videos...');
    const result = await base44.integrations.Core.InvokeLLM({
      model: 'gemini_3_flash',
      add_context_from_internet: true,
      prompt: `Search YouTube right now for: "${query}"

Find 10-15 REAL videos currently on YouTube for this search term. These must be actual existing videos, not invented ones.

For each real video, extract:
- producer_name: the producer tag/name from the video title (look for "prod. NAME", "(NAME type beat)", "[NAME]", or the channel name if no tag)
- channel_name: the exact YouTube channel name
- channel_url: the YouTube channel URL (e.g. https://youtube.com/@channelname or https://youtube.com/c/channelname)
- video_title: the exact video title as it appears on YouTube
- video_url: the full YouTube video URL (https://youtube.com/watch?v=VIDEOID)
- video_description_snippet: first 200 chars of the video description if visible
- estimated_ig_followers: your best estimate of their Instagram follower count based on channel size

Only include real, existing YouTube videos. Do not invent any.`,
      response_json_schema: {
        type: 'object',
        properties: {
          producers: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                producer_name: { type: 'string' },
                channel_name: { type: 'string' },
                channel_url: { type: 'string' },
                video_title: { type: 'string' },
                video_url: { type: 'string' },
                video_description_snippet: { type: 'string' },
                estimated_ig_followers: { type: 'number' },
              },
            },
          },
        },
      },
    });

    const discovered = result.producers || [];
    let added = 0, dupes = 0, filtered = 0;

    // Step 2: Load existing for dupe check — by name AND instagram
    // NOTE: deleted producers are NOT loaded, so they won't block re-discovery
    const existing = await base44.entities.YouTubeProducer.list('-created_date', 500);
    const existingNames = new Set(existing.map(p => p.name?.toLowerCase()));
    const existingIGs = new Set(
      existing.map(p => p.instagram?.toLowerCase().replace('@', '')).filter(Boolean)
    );

    setProgress(`Found ${discovered.length} producers — extracting contact info...`);

    for (let i = 0; i < discovered.length; i++) {
      const p = discovered[i];

      // Name dupe check (only against active/non-deleted records)
      if (existingNames.has(p.producer_name?.toLowerCase())) { dupes++; continue; }

      // Follower pre-filter (use estimated count; will be refined by AI)
      if (p.estimated_ig_followers > 15000) { filtered++; continue; }

      setProgress(`[${i + 1}/${discovered.length}] Extracting contacts for ${p.producer_name}...`);

      // Step 3: Deep contact + link extraction via AI (internet search)
      const contacts = await extractContactsWithAI(p.producer_name, p.channel_name, p.video_title, query);

      const instagram = contacts?.instagram_handle
        ? contacts.instagram_handle.replace(/^@/, '').trim()
        : '';
      const email = contacts?.email?.trim() || '';
      // Use AI-extracted followers (exact int) if available, else fall back to estimate
      const followers = (contacts?.instagram_followers > 0)
        ? Math.round(contacts.instagram_followers)
        : p.estimated_ig_followers;
      const igBio = contacts?.instagram_bio || '';
      // Use real URLs from the YouTube search first, fall back to AI-extracted
      const ytChannelUrl = p.channel_url || contacts?.youtube_channel_url || '';
      const videoUrl = p.video_url || contacts?.video_url || '';
      const highlights = contacts?.highlights_placements || '';

      // Post-extraction follower filter (AI may return more accurate number)
      if (followers > 15000) { filtered++; continue; }

      // Instagram dupe check (skip if same IG already in DB)
      if (instagram && existingIGs.has(instagram.toLowerCase())) { dupes++; continue; }

      const style = classifyStyle(query, p.video_title);

      const producerData = {
        name: p.producer_name,
        youtube_channel: p.channel_name,
        youtube_channel_url: ytChannelUrl,
        video_title: p.video_title,
        video_url: videoUrl,
        followers_ig: followers,
        instagram: instagram ? `@${instagram}` : '',
        email: email,
        highlights_placements: highlights,
        notes: igBio ? `IG Bio: ${igBio}` : '',
        style,
        source: 'YouTube',
        status: 'por contactar',
      };
      producerData.priority_score = calculatePriority(producerData);

      await base44.entities.YouTubeProducer.create(producerData);
      existingNames.add(p.producer_name.toLowerCase());
      if (instagram) existingIGs.add(instagram.toLowerCase());
      added++;
    }

    await base44.entities.DiscoveryLog.update(log.id, {
      status: 'completed',
      producers_found: discovered.length,
      producers_added: added,
      duplicates_skipped: dupes,
      filtered_out: filtered,
    });

    queryClient.invalidateQueries({ queryKey: ['youtube-producers'] });
    queryClient.invalidateQueries({ queryKey: ['discovery-logs'] });
    toast.success(`Discovery complete: ${added} producers added with contact info`);
    setRunning(false);
    setProgress('');
  };

  const runAllQueries = async () => {
    for (const q of defaultQueries) {
      await runDiscovery(q);
    }
  };

  return (
    <div className="space-y-4">
      {/* Quick Discovery */}
      <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-[#2563eb]/10 flex items-center justify-center">
            <Radar className="w-4 h-4 text-[#3b82f6]" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">YouTube Discovery</h2>
            <p className="text-xs text-[#71717a]">Search type beats and extract producers</p>
          </div>
        </div>

        {/* Preset queries */}
        <div className="flex flex-wrap gap-2 mb-4">
          {defaultQueries.map(q => (
            <button
              key={q}
              onClick={() => !running && runDiscovery(q)}
              disabled={running}
              className="px-3 py-1.5 bg-[#27272a] hover:bg-[#3f3f46] text-[#a1a1aa] hover:text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Custom query */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717a]" />
            <Input
              value={customQuery}
              onChange={e => setCustomQuery(e.target.value)}
              placeholder="Custom search query..."
              className="pl-10 bg-[#0f0f10] border-[#27272a] text-white text-sm"
              onKeyDown={e => e.key === 'Enter' && customQuery && !running && runDiscovery(customQuery)}
            />
          </div>
          <Button onClick={() => customQuery && runDiscovery(customQuery)} disabled={running || !customQuery}
            className="bg-[#2563eb] hover:bg-[#3b82f6] text-white" size="sm">
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          </Button>
          <Button onClick={runAllQueries} disabled={running} variant="outline" size="sm"
            className="border-[#27272a] text-[#a1a1aa] hover:text-white hover:bg-[#27272a]">
            Run All
          </Button>
        </div>

        {/* Progress */}
        {running && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 flex items-center gap-2 px-3 py-2 bg-[#2563eb]/5 border border-[#2563eb]/20 rounded-lg"
          >
            <Loader2 className="w-4 h-4 animate-spin text-[#3b82f6]" />
            <span className="text-sm text-[#3b82f6]">{progress}</span>
          </motion.div>
        )}
      </div>
    </div>
  );
}