import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase/firebase';
import { collection, query, where, onSnapshot, getDoc, doc, limit, orderBy } from 'firebase/firestore';
import { UserProfile } from '../types';
import { Users, MessageCircle, User, Phone, Plane } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { UserAvatar } from './UserAvatar';

interface FriendBarProps {
  onProfileClick: (id: string) => void;
  onMessage: (id: string) => void;
  onCall?: (id: string) => void;
  onFlyTo?: (id: string) => void;
  className?: string;
}

export default function FriendBar({ onProfileClick, onMessage, onCall, onFlyTo, className }: FriendBarProps) {
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'friendRequests'),
      where('status', '==', 'accepted'),
      where('participants', 'array-contains', auth.currentUser.uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, async (snap) => {
      const results = await Promise.all(snap.docs.map(async (d) => {
        const data = d.data();
        const targetId = data.from === auth.currentUser?.uid ? data.to : data.from;
        const uSnap = await getDoc(doc(db, 'users', targetId));
        return uSnap.data() as UserProfile;
      }));
      setFriends(results);
      setLoading(false);
    }, (err) => {
      console.error('FriendBar error:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) return null;

  return (
    <div className={cn("bg-white dark:bg-neutral-900 border-neutral-100 dark:border-neutral-800 transition-colors duration-300", className)}>
      <div className="p-4 lg:p-6">
        <div className="flex items-center justify-between mb-4 lg:mb-6">
          <h2 className="text-sm lg:text-lg font-black tracking-tighter text-neutral-900 dark:text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            Mates
          </h2>
          <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 bg-neutral-50 dark:bg-neutral-800 px-2 py-1 rounded-full">
            {friends.length}
          </span>
        </div>

        <div className="flex lg:flex-col gap-3 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 scrollbar-hide">
          {friends.map((friend) => (
            <motion.div 
              key={friend.uid}
              whileHover={{ x: 5 }}
              className="flex-shrink-0 w-14 lg:w-full flex lg:items-center gap-3 p-1 lg:p-2 rounded-2xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition cursor-pointer group"
              onClick={() => onProfileClick(friend.uid)}
            >
              <div className="relative">
                    <UserAvatar 
                      src={friend.photoURL} 
                      username={friend.username} 
                      size="sm" 
                      online={friend.isOnline}
                      className="shadow-sm"
                    />
                {friend.mood?.emoji ? (
                  <div className="absolute -top-1 -right-1 w-5 h-5 lg:w-4 lg:h-4 bg-white dark:bg-neutral-800 rounded-full flex items-center justify-center text-[10px] lg:text-[8px] shadow-sm border border-neutral-100 dark:border-neutral-700">
                    {friend.mood.emoji}
                  </div>
                ) : friend.isOnline && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-neutral-900 shadow-sm"></div>
                )}
              </div>
              <div className="hidden lg:block flex-1 min-w-0">
                <p className="font-bold text-xs text-neutral-900 dark:text-white truncate">{friend.username}</p>
                <p className="text-[9px] text-neutral-400 dark:text-neutral-500 font-bold uppercase tracking-widest truncate">{friend.profession}</p>
              </div>
              <div className="hidden lg:flex gap-1 opacity-0 group-hover:opacity-100 transition">
                {onFlyTo && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); onFlyTo(friend.uid); }}
                    className="p-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition"
                  >
                    <Plane className="w-3 h-3" />
                  </button>
                )}
                {onCall && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); toast.info("This feature is coming soon!"); }}
                    className="p-1.5 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 transition"
                  >
                    <Phone className="w-3 h-3" />
                  </button>
                )}
                <button 
                  onClick={(e) => { e.stopPropagation(); onMessage(friend.uid); }}
                  className="p-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition"
                >
                  <MessageCircle className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          ))}

          {friends.length === 0 && (
            <div className="text-center py-4 lg:py-8">
              <p className="text-[10px] font-bold text-neutral-400">No mates yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
