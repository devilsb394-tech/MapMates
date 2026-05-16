import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Camera, Check, AlertTriangle, Image as ImageIcon, MapPin, ChevronRight, ChevronLeft, Trash2, ShieldCheck, Map as MapIcon, Info, RotateCcw, PenTool, Sparkles, Upload } from 'lucide-react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase/firebase';
import { collection, addDoc, doc, setDoc, getDoc, serverTimestamp, updateDoc, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { uploadFile } from '../supabase/supabase';
import { toast } from 'sonner';
import { cn, getDistanceNumber } from '../lib/utils';
import { MapLabel, UserProfile } from '../types';

// --- Constants & Config ---

const CATEGORIES = [
  { id: 'hospital', name: 'Hospital', icon: '🏥', color: 'bg-red-500' },
  { id: 'park', name: 'Park', icon: '🌳', color: 'bg-green-500' },
  { id: 'road', name: 'Road', icon: '🛣️', color: 'bg-gray-500' },
  { id: 'mosque', name: 'Mosque', icon: '🕌', color: 'bg-emerald-600' },
  { id: 'home', name: 'Home', icon: '🏠', color: 'bg-blue-500' },
  { id: 'shop', name: 'Shop', icon: '🛍️', color: 'bg-orange-500' },
  { id: 'medical', name: 'Medical Store', icon: '💊', color: 'bg-teal-500' },
  { id: 'petrol', name: 'Petrol Pump', icon: '⛽', color: 'bg-yellow-600' },
  { id: 'school', name: 'School', icon: '🏫', color: 'bg-indigo-500' },
  { id: 'business', name: 'Add Business', icon: '🏢', color: 'bg-purple-600' },
  { id: 'custom', name: 'Custom Name', icon: '📍', color: 'bg-neutral-500' },
];

const SUB_CATEGORIES: Record<string, string[]> = {
  hospital: ['General Hospital', 'Clinic', 'Dental Clinic', 'Pharmacy', 'Lab', 'Eye Clinic', 'Emergency Care', 'Children Hospital', 'Cardiology', 'Mental Health'],
  park: ['Public Park', 'Playground', 'Botanical Garden', 'Zoo', 'Stadium', 'Cricket Ground', 'Football Field', 'Gym', 'Walking Track', 'Picnic Spot'],
  shop: ['Grocery Store', 'Clothing Shop', 'Bakery', 'Mobile Shop', 'Electronics', 'Toy Shop', 'Hardware Store', 'Gift Shop', 'Beauty Salon', 'Pan Shop'],
  school: ['Primary School', 'Secondary School', 'College', 'University', 'Coaching Center', 'Academy', 'Library', 'Technical Institute', 'Language School', 'Kindergarten'],
  mosque: ['Grand Mosque', 'Local Mosque', 'Madrasa', 'Prayer Area', 'Islamic Center', 'Shrine', 'Eidgah', 'Community Mosque', 'Old Mosque', 'Small Mosque'],
  road: ['Main Road', 'Street', 'Lane', 'Intersection', 'Roundabout', 'Bridge', 'Highway', 'U-Turn', 'Service Road', 'Cul-de-sac'],
  home: ['Apartment', 'Villa', 'Bungalow', 'Hostel', 'Guest House', 'Flat', 'Residential Area', 'Society Office', 'Security Post', 'Penthouse'],
  medical: ['Pharmacy', 'Medical Store', 'Clinic', 'Diagnostic Center', 'Red Cross', 'Vaccination Center', 'Ambulance Point', 'Health Center', 'Lab', 'Chemist'],
  petrol: ['Petrol Pump', 'Gas Station', 'CNG Station', 'Diesel Point', 'Electric Charging', 'Oil Store', 'Tyre Shop', 'Car Wash', 'Workshop', 'Convenience Store'],
  business: ['Office', 'Factory', 'Warehouse', 'Studio', 'Showroom', 'Bank', 'ATM', 'Restaurant', 'Cafe', 'Hotel'],
  custom: ['Other', 'Interesting Spot', 'Point of Interest', 'View Point', 'Historical Site', 'Monument', 'Statue', 'Fountain', 'Clock Tower', 'Gate']
};

interface MapLabelSystemProps {
  onClose: () => void;
  userCoords: { lat: number; lng: number };
  onSelectMode: (active: boolean) => void;
  onConfirmLocation: (pos: { lat: number; lng: number } | null) => void;
  selectedPos: { lat: number; lng: number } | null;
  confirmTrigger?: number;
  onAddLabel?: (label: MapLabel) => void;
  userProfile?: UserProfile | null;
}

type Step = 'menu' | 'selecting' | 'confirm_location' | 'category' | 'photo_setup' | 'camera' | 'details' | 'success';

export const MapLabelSystem: React.FC<MapLabelSystemProps> = ({ 
  onClose, 
  userCoords, 
  onSelectMode, 
  onConfirmLocation, 
  selectedPos, 
  confirmTrigger, 
  onAddLabel,
  userProfile
}) => {
  const [step, setStep] = useState<Step>('menu');
  const [category, setCategory] = useState<string>('');
  const [subCategory, setSubCategory] = useState<string>('');
  const [categorySearch, setCategorySearch] = useState('');
  const [targetPhotoCount, setTargetPhotoCount] = useState(1);
  const [photos, setPhotos] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [markerIcon, setMarkerIcon] = useState('📍');
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraMode, setCameraMode] = useState<'user' | 'environment'>('environment');
  const [isAiLoading, setIsAiLoading] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleStartSelecting = () => {
    onSelectMode(true);
    setStep('selecting');
  };

  const handleConfirmLocation = () => {
    if (!selectedPos) return;
    onSelectMode(false); // Stop map from capturing clicks
    setStep('category');
  };

  const handleCategorySelect = (catId: string) => {
    setCategory(catId);
    setCategorySearch('');
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: cameraMode },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      toast.error('Could not access camera');
    }
  };

  useEffect(() => {
    if (confirmTrigger && step === 'selecting' && selectedPos) {
      handleConfirmLocation();
    }
  }, [confirmTrigger]);

  useEffect(() => {
    if (step === 'camera') {
      startCamera();
    } else {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(t => t.stop());
      }
    }
  }, [step, cameraMode]);

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    // Ensure video dimensions are available
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      toast.error('Camera not ready yet.');
      return;
    }

    // Use a reasonable max dimension for labels to save space and speed up upload
    const maxDim = 800;
    let width = video.videoWidth;
    let height = video.videoHeight;

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
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

    setPhotos(prev => [...prev, dataUrl]);
    toast.success(`Photo ${photos.length + 1}/${targetPhotoCount} captured!`);
    
    if (photos.length + 1 >= targetPhotoCount) {
      setStep('details');
    }
  };

  const dataUrlToBlob = (dataUrl: string): Blob => {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  const handleGalleryPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setPhotos(prev => [...prev, dataUrl]);
      toast.success(`Photo ${photos.length + 1}/${targetPhotoCount} selected!`);
      if (photos.length + 1 >= targetPhotoCount) {
        setStep('details');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!auth.currentUser || !selectedPos) {
      toast.error('Required data missing (Auth or Position)');
      return;
    }

    // --- Premium Limit Check ---
    if (!userProfile?.premium) {
      try {
        const statsRef = doc(db, 'userLabelStats', auth.currentUser.uid);
        const statsSnap = await getDoc(statsRef);
        const today = new Date().toISOString().split('T')[0];
        
        if (statsSnap.exists()) {
          const stats = statsSnap.data();
          if (stats.lastLabelDate === today && stats.dailyCount >= 10) {
            toast.error("Free limit reached: 10 labels/day. Upgrade to Premium for unlimited labels!", {
              duration: 5000,
              action: {
                label: 'Upgrade',
                onClick: () => {
                  // We can't directly open modal from here easily without a prop, 
                  // but the button and popup will handle it.
                  onClose();
                }
              }
            });
            return;
          }
        }
      } catch (e) {
        console.error("Error checking limits:", e);
      }
    }
    
    if (name.length > 20) {
      toast.error('Name too long (max 20 chars)');
      return;
    }

    setIsAiLoading(true);
    let finalName = name;

    // AI Processing removed as requested to eliminate delay
    // Directly proceed to saving

    const handleError = (error: any) => {
      console.error("FULL ERROR:", error);
      if (error.code === "permission-denied") {
        alert(`Firestore Permission Error: ${error.message} (Code: ${error.code})`);
      } else if (error.message?.includes("User not logged in")) {
        alert("Error: Please login again.");
      } else if (error.message?.includes("Upload failed")) {
        alert("Error: Image upload failed.");
      } else {
        alert("Error: " + error.message);
      }
    };

    try {
      const currentUser = auth.currentUser;
      if (!currentUser || !currentUser.uid) {
        alert("Authentication not ready. Please wait or sign in again.");
        console.error("Submission blocked: User not authenticated or UID missing");
        return;
      }

      console.log("STEP 0: Starting submission. Name:", finalName, "Category:", category, "Photos count:", photos.length);
      const uploadedPhotoUrls: string[] = [];
      
      // 1. Upload photos to Supabase if any
      if (photos.length > 0) {
        console.log("STEP 1: Starting photo uploads...");
        for (let i = 0; i < photos.length; i++) {
          if (photos[i].startsWith('http')) {
             console.log(`STEP 1.${i}: Photo already a URL, skipping upload:`, photos[i]);
             uploadedPhotoUrls.push(photos[i]);
             continue;
          }

          try {
            const blob = dataUrlToBlob(photos[i]);
            const fileName = `label_${currentUser.uid}_${Date.now()}_${i}.jpg`;
            const filePath = `labels/${currentUser.uid}/${fileName}`;
            console.log(`STEP 1.${i}: Uploading blob to path:`, filePath);
            
            const publicUrl = await uploadFile('moments', filePath, blob);
            console.log(`STEP 1.${i}: Upload result URL:`, publicUrl);
            
            if (publicUrl && publicUrl.startsWith('https://')) {
              uploadedPhotoUrls.push(publicUrl);
            } else {
              throw new Error("Upload failed: Received invalid or insecure URL from storage");
            }
          } catch (uploadErr: any) {
            console.error(`STEP 1.${i}: UPLOAD FAILED:`, uploadErr);
            throw new Error(`Upload failed for image ${i+1}: ` + (uploadErr.message || 'Unknown error'));
          }
        }
      }

      // Validate URL exists if photos were provided
      if (photos.length > 0 && uploadedPhotoUrls.length === 0) {
        throw new Error("Upload failed: Photos were selected but none could be uploaded.");
      }

      const labelData: MapLabel & { userId?: string; creatorId?: string } = {
        id: `temp-${Date.now()}`,
        uid: currentUser.uid,
        userId: currentUser.uid, // Explicitly set for new rules
        creatorId: currentUser.uid, // Explicitly set for legacy rules
        creatorName: currentUser.displayName || 'User',
        creatorPhoto: currentUser.photoURL || '',
        name: finalName,
        category,
        subCategory,
        photos: uploadedPhotoUrls,
        location: selectedPos,
        markerIcon,
        status: 'approved',
        createdAt: new Date().toISOString(),
      };

      console.log("LABEL CREATE PAYLOAD", {
        authUid: currentUser.uid,
        payload: labelData
      });

      console.log("STEP 3: Saving to Firestore. Data payload:", labelData);

      // 2. Save to Firestore
      const { id, ...firestoreData } = labelData;
      const docRef = await addDoc(collection(db, 'labels'), {
        ...firestoreData,
        updatedAt: serverTimestamp()
      });
      console.log("STEP 4 SUCCESS: Firestore document created ID:", docRef.id);

      // --- Update Label Stats ---
      try {
        const statsRef = doc(db, 'userLabelStats', currentUser.uid);
        const statsSnap = await getDoc(statsRef);
        const today = new Date().toISOString().split('T')[0];

        if (statsSnap.exists()) {
          const stats = statsSnap.data();
          if (stats.lastLabelDate === today) {
            await updateDoc(statsRef, {
              dailyCount: (stats.dailyCount || 0) + 1
            });
          } else {
            await updateDoc(statsRef, {
              dailyCount: 1,
              lastLabelDate: today
            });
          }
        } else {
          await setDoc(statsRef, {
            uid: currentUser.uid,
            dailyCount: 1,
            lastLabelDate: today,
            acceptedCount: 1,
            rejectedCount: 0
          });
        }
      } catch (statsErr) {
        console.error("Error updating label stats:", statsErr);
      }

      // 3. Update UI only after success
      if (onAddLabel) {
        onAddLabel({ ...labelData, id: docRef.id });
      }
      setStep('success');

    } catch (err: any) {
      handleError(err);
    } finally {
      setIsAiLoading(false);
    }
  };

  const filteredCategories = CATEGORIES.filter(c => 
    c.name.toLowerCase().includes(categorySearch.toLowerCase())
  );

  if (!auth.currentUser) return (
    <div className="fixed inset-x-0 bottom-0 z-[60] p-8 pointer-events-auto">
      <div className="w-full bg-white dark:bg-neutral-900 rounded-[2.5rem] shadow-2xl p-12 text-center border border-neutral-100 dark:border-neutral-800">
        <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-6" />
        <h3 className="text-2xl font-black text-neutral-900 dark:text-white mb-2">Profile not found</h3>
        <p className="text-sm text-neutral-500 max-w-xs mx-auto font-medium">Please sign in to use the Map Label feature.</p>
        <button onClick={onClose} className="mt-8 px-8 py-3 bg-neutral-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px]">Close</button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] pointer-events-none">
      <AnimatePresence>
        {step === 'menu' && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-full bg-[#020617]/90 backdrop-blur-3xl rounded-t-[3rem] shadow-[0_-20px_80px_rgba(37,99,235,0.25)] p-8 pointer-events-auto border-t border-blue-500/30 pb-28 lg:pb-8 max-h-[85vh] overflow-y-auto relative"
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-1.5 bg-blue-500/20 rounded-full mt-3" />
            <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none" />
            
            <div className="flex justify-between items-center mb-8 relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-blue-600/20 rounded-2xl flex items-center justify-center border border-blue-400/50 shadow-[0_0_20px_rgba(37,99,235,0.3)]">
                  <Sparkles className="w-7 h-7 text-blue-400 drop-shadow-[0_0_8px_#3b82f6]" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tighter uppercase italic">Neural Mapping</h2>
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] opacity-80">Augment Sector Data</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-12 h-12 bg-white/5 hover:bg-blue-600/20 rounded-2xl flex items-center justify-center text-white/50 hover:text-white transition-all transform hover:rotate-90 border border-white/10"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-5 relative z-10">
              <button 
                onClick={handleStartSelecting}
                className="flex flex-col items-center gap-5 p-8 bg-blue-600/10 rounded-[2.5rem] border border-blue-500/30 hover:border-blue-400 hover:bg-blue-600/20 transition-all group relative overflow-hidden shadow-2xl"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="w-16 h-16 bg-blue-600 rounded-[1.8rem] flex items-center justify-center text-white text-3xl shadow-[0_0_30px_rgba(37,99,235,0.5)] group-hover:scale-110 group-hover:rotate-3 transition-all relative z-10 border border-white/20">
                  📍
                </div>
                <div className="text-center relative z-10">
                  <span className="text-xs font-black text-white uppercase tracking-[0.2em] group-hover:text-blue-400 transition-colors">Deploy Label</span>
                  <p className="text-[8px] font-black text-blue-500/60 uppercase tracking-widest mt-1">Sector Alignment</p>
                </div>
                <div className="absolute -inset-1 bg-blue-500/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>

              {[
                { label: 'Add Moment', icon: '📸' },
                { label: 'Traffic Alert', icon: '🚥' },
                { label: 'Weather Alert', icon: '⛅' },
                { label: 'Unsafe Area', icon: '⚠️' },
                { label: 'Status on Map', icon: '🗨️' },
                { label: 'Custom Street View', icon: '📷' }
              ].map((feat, i) => (
                <button 
                  key={i}
                  className="flex flex-col items-center gap-4 p-6 glass rounded-[2.5rem] border border-white/5 opacity-40 grayscale cursor-not-allowed group"
                >
                  <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-white/30 text-3xl">
                    {feat.icon}
                  </div>
                  <span className="text-xs font-black text-white/30 uppercase tracking-[0.2em] text-center">{feat.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {step === 'selecting' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 flex flex-col pointer-events-none"
          >
            <div className="mt-20 px-8 py-5 bg-[#020617]/90 backdrop-blur-3xl rounded-[2.5rem] mx-auto shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/20 flex items-center gap-5 animate-bounce">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-black text-white tracking-tight uppercase italic">Deploying Signal</p>
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] opacity-70">Tap anywhere on map (1km max)</p>
              </div>
            </div>
            
            {selectedPos && (
              <div className="mt-auto p-12 text-center pointer-events-none">
                <p className="text-white text-[10px] font-black uppercase tracking-[0.3em] bg-blue-600/20 backdrop-blur-3xl px-8 py-4 rounded-[2rem] inline-block border border-blue-500/30 shadow-[0_20px_40px_rgba(37,99,235,0.2)]">
                  Verify coordinates via holographic popup
                </p>
              </div>
            )}

            {!selectedPos && (
              <div className="mt-auto p-8 mb-4 pointer-events-auto">
                <button 
                  onClick={() => {
                    onSelectMode(false);
                    setStep('menu');
                  }}
                  className="group relative w-full py-6 bg-white/5 hover:bg-white/10 text-white rounded-[2.5rem] font-black uppercase tracking-[0.3em] text-[10px] border border-white/10 transition-all overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                  Return to Headquarters
                </button>
              </div>
            )}
          </motion.div>
        )}

        {step === 'confirm_location' && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="fixed inset-0 flex items-center justify-center pointer-events-none p-8 z-[9000]"
          >
            <div className="w-full max-w-sm bg-[#020617]/90 backdrop-blur-3xl rounded-[4rem] p-10 pointer-events-auto border border-white/20 shadow-[0_50px_100px_rgba(0,0,0,0.8)] relative overflow-hidden">
               <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50" />
               
              <div className="flex flex-col items-center text-center gap-8">
                <div className="w-24 h-24 bg-blue-600 rounded-[2.5rem] flex items-center justify-center text-white shadow-[0_0_30px_rgba(37,99,235,0.4)] relative">
                   <div className="absolute inset-0 bg-white/20 rounded-[2.5rem] animate-pulse" />
                   <MapPin className="w-10 h-10 relative z-10" />
                </div>
                <div>
                  <h3 className="text-3xl font-black text-white tracking-tighter uppercase italic leading-none">Confirm Site</h3>
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.25em] mt-3 opacity-80">
                    Coordinate verification required
                  </p>
                </div>
                <div className="flex flex-col gap-3 w-full mt-4" onMouseDown={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleConfirmLocation();
                    }}
                    className="group relative w-full py-6 bg-blue-600 text-white rounded-[2.5rem] font-black uppercase tracking-[0.4em] text-[10px] shadow-[0_20px_40px_rgba(37,99,235,0.4)] transition-all overflow-hidden flex items-center justify-center gap-3 active:scale-95"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400/0 via-white/20 to-blue-400/0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                    Initialize Deployment
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onConfirmLocation(null);
                      onSelectMode(true);
                      setStep('selecting');
                    }}
                    className="w-full py-5 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] transition-all border border-white/5"
                  >
                    Recalibrate Pos
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {step === 'category' && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            className="w-full bg-[#020617]/95 backdrop-blur-3xl rounded-t-[3rem] shadow-[0_-20px_50px_rgba(0,0,0,0.5)] p-8 pointer-events-auto border-t border-white/10 max-h-[85vh] flex flex-col"
          >
            <div className="flex justify-between items-center mb-8 shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <PenTool className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tighter uppercase italic">Select Category</h2>
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] opacity-70">Initialize deployment protocol</p>
                </div>
              </div>
              <button 
                onClick={() => setStep('confirm_location')}
                className="w-12 h-12 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-center text-white/50"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="relative mb-8 shrink-0 group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-blue-400 transition-colors w-5 h-5" />
              <input 
                type="text"
                placeholder="Search protocols..."
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-[2rem] py-5 pl-14 pr-6 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white/10 transition-all placeholder:text-white/20"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 min-h-0 pr-2 custom-scrollbar pb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredCategories.map((cat) => (
                <button 
                  key={cat.id}
                  onClick={() => handleCategorySelect(cat.id)}
                  className={cn(
                    "w-full flex items-center justify-between p-5 rounded-[2rem] border transition-all relative group overflow-hidden",
                    category === cat.id 
                      ? "bg-blue-600 border-blue-400 shadow-[0_15px_30px_rgba(37,99,235,0.3)]" 
                      : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                  )}
                >
                  {category === cat.id && (
                    <motion.div layoutId="cat-glow" className="absolute inset-0 bg-gradient-to-tr from-blue-600 to-blue-400 -z-10" />
                  )}
                  <div className="flex items-center gap-5 relative z-10">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-inner transition-transform group-hover:scale-110",
                      category === cat.id ? "bg-white/20" : cat.color
                    )}>
                      {cat.icon}
                    </div>
                    <div className="text-left">
                      <span className={cn(
                        "text-xs font-black uppercase tracking-[0.15em] block",
                        category === cat.id ? "text-white" : "text-white/80"
                      )}>{cat.name}</span>
                      <span className={cn(
                        "text-[9px] font-bold uppercase tracking-widest block opacity-50",
                        category === cat.id ? "text-white/70" : "text-white/40"
                      )}>Protocol {cat.id.slice(0,3)}</span>
                    </div>
                  </div>
                  <div className={cn(
                    "w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all",
                    category === cat.id ? "border-white bg-white" : "border-white/10"
                  )}>
                    {category === cat.id && <Check className="w-4 h-4 text-blue-600" />}
                  </div>
                </button>
              ))}
            </div>

            <div className="shrink-0 pt-6 pb-24 lg:pb-6 border-t border-white/10 bg-transparent">
              <button 
                disabled={!category}
                onClick={() => setStep('photo_setup')}
                className="group relative w-full py-6 bg-blue-600 disabled:bg-white/10 text-white disabled:text-white/20 rounded-[2.5rem] font-black uppercase tracking-[0.3em] text-xs transition-all flex items-center justify-center gap-4 overflow-hidden active:scale-95 shadow-[0_20px_50px_rgba(37,99,235,0.3)]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400/0 via-white/20 to-blue-400/0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                Proceed to Verification
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.div>
        )}

        {step === 'photo_setup' && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="fixed inset-0 flex items-center justify-center pointer-events-none p-8 z-[9000]"
          >
            <div className="w-full max-w-sm bg-[#020617]/90 backdrop-blur-3xl rounded-[4rem] p-10 pointer-events-auto border border-white/20 shadow-[0_50px_100px_rgba(0,0,0,0.8)] relative overflow-hidden">
               <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent opacity-50" />
               
              <div className="flex flex-col items-center text-center gap-8">
                <div className="w-24 h-24 bg-orange-600 rounded-[2.5rem] flex items-center justify-center text-white shadow-[0_0_30px_rgba(234,88,12,0.4)] relative">
                   <div className="absolute inset-0 bg-white/20 rounded-[2.5rem] animate-pulse" />
                   <Camera className="w-10 h-10 relative z-10" />
                </div>
                <div>
                  <h3 className="text-3xl font-black text-white tracking-tighter uppercase italic leading-none">Visual Intel</h3>
                  <p className="text-[10px] font-black text-orange-400 uppercase tracking-[0.25em] mt-3 opacity-80">Capture protocol initialization</p>
                </div>
                
                <div className="flex items-center gap-8 py-6 px-10 bg-white/5 rounded-[2.5rem] border border-white/10 relative group">
                  <button 
                    onClick={() => setTargetPhotoCount(Math.max(1, targetPhotoCount - 1))}
                    className="w-14 h-14 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-center text-white/50 transition-all border border-white/5 active:scale-90"
                  >
                    <ChevronLeft className="w-7 h-7" />
                  </button>
                  <div className="flex flex-col items-center">
                    <span className="text-5xl font-black text-white tracking-tighter italic leading-none">{targetPhotoCount}</span>
                    <span className="text-[9px] font-black text-orange-400 uppercase tracking-widest mt-2">Slots</span>
                  </div>
                  <button 
                    onClick={() => setTargetPhotoCount(Math.min(7, targetPhotoCount + 1))}
                    className="w-14 h-14 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-center text-white/50 transition-all border border-white/5 active:scale-90"
                  >
                    <ChevronRight className="w-7 h-7" />
                  </button>
                </div>

                <div className="w-full space-y-3">
                  <button 
                    onClick={() => setStep('camera')}
                    className="group relative w-full py-6 bg-orange-600 text-white rounded-[2.5rem] font-black uppercase tracking-[0.3em] text-[10px] shadow-[0_20px_40px_rgba(234,88,12,0.4)] transition-all overflow-hidden flex items-center justify-center gap-3 active:scale-95"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-400/0 via-white/20 to-orange-400/0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                    Proceed to Capture
                  </button>
                  <button 
                    onClick={() => {
                        setPhotos([]);
                        setStep('details');
                    }}
                    className="w-full py-5 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] transition-all border border-white/5"
                  >
                    Bypass Documentation
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {step === 'camera' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-[#020617] z-[70] flex flex-col pointer-events-auto"
          >
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(circle_at_2px_2px,rgba(255,255,255,0.1)_1px,transparent_0)] bg-[size:32px_32px]" />

            <div className="relative flex-1 flex flex-col items-center justify-center p-12 text-center">
              <button 
                onClick={() => setStep('photo_setup')}
                className="absolute top-12 left-8 p-3 bg-white/5 border border-white/10 rounded-2xl text-white/50 hover:text-white transition-all z-20"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="flex flex-col items-center text-center max-w-sm relative z-10 w-full space-y-12">
                <div className="relative">
                  <div className="w-32 h-32 bg-blue-600/10 rounded-[3.5rem] flex items-center justify-center border border-blue-500/20 shadow-2xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-blue-500/5 blur-xl group-hover:bg-blue-500/10 transition-colors" />
                    <Sparkles className="w-12 h-12 text-blue-400 opacity-50 absolute -top-2 -right-2 animate-pulse" />
                    <Upload className="w-12 h-12 text-blue-500 relative z-10" />
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-[#020617] rounded-2xl flex items-center justify-center border border-white/10 shadow-xl">
                    <ImageIcon className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="absolute top-0 right-0 px-3 py-1 bg-blue-600 rounded-full border border-white/20 -translate-y-1/2 translate-x-1/2 shadow-lg">
                    <span className="text-[10px] font-black text-white uppercase">{photos.length} / {targetPhotoCount}</span>
                  </div>
                </div>

                <div>
                  <h3 className="text-3xl font-black text-white tracking-tighter uppercase italic leading-none mb-3">Sector Imagery</h3>
                  <p className="text-blue-400/40 font-black text-[10px] uppercase tracking-[0.3em] max-w-[240px] mx-auto leading-relaxed">Select tactical imagery for {category} registration. Clear documentation ensures faster approval.</p>
                </div>

                <div className="w-full">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => fileInputRef.current?.click()}
                    className="group relative w-full py-8 bg-blue-600 text-white rounded-[3rem] font-black uppercase tracking-[0.4em] text-xs shadow-[0_30px_60px_rgba(37,99,235,0.3)] transition-all overflow-hidden flex items-center justify-center gap-4"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400/0 via-white/20 to-blue-400/0 -translate-x-full group-hover:animate-[shimmer_2s_infinite]" />
                    <ImageIcon className="w-6 h-6 relative z-10" />
                    <span className="relative z-10">Access Sector Gallery</span>
                  </motion.button>
                  <p className="text-[9px] font-black text-white/10 uppercase tracking-[0.25em] mt-6">Protocol Verification Level: ALPHA</p>
                </div>

                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleGalleryPick}
                />
              </div>
            </div>
            
            <div className="bg-[#020617] p-8 text-center border-t border-white/5">
              <p className="text-white/20 text-[10px] font-black uppercase tracking-widest italic">Node Encryption Active • Local Proxy Enabled</p>
            </div>
          </motion.div>
        )}

        {step === 'details' && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            className="w-full bg-[#020617]/95 backdrop-blur-3xl rounded-t-[3.5rem] shadow-[0_-20px_60px_rgba(0,0,0,0.8)] p-10 pointer-events-auto border-t border-white/10 max-h-[90vh] flex flex-col"
          >
            <div className="flex items-center gap-5 mb-10 shrink-0">
              <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center text-3xl text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] relative">
                <div className="absolute inset-0 bg-white/20 rounded-3xl animate-pulse" />
                <span className="relative z-10">{CATEGORIES.find(c => c.id === category)?.icon || '📍'}</span>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-black text-white tracking-tighter uppercase italic leading-none">Authentication</h2>
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.25em] mt-2 opacity-70">Finalizing Sector Metadata</p>
              </div>
              <button 
                onClick={() => setStep('category')}
                className="w-12 h-12 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-center text-white/40 hover:text-white transition-all transform hover:-rotate-90"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-10 pr-2 custom-scrollbar pb-6 min-h-0">
              {photos.length > 0 && (
                <div className="flex gap-4 overflow-x-auto pb-6 snap-x group">
                  {photos.map((p, i) => (
                    <div key={i} className="relative w-32 h-32 flex-shrink-0 snap-center rounded-[2rem] overflow-hidden border border-white/10 shadow-xl group-hover:scale-95 hover:!scale-110 transition-transform">
                      <img src={p} className="w-full h-full object-cover" />
                      <button 
                        onClick={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}
                        className="absolute top-2 right-2 w-8 h-8 bg-red-600/80 backdrop-blur-md rounded-xl flex items-center justify-center text-white border border-white/20 shadow-lg"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-4">
                <label className="text-[11px] font-black text-white/30 uppercase tracking-[0.3em] ml-2">Designation</label>
                <div className="relative group">
                  <input 
                    type="text"
                    placeholder={`Enter ${category} ID`}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-[2.5rem] py-6 px-8 text-sm font-black text-white outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white/10 transition-all placeholder:text-white/10 uppercase tracking-widest italic"
                  />
                   <div className={cn(
                    "absolute right-6 top-1/2 -translate-y-1/2 text-[9px] font-black transition-colors",
                    name.length > 20 ? 'text-red-500' : 'text-white/20'
                  )}>
                    {name.length} / 20 CRDS
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <label className="text-[11px] font-black text-white/30 uppercase tracking-[0.3em] ml-2">Neural Classification</label>
                <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-3 custom-scrollbar">
                  {SUB_CATEGORIES[category === 'business' ? 'shop' : category === 'medical' ? 'medical' : category || 'custom']?.map((sub, i) => (
                    <button 
                      key={i}
                      onClick={() => setSubCategory(sub)}
                      className={cn(
                        "p-5 rounded-[2rem] border font-black text-[9px] uppercase tracking-[0.2em] transition-all relative overflow-hidden group",
                        subCategory === sub 
                          ? "border-blue-500 bg-blue-600 text-white shadow-[0_10px_25px_rgba(37,99,235,0.3)]" 
                          : "border-white/5 bg-white/5 text-white/40 hover:bg-white/10"
                      )}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <label className="text-[11px] font-black text-white/30 uppercase tracking-[0.3em] ml-2">Visual Indicator</label>
                <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar group">
                  {['📍', '📌', '🏥', '🏢', '🏠', '🛒', '🍴', '🌳', '⛽', '🎓', '💊', '🕌'].map((icon) => (
                    <button 
                      key={icon}
                      onClick={() => setMarkerIcon(icon)}
                      className={cn(
                        "w-16 h-16 flex-shrink-0 bg-white/5 rounded-[2rem] border transition-all flex items-center justify-center text-3xl shadow-inner",
                        markerIcon === icon 
                          ? "border-blue-500 bg-blue-600/20 scale-110 shadow-[0_0_20px_rgba(37,99,235,0.3)]" 
                          : "border-white/5 hover:bg-white/10"
                      )}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="shrink-0 pt-8 pb-32 lg:pb-8 border-t border-white/10 bg-transparent">
              <button 
                disabled={!name || !subCategory || name.length > 20 || isAiLoading}
                onClick={handleSubmit}
                className="group relative w-full py-7 bg-blue-600 text-white rounded-[3rem] font-black uppercase tracking-[0.4em] text-xs shadow-[0_20px_50px_rgba(37,99,235,0.5)] transition-all overflow-hidden active:scale-95 flex items-center justify-center gap-4 disabled:opacity-30 disabled:grayscale"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400/0 via-white/30 to-blue-400/0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                {isAiLoading ? (
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    Neural Processing...
                  </div>
                ) : (
                  <>COMMIT SECTOR DATA <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {step === 'success' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-[#020617]/95 backdrop-blur-3xl z-[100] flex items-center justify-center p-8 text-center"
          >
             <div className="w-full max-w-sm flex flex-col items-center gap-12">
              <div className="w-40 h-40 bg-green-600 rounded-[4rem] flex items-center justify-center text-white shadow-[0_0_50px_rgba(34,197,94,0.4)] relative">
                <div className="absolute inset-0 bg-white/20 rounded-[4rem] animate-pulse" />
                <ShieldCheck className="w-20 h-20 relative z-10" />
              </div>
              
              <div>
                <h3 className="text-4xl font-black text-white tracking-tighter uppercase italic leading-none">Sector Secured</h3>
                <p className="text-[11px] font-black text-green-400 uppercase tracking-[0.3em] mt-5 px-4 opacity-80">
                  Protocol deployment successful. Local network updated.
                </p>
              </div>

              <button 
                onClick={onClose}
                className="group relative w-full py-6 bg-green-600 text-white rounded-[3rem] font-black uppercase tracking-[0.4em] text-xs shadow-[0_20px_40px_rgba(34,197,94,0.3)] transition-all overflow-hidden active:scale-95 flex items-center justify-center gap-3"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-green-400/0 via-white/20 to-green-400/0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                Return to Sector View
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
