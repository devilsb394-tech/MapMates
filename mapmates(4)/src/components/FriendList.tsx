import React, { useState, useEffect } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase/firebase';
import { collection, query, where, onSnapshot, getDoc, doc, limit, startAfter, getDocs, orderBy, deleteDoc } from 'firebase/firestore';
import { UserProfile } from '../types';
import { Users, Search, MessageCircle, User, Trash2, Plane } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn, handleQuotaError } from '../lib/utils';
import { UserAvatar } from './UserAvatar';
import { toast } from 'sonner';

interface FriendListProps {
  onProfileClick: (id: string) => void;
  onMessage: (id: string) => void;
  onFlyTo?: (userId: string) => void;
}

export default function FriendList({ onProfileClick, onMessage, onFlyTo }: FriendListProps) {
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;

    const fetchFriends = async () => {
      try {
        const q = query(
          collection(db, 'friendRequests'),
          where('status', '==', 'accepted'),
          where('participants', 'array-contains', auth.currentUser!.uid),
          orderBy('createdAt', 'desc'),
          limit(20)
        );

        const snap = await getDocs(q);
        const results = await Promise.all(snap.docs.map(async (d) => {
          const data = d.data();
          const targetId = data.from === auth.currentUser?.uid ? data.to : data.from;
          const uSnap = await getDoc(doc(db, 'users', targetId));
          return uSnap.data() as UserProfile;
        }));
        setFriends(results);
        setLastVisible(snap.docs[snap.docs.length - 1]);
        setLoading(false);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'friendRequests');
        setLoading(false);
      }
    };

    fetchFriends();
  }, []);

  const loadMore = async () => {
    if (!auth.currentUser || !lastVisible || !hasMore) return;

    const q = query(
      collection(db, 'friendRequests'),
      where('status', '==', 'accepted'),
      where('participants', 'array-contains', auth.currentUser.uid),
      orderBy('createdAt', 'desc'),
      startAfter(lastVisible),
      limit(20)
    );

    const snap = await getDocs(q).catch(err => {
      handleFirestoreError(err, OperationType.GET, 'friendRequests');
      return { empty: true, docs: [] } as any;
    });
    if (snap.empty) {
      setHasMore(false);
      return;
    }

    const results = await Promise.all(snap.docs.map(async (d) => {
      const data = d.data();
      const targetId = data.from === auth.currentUser?.uid ? data.to : data.from;
      const uSnap = await getDoc(doc(db, 'users', targetId));
      return uSnap.data() as UserProfile;
    }));

    setFriends(prev => [...prev, ...results]);
    setLastVisible(snap.docs[snap.docs.length - 1]);
  };

  const handleDeleteFriend = async (friendId: string) => {
    if (!auth.currentUser) return;
    if (!window.confirm('Are you sure you want to remove this friend?')) return;

    try {
      const q = query(
        collection(db, 'friendRequests'),
        where('status', '==', 'accepted'),
        where('participants', 'array-contains', auth.currentUser.uid)
      );
      const snap = await getDocs(q);
      const docToDelete = snap.docs.find(d => d.data().participants.includes(friendId));
      
      if (docToDelete) {
        await deleteDoc(docToDelete.ref);
        setFriends(prev => prev.filter(f => f.uid !== friendId));
        toast.success('Friend removed');
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'friendRequests');
      toast.error('Failed to remove friend');
    }
  };

  const filteredFriends = friends.filter(f => 
    f.username && f.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto p-4 lg:p-8 h-full flex flex-col transition-colors duration-300 bg-[#020617]">
      <div className="mb-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black tracking-tighter text-white uppercase italic">Mates</h2>
          <p className="text-blue-400/60 font-black uppercase tracking-[0.2em] text-[10px] mt-1">Found {friends.length} personnel in vicinity</p>
        </div>
        <div className="relative group lg:w-80">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500/50 group-focus-within:text-blue-400 transition-colors" />
          <input
            type="text"
            placeholder="Scan directory..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-14 pr-6 py-4 bg-white/5 border border-white/10 rounded-[2rem] w-full focus:ring-2 focus:ring-blue-500/50 focus:bg-white/10 outline-none transition-all shadow-[0_0_20px_rgba(0,0,0,0.3)] font-medium text-white placeholder:text-white/20 uppercase tracking-widest text-xs"
          />
          <div className="absolute inset-0 rounded-[2rem] bg-blue-500/5 blur-xl pointer-events-none opacity-0 group-focus-within:opacity-100 transition-opacity" />
        </div>
      </div>

      <div 
        className="flex-1 overflow-y-auto space-y-5 pr-2 custom-scrollbar pb-24 lg:pb-8"
        onScroll={(e) => {
          const target = e.target as HTMLDivElement;
          if (target.scrollHeight - target.scrollTop === target.clientHeight) {
            loadMore();
          }
        }}
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center p-20 gap-6 h-full">
            <div className="relative">
              <div className="w-16 h-16 border-2 border-blue-500/20 rounded-full animate-pulse" />
              <div className="absolute inset-0 border-2 border-t-blue-500 rounded-full animate-spin shadow-[0_0_15px_rgba(59,130,246,0.3)]" />
            </div>
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em] animate-pulse italic">Scanning Neural Links...</p>
          </div>
        ) : filteredFriends.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredFriends.map((friend) => (
              <motion.div
                key={friend.uid}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.02 }}
                className="bg-white/5 backdrop-blur-md p-5 rounded-[2.5rem] border border-white/10 shadow-2xl flex items-center justify-between group hover:border-blue-500/50 hover:bg-white/[0.08] transition-all duration-300 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="flex items-center gap-5 relative z-10">
                  <div className="relative">
                    <UserAvatar 
                      src={friend.photoURL} 
                      username={friend.username} 
                      size="lg" 
                      online={friend.isOnline}
                      className="border-2 border-blue-500/30 group-hover:border-blue-400 transition-colors"
                    />
                    {friend.isOnline && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-4 border-[#0a0a0a] shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                    )}
                  </div>
                  <div>
                    <p className="font-black text-lg text-white tracking-tight group-hover:text-blue-400 transition-colors">{friend.username}</p>
                    <p className="text-[9px] text-blue-500/60 font-black uppercase tracking-[0.2em] mt-0.5">{friend.profession || 'Tactical Operative'}</p>
                  </div>
                </div>

                <div className="flex gap-2.5 relative z-10">
                  {onFlyTo && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); onFlyTo(friend.uid); }}
                      className="w-11 h-11 bg-white/5 hover:bg-blue-600/20 text-white/40 hover:text-white rounded-2xl transition-all border border-white/5 hover:border-blue-500/50 flex items-center justify-center group/btn"
                      title="Intercept Location"
                    >
                      <Plane className="w-5 h-5 group-hover/btn:rotate-12 transition-transform" />
                    </button>
                  )}
                  <button 
                    onClick={(e) => { e.stopPropagation(); onMessage(friend.uid); }}
                    className="w-11 h-11 bg-white/5 hover:bg-blue-600/20 text-white/40 hover:text-white rounded-2xl transition-all border border-white/5 hover:border-blue-500/50 flex items-center justify-center group/btn"
                    title="Open Channel"
                  >
                    <MessageCircle className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onProfileClick(friend.uid); }}
                    className="w-11 h-11 bg-white/5 hover:bg-blue-600/20 text-white/40 hover:text-white rounded-2xl transition-all border border-white/5 hover:border-blue-500/50 flex items-center justify-center group/btn"
                    title="Profile Access"
                  >
                    <User className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteFriend(friend.uid); }}
                    className="w-11 h-11 bg-white/5 hover:bg-red-600/20 text-white/40 hover:text-red-500 rounded-2xl transition-all border border-white/5 hover:border-red-500/50 flex items-center justify-center group/btn"
                    title="Terminate Connection"
                  >
                    <Trash2 className="w-5 h-5 group-hover/btn:rotate-12 transition-transform" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
            <div className="text-center py-20 px-8 bg-white/5 backdrop-blur-2xl rounded-[4rem] border border-blue-500/10 shadow-[0_30px_100px_rgba(0,0,0,0.5)] relative overflow-hidden group w-full max-w-sm">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
              <div className="w-28 h-28 bg-blue-600/5 rounded-[3rem] flex items-center justify-center mx-auto mb-10 border border-blue-500/10 shadow-[inner_0_0_20px_rgba(59,130,246,0.1)] group-hover:scale-110 transition-all duration-700 relative">
                <div className="absolute inset-0 bg-blue-500/10 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                <Users className="w-14 h-14 text-blue-500/20 group-hover:text-blue-500/60 transition-colors relative z-10" />
              </div>
              <h3 className="text-4xl font-black text-white italic tracking-tighter uppercase leading-none mb-4">0 Mates</h3>
              <p className="text-blue-400/40 font-black text-[10px] uppercase tracking-[0.3em] max-w-[200px] mx-auto leading-relaxed">Expand your scan radius and initialize contact on the global sector.</p>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
