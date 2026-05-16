import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, Zap, MapPin, Globe, Compass, Radio, Flag, X, Crown, Shield, Plane, Medal, Users, Heart } from 'lucide-react';
import { UserProfile } from '../types';
import { cn } from '../lib/utils';
import { UserAvatar } from './UserAvatar';

interface AchievementModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile | null;
}

export default function AchievementModal({ isOpen, onClose, userProfile }: AchievementModalProps) {
  if (!userProfile) return null;

  const level = Math.floor((userProfile.xp || 0) / 100) + 1;
  const progress = (userProfile.xp || 0) % 100;

  const badges = [
    { id: 'beginner', label: 'Beginner Explorer', icon: Globe, color: 'bg-green-500', minXp: 0 },
    { id: 'road_walker', label: 'Road Walker', icon: MapPin, color: 'bg-blue-500', minXp: 500 },
    { id: 'city_finder', label: 'City Pathfinder', icon: Compass, color: 'bg-indigo-500', minXp: 1000 },
    { id: 'top_explorer', label: 'Top Explorer', icon: Star, color: 'bg-yellow-500', minXp: 2500 },
    { id: 'neon_nav', label: 'Neon Navigator', icon: Zap, color: 'bg-cyan-500', minXp: 5000 },
    { id: 'diamond_travel', label: 'Diamond Traveler', icon: Crown, color: 'bg-purple-500', minXp: 10000 },
  ];

  const achievementCards = [
    { title: 'First Steps', desc: 'Completed your first destiny journey', achieved: (userProfile.xp || 0) > 100, icon: Flag },
    { title: 'Social Mixer', desc: 'Added 10 friends to your mate list', achieved: (userProfile.mates?.length || 0) >= 10, icon: Radio },
    { title: 'High Flier', desc: 'Visited 5 different cities globally', achieved: (userProfile.xp || 0) > 5000, icon: Plane },
    { title: 'Community Pillar', desc: 'Received 50+ profile ratings', achieved: (userProfile.stats?.likes || 0) >= 50, icon: Heart },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="achievement-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            className="w-full max-w-2xl h-full sm:h-auto sm:max-h-[90vh] bg-[#020617] sm:border border-white/5 sm:rounded-[3.5rem] rounded-none overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.8)] overflow-y-auto custom-scrollbar relative"
          >
            {/* Background Decor */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-600/10 blur-[120px] rounded-full pointer-events-none" />

            {/* Header / Profile Hero */}
            <div className="relative p-10 pb-36 bg-gradient-to-br from-blue-900/10 via-transparent to-transparent">
              <div className="absolute top-6 right-6">
                <button 
                  onClick={onClose}
                  className="w-12 h-12 bg-white/5 backdrop-blur-xl border border-white/5 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all active:scale-95"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-col items-center gap-6 text-center mt-6">
                <div className="relative group">
                  <div className="absolute inset-[-8px] bg-blue-500 blur-2xl opacity-0 group-hover:opacity-30 transition-opacity duration-700" />
                  <div className="relative">
                    <UserAvatar src={userProfile.photoURL} username={userProfile.username} size="xl" className="border-4 border-white/5 relative z-10 p-1 bg-white/5 hover:border-blue-500/50 transition-colors duration-500" />
                    <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 px-5 py-2 bg-blue-600 rounded-[1.2rem] border-4 border-[#020617] text-[10px] font-black text-white uppercase tracking-[0.2em] z-20 whitespace-nowrap shadow-[0_15px_30px_rgba(37,99,235,0.4)] italic">
                      LVL {level}
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <h2 className="text-4xl font-black text-white tracking-[-0.05em] uppercase italic">{userProfile.username}</h2>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_#3b82f6]" />
                    <p className="text-[10px] font-black text-blue-400/80 uppercase tracking-[0.4em] italic">{level > 10 ? 'Neural Pathfinder' : 'Signal Initiate'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Overview */}
            <div className="-mt-24 px-10 grid grid-cols-3 gap-4 relative z-10">
              {[
                { label: 'Neural XP', value: userProfile.xp || 0, icon: Zap, color: 'text-blue-400', glow: 'shadow-blue-500/20' },
                { label: 'Global Rank', value: '#124', icon: Trophy, color: 'text-amber-400', glow: 'shadow-amber-500/20' },
                { label: 'Nodes Linked', value: userProfile.mates?.length || 0, icon: Users, color: 'text-purple-400', glow: 'shadow-purple-500/20' },
              ].map((stat) => (
                <div key={stat.label} className={cn("p-6 bg-white/[0.03] backdrop-blur-2xl border border-white/5 rounded-[2.2rem] text-center group hover:bg-white/[0.05] transition-all duration-500", stat.glow)}>
                  <stat.icon className={cn("w-5 h-5 mx-auto mb-3 transition-transform group-hover:scale-110", stat.color)} />
                  <p className="text-2xl font-black text-white tracking-tighter">{stat.value}</p>
                  <p className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em] mt-1">{stat.label}</p>
                </div>
              ))}
            </div>

            <div className="p-10 space-y-16">
              {/* XP Progress */}
              <div className="space-y-5">
                <div className="flex items-center justify-between px-2">
                  <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] italic">Synchronization Matrix</p>
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest italic">{progress}% SYNC</p>
                </div>
                <div className="h-4 bg-white/[0.03] rounded-full overflow-hidden border border-white/5 p-1">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-400 rounded-full shadow-[0_0_25px_rgba(37,99,235,0.6)] relative overflow-hidden"
                  >
                    <motion.div 
                      className="absolute inset-0 bg-white/20"
                      animate={{ x: ['-100%', '100%'] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                    />
                  </motion.div>
                </div>
              </div>

              {/* Badges Section */}
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400 border border-blue-500/20">
                      <Medal className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-white tracking-tight italic uppercase">Elite Artifacts</h3>
                      <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">Neural Recognition System</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-6">
                  {badges.map((badge) => {
                    const isUnlocked = (userProfile.xp || 0) >= badge.minXp;
                    return (
                      <div key={badge.id} className="flex flex-col items-center gap-3 group">
                        <div className={cn(
                          "w-14 h-14 rounded-[1.4rem] flex items-center justify-center transition-all duration-500 relative overflow-hidden border",
                          isUnlocked 
                            ? `bg-white/[0.03] border-white/10 shadow-emerald-500/5` 
                            : "bg-black border-transparent grayscale opacity-20"
                        )}>
                          <badge.icon className={cn("w-6 h-6 transition-transform group-hover:scale-110", isUnlocked ? "text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]" : "text-white/20")} />
                          {isUnlocked && (
                            <motion.div 
                              className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent"
                              animate={{ y: ['100%', '-100%'] }}
                              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                            />
                          )}
                        </div>
                        <p className={cn(
                          "text-[8px] font-black uppercase text-center leading-tight transition-colors tracking-wider",
                          isUnlocked ? "text-white/60" : "text-white/10"
                        )}>
                          {badge.label}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Achievement Cards */}
              <div className="space-y-8 pb-8">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white tracking-tight italic uppercase">System Milestones</h3>
                    <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">Protocol Accomplishments</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {achievementCards.map((card) => (
                    <div 
                      key={card.title}
                      className={cn(
                        "p-6 rounded-[2.5rem] border transition-all duration-500 flex items-center gap-5 relative overflow-hidden group",
                        card.achieved 
                          ? "bg-white/[0.02] border-white/10 hover:border-blue-500/30 hover:bg-white/[0.04]" 
                          : "bg-black/40 border-white/5 opacity-40 grayscale"
                      )}
                    >
                      {card.achieved && (
                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 blur-3xl pointer-events-none" />
                      )}
                      
                      <div className={cn(
                        "w-14 h-14 rounded-[1.4rem] flex items-center justify-center shrink-0 border transition-all duration-500",
                        card.achieved 
                          ? "bg-blue-600/10 border-blue-500/20 text-blue-400" 
                          : "bg-neutral-800/20 border-white/5 text-white/20"
                      )}>
                        <card.icon className={cn("w-6 h-6", card.achieved ? "drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]" : "")} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-black text-white text-sm tracking-tight uppercase italic">{card.title}</p>
                          {card.achieved && (
                            <div className="bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-lg text-[7px] font-black uppercase tracking-widest border border-blue-500/20">
                              SYNCD
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-white/40 font-bold leading-normal uppercase tracking-wide">{card.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
