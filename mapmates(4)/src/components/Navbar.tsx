import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, HelpCircle, LogIn, UserPlus, User, ArrowDownToLine as Download, Menu, Info, ChevronRight, Users, Settings as SettingsIcon, Crown, Trophy, PenLine, X, QrCode } from 'lucide-react';
import { db } from '../firebase/firebase';
import { UserProfile } from '../types';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';

import { UserAvatar } from './UserAvatar';
import { cn } from '../lib/utils';

interface NavbarProps {
  user: UserProfile | null;
  onlineCount: number;
  unreadCount: number;
  onLogin: () => void;
  onSignup: () => void;
  onTabChange: (tab: string) => void;
  onViewProfile: (id: string) => void;
  onShowStory: () => void;
  onMenuToggle?: (isOpen: boolean) => void;
  onSearch?: (query: string) => void;
  onOpenFilter?: () => void;
  onOpenPremium?: () => void;
  onShowAchievements?: () => void;
  onShowRanking?: () => void;
  onShowStatus?: () => void;
  showInstallBtn?: boolean;
  onInstall?: () => void;
}

export default function Navbar({ user, onlineCount, unreadCount, onLogin, onSignup, onTabChange, onViewProfile, onShowStory, onMenuToggle, onSearch, onOpenFilter, onOpenPremium, onShowAchievements, onShowRanking, onShowStatus, showInstallBtn, onInstall }: NavbarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const toggleMenu = (val: boolean) => {
    setShowMenu(val);
    onMenuToggle?.(val);
  };

  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toLowerCase();
    setSearchQuery(val);
    if (val.length > 0) {
      const q = query(
        collection(db, 'users'),
        where('username', '>=', val),
        where('username', '<=', val + '\uf8ff'),
        limit(5)
      );
      const snap = await getDocs(q);
      setSearchResults(snap.docs.map(doc => doc.data() as UserProfile));
      setShowResults(true);
    } else {
      setSearchResults([]);
      setShowResults(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      onTabChange('search');
      onSearch?.(searchQuery);
      setShowResults(false);
    }
  };

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (onMenuToggle) onMenuToggle(showMenu);
    if (showMenu) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }, [showMenu, onMenuToggle]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node) && showMenu) {
        toggleMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  return (
    <nav className={cn(
      "relative h-16 w-full shrink-0 z-[7000] flex items-center px-4 sm:px-8 justify-between transition-all duration-500",
      showMenu ? "shadow-none" : "shadow-[0_10px_40px_rgba(37,99,235,0.2)]"
    )}>
      {/* Background with Blur - Separated to avoid trapping fixed/absolute children */}
      <div className={cn(
        "absolute inset-0 bg-[#020617]/90 backdrop-blur-3xl border-b border-blue-500/30 overflow-hidden transition-opacity duration-300",
        showMenu ? "opacity-0 pointer-events-none" : "opacity-100"
      )}>
        {/* Neon Glow Accents */}
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-60 shadow-[0_0_15px_#3b82f6]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.15),transparent_50%)]" />
      </div>
      
      <div className="flex items-center gap-3 sm:gap-6 relative z-10 w-full justify-between">
        <div className="flex items-center gap-3 sm:gap-6">
          <div className="relative" ref={menuRef}>
            <button 
              onClick={() => toggleMenu(!showMenu)}
              className="p-2.5 hover:bg-white/10 rounded-2xl transition-all active:scale-95 text-white/70 hover:text-white border border-transparent hover:border-white/10 z-[8500] relative"
            >
              {showMenu ? <X className="w-5 h-5 sm:w-6 sm:h-6" /> : <Menu className="w-5 h-5 sm:w-6 sm:h-6" />}
            </button>

            <AnimatePresence>
              {showMenu && (
                <>
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => toggleMenu(false)}
                    className="fixed inset-0 z-[7500] bg-black/60 backdrop-blur-sm"
                  />
                  <motion.div
                    initial={{ opacity: 0, x: -50, scale: 0.95, filter: 'blur(10px)' }}
                    animate={{ opacity: 1, x: 0, scale: 1, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, x: -50, scale: 0.95, filter: 'blur(10px)' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="fixed top-0 left-0 bottom-0 w-[85vw] sm:w-[380px] bg-[#020617]/95 backdrop-blur-3xl border-r border-blue-500/30 shadow-[40px_0_100px_rgba(0,0,0,0.8)] z-[8000] overflow-hidden rounded-r-[3rem]"
                  >
                    <div className="h-full flex flex-col pt-20">
                      <div className="max-h-full overflow-y-auto custom-scrollbar p-3 flex-1">
                        <div className="px-6 pt-4 mb-8">
                          <h3 className="text-3xl font-black tracking-tighter text-white italic uppercase leading-none">Systems</h3>
                          <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mt-2 opacity-70">Central Control / Root</p>
                        </div>

                      <div className="space-y-1.5 px-3 pb-8">
                        <button
                          onClick={() => {
                            onShowStory();
                            toggleMenu(false);
                          }}
                          className="w-full flex items-center gap-5 p-5 hover:bg-blue-600/10 rounded-[2rem] transition-all duration-300 group border border-transparent hover:border-blue-500/30 relative overflow-hidden shadow-sm hover:shadow-[0_0_30px_rgba(37,99,235,0.15)]"
                        >
                          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/40 group-hover:scale-110 transition-all duration-500 relative">
                            <div className="absolute inset-0 bg-blue-400/30 blur-md rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                            <Info className="w-6 h-6 text-white relative z-10" />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="text-sm font-black text-white leading-tight uppercase italic tracking-tighter group-hover:text-blue-400 transition-colors">Origins</p>
                            <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] mt-1 group-hover:text-white/40">Project Log v1.0</p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-white/10 group-hover:text-blue-400 group-hover:translate-x-1 transition-all duration-300" />
                        </button>

                        <button
                          onClick={() => {
                            onOpenPremium?.();
                            toggleMenu(false);
                          }}
                          className="w-full flex items-center gap-5 p-5 hover:bg-blue-600/10 rounded-[2rem] transition-all duration-300 group border border-transparent hover:border-blue-500/30 relative overflow-hidden shadow-sm hover:shadow-[0_0_30px_rgba(37,99,235,0.15)]"
                        >
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/40 group-hover:scale-110 transition-all duration-500 relative">
                             <div className="absolute inset-0 bg-blue-400/30 blur-md rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                            <Crown className="w-6 h-6 text-white relative z-10" />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="text-sm font-black text-white leading-tight uppercase italic tracking-tighter group-hover:text-blue-400 transition-colors">
                              {user?.premium ? 'Core Elite' : 'Neural Ignite'}
                            </p>
                            <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] mt-1 group-hover:text-white/40">
                              {user?.premium ? 'Priority Access' : 'Upgrade Protocol'}
                            </p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-white/10 group-hover:text-blue-400 group-hover:translate-x-1 transition-all duration-300" />
                        </button>

                        <button
                          onClick={() => {
                            onShowAchievements?.();
                            toggleMenu(false);
                          }}
                          className="w-full flex items-center gap-5 p-5 hover:bg-blue-600/10 rounded-[2rem] transition-all duration-300 group border border-transparent hover:border-blue-500/30 relative overflow-hidden shadow-sm hover:shadow-[0_0_30px_rgba(37,99,235,0.15)]"
                        >
                          <div className="w-12 h-12 bg-blue-900/40 rounded-2xl flex items-center justify-center border border-blue-500/30 group-hover:bg-blue-600 shadow-lg group-hover:shadow-blue-500/40 group-hover:scale-110 transition-all duration-500 relative">
                            <Trophy className="w-6 h-6 text-blue-400 group-hover:text-white" />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="text-sm font-black text-white leading-tight uppercase italic tracking-tighter group-hover:text-blue-400 transition-colors">Milestones</p>
                            <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] mt-1 group-hover:text-white/40">Sync Progress</p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-white/10 group-hover:text-blue-400 group-hover:translate-x-1 transition-all duration-300" />
                        </button>

                        <button
                          onClick={() => {
                            onShowRanking?.();
                            toggleMenu(false);
                          }}
                          className="w-full flex items-center gap-5 p-5 hover:bg-blue-600/10 rounded-[2rem] transition-all duration-300 group border border-transparent hover:border-blue-500/30 relative overflow-hidden shadow-sm hover:shadow-[0_0_30px_rgba(37,99,235,0.15)]"
                        >
                          <div className="w-12 h-12 bg-blue-950/60 rounded-2xl flex items-center justify-center border border-blue-500/30 group-hover:bg-blue-700 shadow-lg group-hover:shadow-blue-500/40 group-hover:scale-110 transition-all duration-500 relative">
                            <Crown className="w-6 h-6 text-blue-500 group-hover:text-white" />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="text-sm font-black text-white leading-tight uppercase italic tracking-tighter group-hover:text-blue-400 transition-colors">Leaderboard</p>
                            <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] mt-1 group-hover:text-white/40">Global Tiers</p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-white/10 group-hover:text-blue-400 group-hover:translate-x-1 transition-all duration-300" />
                        </button>

                        <button
                          onClick={() => {
                            onShowStatus?.();
                            toggleMenu(false);
                          }}
                          className="w-full flex items-center gap-5 p-5 hover:bg-emerald-500/10 rounded-[2rem] transition-all duration-300 group border border-transparent hover:border-emerald-500/30 relative overflow-hidden shadow-sm hover:shadow-[0_0_30px_rgba(16,185,129,0.15)]"
                        >
                          <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/40 group-hover:scale-110 transition-all duration-500 relative">
                            <div className="absolute inset-0 bg-emerald-400/30 blur-md rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                            <PenLine className="w-6 h-6 text-white relative z-10" />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="text-sm font-black text-white leading-tight uppercase italic tracking-tighter group-hover:text-emerald-400 transition-colors">Broadcast</p>
                            <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] mt-1 group-hover:text-white/40">Signal Status</p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-white/10 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all duration-300" />
                        </button>

                        <button
                          onClick={() => {
                            setShowQR(true);
                            toggleMenu(false);
                          }}
                          className="w-full flex items-center gap-5 p-5 hover:bg-blue-600/10 rounded-[2rem] transition-all duration-300 group border border-transparent hover:border-blue-500/30 relative overflow-hidden shadow-sm hover:shadow-[0_0_30px_rgba(37,99,235,0.15)]"
                        >
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/40 group-hover:scale-110 transition-all duration-500 relative">
                            <div className="absolute inset-0 bg-blue-400/30 blur-md rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                            <QrCode className="w-6 h-6 text-white relative z-10" />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="text-sm font-black text-white leading-tight uppercase italic tracking-tighter group-hover:text-blue-400 transition-colors">QR Scan</p>
                            <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] mt-1 group-hover:text-white/40">Network Link</p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-white/10 group-hover:text-blue-400 group-hover:translate-x-1 transition-all duration-300" />
                        </button>

                      {showInstallBtn && (
                        <button
                          onClick={() => {
                            onInstall?.();
                            toggleMenu(false);
                          }}
                          className="w-full flex items-center gap-5 p-5 hover:bg-blue-600/10 rounded-[2rem] transition-all duration-300 group border border-transparent hover:border-blue-500/30 relative overflow-hidden shadow-sm hover:shadow-[0_0_30px_rgba(37,99,235,0.15)]"
                        >
                          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/40 group-hover:scale-110 transition-all duration-500 relative">
                            <div className="absolute inset-0 bg-blue-400/30 blur-md rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                            <Download className="w-6 h-6 text-white relative z-10" />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="text-sm font-black text-white leading-tight uppercase italic tracking-tighter group-hover:text-blue-400 transition-colors">Local Install</p>
                            <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] mt-1 group-hover:text-white/40">Edge Computing</p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-white/10 group-hover:text-blue-400 group-hover:translate-x-1 transition-all duration-300" />
                        </button>
                      )}
                      
                      <button
                        onClick={() => {
                          onTabChange('settings');
                          toggleMenu(false);
                        }}
                        className="w-full flex items-center gap-5 p-5 hover:bg-white/5 rounded-[2rem] transition-all duration-300 group border border-transparent hover:border-white/10 relative overflow-hidden mt-2 pt-6 border-t border-white/5"
                      >
                        <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform relative">
                          <SettingsIcon className="w-6 h-6 text-white/60 group-hover:text-white transition-colors" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-black text-white leading-tight uppercase italic tracking-tighter group-hover:text-white transition-colors">Core Config</p>
                          <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] mt-1 group-hover:text-white/40">Encryption & UI</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-white/10 group-hover:text-white group-hover:translate-x-1 transition-all duration-300" />
                      </button>
                      </div>

                      <div className="p-8 pb-10 flex flex-col items-center">
                        <div className="w-full h-[1px] bg-white/5 mb-6" />
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em]">Node v2.5.0 • Signal Strength: 100%</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <div className={cn(
            "flex items-center gap-2 sm:gap-3 cursor-pointer shrink-0 group transition-opacity duration-300",
            showMenu ? "opacity-0 pointer-events-none" : "opacity-100"
          )} onClick={() => onTabChange('map')}>
            <div className="w-9 h-9 bg-blue-600 rounded-[0.9rem] flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.4)] group-hover:scale-110 transition-transform relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent" />
              <span className="text-white text-xs font-black relative z-10 italic">MM</span>
            </div>
            <div className="flex flex-col">
              <span className="text-lg sm:text-xl font-black tracking-[-0.05em] text-white leading-none uppercase italic">MAP<span className="text-blue-500">MATES</span></span>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center gap-1.5 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_#22c55e]"></div>
                  <span className="text-[9px] font-black text-green-400 uppercase tracking-[0.1em]">{onlineCount} Online</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={cn(
          "flex items-center gap-1 sm:gap-4 pr-1 sm:pr-2 transition-opacity duration-300",
          showMenu ? "opacity-0 pointer-events-none" : "opacity-100"
        )}>
          <button 
            onClick={() => onTabChange('settings')}
            className="p-2.5 text-white/50 hover:bg-white/10 rounded-2xl transition-all relative flex group border border-transparent hover:border-white/5 hover:text-white"
          >
            <SettingsIcon className="w-5 h-5 transition-transform group-hover:rotate-45" />
          </button>
          <button 
            onClick={() => onTabChange('settings')}
            className="p-2.5 text-white/50 hover:bg-white/10 rounded-2xl transition-all relative flex group border border-transparent hover:border-white/5 hover:text-white"
          >
            <Bell className="w-5 h-5 group-hover:scale-110 transition-transform" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[20px] h-[20px] bg-red-600 text-white text-[10px] font-black rounded-full border-2 border-black/40 flex items-center justify-center px-1 shadow-[0_0_15px_rgba(220,38,38,0.5)] animate-bounce">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
          
          <div className="h-8 w-[1px] bg-white/5 mx-1 hidden sm:block" />

          {user ? (
            <div className="flex items-center gap-3 ml-1 sm:ml-2">
              <div 
                className="flex items-center gap-2.5 cursor-pointer bg-white/5 hover:bg-white/10 p-1 rounded-2xl border border-white/10 transition-all group overflow-hidden"
                onClick={() => onTabChange('profile')}
              >
                <div className="relative">
                  <UserAvatar 
                    src={user.photoURL} 
                    username={user.username} 
                    size="xs" 
                    className="rounded-xl border border-white/20 shadow-lg group-hover:scale-105 transition-transform relative z-10"
                  />
                  <div className="absolute inset-0 bg-blue-500/20 blur-md rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <span className="text-xs font-black uppercase tracking-widest hidden sm:block text-white/70 group-hover:text-white transition-colors pr-2">{user.username}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button 
                onClick={onLogin}
                className="px-5 py-2.5 text-[10px] sm:text-xs font-black text-white/50 hover:text-white uppercase tracking-widest border border-white/5 hover:bg-white/5 rounded-2xl transition-all"
              >
                Sign In
              </button>
              <button 
                onClick={onSignup}
                className="px-6 py-2.5 text-[10px] sm:text-xs font-black bg-blue-600 text-white rounded-2xl hover:bg-blue-500 transition-all shadow-[0_10px_30px_rgba(37,99,235,0.3)] uppercase tracking-widest border border-blue-400/20"
              >
                Join Node
              </button>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showQR && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] bg-[#020617]/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6 overflow-hidden"
          >
            {/* Neon Background Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.15),transparent_70%)]" />
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent shadow-[0_0_20px_#3b82f6]" />
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent shadow-[0_0_20px_#3b82f6]" />

            <button 
              onClick={() => setShowQR(false)}
              className="absolute top-6 right-6 p-4 bg-white/5 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-all border border-white/10 active:scale-95 group z-10"
            >
              <X className="w-8 h-8 group-hover:rotate-90 transition-transform duration-300" />
            </button>
            
            <motion.div 
              initial={{ scale: 0.8, y: -20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ type: 'spring', damping: 20 }}
              className="relative"
            >
              <div className="w-48 h-48 sm:w-64 sm:h-64 bg-white p-4 rounded-3xl shadow-[0_0_50px_rgba(37,99,235,0.5)] border-4 border-blue-500/50 relative overflow-hidden group">
                <div className="absolute inset-0 bg-blue-500/5 pointer-events-none group-hover:bg-blue-500/10 transition-colors" />
                <img 
                  src="https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=https://mapmates.app" 
                  alt="QR Code"
                  className="w-full h-full object-contain relative z-10"
                />
                
                {/* Corner Accents */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-xl" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-xl" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-xl" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-xl" />
              </div>

              {/* Decorative rings */}
              <div className="absolute -inset-8 border border-blue-500/20 rounded-full animate-[spin_20s_linear_infinite]" />
              <div className="absolute -inset-16 border border-blue-500/10 rounded-full animate-[spin_30s_linear_infinite_reverse]" />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col items-center mt-12"
            >
              <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase flex items-center gap-3">
                <span className="text-blue-500">Scan</span> MapMates
              </h2>
              <div className="mt-4 w-24 h-1.5 bg-blue-500 rounded-full shadow-[0_0_20px_#3b82f6] animate-pulse" />
              <p className="mt-6 text-[10px] font-bold text-white/40 uppercase tracking-[0.4em] text-center max-w-xs leading-relaxed">
                Sync with the protocol • Encrypted Node Access
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
