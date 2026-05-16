import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, MessageCircle, MapPin, Eye, Users, Globe, ExternalLink, ChevronRight } from 'lucide-react';
import { db, auth } from '../../firebase/firebase';
import { collection, query, where, orderBy, onSnapshot, limit, Timestamp } from 'firebase/firestore';
import { Moment, UserProfile } from '../../types';
import { UserAvatar } from '../UserAvatar';
import { formatDistanceToNow } from 'date-fns';
import { calculateDistance, getDistanceNumber } from '../../lib/utils';

interface MomentDiscoveryFeedProps {
  userLocation?: { lat: number; lng: number };
  onClose: () => void;
  onFlyTo: (lat: number, lng: number) => void;
  onViewProfile: (uid: string) => void;
  friends: string[];
}

export default function MomentDiscoveryFeed({ 
  userLocation, 
  onClose, 
  onFlyTo, 
  onViewProfile,
  friends 
}: MomentDiscoveryFeedProps) {
  const [tab, setTab] = useState<'random' | 'friends'>('random');
  const [moments, setMoments] = useState<Moment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const momentsRef = collection(db, 'moments');
    const now = new Date().toISOString();
    
    let q;
    if (tab === 'friends') {
      // Note: Firestore 'in' query limited to 10/30 elements, but here we'll just filter by friends if needed
      // Actually simpler to fetch active and filter locally if friends list is large, 
      // or use a query if it's manageable. 
      q = query(
        momentsRef,
        where('expiresAt', '>', now),
        orderBy('expiresAt'),
        limit(50)
      );
    } else {
      q = query(
        momentsRef,
        where('expiresAt', '>', now),
        orderBy('expiresAt'),
        limit(100)
      );
    }

    const unsub = onSnapshot(q, (snap) => {
      let docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Moment));
      
      if (tab === 'friends') {
        docs = docs.filter(m => friends.includes(m.uid));
      }
      
      // Sort by distance if userLocation is available
      if (userLocation && tab === 'random') {
        docs.sort((a, b) => {
          const distA = getDistanceNumber(userLocation.lat, userLocation.lng, a.location.lat, a.location.lng);
          const distB = getDistanceNumber(userLocation.lat, userLocation.lng, b.location.lat, b.location.lng);
          return distA - distB;
        });
      }

      setMoments(docs);
      setLoading(false);
    });

    return () => unsub();
  }, [tab, friends, userLocation]);

  return (
    <motion.div 
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-x-0 bottom-0 z-[8000] h-[90vh] bg-white rounded-t-[3rem] shadow-2xl flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="p-6 border-b flex flex-col gap-6 bg-neutral-50/50">
        <div className="flex items-center justify-between">
          <div className="flex gap-6">
            <button 
              onClick={() => setTab('random')}
              className={`relative py-1 text-2xl font-black transition-all ${tab === 'random' ? 'text-black' : 'text-neutral-300'}`}
            >
              Random Vibe
              {tab === 'random' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-1 bg-black rounded-full" />}
            </button>
            <button 
              onClick={() => setTab('friends')}
              className={`relative py-1 text-2xl font-black transition-all ${tab === 'friends' ? 'text-black' : 'text-neutral-300'}`}
            >
              Friends
              {tab === 'friends' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-1 bg-black rounded-full" />}
            </button>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-white rounded-2xl shadow-sm border border-neutral-100 hover:bg-neutral-50 transition-colors">
            <X className="w-6 h-6 text-neutral-500" />
          </button>
        </div>

        {/* Horizontal Stories - Nearby Active Users */}
        <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
          {moments.slice(0, 10).map((m) => (
            <button 
              key={`story-${m.id}`}
              onClick={() => onFlyTo(m.location.lat, m.location.lng)}
              className="flex-shrink-0 flex flex-col items-center gap-1"
            >
              <div className="p-1 rounded-full border-2 border-blue-500 animate-pulse">
                <UserAvatar src={m.userPhoto} username={m.username} size="md" />
              </div>
              <span className="text-[10px] font-bold text-neutral-500 truncate w-16 text-center">{m.username}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-black uppercase text-neutral-400 tracking-widest">Finding Moments...</p>
          </div>
        ) : moments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center p-8">
            <div className="w-20 h-20 bg-neutral-50 rounded-full flex items-center justify-center mb-4">
              <Zap className="w-10 h-10 text-neutral-200" />
            </div>
            <h3 className="text-xl font-bold text-neutral-900 mb-2">No Moments Yet</h3>
            <p className="text-sm text-neutral-500 text-balance">Be the first one in your area to share what's happening!</p>
          </div>
        ) : (
          moments.map((moment) => (
            <MomentCard 
              key={moment.id} 
              moment={moment} 
              onFlyTo={onFlyTo}
              onViewProfile={onViewProfile}
            />
          ))
        )}
      </div>
    </motion.div>
  );
}

function MomentCard({ moment, onFlyTo, onViewProfile }: { moment: Moment, onFlyTo: (lat: number, lng: number) => void, onViewProfile: (uid: string) => void }) {
  const [isViewed, setIsViewed] = useState(false);

  const handleView = () => {
    if (!isViewed) {
      // Increment logic would go here
      setIsViewed(true);
    }
  };

  return (
    <div className="bg-neutral-50 rounded-[2.5rem] border border-neutral-100 overflow-hidden shadow-sm flex flex-col">
      {/* Top Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UserAvatar src={moment.userPhoto} username={moment.username} size="sm" onClick={() => onViewProfile(moment.uid)} />
          <div>
            <div className="text-sm font-black text-neutral-900 leading-tight flex items-center gap-1">
              {moment.username}
              <button onClick={() => onViewProfile(moment.uid)}>
                <ChevronRight className="w-3 h-3 text-neutral-400" />
              </button>
            </div>
            <button 
              onClick={() => onFlyTo(moment.location.lat, moment.location.lng)}
              className="text-[10px] font-bold text-blue-600 uppercase tracking-widest flex items-center gap-1"
            >
              <MapPin className="w-3 h-3" />
              {moment.location.name || 'View on Map'}
            </button>
          </div>
        </div>
        <div className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">
          {formatDistanceToNow(new Date(moment.createdAt))} ago
        </div>
      </div>

      {/* Main Content */}
      <div className="relative aspect-[4/5] bg-neutral-200">
        <img src={moment.mediaUrl} className="w-full h-full object-cover" />
        
        {/* Render Text Layers */}
        {moment.textLayers?.map((layer: any) => (
          <div 
            key={layer.id}
            className="absolute pointer-events-none"
            style={{ 
              left: `${layer.x}px`, 
              top: `${layer.y}px`,
              color: layer.color,
              fontSize: `${layer.fontSize}px`,
              fontWeight: 900,
              textShadow: '2px 2px 10px rgba(0,0,0,0.5)'
            }}
          >
            {layer.text}
          </div>
        ))}

        {/* Stats Overlay */}
        <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
          <div className="max-w-[70%]">
            {moment.description && (
              <p className="text-white font-bold text-sm drop-shadow-lg line-clamp-2">
                {moment.description}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col items-center gap-1">
              <button className="w-12 h-12 bg-black/20 backdrop-blur-xl rounded-full flex items-center justify-center text-white border border-white/10">
                <Heart className="w-6 h-6" />
              </button>
              <span className="text-[10px] text-white font-black">2.4k</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="w-12 h-12 bg-black/20 backdrop-blur-xl rounded-full flex items-center justify-center text-white border border-white/10">
                <Eye className="w-6 h-6" />
              </div>
              <span className="text-[10px] text-white font-black">{moment.viewsCount || 0}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer / Profile Link */}
      <button 
        onClick={() => onViewProfile(moment.uid)}
        className="p-4 bg-white border-t border-neutral-100 flex items-center justify-center gap-2 text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em]"
      >
        View Full Profile
        <ExternalLink className="w-3 h-3" />
      </button>
    </div>
  );
}

function Zap({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M13 3L4 14H12L11 21L20 10H12L13 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
