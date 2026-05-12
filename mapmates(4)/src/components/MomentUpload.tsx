import React, { useState, useRef, useEffect } from 'react';
import { db, auth } from '../firebase/firebase';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { uploadFile } from '../supabase/supabase';
import { UserProfile } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Video, Send, Loader2, Clock, MapPin, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

interface MomentUploadProps {
  userProfile: UserProfile | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function MomentUpload({ userProfile, onClose, onSuccess }: MomentUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [expiration, setExpiration] = useState<12 | 24>(24);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isCompressing, setIsCompressing] = useState(false);
  const [hasActiveMoment, setHasActiveMoment] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (userProfile?.hasActiveMoment && userProfile?.lastMomentExpiry) {
      const expiry = new Date(userProfile.lastMomentExpiry);
      if (expiry > new Date()) {
        setHasActiveMoment(true);
      }
    }
  }, [userProfile]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (hasActiveMoment) {
      toast.error("You already have an active moment! Wait for it to expire.");
      return;
    }
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.size > 20 * 1024 * 1024) {
      toast.error("File size too large (max 20MB)");
      return;
    }

    const type = selectedFile.type.startsWith('video/') ? 'video' : 'image';
    setMediaType(type);
    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
    
    // Start pre-compression for images immediately
    if (type === 'image') {
      setIsCompressing(true);
      try {
        const compressed = await compressImage(selectedFile);
        setFile(compressed as File);
      } catch (e) {
        console.warn("Pre-compression failed", e);
      } finally {
        setIsCompressing(false);
      }
    }
  };

  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 400; // Ultra-small for 3-4s upload

        if (width > height) {
          if (width > maxDim) {
            height *= maxDim / width;
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width *= maxDim / height;
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Compression failed'));
        }, 'image/jpeg', 0.3); // Aggressive quality for speed
      };
      img.onerror = reject;
    });
  };

  const handleUpload = async () => {
    if (!auth.currentUser || !userProfile || !file || !mediaType || isCompressing) return;
    
    if (hasActiveMoment) {
      toast.error("You already have an active moment!");
      return;
    }

    setLoading(true);
    
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
      const fileExt = mediaType === 'image' ? 'jpg' : file.name.split('.').pop();
      const fileName = `${auth.currentUser!.uid}_${Date.now()}.${fileExt}`;
      const path = `moments/${auth.currentUser!.uid}/${fileName}`;
      
      const mediaUrl = await uploadFile('moments', path, file);
      
      if (!mediaUrl || !mediaUrl.startsWith('https://')) {
        throw new Error('Upload failed: Invalid or insecure URL returned from storage');
      }

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expiration);
      const expiresAtStr = expiresAt.toISOString();

      // Update user profile first to prevent multiple uploads
      await updateDoc(doc(db, 'users', auth.currentUser!.uid), {
        hasActiveMoment: true,
        lastMomentExpiry: expiresAtStr
      });

      await addDoc(collection(db, 'moments'), {
        uid: auth.currentUser!.uid,
        username: userProfile.username,
        userPhoto: userProfile.photoURL,
        mediaUrl,
        mediaType,
        createdAt: new Date().toISOString(),
        expiresAt: expiresAtStr,
        location: {
          lat: userProfile.location?.lat || 0,
          lng: userProfile.location?.lng || 0,
          name: 'Nearby'
        },
        likes: 0,
        views: 0
      });
      
      toast.success('Moment shared successfully!');
      onSuccess();
      onClose();
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  if (hasActiveMoment) {
    return (
      <div className="fixed inset-0 z-[8000] bg-black flex flex-col items-center justify-center p-8 text-center">
        <div className="w-24 h-24 bg-pink-600/20 rounded-[2.5rem] flex items-center justify-center mb-8 border border-pink-500/20 shadow-2xl">
          <AlertCircle className="w-10 h-10 text-pink-500" />
        </div>
        <h3 className="text-2xl font-black text-white tracking-tight mb-4">Moment Already Active</h3>
        <p className="text-neutral-500 text-sm max-w-xs mb-12">
          You can only share one moment at a time. Please wait for your current moment to expire before sharing a new one.
        </p>
        <button 
          onClick={onClose}
          className="px-12 py-4 bg-white text-black rounded-2xl font-black text-sm uppercase tracking-widest"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[8000] bg-black flex flex-col">
      <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between z-10">
        <button 
          onClick={onClose}
          className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/10 hover:bg-white/20 transition"
        >
          <X className="w-6 h-6" />
        </button>
        <h2 className="text-white font-black tracking-tighter text-xl">New Moment</h2>
        <div className="w-12"></div>
      </div>

      {!previewUrl ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-24 h-24 bg-neutral-900 rounded-[2.5rem] flex items-center justify-center mb-8 border border-white/5 shadow-2xl">
            <Camera className="w-10 h-10 text-neutral-700" />
          </div>
          <h3 className="text-2xl font-black text-white tracking-tight mb-4">Share a Moment</h3>
          <p className="text-neutral-500 text-sm max-w-xs mb-12">Capture what's happening around you right now. Images or videos up to 20MB.</p>
          
          <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center gap-4 p-8 bg-neutral-900 rounded-[2rem] border border-white/5 hover:bg-neutral-800 transition group"
            >
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
                <Camera className="w-6 h-6" />
              </div>
              <span className="text-white text-xs font-black uppercase tracking-widest">Photo</span>
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center gap-4 p-8 bg-neutral-900 rounded-[2rem] border border-white/5 hover:bg-neutral-800 transition group"
            >
              <div className="w-12 h-12 bg-pink-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-pink-500/20 group-hover:scale-110 transition-transform">
                <Video className="w-6 h-6" />
              </div>
              <span className="text-white text-xs font-black uppercase tracking-widest">Video</span>
            </button>
          </div>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            accept="image/*,video/*" 
            className="hidden" 
          />
        </div>
      ) : (
        <div className="flex-1 relative flex items-center justify-center overflow-hidden">
          {mediaType === 'video' ? (
            <video 
              src={previewUrl} 
              className="h-full w-full object-cover" 
              autoPlay 
              loop 
              muted 
              playsInline 
            />
          ) : (
            <img 
              src={previewUrl} 
              alt="Preview" 
              className="h-full w-full object-cover" 
            />
          )}

          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 pointer-events-none"></div>

          <div className="absolute bottom-0 left-0 right-0 p-8 flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-black/40 backdrop-blur-md border border-white/10 p-4 rounded-3xl">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <span className="text-white text-[10px] font-black uppercase tracking-widest">Expiration Time</span>
                </div>
                <div className="flex gap-2">
                  {[12, 24].map((hours) => (
                    <button
                      key={hours}
                      onClick={() => setExpiration(hours as 12 | 24)}
                      className={cn(
                        "flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                        expiration === hours ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "bg-white/5 text-white/60 hover:bg-white/10"
                      )}
                    >
                      {hours} Hours
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="flex-1 bg-black/40 backdrop-blur-md border border-white/10 p-4 rounded-3xl">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-4 h-4 text-pink-400" />
                  <span className="text-white text-[10px] font-black uppercase tracking-widest">Location</span>
                </div>
                <div className="flex items-center gap-2 text-white/90 text-xs font-bold">
                  <span className="truncate">Current Location</span>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => {
                  setFile(null);
                  setPreviewUrl(null);
                  setMediaType(null);
                }}
                disabled={loading}
                className="flex-1 py-5 bg-white/10 backdrop-blur-md text-white rounded-[2rem] font-black uppercase tracking-widest text-[10px] border border-white/10 hover:bg-white/20 transition disabled:opacity-50"
              >
                Retake
              </button>
              <button 
                onClick={handleUpload}
                disabled={loading || isCompressing}
                className="flex-[2] py-5 bg-blue-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-blue-500/20 hover:bg-blue-700 transition flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isCompressing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Share Moment</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
