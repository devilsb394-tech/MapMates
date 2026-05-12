import React, { useState, useRef } from 'react';
import { X, Camera, Image as ImageIcon, Zap, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

interface CameraUIProps {
  onCapture: (image: string) => void;
  onClose: () => void;
}

export default function CameraUI({ onCapture, onClose }: CameraUIProps) {
  const [flash, setFlash] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onCapture(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-[6000] bg-black flex flex-col">
      {/* Header */}
      <div className="p-6 flex items-center justify-between text-white z-10">
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
          <X className="w-8 h-8" />
        </button>
        <div className="flex gap-6">
          <button onClick={() => setFlash(!flash)} className={cn("p-2 rounded-full transition", flash ? "text-yellow-400" : "text-white")}>
            <Zap className="w-6 h-6" />
          </button>
          <button className="p-2 text-white">
            <RefreshCw className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Viewfinder (Mock) */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-neutral-900 flex items-center justify-center">
          <Camera className="w-20 h-20 text-neutral-800 animate-pulse" />
          <p className="absolute bottom-20 text-neutral-500 font-bold uppercase tracking-widest text-xs">Camera Viewfinder</p>
        </div>
        
        {/* Grid lines */}
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
          <div className="border-r border-b border-white/10"></div>
          <div className="border-r border-b border-white/10"></div>
          <div className="border-b border-white/10"></div>
          <div className="border-r border-b border-white/10"></div>
          <div className="border-r border-b border-white/10"></div>
          <div className="border-b border-white/10"></div>
          <div className="border-r border-white/10"></div>
          <div className="border-r border-white/10"></div>
          <div></div>
        </div>
      </div>

      {/* Controls */}
      <div className="p-12 flex items-center justify-center text-white z-10">
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="w-20 h-20 bg-blue-600/20 rounded-3xl flex flex-col items-center justify-center hover:bg-blue-600/30 transition border border-blue-500/30 shadow-[0_0_20px_rgba(37,99,235,0.2)] group"
        >
          <ImageIcon className="w-8 h-8 text-blue-400 group-hover:scale-110 transition-transform" />
          <span className="text-[10px] font-black uppercase tracking-widest mt-2 text-blue-400/70">Gallery</span>
        </button>

        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept="image/*" 
          className="hidden" 
        />
      </div>
    </div>
  );
}
