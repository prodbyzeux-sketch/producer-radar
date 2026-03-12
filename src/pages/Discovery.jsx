import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Radar, Play, Loader2, Youtube, Music2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import StatusBadge from '@/components/shared/StatusBadge';
import DiscoveryRunner from '@/components/discovery/DiscoveryRunner';

const defaultQueries = [
  'juice wrld type beat',
  'rod wave type beat',
  'polo g type beat',
  'nba youngboy type beat',
  'nocap type beat',
];

export default function Discovery() {
  const [customQuery, setCustomQuery] = useState('');
  const queryClient = useQueryClient();

  const { data: logs = [] } = useQuery({
    queryKey: ['discovery-logs'],
    queryFn: () => base44.entities.DiscoveryLog.list('-created_date', 50),
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Discovery</h1>
        <p className="text-[#71717a] text-sm mt-1">Search YouTube type beats and song credits for producers</p>
      </div>

      {/* YouTube Discovery */}
      <DiscoveryRunner />

      {/* Discovery Logs */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Discovery History</h2>
        <div className="bg-[#18181b] border border-[#27272a] rounded-xl divide-y divide-[#27272a]">
          {logs.length === 0 && (
            <div className="p-8 text-center text-[#3f3f46] text-sm">No discovery runs yet</div>
          )}
          {logs.map((log, i) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-center justify-between px-5 py-4"
            >
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-lg bg-[#27272a] flex items-center justify-center">
                  {log.source === 'YouTube' ? (
                    <Youtube className="w-4 h-4 text-red-400" />
                  ) : (
                    <Music2 className="w-4 h-4 text-purple-400" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{log.query}</p>
                  <p className="text-xs text-[#71717a]">
                    {new Date(log.created_date).toLocaleString()} · {log.source}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm text-white tabular-nums">
                    {log.producers_found || 0} found · {log.producers_added || 0} added
                  </p>
                  <p className="text-xs text-[#71717a]">
                    {log.duplicates_skipped || 0} dupes · {log.filtered_out || 0} filtered
                  </p>
                </div>
                <StatusBadge status={log.status || 'completed'} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}