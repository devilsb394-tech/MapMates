import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Shield, Zap, Users, MessageSquare, Target, Sparkles, Map as MapIcon, Info, User, Radio, Camera, Compass } from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from '../firebase/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { uploadFile } from '../supabase/supabase';
import { toast } from 'sonner';

interface StoryOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function StoryOverlay({ isOpen, onClose }: StoryOverlayProps) {
  const [storyPic, setStoryPic] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isCreator = auth.currentUser?.email === 'devilsb394@gmail.com';

  useEffect(() => {
    async function fetchStory() {
      try {
        const snap = await getDoc(doc(db, 'app_config', 'story'));
        if (snap.exists()) {
          setStoryPic(snap.data().url);
        }
      } catch (err) {
        // If it's a permission error, it might be because the app is still initializing or rules are propagating
        console.warn('Story fetch error:', err);
        // We don't want to crash the whole app for this background fetch
      }
    }
    fetchStory();
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isCreator) return;

    setUploading(true);
    const toastId = toast.loading('Uploading story picture...');

    try {
      const path = `app_assets/story_pic_${Date.now()}.jpg`;
      const url = await uploadFile('moments', path, file);
      
      if (!url) {
        throw new Error("Upload failed: No URL returned");
      }

      await setDoc(doc(db, 'app_config', 'story'), { url });
      setStoryPic(url);
      toast.success('Story picture updated!', { id: toastId });
    } catch (err: any) {
      console.error('Upload error:', err);
      toast.error('Failed to upload: ' + err.message, { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  interface StorySection {
    id: string;
    title: string;
    subtitle?: string;
    icon?: React.ReactNode;
    content: React.ReactNode;
  }

  const sections: StorySection[] = [
    {
      id: 'intro',
      title: 'Why I Built MapMates',
      subtitle: '“This is not just an app, this is a real story.”',
      content: (
        <div className="space-y-8">
          <div className="flex flex-col items-center">
            <div className="relative group">
              <div className="w-40 h-40 rounded-full border-4 border-blue-500/30 shadow-2xl overflow-hidden bg-neutral-800 flex items-center justify-center">
                {storyPic ? (
                  <img src={storyPic} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="Creator" />
                ) : (
                  <Camera className="w-10 h-10 text-neutral-600" />
                )}
                {uploading && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              {isCreator && (
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-2 right-2 p-3 bg-blue-600 text-white rounded-full shadow-xl hover:bg-blue-700 transition-all hover:scale-110 active:scale-95 z-10"
                >
                  <Camera className="w-5 h-5" />
                </button>
              )}
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleFileChange} 
              />
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/20 shadow-xl">
            <h3 className="text-xl font-black text-white mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-400" /> About the Creator
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="bg-black/20 p-4 rounded-2xl">
                <p className="text-neutral-400 font-bold uppercase tracking-widest text-[10px]">Name</p>
                <p className="text-white font-black">Faizan Zeeshan</p>
              </div>
              <div className="bg-black/20 p-4 rounded-2xl">
                <p className="text-neutral-400 font-bold uppercase tracking-widest text-[10px]">Brother Name</p>
                <p className="text-white font-black">Burhan</p>
              </div>
              <div className="bg-black/20 p-4 rounded-2xl">
                <p className="text-neutral-400 font-bold uppercase tracking-widest text-[10px]">Age</p>
                <p className="text-white font-black">17</p>
              </div>
              <div className="bg-black/20 p-4 rounded-2xl">
                <p className="text-neutral-400 font-bold uppercase tracking-widest text-[10px]">Location</p>
                <p className="text-white font-black">Janipura, Pakistan</p>
              </div>
            </div>
            <p className="mt-6 text-neutral-200 font-medium italic leading-relaxed border-l-4 border-blue-500 pl-4">
              "A young builder with a vision to connect the real world through technology — focused on safety, communication, and meaningful connections."
            </p>
          </div>
        </div>
      )
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="story-overlay-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-8 bg-neutral-950 overflow-hidden"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-4xl h-full max-h-[90vh] bg-neutral-900 border border-white/10 rounded-[2.5rem] shadow-2xl border-white/5 flex flex-col overflow-hidden"
          >
            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, 90, 0],
                  x: [0, 100, 0],
                  y: [0, 50, 0],
                }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-blue-600/30 to-purple-600/30 blur-[120px] rounded-full"
              />
              <motion.div
                animate={{
                  scale: [1.2, 1, 1.2],
                  rotate: [90, 0, 90],
                  x: [100, 0, 100],
                  y: [50, 0, 50],
                }}
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tr from-cyan-600/30 to-blue-600/30 blur-[120px] rounded-full"
              />
            </div>

            {/* Content Container */}
            <div className="relative z-10 flex-1 overflow-y-auto custom-scrollbar scroll-smooth">
              {/* Header inside scrollable */}
              <div className="flex items-center justify-between p-6 sm:p-8 border-b border-white/5 bg-neutral-900/50 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <Info className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-white tracking-tight">Our Story</h2>
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">The Vision Behind MapMates</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-3 bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white rounded-2xl transition-all border border-white/5"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 sm:p-12 space-y-24">
                {sections.map((section, index) => (
                <motion.section
                  key={section.id}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.8, delay: index * 0.1 }}
                  className="relative"
                >
                  <div className="max-w-2xl mx-auto">
                    <div className="flex items-center gap-4 mb-6">
                      {section.icon && (
                        <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
                          {section.icon}
                        </div>
                      )}
                      <div>
                        <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tighter">
                          {section.title}
                        </h3>
                        {section.subtitle && (
                          <p className="text-blue-400 font-bold italic mt-1">{section.subtitle}</p>
                        )}
                      </div>
                    </div>
                    <div className="prose prose-invert max-w-none">
                      {section.content}
                    </div>
                  </div>
                  
                  {/* Decorative line between sections */}
                  {index < sections.length - 1 && (
                    <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-px h-12 bg-gradient-to-b from-white/10 to-transparent" />
                  )}
                </motion.section>
              ))}
              
              {/* Footer Space */}
              <div className="h-12" />
            </div>

          </div>

          {/* Progress Bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5">
              <motion.div
                className="h-full bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.5)]"
                initial={{ width: "0%" }}
                whileInView={{ width: "100%" }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
