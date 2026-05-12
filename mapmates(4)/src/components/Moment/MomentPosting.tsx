import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Send, Clock, MapPin, Loader2 } from 'lucide-react';
import { auth, db } from '../../firebase/firebase';
import { collection, addDoc, serverTimestamp, setDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { uploadFile } from '../../supabase/supabase';
import { toast } from 'sonner';
import { UserProfile } from '../../types';

interface MomentPostingProps {
  media: string;
  layers: any[];
  filters: any;
  onComplete: () => void;
  onBack: () => void;
  onOptimisticMoment?: (moment: any) => void;
  userProfile: UserProfile | null;
}

const DURATIONS = [
  { hours: 7, label: '7h' },
  { hours: 10, label: '10h' },
  { hours: 12, label: '12h' },
  { hours: 18, label: '18h' },
  { hours: 24, label: '24h' },
];

export default function MomentPosting({ media, layers, filters, onComplete, onBack, onOptimisticMoment, userProfile }: MomentPostingProps) {
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(24);
  const [isUploading, setIsUploading] = useState(false);

  // Get user location (mocked or from state, let's try to get current pos)
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  React.useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        console.error('Geolocation error:', err);
        // Fallback to a default if really needed, but better to alert
      },
      { enableHighAccuracy: true }
    );
  }, []);

  const compressImage = async (dataUrl: string): Promise<Blob> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Max dimensions
        const MAX_WIDTH = 1080;
        const MAX_HEIGHT = 1920;
        
        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          resolve(blob!);
        }, 'image/jpeg', 0.8);
      };
      img.src = dataUrl;
    });
  };

  const handlePost = async () => {
    if (!auth.currentUser) {
      toast.error('You must be logged in to post a moment');
      return;
    }

    if (!location) {
      toast.error('Location required to post a moment');
      return;
    }

    const toastId = toast.loading('Posting your moment (0%)...');
    setIsUploading(true);

    // --- Premium Limit Check ---
    if (!userProfile?.premium) {
      try {
        const statsRef = doc(db, 'userMomentStats', auth.currentUser.uid);
        const statsSnap = await getDoc(statsRef);
        const today = new Date().toISOString().split('T')[0];
        
        if (statsSnap.exists()) {
          const stats = statsSnap.data();
          if (stats.lastMomentDate === today && stats.dailyCount >= 3) {
            toast.dismiss(toastId);
            toast.error("Free limit reached: 3 moments/day. Upgrade to Premium for unlimited moments!", {
              duration: 5000,
            });
            setIsUploading(false);
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
      } else if (error.message?.includes("Upload failed")) {
        alert("Error: Image upload failed.");
      } else {
        alert("Error: " + error.message);
      }
    };

    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + duration);

      // 1. Compress and Prepare for upload
      toast.loading('Posting your moment (30%)...', { id: toastId });
      const compressedBlob = await compressImage(media);
      
      toast.loading('Posting your moment (60%)...', { id: toastId });
      const fileExt = 'jpg';
      const fileName = `${auth.currentUser.uid}_${Date.now()}.${fileExt}`;
      const filePath = `moments/${fileName}`;

      // 2. Upload to Supabase
      const publicUrl = await uploadFile('moments', filePath, compressedBlob);
      
      if (!publicUrl || !publicUrl.startsWith('https://')) {
        throw new Error('Upload failed: Invalid or insecure URL returned from storage');
      }

      toast.loading('Posting your moment (90%)...', { id: toastId });

      // 3. Save to Firestore
      const momentData = {
        uid: auth.currentUser.uid,
        username: auth.currentUser.displayName || 'User',
        userPhoto: auth.currentUser.photoURL || '',
        mediaUrl: publicUrl,
        mediaType: 'image',
        description,
        location: {
          lat: location.lat,
          lng: location.lng,
          name: 'Moment Location'
        },
        textLayers: layers,
        filters: filters,
        createdAt: serverTimestamp(),
        expiresAt: expiresAt.toISOString(),
        viewsCount: 0,
        viewerIds: []
      };

      await addDoc(collection(db, 'moments'), momentData);

      // --- Update Moment Stats ---
      try {
        const statsRef = doc(db, 'userMomentStats', auth.currentUser.uid);
        const statsSnap = await getDoc(statsRef);
        const today = new Date().toISOString().split('T')[0];

        if (statsSnap.exists()) {
          const stats = statsSnap.data();
          if (stats.lastMomentDate === today) {
            await updateDoc(statsRef, {
              dailyCount: (stats.dailyCount || 0) + 1
            });
          } else {
            await updateDoc(statsRef, {
              dailyCount: 1,
              lastMomentDate: today
            });
          }
        } else {
          await setDoc(statsRef, {
            uid: auth.currentUser.uid,
            dailyCount: 1,
            lastMomentDate: today
          });
        }
      } catch (statsErr) {
        console.error("Error updating moment stats:", statsErr);
      }
      
      await setDoc(doc(db, 'users', auth.currentUser.uid), {
        hasActiveMoment: true,
        lastMomentExpiry: expiresAt.toISOString()
      }, { merge: true });
      
      toast.success('Moment shared successfully!', { id: toastId });
      onComplete();

    } catch (error: any) {
      handleError(error);
      toast.dismiss(toastId);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="relative h-full w-full bg-neutral-50 flex flex-col">
      {/* Header */}
      <div className="p-6 flex items-center justify-between border-b bg-white">
        <div className="w-10" />
        <h2 className="text-xl font-black uppercase tracking-tighter text-neutral-900">Share Moment</h2>
        <button onClick={onBack} className="p-2 hover:bg-neutral-100 rounded-full">
          <X className="w-6 h-6 text-neutral-900" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Preview Thumbnail */}
        <div className="flex gap-4">
          <div className="w-32 aspect-[9/16] rounded-2xl bg-neutral-200 overflow-hidden shadow-md">
            <img src={media} className="w-full h-full object-cover" />
          </div>
          <div className="flex-1">
            <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2 block">Description</label>
            <textarea 
              autoFocus
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's happening?"
              className="w-full bg-transparent text-lg font-medium focus:outline-none resize-none"
              rows={4}
            />
          </div>
        </div>

        {/* Expiry Selector */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-neutral-900 font-bold">
            <Clock className="w-5 h-5 text-blue-600" />
            <span>Visible For</span>
          </div>
          <div className="flex gap-3">
            {DURATIONS.map(d => (
              <button 
                key={d.hours}
                onClick={() => setDuration(d.hours)}
                className={`flex-1 py-3 px-2 rounded-2xl border-2 transition-all font-bold ${
                  duration === d.hours 
                  ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200' 
                  : 'bg-white border-neutral-100 text-neutral-500 hover:border-blue-200'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-neutral-400 font-medium italic">
            This moment will automatically disappear after the selected time.
          </p>
        </div>

        {/* Location Info */}
        <div className="p-4 bg-white rounded-2xl border border-neutral-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center">
            <MapPin className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <div className="text-sm font-bold text-neutral-900">Current Location</div>
            <div className="text-xs text-neutral-500">
              {location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : 'Detecting location...'}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-6 pb-24 bg-white border-t">
        <button 
          disabled={isUploading || !location}
          onClick={handlePost}
          className={`w-full py-5 rounded-[24px] flex items-center justify-center gap-3 text-lg font-black transition-all ${
            isUploading || !location
            ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
            : 'bg-black text-white hover:bg-neutral-800 shadow-2xl overflow-hidden'
          }`}
        >
          {isUploading ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <>
              Post Moment
              <Send className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
