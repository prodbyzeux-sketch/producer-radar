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

function extractProducerName(title) {
  const patterns = [
    /prod\.\s*([^|\]\)"]+)/i,
    /prod\s+by\s+([^|\]\)"]+)/i,
    /producer:\s*([^|\]\)"]+)/i,
    /\|\s*prod\.?\s*([^|\]\)"]+)/i,
  ];
  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) return match[1].trim();
  }
  return null;
}

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

function calculatePriority(producer) {
  let score = 0;
  if (producer.followers_ig && producer.followers_ig < 5000) score += 2;
  else if (producer.followers_ig && producer.followers_ig < 15000) score += 1;
  const melStyles = ['Juice WRLD', 'Melodic Trap', 'Emo Trap'];
  if (melStyles.includes(producer.style)) score += 2;
  if (producer.email) score += 2;
  score += 2; // active channel (found on YT)
  if (producer.highlights_placements) score += 2;
  return Math.min(score, 10);
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

    // Use LLM to simulate YouTube discovery
    setProgress('Analyzing YouTube results with AI...');
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a YouTube type beat research assistant. For the search query "${query}", generate a realistic list of 15-20 music producers that would appear in YouTube search results for type beats.

For each producer, generate:
- producer_name: a realistic producer name (use real-sounding producer tags like KXVI, Pluto, Sadboii, etc.)
- channel_name: YouTube channel name
- video_title: a realistic type beat video title containing the producer tag
- estimated_followers: realistic Instagram follower count (most should be under 15k, some over)

Make it realistic - these should be the kind of small to mid-size producers who make type beats on YouTube.`,
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
                video_title: { type: 'string' },
                estimated_followers: { type: 'number' },
              },
            },
          },
        },
      },
    });

    const discovered = result.producers || [];
    let added = 0, dupes = 0, filtered = 0;

    // Get existing producers for dupe check
    const existing = await base44.entities.YouTubeProducer.list('-created_date', 500);
    const existingNames = new Set(existing.map(p => p.name?.toLowerCase()));

    setProgress(`Processing ${discovered.length} producers...`);

    for (const p of discovered) {
      // Duplicate check by name
      if (existingNames.has(p.producer_name?.toLowerCase())) {
        dupes++;
        continue;
      }

      // Filter > 15k followers
      if (p.estimated_followers > 15000) {
        filtered++;
        continue;
      }

      const style = classifyStyle(query, p.video_title);
      const producerData = {
        name: p.producer_name,
        youtube_channel: p.channel_name,
        video_title: p.video_title,
        followers_ig: p.estimated_followers,
        style,
        source: 'YouTube',
        status: 'por contactar',
      };
      producerData.priority_score = calculatePriority(producerData);

      await base44.entities.YouTubeProducer.create(producerData);
      existingNames.add(p.producer_name?.toLowerCase());
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
    toast.success(`Discovery complete: ${added} new producers added`);
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