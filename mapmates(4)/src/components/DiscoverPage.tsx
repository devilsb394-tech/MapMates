import React, { useState, useEffect } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase/firebase';
import { collection, query, where, getDocs, limit, onSnapshot } from 'firebase/firestore';
import { UserProfile } from '../types';
import { MapPin, UserPlus, MessageCircle, Eye, Plane, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { handleQuotaError, getDistanceNumber } from '../lib/utils';
import { cn } from '../lib/utils';
import { UserAvatar } from './UserAvatar';

interface DiscoverPageProps {
  userProfile: UserProfile | null;
  onProfileClick: (id: string) => void;
  onMessage: (id: string) => void;
  onFlyTo?: (userId: string) => void;
}

export default function DiscoverPage({ userProfile, onProfileClick, onMessage, onFlyTo }: DiscoverPageProps) {
  const [nearbyUsers, setNearbyUsers] = useState<(UserProfile & { distance: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [radius, setRadius] = useState(50); // Default 50km
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchNearby = async (isLoadMore = false) => {
    if (!userProfile?.location) {
      setLoading(false);
      return;
    }

    try {
      const q = query(
        collection(db, 'users'),
        where('showOnDiscover', '==', true),
        where('privateProfile', '==', false),
        limit(20)
      );
      
      const snap = await getDocs(q);
      const allUsers = snap.docs
        .map(doc => doc.data() as UserProfile)
        .filter(u => u.uid !== auth.currentUser?.uid && u.location && !isNaN(u.location.lat) && !isNaN(u.location.lng));

      const withDistance = allUsers.map(u => ({
        ...u,
        distance: getDistanceNumber(
          userProfile.location!.lat,
          userProfile.location!.lng,
          u.location!.lat,
          u.location!.lng
        )
      })).filter(u => u.distance <= radius)
        .sort((a, b) => a.distance - b.distance);

      if (isLoadMore) {
        setNearbyUsers(prev => [...prev, ...withDistance]);
      } else {
        setNearbyUsers(withDistance);
      }
      
      setLastVisible(snap.docs[snap.docs.length - 1]);
      if (snap.docs.length < 20) setHasMore(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNearby();
  }, [userProfile, radius]);

  return (
    <div className="flex flex-col h-full bg-[var(--bg-main)] transition-colors duration-300">
      <div className="p-4 border-b border-neutral-100 dark:border-neutral-800">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-black tracking-tighter text-neutral-900 dark:text-white">Discover Mates</h2>
            <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-bold uppercase tracking-widest">Nearby Connections</p>
          </div>
          <div className="flex items-center gap-1.5 bg-neutral-50 dark:bg-neutral-800 p-1.5 rounded-xl border border-neutral-100 dark:border-neutral-700">
            <select 
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="bg-transparent border-none p-0 text-[10px] font-black focus:ring-0 outline-none text-neutral-900 dark:text-white"
            >
              <option value={5}>5km</option>
              <option value={10}>10km</option>
              <option value={20}>20km</option>
              <option value={50}>50km</option>
              <option value={100}>100km</option>
              <option value={500}>500km</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 custom-scrollbar" onScroll={(e) => {
        const target = e.currentTarget;
        if (target.scrollHeight - target.scrollTop === target.clientHeight && hasMore && !loading) {
          fetchNearby(true);
        }
      }}>
        {loading && nearbyUsers.length === 0 ? (
          <div className="flex items-center justify-center h-24">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        ) : nearbyUsers.length > 0 ? (
          <div className="flex flex-col gap-2">
            {nearbyUsers.map((user) => (
              <motion.div
                key={user.uid}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-xl p-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all group cursor-pointer flex items-center justify-between gap-2"
                onClick={() => onProfileClick(user.uid)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="relative shrink-0">
                    <UserAvatar 
                      src={user.photoURL} 
                      username={user.username} 
                      size="sm" 
                      online={user.isOnline}
                      className="shadow-sm"
                    />
                    {user.isOnline && (
                      <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-neutral-900 shadow-sm"></div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-black text-[11px] text-neutral-900 dark:text-white truncate">{user.username}</h4>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-2 h-2 text-blue-600" />
                      <span className="text-[9px] font-black text-blue-600 uppercase tracking-tighter">
                        {user.distance < 1 ? 'Nearby' : `${user.distance.toFixed(0)}km`}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onMessage(user.uid); }}
                    className="p-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onFlyTo?.(user.uid); }}
                    className="p-1.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition"
                  >
                    <Plane className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-12 h-12 bg-neutral-50 dark:bg-neutral-800 rounded-xl flex items-center justify-center mb-3">
              <MapPin className="w-6 h-6 text-neutral-300 dark:text-neutral-600" />
            </div>
            <h3 className="text-sm font-black text-neutral-900 dark:text-white">No mates nearby</h3>
            <p className="text-[10px] text-neutral-500 dark:text-neutral-400 max-w-[150px] mx-auto">Try increasing the search radius.</p>
          </div>
        )}
      </div>
    </div>
  );
}
