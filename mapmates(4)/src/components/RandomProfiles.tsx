import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase/firebase';
import { collection, query, limit, onSnapshot, where, getDocs } from 'firebase/firestore';
import { UserProfile } from '../types';
import { MapPin, UserPlus, Shuffle, Heart, MessageCircle, Plane } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, handleQuotaError } from '../lib/utils';
import { UserAvatar } from './UserAvatar';

interface RandomProfilesProps {
  onProfileClick: (id: string) => void;
  onFlyTo?: (userId: string) => void;
}

export default function RandomProfiles({ onProfileClick, onFlyTo }: RandomProfilesProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'users'), 
        where('showOnDiscover', '==', true), 
        where('privateProfile', '==', false),
        limit(12)
      );
      const snap = await getDocs(q);
      setUsers(snap.docs
        .map(doc => doc.data() as UserProfile)
        .filter(u => u.location && !isNaN(u.location.lat) && !isNaN(u.location.lng))
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleShuffle = () => {
    fetchUsers();
  };

  return (
    <div className="p-8 h-full overflow-y-auto bg-neutral-50 dark:bg-neutral-950 transition-colors duration-300">
      <div className="flex items-center justify-between mb-12">
        <div>
          <h2 className="text-4xl font-black tracking-tighter text-neutral-900 dark:text-white">Discover Mates</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">Meet random people from around the globe!</p>
        </div>
        <button 
          onClick={handleShuffle}
          className="flex items-center gap-3 px-8 py-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-[2rem] font-black tracking-tight text-neutral-900 dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition shadow-xl shadow-neutral-100 dark:shadow-none"
        >
          <Shuffle className={cn("w-5 h-5 text-blue-600", loading && "animate-spin")} /> Shuffle Profiles
        </button>
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            {users.map((user) => (
              <motion.div
                key={user.uid}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between p-3 lg:p-4 bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-2xl hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-all group cursor-pointer"
                onClick={() => onProfileClick(user.uid)}
              >
                <div className="flex items-center gap-3 lg:gap-4 min-w-0">
                  <div className="relative shrink-0">
                    <UserAvatar 
                      src={user.photoURL} 
                      username={user.username} 
                      size="lg" 
                      online={user.isOnline}
                      className="shadow-sm"
                    />
                    {user.isOnline && <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-neutral-900 shadow-sm"></div>}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-black text-sm lg:text-base text-neutral-900 dark:text-white truncate">{user.username}</p>
                      {user.mood?.emoji && (
                        <span className="text-sm">{user.mood.emoji}</span>
                      )}
                    </div>
                    <p className="text-[10px] lg:text-xs text-neutral-400 dark:text-neutral-500 font-bold uppercase tracking-widest truncate">{user.profession} • {user.age}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-1 lg:gap-2">
                  {onFlyTo && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); onFlyTo(user.uid); }}
                      className="p-2 lg:p-3 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition"
                      title="Fly to location"
                    >
                      <Plane className="w-4 h-4 lg:w-5 lg:h-5" />
                    </button>
                  )}
                  <button 
                    onClick={(e) => { e.stopPropagation(); onProfileClick(user.uid); }}
                    className="p-2 lg:p-3 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition"
                    title="View Profile"
                  >
                    <Heart className="w-4 h-4 lg:w-5 lg:h-5" />
                  </button>
                  <button 
                    className="p-2 lg:p-3 text-neutral-400 dark:text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white rounded-xl transition"
                    title="Add Friend"
                  >
                    <UserPlus className="w-4 h-4 lg:w-5 lg:h-5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
