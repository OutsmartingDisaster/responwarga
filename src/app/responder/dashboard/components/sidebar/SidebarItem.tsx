'use client';

import { LucideIcon } from 'lucide-react';

interface SidebarItemProps {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick?: () => void;
  collapsed?: boolean;
  badge?: string;
  theme?: 'orange' | 'blue' | 'slate';
}

export default function SidebarItem({ 
  icon: Icon, 
  label, 
  active, 
  onClick, 
  collapsed, 
  badge, 
  theme = 'orange' 
}: SidebarItemProps) {
  const activeClass = theme === 'blue'
    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
    : 'bg-orange-600 text-white shadow-lg shadow-orange-900/20';

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-4 p-3 w-full rounded-xl transition-all duration-300 group relative overflow-hidden
        ${active ? activeClass : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
    >
      <Icon size={20} className={`z-10 ${active ? 'animate-pulse-slow' : ''}`} />
      {!collapsed && (
        <span className="z-10 font-medium text-sm tracking-wide whitespace-nowrap opacity-100 transition-opacity flex-1 text-left">
          {label}
        </span>
      )}
      {!collapsed && badge && (
        <span className={`z-10 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ${theme === 'blue' ? 'bg-blue-800' : 'bg-orange-800'}`}>
          {badge}
        </span>
      )}
      {active && (
        <div className={`absolute inset-0 z-0 bg-gradient-to-r ${theme === 'blue' ? 'from-blue-600 to-blue-500' : 'from-orange-600 to-orange-500'}`} />
      )}
    </button>
  );
}
