import React, { useState, useEffect } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase/firebase';
import { collection, query, orderBy, limit, getDocs, where, addDoc } from 'firebase/firestore';
import { UserProfile } from '../types';
import { Trophy, Heart, Eye, Star, Shield, Users, Plane, MessageCircle, UserPlus, Medal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, handleQuotaError } from '../lib/utils';
import { toast } from 'sonner';

interface AchievementsProps {
  onViewProfile: (id: string) => void;
  onMessage: (id: string) => void;
  onLocate: (id: string) => void;
}

type Category = 'likes' | 'views' | 'personality' | 'friendline' | 'attractiveness' | 'trustLevel';

export default function Achievements({ onViewProfile, onMessage, onLocate }: AchievementsProps) {
  const [activeCategory, setActiveCategory] = useState<Category>('likes');
  const [topUsers, setTopUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const categories: { id: Category; label: string; icon: any; color: string; field: string }[] = [
    { id: 'likes', label: 'Most Liked', icon: Heart, color: 'text-red-500', field: 'stats.likes' },
    { id: 'views', label: 'Most Viewed', icon: Eye, color: 'text-blue-500', field: 'stats.views' },
    { id: 'personality', label: 'Top Personality', icon: Star, color: 'text-yellow-500', field: 'stats.avgPersonality' },
    { id: 'friendline', label: 'Friendline', icon: Users, color: 'text-green-500', field: 'stats.avgFriendliness' },
    { id: 'attractiveness', label: 'Most Attractive', icon: Star, color: 'text-purple-500', field: 'stats.avgAttractiveness' },
    { id: 'trustLevel', label: 'Most Trusted', icon: Shield, color: 'text-indigo-500', field: 'stats.avgTrustLevel' },
  ];

  useEffect(() => {
    const fetchTopUsers = async () => {
      setLoading(true);
      try {
        const cat = categories.find(c => c.id === activeCategory);
        if (!cat) return;

        const q = query(
          collection(db, 'users'),
          orderBy(cat.field, 'desc'),
          limit(10)
        );

        const snap = await getDocs(q);
        const users = snap.docs.map(d => d.data() as UserProfile);
        setTopUsers(users);
      } catch (err: any) {
        handleFirestoreError(err, OperationType.GET, 'users');
      } finally {
        setLoading(false);
      }
    };

    fetchTopUsers();
  }, [activeCategory]);

  const handleAddFriend = async (targetId: string) => {
    if (!auth.currentUser) return;
    try {
      // Check if already friends or request exists
      const q = query(
        collection(db, 'friendRequests'),
        where('participants', 'array-contains', auth.currentUser.uid)
      );
      const snap = await getDocs(q);
      const exists = snap.docs.some(d => d.data().participants.includes(targetId));

      if (exists) {
        toast.info("Friend request already exists or you are already friends.");
        return;
      }

      await addDoc(collection(db, 'friendRequests'), {
        from: auth.currentUser.uid,
        to: targetId,
        participants: [auth.currentUser.uid, targetId],
        status: 'pending',
        friendshipType: 'Regular',
        closeness: 50,
        createdAt: new Date().toISOString()
      });
      toast.success("Friend request sent!");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-6 border-b border-neutral-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-yellow-50 text-yellow-600 rounded-xl flex items-center justify-center">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight text-neutral-900">Achievements</h2>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Top Rated Users</p>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "flex-shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 border",
                activeCategory === cat.id 
                  ? "bg-neutral-900 text-white border-neutral-900 shadow-lg shadow-neutral-200" 
                  : "bg-white text-neutral-400 border-neutral-100 hover:border-neutral-200"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center py-12"
            >
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </motion.div>
          ) : (
            <motion.div 
              key="content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              {topUsers.map((user, index) => (
                <div 
                  key={user.uid}
                  className="group relative bg-neutral-50 p-4 rounded-3xl border border-neutral-100 hover:bg-white hover:shadow-xl hover:shadow-neutral-100 transition-all duration-300"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <img 
                        src={user.photoURL} 
                        alt={user.username} 
                        className="w-14 h-14 rounded-2xl object-cover cursor-pointer shadow-sm"
                        onClick={() => onViewProfile(user.uid)}
                      />
                      {index < 3 && (
                        <div className={cn(
                          "absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center shadow-lg border-2 border-white",
                          index === 0 ? "bg-yellow-400" : index === 1 ? "bg-neutral-300" : "bg-orange-400"
                        )}>
                          <Medal className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-black text-neutral-900 text-sm truncate">{user.username}</p>
                        {user.isOnline && <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>}
                      </div>
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest truncate">{user.profession}</p>
                      
                      <div className="flex items-center gap-1 mt-1">
                        {React.createElement(categories.find(c => c.id === activeCategory)!.icon, {
                          className: cn("w-3 h-3", categories.find(c => c.id === activeCategory)!.color)
                        })}
                        <span className="text-[10px] font-black text-neutral-900">
                          {activeCategory === 'likes' ? user.stats.likes :
                           activeCategory === 'views' ? user.stats.views :
                           activeCategory === 'personality' ? `${Math.round(user.stats.avgPersonality || 0)}%` :
                           activeCategory === 'friendline' ? `${Math.round(user.stats.avgFriendliness || 0)}%` :
                           activeCategory === 'attractiveness' ? `${Math.round(user.stats.avgAttractiveness || 0)}%` :
                           `${Math.round(user.stats.avgTrustLevel || 0)}%`}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <button 
                        onClick={() => onLocate(user.uid)}
                        className="p-2 bg-white text-neutral-900 rounded-xl hover:bg-neutral-900 hover:text-white transition shadow-sm"
                        title="Locate on Map"
                      >
                        <Plane className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => onMessage(user.uid)}
                        className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition shadow-sm"
                        title="Message"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleAddFriend(user.uid)}
                        className="p-2 bg-green-50 text-green-600 rounded-xl hover:bg-green-600 hover:text-white transition shadow-sm"
                        title="Add Friend"
                      >
                        <UserPlus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
