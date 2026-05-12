import React, { useState, useEffect, useRef, useCallback } from 'react';
import { db, auth } from '../firebase/firebase';
import { collection, query, where, orderBy, limit, getDocs, startAfter, Timestamp, doc, getDoc } from 'firebase/firestore';
import { Moment, UserProfile } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { User, MapPin, X, Play, Pause, Volume2, VolumeX, Loader2, Heart, MessageCircle, Share2, MoreVertical } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

interface MomentsProps {
  onProfileClick: (id: string) => void;
  onClose?: () => void;
  initialUserId?: string;
}

export default function Moments({ onProfileClick, onClose, initialUserId }: MomentsProps) {
  const [moments, setMoments] = useState<Moment[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<'vibe' | 'mates'>('vibe');
  const [friends, setFriends] = useState<any[]>([]);

  useEffect(() => {
    if (auth.currentUser) {
      const fetchFriends = async () => {
        try {
          const snap = await getDocs(query(collection(db, 'mates'), where('uid', '==', auth.currentUser?.uid)));
          if (!snap.empty) {
            setFriends(snap.docs[0].data().friends || []);
          }
        } catch (err) {
          console.error("Error fetching friends for moments:", err);
        }
      };
      fetchFriends();
    }
  }, []);

  const fetchMoments = useCallback(async (isInitial = false) => {
    setLoading(true);
    try {
      const now = new Date().toISOString();
      let q;
      
      if (initialUserId) {
        q = query(
          collection(db, 'moments'),
          where('uid', '==', initialUserId),
          where('expiresAt', '>', now),
          orderBy('expiresAt', 'desc'),
          orderBy('createdAt', 'desc'),
          limit(10)
        );
      } else {
        const momentRef = collection(db, 'moments');
        if (activeTab === 'mates' && auth.currentUser) {
          const friendIds = friends.map(f => f.uid);
          // Always include self in Mates feed too
          friendIds.push(auth.currentUser.uid);
          
          if (friendIds.length > 0) {
            q = query(
              momentRef,
              where('uid', 'in', friendIds.slice(0, 10)), // Firestore 'in' limit is 10
              where('expiresAt', '>', now),
              orderBy('expiresAt', 'desc'),
              orderBy('createdAt', 'desc'),
              limit(10)
            );
          } else {
            setMoments([]);
            setLoading(false);
            return;
          }
        } else {
          q = query(
            momentRef,
            where('expiresAt', '>', now),
            orderBy('expiresAt', 'desc'),
            orderBy('createdAt', 'desc'),
            limit(10)
          );
        }
      }

      if (!isInitial && lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snap = await getDocs(q);
      const newMoments = snap.docs.map(d => ({ id: d.id, ...d.data() as any } as Moment));
      
      if (isInitial) {
        setMoments(newMoments);
      } else {
        setMoments(prev => [...prev, ...newMoments]);
      }
      
      setLastDoc(snap.docs[snap.docs.length - 1]);
      setHasMore(snap.docs.length === 10);
    } catch (err: any) {
      console.error("Error fetching moments:", err);
      toast.error("Failed to load moments");
    } finally {
      setLoading(false);
    }
  }, [initialUserId, lastDoc]);

  useEffect(() => {
    fetchMoments(true);
  }, [initialUserId, activeTab]);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollTop, clientHeight } = containerRef.current;
    const index = Math.round(scrollTop / clientHeight);
    if (index !== currentIndex) {
      setCurrentIndex(index);
    }

    if (hasMore && !loading && scrollTop + clientHeight >= containerRef.current.scrollHeight - 100) {
      fetchMoments();
    }
  }, [currentIndex, hasMore, loading, fetchMoments]);

  if (loading && moments.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-black">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (moments.length === 0) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-black text-white p-8 text-center">
        <div className="w-20 h-20 bg-neutral-900 rounded-full flex items-center justify-center mb-6">
          <Play className="w-10 h-10 text-neutral-700" />
        </div>
        <h3 className="text-xl font-black tracking-tighter mb-2">No Moments Yet</h3>
        <p className="text-sm text-neutral-500 max-w-xs">Be the first to share a moment with the world!</p>
        {onClose && (
          <button 
            onClick={onClose}
            className="mt-8 px-8 py-3 bg-white text-black rounded-2xl font-black text-sm"
          >
            Go Back
          </button>
        )}
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      onScroll={handleScroll}
      className="h-full w-full bg-black overflow-y-scroll snap-y snap-mandatory custom-scrollbar-none"
    >
      {onClose && (
        <button 
          onClick={onClose}
          className="fixed top-6 left-6 z-[7000] w-12 h-12 bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/10 hover:bg-black/40 transition"
        >
          <X className="w-6 h-6" />
        </button>
      )}

      {/* TikTok Style Tabs */}
      {!initialUserId && (
        <div className="fixed top-6 left-0 right-0 z-[6000] flex justify-center gap-6">
          <button 
            onClick={() => setActiveTab('vibe')}
            className={cn(
              "text-sm font-black uppercase tracking-widest transition-all",
              activeTab === 'vibe' ? "text-white scale-110 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" : "text-white/40"
            )}
          >
            Vibe
            {activeTab === 'vibe' && <motion.div layoutId="moment-tab" className="h-1 bg-white rounded-full mt-1 mx-auto w-4" />}
          </button>
          <button 
            onClick={() => setActiveTab('mates')}
            className={cn(
              "text-sm font-black uppercase tracking-widest transition-all",
              activeTab === 'mates' ? "text-white scale-110 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" : "text-white/40"
            )}
          >
            Mates
            {activeTab === 'mates' && <motion.div layoutId="moment-tab" className="h-1 bg-white rounded-full mt-1 mx-auto w-4" />}
          </button>
        </div>
      )}

      <button 
        onClick={() => setIsMuted(!isMuted)}
        className="fixed top-6 right-6 z-[7000] w-12 h-12 bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/10 hover:bg-black/40 transition"
      >
        {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
      </button>

      {moments.map((moment, index) => (
        <MomentItem 
          key={moment.id} 
          moment={moment} 
          isActive={index === currentIndex}
          isMuted={isMuted}
          onProfileClick={onProfileClick}
        />
      ))}
    </div>
  );
}

