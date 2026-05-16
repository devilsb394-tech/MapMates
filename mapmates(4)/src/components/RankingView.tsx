import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, auth } from '../firebase/firebase';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { UserProfile } from '../types';
import { Trophy, Crown, Medal, ArrowLeft, Star, Zap, MapPin, Search, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { UserAvatar } from './UserAvatar';

interface RankingViewProps {
  onClose: () => void;
  onViewProfile: (id: string) => void;
  userProfile: UserProfile | null;
}

export default function RankingView({ onClose, onViewProfile, userProfile }: RankingViewProps) {
  const [rankings, setRankings] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'global' | 'local'>('global');
  const [area, setArea] = useState('Janipura');

  useEffect(() => {
    const fetchRankings = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, 'users'),
          orderBy('xp', 'desc'),
          limit(50)
        );
        const snap = await getDocs(q);
        setRankings(snap.docs.map(doc => doc.data() as UserProfile));
      } catch (err) {
        console.error("Error fetching rankings:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRankings();
  }, [filter]);

  return (
    <motion.div 
      initial={{ opacity: 0, x: '100%' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '100%' }}
      className="fixed inset-0 z-[60] bg-[#020617] flex flex-col"
    >
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-600/5 blur-[150px] rounded-full pointer-events-none" />

      {/* Header */}
      <div className="p-6 xs:p-8 pt-10 xs:pt-14 flex items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-3xl relative z-10 shrink-0">
        <div>
          <p className="text-[9px] xs:text-[10px] font-black text-blue-400/50 uppercase tracking-[0.3em] italic mb-1">{filter === 'global' ? 'Global Node Leaders' : `${area} Sector Top`}</p>
          <h2 className="text-2xl xs:text-3xl font-black tracking-[-0.05em] text-white uppercase italic leading-none">Neural <span className="text-blue-500 text-glow-blue">Hierarchy</span></h2>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden xs:flex bg-white/5 p-1 rounded-xl border border-white/5 backdrop-blur-xl shrink-0">
            <button 
              onClick={() => setFilter('global')}
              className={cn(
                "px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] transition-all italic",
                filter === 'global' ? "bg-blue-600 text-white shadow-lg shadow-blue-600/40" : "text-white/30 hover:text-white"
              )}
            >
              Global
            </button>
            <button 
              onClick={() => setFilter('local')}
              className={cn(
                "px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] transition-all italic",
                filter === 'local' ? "bg-blue-600 text-white shadow-lg shadow-blue-600/40" : "text-white/30 hover:text-white"
              )}
            >
              Local
            </button>
          </div>

          <button 
            onClick={onClose}
            className="w-10 h-10 xs:w-12 xs:h-12 bg-white/5 backdrop-blur-xl border border-white/5 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition-all active:scale-95 shadow-lg group"
          >
            <X className="w-5 h-5 transition-transform group-hover:rotate-90" />
          </button>
        </div>
      </div>

      {/* Mobile Filter Tabs (visible only on very small screens) */}
      <div className="flex xs:hidden p-3 bg-black/20 border-b border-white/5 shrink-0 overflow-x-auto no-scrollbar">
        <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 backdrop-blur-xl w-full">
          <button 
            onClick={() => setFilter('global')}
            className={cn(
              "flex-1 px-4 py-2 rounded-lg text-[8px] font-black uppercase tracking-[0.2em] transition-all italic",
              filter === 'global' ? "bg-blue-600 text-white" : "text-white/30"
            )}
          >
            Global Leaders
          </button>
          <button 
            onClick={() => setFilter('local')}
            className={cn(
              "flex-1 px-4 py-2 rounded-lg text-[8px] font-black uppercase tracking-[0.2em] transition-all italic",
              filter === 'local' ? "bg-blue-600 text-white" : "text-white/30"
            )}
          >
            Local Sector
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-8 relative z-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-6">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 border-4 border-blue-600/20 rounded-full" />
              <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <div className="absolute inset-4 bg-blue-500/10 rounded-full animate-pulse" />
            </div>
            <p className="text-[10px] font-black text-blue-400/40 uppercase tracking-[0.4em] animate-pulse">Scanning Neural Network...</p>
          </div>
        ) : (
          <div className="max-w-xl mx-auto space-y-4">
            {/* Top 3 Podium */}
            <div className="flex items-end justify-center gap-4 mb-20 pt-12">
              {/* #2 */}
              {rankings[1] && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex flex-col items-center gap-4 w-28"
                >
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-neutral-400/20 blur opacity-0 group-hover:opacity-100 transition-opacity rounded-full" />
                    <UserAvatar src={rankings[1].photoURL} username={rankings[1].username} size="lg" className="border-4 border-neutral-400/50 relative z-10" />
                    <div className="absolute -top-4 -right-4 w-10 h-10 bg-[#020617] border border-neutral-400/50 rounded-full flex items-center justify-center text-neutral-400 shadow-2xl relative z-20">
                      <Medal className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="text-center group">
                    <p className="text-sm font-black text-white/80 group-hover:text-white transition-colors uppercase italic tracking-tight">{rankings[1].username}</p>
                    <p className="text-[9px] font-black text-neutral-500 uppercase tracking-widest mt-1">#{(rankings[1].xp || 0).toLocaleString()} XP</p>
                  </div>
                  <div className="w-full h-24 bg-gradient-to-t from-white/5 to-white/10 border-t border-x border-white/5 rounded-t-[2rem] flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-neutral-400/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="text-3xl font-black text-white/5 italic">2</span>
                  </div>
                </motion.div>
              )}

              {/* #1 */}
              {rankings[0] && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center gap-4 w-32"
                >
                   <div className="relative group">
                    <div className="absolute -inset-2 bg-yellow-500/20 blur-xl opacity-100 group-hover:opacity-100 transition-opacity rounded-full animate-pulse" />
                    <UserAvatar src={rankings[0].photoURL} username={rankings[0].username} size="xl" className="border-4 border-yellow-500 relative z-10" />
                    <div className="absolute -top-6 -right-6 w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center text-yellow-950 shadow-[0_10px_30px_rgba(234,179,8,0.4)] relative z-20 animate-bounce">
                      <Crown className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="text-center group">
                    <p className="text-lg font-black text-white tracking-[-0.05em] group-hover:text-glow-yellow transition-all uppercase italic">{rankings[0].username}</p>
                    <p className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.3em] mt-1">#{(rankings[0].xp || 0).toLocaleString()} XP</p>
                  </div>
                  <div className="w-full h-36 bg-gradient-to-t from-yellow-500/20 to-yellow-500/30 border-t border-x border-yellow-500/30 rounded-t-[2.5rem] flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/5 animate-pulse" />
                    <span className="text-4xl font-black text-yellow-500/40 italic">1</span>
                  </div>
                </motion.div>
              )}

              {/* #3 */}
              {rankings[2] && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex flex-col items-center gap-4 w-28"
                >
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-orange-500/20 blur opacity-0 group-hover:opacity-100 transition-opacity rounded-full" />
                    <UserAvatar src={rankings[2].photoURL} username={rankings[2].username} size="lg" className="border-4 border-orange-500/50 relative z-10" />
                    <div className="absolute -top-4 -right-4 w-10 h-10 bg-[#020617] border border-orange-500/50 rounded-full flex items-center justify-center text-orange-400 shadow-2xl relative z-20">
                      <Medal className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="text-center group">
                    <p className="text-sm font-black text-white/80 group-hover:text-white transition-colors uppercase italic tracking-tight">{rankings[2].username}</p>
                    <p className="text-[9px] font-black text-neutral-500 uppercase tracking-widest mt-1">#{(rankings[2].xp || 0).toLocaleString()} XP</p>
                  </div>
                  <div className="w-full h-20 bg-gradient-to-t from-white/5 to-white/10 border-t border-x border-white/5 rounded-t-[2rem] flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-orange-400/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="text-3xl font-black text-white/5 italic">3</span>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Rest of the List */}
            <div className="space-y-3">
              {rankings.slice(3).map((user, index) => (
                <motion.button
                  key={user.uid}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: (index * 0.05) }}
                  onClick={() => onViewProfile(user.uid)}
                  className={cn(
                    "w-full flex items-center gap-5 p-5 rounded-[2rem] transition-all border group relative overflow-hidden",
                    user.uid === auth.currentUser?.uid 
                      ? "bg-blue-600/10 border-blue-500/40 shadow-[0_10px_30px_rgba(37,99,235,0.15)]" 
                      : "bg-white/[0.03] border-white/5 hover:bg-white/[0.08] hover:border-white/10"
                  )}
                >
                  {user.uid === auth.currentUser?.uid && (
                     <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                  )}
                  <span className="w-8 text-[11px] font-black text-white/20 group-hover:text-white/60 transition-colors italic">{(index + 4).toString().padStart(2, '0')}</span>
                  <UserAvatar src={user.photoURL} username={user.username} size="sm" className="ring-2 ring-white/5 ring-offset-2 ring-offset-[#020617]" />
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-black text-white group-hover:text-blue-400 transition-colors uppercase italic truncate">{user.username}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em] italic">Node Level {Math.floor((user.xp || 0) / 100) + 1}</p>
                      <div className="w-1 h-1 bg-white/10 rounded-full shrink-0" />
                      <p className="text-[8px] font-black text-blue-400 uppercase tracking-[0.2em] italic">{(user.xp || 0).toLocaleString()} Neural Credits</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {(user.xp || 0) > 500 && <Zap className="w-3.5 h-3.5 text-blue-400 animate-pulse" />}
                    {(user.xp || 0) > 1000 && <Star className="w-3.5 h-3.5 text-indigo-400" />}
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* My Rank Footer */}
      {userProfile && (
        <div className="p-8 pb-10 bg-black/60 backdrop-blur-3xl border-t border-white/5 flex items-center gap-6 relative z-20">
          <div className="w-16 h-16 bg-blue-600 rounded-[1.4rem] flex items-center justify-center text-white shrink-0 shadow-[0_15px_30px_rgba(37,99,235,0.3)] relative overflow-hidden group hover:scale-105 transition-transform duration-500">
            <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            <Trophy className="w-8 h-8 relative z-10" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-black text-white uppercase tracking-[0.1em] italic">Current Standing</p>
            <p className="text-[9px] font-black text-blue-400/60 uppercase tracking-[0.3em] italic mt-1">Top Tier Neural Node</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-blue-500 tracking-[-0.05em] uppercase italic text-glow-blue">Elite Level {Math.floor((userProfile.xp || 0) / 100) + 1}</p>
            <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mt-1 italic">{(userProfile.xp || 0).toLocaleString()} Total Credits</p>
          </div>
        </div>
      )}
    </motion.div>
  );
}
