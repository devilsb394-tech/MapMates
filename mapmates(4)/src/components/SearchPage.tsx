import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, MapPin, UserPlus, MessageCircle, Heart, Star, Compass, X, User, Zap, Sparkles, Radio, Loader2, Image as ImageIcon } from 'lucide-react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase/firebase';
import { collection, query, where, getDocs, limit, startAfter, doc, getDoc, orderBy, onSnapshot } from 'firebase/firestore';
import { UserProfile, Moment } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

interface SearchPageProps {
  onViewProfile: (id: string) => void;
  onMessage: (id: string) => void;
  onBack: () => void;
  initialQuery?: string;
}

interface FeedUser extends UserProfile {
  activeMoment?: Moment;
}

export default function SearchPage({ onViewProfile, onMessage, onBack, initialQuery }: SearchPageProps) {
  const [searchQuery, setSearchQuery] = useState(initialQuery || '');
  const [users, setUsers] = useState<FeedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const observer = useRef<IntersectionObserver | null>(null);

  const fetchUsers = useCallback(async (isNext = false, queryStr = '') => {
    setLoading(true);
    try {
      let q;
      if (queryStr) {
        const val = queryStr.toLowerCase();
        q = isNext && lastDoc 
          ? query(collection(db, 'users'), where('username', '>=', val), where('username', '<=', val + '\uf8ff'), startAfter(lastDoc), limit(15))
          : query(collection(db, 'users'), where('username', '>=', val), where('username', '<=', val + '\uf8ff'), limit(15));
      } else {
        q = isNext && lastDoc
          ? query(collection(db, 'users'), orderBy('lastSeen', 'desc'), startAfter(lastDoc), limit(10))
          : query(collection(db, 'users'), orderBy('lastSeen', 'desc'), limit(10));
      }

      const snap = await getDocs(q);
      const newUsers = snap.docs.map(d => d.data() as FeedUser);
      
      // Fetch moments for these users if they have them
      const usersWithMoments = await Promise.all(newUsers.map(async (user) => {
        if (user.hasActiveMoment) {
          const momentsQ = query(
            collection(db, 'moments'),
            where('uid', '==', user.uid),
            orderBy('createdAt', 'desc'),
            limit(1)
          );
          const momentSnap = await getDocs(momentsQ);
          if (!momentSnap.empty) {
            return { ...user, activeMoment: momentSnap.docs[0].data() as Moment };
          }
        }
        return user;
      }));

      if (isNext) {
        setUsers(prev => [...prev, ...usersWithMoments]);
      } else {
        setUsers(usersWithMoments);
      }

      setLastDoc(snap.docs[snap.docs.length - 1]);
      setHasMore(snap.docs.length >= (queryStr ? 15 : 10));
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'users');
    } finally {
      setLoading(false);
    }
  }, [lastDoc]);

  // Infinite scroll observer
  const lastElementRef = useCallback((node: HTMLDivElement) => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        fetchUsers(true, searchQuery);
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, hasMore, fetchUsers, searchQuery]);

  useEffect(() => {
    fetchUsers(false, searchQuery);
  }, [searchQuery]);

  return (
    <div className="relative bg-[#020617] flex flex-col h-full w-full overflow-hidden">
      {/* Background FX */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-pink-600/5 blur-[150px] rounded-full pointer-events-none" />

      {/* Header */}
      <div className="p-6 pt-10 relative z-20 shrink-0">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-blue-400 animate-pulse" />
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] italic">Dimensional Discovery</p>
            </div>
            <h2 className="text-3xl font-black tracking-[-0.05em] text-white uppercase italic leading-none">Neural <span className="text-blue-500 text-glow-blue">Mates</span></h2>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/50">
            <Radio className="w-6 h-6 animate-pulse text-blue-500" />
          </div>
        </div>

        {/* Improved Search Bar */}
        <div className="relative group">
          <div className="absolute inset-0 bg-blue-500/20 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 w-6 h-6 group-focus-within:text-blue-400 transition-colors z-10" />
          <input
            type="text"
            placeholder="Sync with username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2rem] py-5 pl-14 pr-14 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all text-lg font-black text-white placeholder:text-white/10 italic relative z-10"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors z-20"
            >
              <X className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Feed */}
      <div className="flex-1 overflow-y-auto px-6 pb-20 custom-scrollbar relative z-10">
        <div className="grid grid-cols-1 gap-6 max-w-2xl mx-auto">
          <AnimatePresence mode="popLayout">
            {users.map((user, index) => (
              <motion.div
                key={user.uid}
                ref={index === users.length - 1 ? lastElementRef : null}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                onClick={() => onViewProfile(user.uid)}
                className="group relative bg-white/5 backdrop-blur-3xl rounded-[2.5rem] border border-white/10 overflow-hidden hover:border-blue-500/50 transition-all cursor-pointer shadow-2xl"
              >
                {/* Moment Preview Image if exists */}
                {user.activeMoment ? (
                  <div className="aspect-[4/5] w-full relative overflow-hidden">
                    <img 
                      src={user.activeMoment.mediaUrl} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-black/20" />
                    
                    {/* Live Badge */}
                    <div className="absolute top-6 left-6 flex items-center gap-2 px-3 py-1.5 bg-pink-600/80 backdrop-blur-md rounded-xl border border-pink-400/50 shadow-lg animate-pulse">
                      <div className="w-1.5 h-1.5 bg-white rounded-full" />
                      <span className="text-[8px] font-black text-white uppercase tracking-widest">Moment Active</span>
                    </div>
                  </div>
                ) : (
                  <div className="h-40 w-full relative overflow-hidden bg-gradient-to-br from-blue-600/10 to-transparent">
                     <div className="absolute inset-0 flex items-center justify-center opacity-10">
                        <User className="w-32 h-32 text-blue-500" />
                     </div>
                     <div className="absolute inset-0 bg-gradient-to-t from-[#020617] to-transparent" />
                  </div>
                )}

                {/* Content Overlay */}
                <div className="p-6 relative">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="relative shrink-0">
                        <div className="absolute -inset-1 bg-gradient-to-tr from-blue-600 to-pink-500 rounded-2xl blur-sm opacity-50 group-hover:opacity-100 transition-opacity" />
                        <img 
                          src={user.photoURL} 
                          className="relative w-14 h-14 rounded-2xl object-cover border-2 border-[#020617] shadow-xl" 
                        />
                        {user.isOnline && (
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-[#020617] shadow-lg shadow-green-500/50" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-lg font-black text-white leading-none uppercase italic tracking-tight group-hover:text-glow-blue transition-all">
                          {user.username}
                        </h3>
                        <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mt-1.5 truncate">
                          {user.profession || 'Neural Traveler'} • {auth.currentUser?.uid === user.uid ? 'YOU' : 'SECTOR 7'}
                        </p>
                        {user.status && (
                          <p className="text-[10px] font-bold text-blue-400/70 mt-2 truncate max-w-[150px] italic">
                            "{user.status}"
                          </p>
                        )}
                      </div>
                    </div>

                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        toast.success(`Connection request sent to ${user.username}`);
                      }}
                      className="w-12 h-12 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/40 transition active:scale-90"
                    >
                      <UserPlus className="w-6 h-6" />
                    </button>
                  </div>

                  {/* Interaction Stats */}
                  <div className="mt-6 flex items-center gap-6 border-t border-white/5 pt-6 opacity-60 group-hover:opacity-100 transition-opacity">
                    <div className="flex items-center gap-2">
                      <Star className="w-3.5 h-3.5 text-blue-400 fill-blue-400" />
                      <span className="text-[10px] font-black text-white italic">{user.stats?.avgTrustLevel || '5.0'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <Heart className="w-3.5 h-3.5 text-pink-500 fill-pink-500" />
                       <span className="text-[10px] font-black text-white italic">{user.stats?.likes || '0'}</span>
                    </div>
                    <div className="ml-auto">
                        <button 
                          onClick={(e) => { e.stopPropagation(); onMessage(user.uid); }}
                          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-400 hover:text-white transition-colors"
                        >
                          <MessageCircle className="w-4 h-4" /> Message
                        </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Skeleton/Loading States */}
          {loading && (
            <div className="space-y-6">
              {[1, 2].map(i => (
                <div key={i} className="bg-white/5 animate-pulse h-96 rounded-[2.5rem] border border-white/10" />
              ))}
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                <p className="text-[8px] font-black uppercase text-blue-400 tracking-[0.3em] animate-pulse">Syncing Dimension...</p>
              </div>
            </div>
          )}
          
          {!hasMore && !loading && users.length > 0 && (
            <div className="py-20 text-center relative overflow-hidden">
              <div className="h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent w-full mb-8" />
              <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em] italic drop-shadow-sm">Edge of the World Synced 🌍</p>
            </div>
          )}

          {!loading && users.length === 0 && (
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <div className="w-32 h-32 bg-white/5 rounded-[3rem] flex items-center justify-center mb-8 border border-white/5 relative group">
                <div className="absolute inset-0 bg-blue-500/10 rounded-[3rem] blur-2xl group-hover:blur-3xl transition-all" />
                <Compass className="w-16 h-16 text-blue-500/10 animate-pulse relative z-10" />
              </div>
              <h3 className="text-2xl font-black text-white uppercase italic mb-3">No Mates Found</h3>
              <p className="text-white/30 text-xs font-black uppercase tracking-widest max-w-xs">The sector appears deserted. Try expanding your search parameters.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

