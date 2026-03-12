import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export default function StatCard({ title, value, icon: Icon, trend, trendLabel, accentColor = '#2563eb' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-[#18181b] border border-[#27272a] rounded-xl p-5 relative overflow-hidden group hover:border-[#3f3f46] transition-colors"
    >
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-5 -translate-y-6 translate-x-6"
        style={{ background: accentColor }} />
      
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[13px] text-[#71717a] font-medium">{title}</p>
          <p className="text-2xl font-bold text-white mt-1.5">{value}</p>
          {trend !== undefined && (
            <div className="flex items-center gap-1.5 mt-2">
              <span className={cn(
                "text-xs font-medium",
                trend >= 0 ? "text-emerald-400" : "text-red-400"
              )}>
                {trend >= 0 ? '+' : ''}{trend}%
              </span>
              {trendLabel && (
                <span className="text-xs text-[#71717a]">{trendLabel}</span>
              )}
            </div>
          )}
        </div>
        <div className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ background: `${accentColor}15` }}>
          <Icon className="w-5 h-5" style={{ color: accentColor }} />
        </div>
      </div>
    </motion.div>
  );
}