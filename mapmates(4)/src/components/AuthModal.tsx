import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, Chrome, Apple, Facebook } from 'lucide-react';
import { auth, googleProvider, appleProvider, facebookProvider } from '../firebase/firebase';
import { signInWithPopup } from 'firebase/auth';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  isFullPage?: boolean;
}

export default function AuthModal({ isOpen, onClose, isFullPage = false }: AuthModalProps) {
  const [loading, setLoading] = useState(false);

  const handleSocialLogin = async (provider: any) => {
    setLoading(true);
    try {
      await signInWithPopup(auth, provider);
      toast.success('Logged in successfully!');
      onClose();
    } catch (err: any) {
      if (err.code === 'auth/unauthorized-domain') {
        toast.error('This domain is not authorized in Firebase. Please add it to your Firebase Console > Authentication > Settings > Authorized domains.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        // Silent
      } else {
        toast.error(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <div className={cn(
      "flex flex-col md:flex-row w-full bg-white dark:bg-neutral-900 overflow-hidden",
      isFullPage ? "min-h-screen" : "max-w-lg rounded-[2rem] md:rounded-[2.5rem] shadow-2xl relative"
    )}>
      {/* Left side info panel */}
      <div className={cn(
        "hidden md:flex md:w-1/3 bg-blue-600 p-8 flex-col justify-between text-white",
        isFullPage ? "md:w-1/4" : ""
      )}>
        <div>
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center mb-4">
            <span className="text-blue-600 font-black text-xs">MM</span>
          </div>
          <h2 className="text-2xl font-black tracking-tighter leading-tight">Connect with the World.</h2>
        </div>
        <p className="text-xs text-blue-100 font-medium leading-relaxed">Join thousands of users discovering new connections every day on MAPMATES.</p>
      </div>

      {/* Right side form panel */}
      <div className={cn(
        "flex-1 p-6 md:p-12 relative overflow-y-auto flex items-center justify-center",
        isFullPage ? "min-h-screen pt-20" : ""
      )}>
        {!isFullPage && (
          <button onClick={onClose} className="absolute top-4 right-4 md:top-6 md:right-6 p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition z-10 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm">
            <X className="w-5 h-5 text-neutral-400" />
          </button>
        )}

        <div className="max-w-xs w-full py-8 text-center">
          <div className="mx-auto w-16 h-16 bg-blue-600 rounded-[1.5rem] flex items-center justify-center mb-8 shadow-2xl shadow-blue-200">
            <span className="text-white font-black text-xl">MM</span>
          </div>

          <h3 className="text-3xl font-black tracking-tighter text-neutral-900 dark:text-white mb-2">
            Join MAPMATES
          </h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-12 font-medium">
            Discover real-time connections near you.
          </p>

          <div className="space-y-4">
            <button 
              onClick={() => handleSocialLogin(googleProvider)}
              disabled={loading}
              className="w-full py-5 bg-white dark:bg-neutral-800 border-2 border-neutral-100 dark:border-neutral-800 rounded-[2rem] font-black tracking-tight hover:bg-neutral-50 dark:hover:bg-neutral-700 transition shadow-sm flex items-center justify-center gap-4 text-base dark:text-white disabled:opacity-50"
            >
              <Chrome className="w-6 h-6 text-blue-600" /> Continue with Google
            </button>

            <button 
              onClick={() => handleSocialLogin(appleProvider)}
              disabled={loading}
              className="w-full py-5 bg-neutral-900 text-white rounded-[2rem] font-black tracking-tight hover:bg-neutral-800 transition shadow-xl shadow-neutral-200 flex items-center justify-center gap-4 text-base disabled:opacity-50"
            >
              <Apple className="w-6 h-6" /> Continue with Apple
            </button>

            <button 
              onClick={() => handleSocialLogin(facebookProvider)}
              disabled={loading}
              className="w-full py-5 bg-[#1877F2] text-white rounded-[2rem] font-black tracking-tight hover:bg-[#166fe5] transition shadow-xl shadow-blue-100 flex items-center justify-center gap-4 text-base disabled:opacity-50"
            >
              <Facebook className="w-6 h-6" /> Continue with Facebook
            </button>
          </div>

          <p className="mt-12 text-[10px] text-neutral-400 font-bold uppercase tracking-widest leading-relaxed">
            By continuing, you agree to our <br/>
            <span className="text-neutral-900 dark:text-white">Terms of Service</span> and <span className="text-neutral-900 dark:text-white">Privacy Policy</span>.
          </p>
        </div>
      </div>
    </div>
  );

  if (isFullPage) {
    return content;
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div key="auth-modal-container" className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-lg"
          >
            {content}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