interface MomentItemProps {
  key?: React.Key;
  moment: Moment;
  isActive: boolean;
  isMuted: boolean;
  onProfileClick: (id: string) => void;
}

function MomentItem({ moment, isActive, isMuted, onProfileClick }: MomentItemProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    if (videoRef.current) {
      if (isActive) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
    }
  }, [isActive]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="h-full w-full snap-start relative flex items-center justify-center overflow-hidden bg-neutral-950">
      {moment.mediaType === 'video' ? (
        <video
          ref={videoRef}
          src={moment.mediaUrl}
          className="h-full w-full object-cover"
          loop
          muted={isMuted}
          playsInline
          onClick={togglePlay}
        />
      ) : (
        <img 
          src={moment.mediaUrl} 
          alt="Moment" 
          className="h-full w-full object-cover"
        />
      )}

      {/* Overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 pointer-events-none"></div>

      {/* Top Info */}
      <div className="absolute top-0 left-0 right-0 p-6 pt-20 flex items-center gap-3">
        <div 
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => onProfileClick(moment.uid)}
        >
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-pink-500 to-purple-500 animate-spin-slow blur-sm opacity-75"></div>
            <img 
              src={moment.userPhoto} 
              alt={moment.username} 
              className="relative w-12 h-12 rounded-full border-2 border-white object-cover shadow-2xl" 
            />
          </div>
          <div>
            <h4 className="text-white font-black tracking-tight drop-shadow-lg group-hover:text-blue-400 transition-colors">{moment.username}</h4>
            <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">
              {new Date(moment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      </div>

      {/* Right Actions */}
      <div className="absolute right-4 bottom-32 flex flex-col gap-6 items-center">
        <button className="flex flex-col items-center gap-1 group">
          <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/10 group-hover:bg-pink-500 group-hover:border-pink-400 transition-all duration-300">
            <Heart className="w-6 h-6" />
          </div>
          <span className="text-white text-[10px] font-black">Like</span>
        </button>
        <button className="flex flex-col items-center gap-1 group">
          <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/10 group-hover:bg-blue-500 group-hover:border-blue-400 transition-all duration-300">
            <MessageCircle className="w-6 h-6" />
          </div>
          <span className="text-white text-[10px] font-black">Reply</span>
        </button>
        <button className="flex flex-col items-center gap-1 group">
          <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/10 group-hover:bg-green-500 group-hover:border-green-400 transition-all duration-300">
            <Share2 className="w-6 h-6" />
          </div>
          <span className="text-white text-[10px] font-black">Share</span>
        </button>
        <button className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/10">
          <MoreVertical className="w-6 h-6" />
        </button>
      </div>

      {/* Bottom Info */}
      <div className="absolute bottom-0 left-0 right-0 p-8 pb-24 lg:pb-8">
        <div className="flex items-center gap-2 bg-black/20 backdrop-blur-md border border-white/10 px-4 py-2 rounded-2xl w-fit mb-4">
          <MapPin className="w-4 h-4 text-pink-500" />
          <span className="text-white text-xs font-black tracking-tight">
            {moment.location.name || 'Somewhere on Earth'}
          </span>
        </div>
        <p className="text-white/90 text-sm font-medium leading-relaxed max-w-sm drop-shadow-md">
          Shared a new moment from the map! Check out what's happening.
        </p>
      </div>

      {!isPlaying && moment.mediaType === 'video' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-20 h-20 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20">
            <Play className="w-10 h-10 fill-current" />
          </div>
        </div>
      )}
    </div>
  );
}
