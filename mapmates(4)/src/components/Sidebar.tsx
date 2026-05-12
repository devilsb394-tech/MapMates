import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Map, Users, Shuffle, MessageSquare, User, Settings as SettingsIcon, Search, Trophy, Eye, PlayCircle, Crown, LogOut, ChevronRight, Sparkles, Zap, Activity, Shield } from 'lucide-react';
import { cn } from '../lib/utils';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  user: any;
  onLogin: () => void;
  onSignup: () => void;
  onOpenPremium?: () => void;
  onShowAchievements?: () => void;
  onShowRanking?: () => void;
  onShowStatus?: () => void;
}

export default function Sidebar({ activeTab, onTabChange, user, onLogin, onSignup, onOpenPremium }: SidebarProps) {
  const menuItems = [
    { id: 'map', label: 'MapVibe', icon: Map },
    { id: 'search', label: 'Search Mates', icon: Search },
    { id: 'friends', label: 'Friend List', icon: Users },
    { id: 'chat', label: 'Inbox / Messages', icon: MessageSquare },
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <aside className="w-80 bg-gradient-to-b from-[#020617] via-[#020617] to-blue-900/40 border-r border-blue-500/20 flex flex-col h-full transition-all duration-500 overflow-hidden relative shadow-[20px_0_50px_rgba(37,99,235,0.1)]">
      {/* Neon Glow Accents */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/20 blur-[100px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none translate-y-1/2 -translate-x-1/2" />
      
      <div className="p-8 pb-4 relative z-10">
        <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em] px-2 mb-1 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]">Navigation System</p>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 flex flex-col gap-2 relative z-10">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={cn(
              "flex items-center gap-4 px-6 py-4 rounded-[1.8rem] transition-all duration-300 group relative overflow-hidden border border-transparent",
              activeTab === item.id 
                ? "bg-blue-600/10 text-white border-blue-500/20 shadow-[0_10px_30px_rgba(37,99,235,0.1)]" 
                : "text-white/40 hover:bg-white/5 hover:text-white"
            )}
          >
            {activeTab === item.id && (
              <motion.div layoutId="active-tab-glow" className="absolute left-0 w-1 h-6 bg-blue-500 rounded-r-full shadow-[0_0_15px_#3b82f6]" />
            )}
            <item.icon className={cn("w-5 h-5 transition-transform group-hover:scale-110", activeTab === item.id ? "text-blue-400 drop-shadow-[0_0_5px_rgba(59,130,246,0.5)]" : "text-white/20 group-hover:text-blue-400")} />
            <span className="font-black text-sm uppercase tracking-wider italic">{item.label}</span>
          </button>
        ))}

        {!user && (
          <div className="mt-8 px-4 space-y-3">
            <button 
              onClick={onLogin}
              className="w-full py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black text-xs uppercase tracking-widest border border-white/5 transition-all active:scale-95 italic"
            >
              System Login
            </button>
            <button 
              onClick={onSignup}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-[0_15px_35px_rgba(37,99,235,0.3)] active:scale-95 italic"
            >
              Initialize Node
            </button>
          </div>
        )}

        <div className="mt-auto pt-8">
          <div className="p-6 bg-blue-600/5 rounded-[2.5rem] border border-white/5 relative overflow-hidden group">
            <div className="absolute top-[-20%] right-[-20%] w-24 h-24 bg-blue-500/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
            
            <div className="flex items-center gap-2 mb-3">
              <Crown className={cn("w-4 h-4", user?.premium ? "text-amber-400 animate-pulse" : "text-blue-400")} />
              <p className="text-[10px] font-black text-white uppercase tracking-[0.2em]">
                {user?.premium ? 'NEURAL ELITE ACTIVE' : 'UPGRADE PROTOCOL'}
              </p>
            </div>
            
            <p className="text-[10px] font-bold text-white/40 leading-relaxed mb-5 uppercase tracking-wide">
              {user?.premium 
                ? `Advanced node connectivity engaged. Welcome back, elite Mater.` 
                : 'Unlock quantum filters, encrypted signals, and priority routing.'}
            </p>
            
            <button 
              disabled={user?.premium}
              onClick={onOpenPremium}
              className={cn(
                "w-full py-3 text-[9px] font-black uppercase tracking-[0.3em] rounded-2xl transition-all relative overflow-hidden",
                user?.premium 
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                  : "bg-white text-black hover:bg-blue-400 hover:text-white"
              )}
            >
              {user?.premium ? 'ELITE STATUS' : 'IGNITE CORE'}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
