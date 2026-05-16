import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase/firebase';
import { collection, query, where, onSnapshot, limit, getDocs } from 'firebase/firestore';
import { UserProfile } from '../types';
import { MapPin, UserPlus, Plane } from 'lucide-react';
import { motion } from 'framer-motion';
import { handleQuotaError } from '../lib/utils';

interface ActiveUsersProps {
  onProfileClick: (id: string) => void;
  onFlyTo?: (userId: string) => void;
}

export default function ActiveUsers({ onProfileClick, onFlyTo }: ActiveUsersProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, 'users'), 
      where('isOnline', '==', true),
      where('privateProfile', '==', false),
      limit(100)
    );
    
    const unsubscribe = onSnapshot(q, (snap) => {
      const now = Date.now();
      const filteredUsers = snap.docs
        .map(doc => doc.data() as UserProfile)
        .filter(u => {
          // Check location
          if (!u.location || isNaN(u.location.lat) || isNaN(u.location.lng)) return false;
          
          // Check lastSeen for staleness
          if (!u.lastSeen) return true;
          try {
            const lastSeenDate = (u.lastSeen as any)?.toDate ? (u.lastSeen as any).toDate() : new Date(u.lastSeen as string);
            return (now - lastSeenDate.getTime()) < 10 * 60 * 1000;
          } catch (e) {
            return true;
          }
        });
      setUsers(filteredUsers);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'users');
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-black tracking-tighter text-neutral-900 dark:text-white">Active Mates</h2>
          <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-bold uppercase tracking-widest">Online Now</p>
        </div>
        <div className="flex items-center gap-1.5 bg-green-50 dark:bg-green-900/20 px-2.5 py-1 rounded-full border border-green-100 dark:border-green-900/30">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-[10px] font-black text-green-600 dark:text-green-400 uppercase tracking-widest">{users.length}</span>
        </div>
      </div>

      <div className="space-y-2">
        {users.map((user) => (
          <motion.div
            key={user.uid}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between p-2 bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all group cursor-pointer"
            onClick={() => onProfileClick(user.uid)}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative shrink-0">
                <img 
                  src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=random`} 
                  alt={user.username} 
                  className="w-10 h-10 rounded-lg object-cover shadow-sm" 
                  onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=random`; }}
                />
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-neutral-900 shadow-sm"></div>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-black text-xs text-neutral-900 dark:text-white truncate">{user.username}</p>
                  {user.mood?.emoji && (
                    <span className="text-xs">{user.mood.emoji}</span>
                  )}
                </div>
                <p className="text-[9px] text-neutral-400 dark:text-neutral-500 font-bold uppercase tracking-widest truncate">{user.profession}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              {onFlyTo && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onFlyTo(user.uid); }}
                  className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"
                >
                  <Plane className="w-3.5 h-3.5" />
                </button>
              )}
              <button 
                className="p-1.5 text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white rounded-lg transition"
              >
                <UserPlus className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
