import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Radar, Users, UserCheck, Clock, TrendingUp, ArrowRight, MessageCircle, RefreshCw, Instagram } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import StatCard from '@/components/dashboard/StatCard';
import StatusBadge from '@/components/shared/StatusBadge';
import PriorityBar from '@/components/shared/PriorityBar';

export default function Dashboard() {
  const { data: ytProducers = [] } = useQuery({
    queryKey: ['youtube-producers'],
    queryFn: () => base44.entities.YouTubeProducer.list('-created_date', 100),
  });

  const { data: placementProducers = [] } = useQuery({
    queryKey: ['placement-producers'],
    queryFn: () => base44.entities.PlacementProducer.list('-created_date', 100),
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['discovery-logs'],
    queryFn: () => base44.entities.DiscoveryLog.list('-created_date', 10),
  });

  const today = new Date().toISOString().split('T')[0];
  const todayProducers = ytProducers.filter(p => p.created_date?.startsWith(today));
  const highPriority = [...ytProducers, ...placementProducers].filter(p => (p.priority || 0) >= 7);
  const contacted = [...ytProducers, ...placementProducers].filter(p => p.status === 'contactado');
  const followUps = [...ytProducers, ...placementProducers].filter(p => p.status?.startsWith('follow up'));

  // Daily DMs: not yet contacted
  const dailyDMs = [...ytProducers, ...placementProducers]
    .filter(p => p.status === 'por contactar')
    .sort((a, b) => (b.priority || 0) - (a.priority || 0))
    .slice(0, 8);

  // Daily Follow Ups: next_follow_up = today
  const dailyFollowUps = [...ytProducers, ...placementProducers]
    .filter(p => p.next_follow_up === today && p.status?.startsWith('follow up'))
    .sort((a, b) => (b.priority || 0) - (a.priority || 0));

  const topProducers = [...ytProducers, ...placementProducers]
    .sort((a, b) => (b.priority || 0) - (a.priority || 0))
    .slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-[#71717a] text-sm mt-1">Overview of your producer discovery network</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Discovered Today" value={todayProducers.length} icon={Radar} accentColor="#2563eb" />
        <StatCard title="High Priority" value={highPriority.length} icon={TrendingUp} accentColor="#22c55e" />
        <StatCard title="Contacted" value={contacted.length} icon={UserCheck} accentColor="#a855f7" />
        <StatCard title="Follow Ups" value={followUps.length} icon={Clock} accentColor="#f59e0b" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Priority Producers */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#18181b] border border-[#27272a] rounded-xl"
        >
          <div className="flex items-center justify-between p-5 border-b border-[#27272a]">
            <h2 className="text-sm font-semibold text-white">Top Priority Producers</h2>
            <Link to="/DailyContacts" className="flex items-center gap-1 text-xs text-[#3b82f6] hover:text-[#60a5fa] transition-colors">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-[#27272a]">
            {topProducers.length === 0 && (
              <div className="p-8 text-center text-[#3f3f46] text-sm">No producers yet. Start discovery!</div>
            )}
            {topProducers.map((p, i) => (
              <div key={p.id} className="flex items-center justify-between px-5 py-3 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[#3f3f46] w-4 tabular-nums">{i + 1}</span>
                  <div>
                    <p className="text-sm font-medium text-white">{p.name}</p>
                    <p className="text-xs text-[#71717a]">{p.instagram || 'No IG'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <PriorityBar score={p.priority || 0} max={10} />
                  <StatusBadge status={p.status || 'por contactar'} />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Recent Discovery Logs */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[#18181b] border border-[#27272a] rounded-xl"
        >
          <div className="flex items-center justify-between p-5 border-b border-[#27272a]">
            <h2 className="text-sm font-semibold text-white">Recent Discovery Logs</h2>
            <Link to="/Discovery" className="flex items-center gap-1 text-xs text-[#3b82f6] hover:text-[#60a5fa] transition-colors">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-[#27272a]">
            {logs.length === 0 && (
              <div className="p-8 text-center text-[#3f3f46] text-sm">No discovery runs yet</div>
            )}
            {logs.map(log => (
              <div key={log.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-white">{log.query}</p>
                  <p className="text-xs text-[#71717a]">{log.source} · {new Date(log.created_date).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[#a1a1aa]">
                    +{log.producers_added || 0} added
                  </span>
                  <StatusBadge status={log.status || 'completed'} />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Daily Workflow */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily DMs */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-[#18181b] border border-[#27272a] rounded-xl"
        >
          <div className="flex items-center justify-between p-5 border-b border-[#27272a]">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-[#3b82f6]" />
              <h2 className="text-sm font-semibold text-white">Daily DMs</h2>
              <span className="text-xs bg-[#2563eb]/10 text-[#3b82f6] border border-[#2563eb]/20 px-2 py-0.5 rounded-full">{dailyDMs.length}</span>
            </div>
            <Link to="/DailyContacts" className="flex items-center gap-1 text-xs text-[#3b82f6] hover:text-[#60a5fa] transition-colors">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-[#27272a]">
            {dailyDMs.length === 0 && (
              <div className="p-8 text-center text-[#3f3f46] text-sm">No producers to DM today</div>
            )}
            {dailyDMs.map(p => (
              <div key={p.id} className="flex items-center justify-between px-5 py-3 hover:bg-white/[0.02]">
                <div>
                  <p className="text-sm font-medium text-white">{p.name}</p>
                  {p.instagram && (
                    <a href={`https://instagram.com/${p.instagram.replace('@','')}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-[#71717a] hover:text-[#e1306c] transition-colors mt-0.5">
                      <Instagram className="w-3 h-3" />{p.instagram}
                    </a>
                  )}
                </div>
                <PriorityBar score={p.priority || 0} max={10} />
              </div>
            ))}
          </div>
        </motion.div>

        {/* Daily Follow Ups */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-[#18181b] border border-[#27272a] rounded-xl"
        >
          <div className="flex items-center justify-between p-5 border-b border-[#27272a]">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-white">Daily Follow Ups</h2>
              <span className="text-xs bg-amber-400/10 text-amber-400 border border-amber-400/20 px-2 py-0.5 rounded-full">{dailyFollowUps.length}</span>
            </div>
            <Link to="/DailyContacts" className="flex items-center gap-1 text-xs text-[#3b82f6] hover:text-[#60a5fa] transition-colors">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-[#27272a]">
            {dailyFollowUps.length === 0 && (
              <div className="p-8 text-center text-[#3f3f46] text-sm">No follow ups due today</div>
            )}
            {dailyFollowUps.map(p => (
              <div key={p.id} className="flex items-center justify-between px-5 py-3 hover:bg-white/[0.02]">
                <div>
                  <p className="text-sm font-medium text-white">{p.name}</p>
                  <p className="text-xs text-amber-400 mt-0.5">{p.status}</p>
                </div>
                <PriorityBar score={p.priority || 0} max={10} />
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Total Stats */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-[#18181b] border border-[#27272a] rounded-xl p-5"
      >
        <h2 className="text-sm font-semibold text-white mb-4">Network Overview</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <div>
            <p className="text-2xl font-bold text-white">{ytProducers.length}</p>
            <p className="text-xs text-[#71717a] mt-0.5">YouTube Producers</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{placementProducers.length}</p>
            <p className="text-xs text-[#71717a] mt-0.5">Placement Producers</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{[...ytProducers, ...placementProducers].filter(p => p.email).length}</p>
            <p className="text-xs text-[#71717a] mt-0.5">Emails Found</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{logs.length}</p>
            <p className="text-xs text-[#71717a] mt-0.5">Discovery Runs</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}