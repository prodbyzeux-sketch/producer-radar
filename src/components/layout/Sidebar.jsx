import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Youtube, 
  Music2, 
  Radar, 
  Users, 
  MessageSquare,
  BookUser,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/Dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/YouTubeProducers', label: 'YouTube Producers', icon: Youtube },
  { path: '/PlacementProducers', label: 'Placement Producers', icon: Music2 },
  { path: '/Discovery', label: 'Discovery', icon: Radar },
  { path: '/DailyContacts', label: 'Daily Contacts', icon: Users },
  { path: '/Contacts', label: 'Contacts', icon: BookUser },
  { path: '/MessageGenerator', label: 'Message Generator', icon: MessageSquare },
];

export default function Sidebar({ collapsed, onToggle }) {
  const location = useLocation();

  return (
    <aside className={cn(
      "fixed left-0 top-0 h-screen z-50 flex flex-col transition-all duration-300 ease-in-out",
      "bg-[#18181b] border-r border-[#27272a]",
      collapsed ? "w-[68px]" : "w-[240px]"
    )}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-[#27272a]">
        <div className="w-8 h-8 rounded-lg bg-[#2563eb] flex items-center justify-center flex-shrink-0">
          <Radar className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <span className="font-semibold text-[15px] text-white tracking-tight whitespace-nowrap">
            Producer Radar
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {navItems.map(({ path, label, icon: Icon }) => {
          const isActive = location.pathname === path || 
            (path === '/Dashboard' && location.pathname === '/');
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                isActive 
                  ? "bg-[#2563eb]/10 text-[#3b82f6]" 
                  : "text-[#a1a1aa] hover:text-white hover:bg-white/5"
              )}
            >
              <Icon className={cn("w-[18px] h-[18px] flex-shrink-0", isActive && "text-[#3b82f6]")} />
              {!collapsed && (
                <span className="text-[13px] font-medium whitespace-nowrap">{label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="flex items-center justify-center h-12 border-t border-[#27272a] text-[#71717a] hover:text-white transition-colors"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </aside>
  );
}