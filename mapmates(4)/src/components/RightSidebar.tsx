import React, { useState, useEffect } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase/firebase';
import { collection, query, where, limit, onSnapshot, getDocs } from 'firebase/firestore';
import { UserProfile } from '../types';
import { UserPlus, MapPin, MessageCircle, Users, Plane } from 'lucide-react';
import { handleQuotaError } from '../lib/utils';
import { UserAvatar } from './UserAvatar';

interface RightSidebarProps {
  onProfileClick: (id: string) => void;
  onFlyTo?: (userId: string) => void;
}

export default function RightSidebar({ onProfileClick, onFlyTo }: RightSidebarProps) {
  const [nearbyUsers, setNearbyUsers] = useState<UserProfile[]>([]);

  useEffect(() => {
    // Optimization: Use getDocs instead of onSnapshot for non-critical live data to save reads
    const fetchUsers = async () => {
      try {
        const q = query(
          collection(db, 'users'), 
          where('privateProfile', '==', false),
          limit(5)
        );
        const snap = await getDocs(q);
        setNearbyUsers(snap.docs
          .map(doc => doc.data() as UserProfile)
          .filter(u => u.location && !isNaN(u.location.lat) && !isNaN(u.location.lng))
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'users');
      }
    };

    fetchUsers();
  }, []);

  return (
    <aside className="w-80 bg-[#020617]/95 border-l border-white/5 p-6 overflow-y-auto backdrop-blur-3xl custom-scrollbar">
      <div className="flex items-center justify-between mb-8 px-1">
        <h2 className="text-lg font-black tracking-tighter text-white italic uppercase">Signal Grid</h2>
        <span className="text-[10px] font-black text-blue-400 bg-blue-600/10 border border-blue-500/20 px-2.5 py-1 rounded-full uppercase tracking-widest italic">Live Feed</span>
      </div>

      <div className="flex flex-col gap-4">
        {nearbyUsers.map((user) => (
          <div 
            key={user.uid}
            className="group bg-white/5 rounded-[2rem] p-5 border border-white/5 hover:border-blue-500/30 hover:bg-blue-600/5 transition-all duration-500 cursor-pointer relative overflow-hidden"
            onClick={() => onProfileClick(user.uid)}
          >
             {/* Hover Glow */}
             <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="flex items-center gap-4 mb-5">
              <div className="relative">
                    <UserAvatar 
                      src={user.photoURL} 
                      username={user.username} 
                      size="md" 
                      online={user.isOnline}
                      className="ring-2 ring-white/5 group-hover:ring-blue-500/50 transition-all duration-500"
                    />
                {user.isOnline && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#020617] rounded-full p-0.5">
                    <div className="w-full h-full bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.8)] animate-pulse" />
                  </div>
                )}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="font-black text-sm text-white truncate italic uppercase tracking-wider">{user.username}</p>
                <div className="flex items-center gap-1.5 text-[10px] text-white/30 font-bold uppercase tracking-widest mt-1">
                  <MapPin className="w-3 h-3 text-blue-500" />
                  <span>2.4 km</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button className="flex-1 py-3 bg-white/5 border border-white/10 text-white text-[10px] font-black rounded-xl hover:bg-white/10 transition-all flex items-center justify-center gap-2 italic uppercase tracking-widest">
                <UserPlus className="w-4 h-4" /> Add
              </button>
              {onFlyTo && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onFlyTo(user.uid);
                  }}
                  className="p-3 bg-blue-600/10 text-blue-400 border border-blue-500/30 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-[0_0_15px_rgba(37,99,235,0.1)]"
                  title="Warp to node"
                >
                  <Plane className="w-4 h-4" />
                </button>
              )}
              <button className="p-3 bg-white/5 text-white/60 border border-white/10 rounded-xl hover:bg-white/10 transition-all">
                <MessageCircle className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {nearbyUsers.length === 0 && (
          <div className="text-center py-20 px-4">
            <div className="w-20 h-20 bg-white/5 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 border border-white/5">
              <Users className="w-10 h-10 text-white/10" />
            </div>
            <p className="text-sm font-black text-white/30 uppercase tracking-[0.2em] italic">No active nodes in range</p>
            <p className="text-[10px] text-white/10 uppercase tracking-widest mt-3">Scan parameters empty</p>
          </div>
        )}
      </div>

      <div className="mt-12 p-8 bg-gradient-to-br from-blue-900 to-indigo-950 rounded-[2.5rem] text-white shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-blue-500/20 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-44 h-44 bg-blue-400/10 rounded-full -mr-20 -mt-20 blur-3xl group-hover:scale-150 transition-transform duration-1000"></div>
        <p className="text-2xl font-black tracking-tighter mb-3 relative z-10 italic uppercase">Vibe Pro</p>
        <p className="text-xs text-blue-200/60 leading-relaxed mb-6 relative z-10 font-bold uppercase tracking-wider">Sync with real-time profile analytics.</p>
        <button className="w-full py-4 bg-white text-black text-xs font-black rounded-2xl hover:bg-blue-400 hover:text-white transition-all relative z-10 uppercase tracking-widest italic">
          Initiate Protocol
        </button>
      </div>
    </aside>
  );
}
