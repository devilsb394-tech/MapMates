/* 
 * MomentCamera Component
 * Modified to support only gallery upload as per new UX direction.
 */
import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image as ImageIcon, X, Check, RotateCcw, Upload, Sparkles } from 'lucide-react';

interface MomentCameraProps {
  onCapture: (data: string) => void;
  onClose: () => void;
}

export default function MomentCamera({ onCapture, onClose }: MomentCameraProps) {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="relative h-full w-full flex flex-col bg-[#020617]">
      <AnimatePresence mode="wait">
        {!previewImage ? (
          <motion.div 
            key="upload-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-full w-full flex flex-col items-center justify-center p-8 relative"
          >
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(circle_at_2px_2px,rgba(255,255,255,0.1)_1px,transparent_0)] bg-[size:32px_32px]" />
            
            <button 
              onClick={onClose}
              className="absolute top-8 left-8 p-3 bg-white/5 border border-white/10 rounded-2xl text-white/50 hover:text-white transition-all z-20"
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
              </div>

              <div>
                <h3 className="text-3xl font-black text-white tracking-tighter uppercase italic leading-none mb-3">Upload Moment</h3>
                <p className="text-blue-400/40 font-black text-[10px] uppercase tracking-[0.3em] max-w-[240px] mx-auto leading-relaxed">Select a tactical relay from your local registry to deploy to the matrix.</p>
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
                  <span className="relative z-10">Access Gallery</span>
                </motion.button>
                <p className="text-[9px] font-black text-white/10 uppercase tracking-[0.25em] mt-6">Secure Encrypted Transmission</p>
              </div>

              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleFileUpload}
              />
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="preview-view"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="h-full w-full flex flex-col items-center justify-center relative p-4"
          >
            <div className="w-full h-full rounded-[2.5rem] overflow-hidden shadow-2xl relative">
              <img src={previewImage} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
            </div>

            {/* Actions Bar */}
            <div className="absolute bottom-12 left-0 right-0 flex justify-center gap-10">
              <button 
                onClick={() => setPreviewImage(null)}
                className="w-16 h-16 bg-white/10 backdrop-blur-2xl rounded-full flex items-center justify-center text-white border border-white/20 shadow-xl hover:bg-white/20 transition-all hover:scale-110 active:scale-95"
              >
                <RotateCcw className="w-8 h-8" />
              </button>
              
              <button 
                onClick={() => onCapture(previewImage)}
                className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-blue-600 shadow-2xl hover:scale-110 active:scale-90 transition-all group"
              >
                <Check className="w-10 h-10 group-hover:scale-125 transition-transform" />
              </button>
            </div>

            <div className="absolute top-10 left-0 right-0 text-center">
              <span className="bg-black/40 backdrop-blur-xl px-6 py-2 rounded-full text-white text-[10px] font-black uppercase tracking-[0.3em] border border-white/10 shadow-xl">
                Review Moment
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
