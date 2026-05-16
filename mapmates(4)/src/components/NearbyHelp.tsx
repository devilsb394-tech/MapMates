import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Radio, X, Zap } from 'lucide-react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, deleteDoc, doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { UserProfile } from '../types';

interface NearbyHelpProps {
  userProfile: UserProfile | null;
  onClose: () => void;
}

export default function NearbyHelp({ userProfile, onClose }: NearbyHelpProps) {
  const [helpText, setHelpText] = useState('');
  const [helpRadius, setHelpRadius] = useState(50);
  const [isSending, setIsSending] = useState(false);

  const sendHelpSignal = async () => {
    if (!auth.currentUser || !userProfile?.location) return;
    if (!helpText.trim()) {
      toast.error('Please describe what help you need');
      return;
    }

    setIsSending(true);

    // --- Premium Limit Check ---
    if (!userProfile?.premium) {
      try {
        const statsRef = doc(db, 'userHelpStats', auth.currentUser.uid);
        const statsSnap = await getDoc(statsRef);
        const today = new Date().toISOString().split('T')[0];
        
        if (statsSnap.exists()) {
          const stats = statsSnap.data();
          if (stats.lastHelpDate === today && stats.dailyCount >= 3) {
            toast.error("Free limit reached: 3 help signals/day. Upgrade to Premium for unlimted assistance!", {
              duration: 5000,
            });
            setIsSending(false);
            return;
          }
        }
      } catch (e) {
        console.error("Error checking limits:", e);
      }
    }
    
    const handleError = (error: any) => {
      console.error("FULL ERROR:", error);
      if (error.code === "permission-denied") {
        alert("Error: Permission denied (UID mismatch).");
      } else if (error.message?.includes("User not logged in")) {
        alert("Error: Please login again.");
      } else {
        alert("Error: " + error.message);
      }
    };

    try {
      await addDoc(collection(db, 'help_signals'), {
        uid: auth.currentUser.uid,
        username: userProfile.username,
        photoURL: userProfile.photoURL,
        text: helpText,
        lat: userProfile.location.lat,
        lng: userProfile.location.lng,
        radius: helpRadius,
        timestamp: new Date().toISOString(),
        serverTimestamp: serverTimestamp()
      });

      // --- Update Help Stats ---
      try {
        const statsRef = doc(db, 'userHelpStats', auth.currentUser.uid);
        const statsSnap = await getDoc(statsRef);
        const today = new Date().toISOString().split('T')[0];

        if (statsSnap.exists()) {
          const stats = statsSnap.data();
          if (stats.lastHelpDate === today) {
            await updateDoc(statsRef, {
              dailyCount: (stats.dailyCount || 0) + 1
            });
          } else {
            await updateDoc(statsRef, {
              dailyCount: 1,
              lastHelpDate: today
            });
          }
        } else {
          await setDoc(statsRef, {
            uid: auth.currentUser.uid,
            dailyCount: 1,
            lastHelpDate: today
          });
        }
      } catch (statsErr) {
        console.error("Error updating help stats:", statsErr);
      }
      
      toast.success('Help signal broadcasted!', {
        description: `Mates within ${helpRadius}m have been notified.`,
        icon: '🚨'
      });
      onClose();
    } catch (err: any) {
      handleError(err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-neutral-900">
      <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
        <div className="flex items-center justify-between mb-8 sticky top-0 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md pt-2 pb-4 z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center text-red-600 animate-pulse">
              <Radio className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tighter text-neutral-900 dark:text-white uppercase">Nearby Help</h3>
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest leading-none mt-1">SOS / Assistance Broadcast</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-12 h-12 bg-neutral-100 dark:bg-neutral-800 rounded-2xl flex items-center justify-center text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="max-w-md mx-auto space-y-8">
          <div className="relative">
            <textarea
              value={helpText}
              onChange={(e) => setHelpText(e.target.value)}
              placeholder="What do you need help with? (e.g. Car breakdown, medical, etc.)"
              className="w-full h-40 bg-red-50/30 dark:bg-red-900/5 border border-red-100 dark:border-red-900/20 rounded-[2rem] p-6 text-sm font-medium outline-none focus:ring-2 focus:ring-red-500 transition-all resize-none dark:text-white"
              maxLength={150}
            />
            <div className="absolute bottom-4 right-6 text-[10px] font-black text-neutral-300 uppercase tracking-widest">
              {helpText.length}/150
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Broadcast Radius</label>
              <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">
                {helpRadius}m
              </span>
            </div>
            <input 
              type="range" 
              min="20" 
              max="100" 
              step="1"
              value={helpRadius}
              onChange={(e) => setHelpRadius(parseInt(e.target.value))}
              className="w-full h-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-red-600"
            />
            <div className="flex justify-between text-[8px] font-bold text-neutral-300 uppercase tracking-tighter">
              <span>20m</span>
              <span>40m</span>
              <span>60m</span>
              <span>80m</span>
              <span>100m</span>
            </div>
          </div>

          <div className="bg-red-50 dark:bg-red-900/10 p-6 rounded-[2rem] flex items-start gap-4 border border-red-100 dark:border-red-900/20">
            <Zap className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] font-bold text-red-700 dark:text-red-400 leading-relaxed uppercase tracking-wider">
                Your exact GPS location will be shared with active users in this circle instantly.
              </p>
              <p className="text-[10px] font-medium text-red-600/60 dark:text-red-400/60 mt-1 uppercase tracking-widest">
                Use only for real assistance.
              </p>
            </div>
          </div>

          <button
            onClick={sendHelpSignal}
            disabled={isSending || !helpText.trim()}
            className={cn(
              "w-full py-5 rounded-[2rem] text-sm font-black uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
              "bg-red-600 text-white shadow-red-200 dark:shadow-red-900/20 hover:bg-red-700"
            )}
          >
            {isSending ? 'Broadcasting...' : 'Launch Help Signal'}
          </button>
        </div>
      </div>
    </div>
  );
}
