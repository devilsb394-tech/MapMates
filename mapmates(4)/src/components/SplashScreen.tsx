import React from 'react';
import { motion } from 'framer-motion';

interface SplashScreenProps {
  isSigningUp?: boolean;
}

export default function SplashScreen({ isSigningUp }: SplashScreenProps = {}) {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#020617] overflow-hidden">
      {/* Background Animated Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
      
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center relative z-10"
      >
        <div className="relative group">
          <div className="absolute inset-0 bg-blue-500 rounded-[2.5rem] blur-2xl opacity-20 group-hover:opacity-40 transition-opacity" />
          <div className="w-28 h-28 bg-gradient-to-br from-blue-600 to-blue-400 rounded-[2.5rem] flex items-center justify-center shadow-[0_20px_50px_rgba(37,99,235,0.3)] mb-10 border border-white/20 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent" />
            <span className="text-white text-5xl font-black tracking-tighter italic drop-shadow-2xl">MM</span>
          </div>
        </div>

        <h1 className="text-4xl font-black tracking-[-0.05em] text-white mb-3 uppercase italic">
          MAP<span className="text-blue-400">MATES</span>
        </h1>
        
        <div className="flex gap-2 mb-10">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.3, 1, 0.3],
                backgroundColor: ["#3b82f6", "#60a5fa", "#3b82f6"]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.3,
              }}
              className="w-2 h-2 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"
            />
          ))}
        </div>

        <p className="text-[11px] font-black text-neutral-400 uppercase tracking-[0.4em] animate-pulse max-w-[250px] text-center leading-relaxed">
          {isSigningUp ? "Securing neural connection..." : "Initializing global network..."}
        </p>
      </motion.div>
      
      <div className="absolute bottom-16 flex flex-col items-center gap-2">
        <div className="h-[1px] w-12 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent mb-2" />
        <p className="text-neutral-500 font-bold tracking-[0.2em] text-[10px] uppercase">
          Independent created by <span className="text-neutral-400">Faizan Zeeshan</span>
        </p>
      </div>
    </div>
  );
}
