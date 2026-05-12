import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, CreditCard, ShieldCheck, Crown, Zap, Map as MapIcon, Image as ImageIcon, Users, MessageSquare, AlertTriangle, Send, Upload, Clock, Phone } from 'lucide-react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { UserProfile } from '../types';
import { toast } from 'sonner';

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
}

export default function PremiumModal({ isOpen, onClose, user }: PremiumModalProps) {
  const [step, setStep] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<'JazzCash' | 'Easypaisa' | null>(null);
  const [transactionId, setTransactionId] = useState('');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setPaymentMethod(null);
      setTransactionId('');
      setScreenshot(null);
    }
  }, [isOpen]);

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024) { // 500KB limit for base64 storage
        toast.error("Screenshot too large. Max 500KB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshot(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitPayment = async () => {
    if (!auth.currentUser || !user) return;
    if (!transactionId.trim()) {
      toast.error("Enter Transaction ID");
      return;
    }
    if (!screenshot) {
      toast.error("Upload Screenshot");
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'premiumPayments'), {
        uid: auth.currentUser.uid,
        username: user.username,
        amount: 100,
        currency: 'PKR',
        screenshotUrl: screenshot,
        transactionId,
        paymentMethod,
        status: 'pending',
        timestamp: serverTimestamp()
      });
      toast.success("Payment submitted! Admin will verify soon.");
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'premiumPayments');
      toast.error("Failed to submit payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
        {/* Backdrop with extreme blur as requested */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-[20px]"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-4xl max-h-[90vh] bg-[#020617] rounded-[3.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col border border-white/5"
        >
          {/* Background Glows */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 blur-[150px] rounded-full pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-600/10 blur-[150px] rounded-full pointer-events-none" />

          {/* Close button */}
          <button 
            onClick={onClose}
            className="absolute top-8 right-8 w-12 h-12 bg-white/5 backdrop-blur-xl border border-white/5 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all z-20 active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10">
            {step === 1 ? (
              <div className="p-10 md:p-14">
                <div className="text-center mb-14">
                  <div className="inline-flex items-center gap-3 bg-blue-500/10 border border-blue-500/20 px-5 py-2.5 rounded-full mb-6">
                    <Crown className="w-4 h-4 text-blue-400 animate-pulse" />
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em] italic">Neural Elite Protocol</span>
                  </div>
                  <h2 className="text-4xl md:text-6xl font-black tracking-[-0.05em] text-white mb-6 uppercase italic">
                    Ascend to <span className="text-blue-500 text-glow-blue">Premium</span>
                  </h2>
                  <p className="text-white/40 font-bold max-w-xl mx-auto uppercase tracking-wide leading-relaxed text-xs">
                    Engage advanced connectivity, bypass standard limitations, and architect the future of MapMates for <span className="text-white">100 PKR/Cycle</span>.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 mb-14">
                  {/* Free Plan */}
                  <div className="bg-white/[0.02] backdrop-blur-2xl rounded-[3rem] p-10 border border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center justify-between mb-10">
                      <div>
                        <h3 className="text-2xl font-black text-white italic uppercase">Basic Node</h3>
                        <p className="text-[9px] font-black text-white/30 tracking-[0.3em] mt-1 uppercase">Limited Access</p>
                      </div>
                      <div className="text-3xl font-black text-white italic">0 <span className="text-xs uppercase tracking-widest text-white/40">PKR</span></div>
                    </div>

                    <div className="space-y-5">
                      <FeatureItem icon={MapIcon} text="10 Signals per cycle" isFree isCross />
                      <FeatureItem icon={ImageIcon} text="3 Moments per cycle" isFree isCross />
                      <FeatureItem icon={Users} text="Limited Mate Tracking" isFree isCross />
                      <FeatureItem icon={AlertTriangle} text="Standard Help Access" isFree isCross />
                      <FeatureItem icon={Users} text="10 Node Connections" isFree />
                      <FeatureItem icon={Zap} text="Basic Raster Filters" isFree />
                      <FeatureItem icon={MessageSquare} text="Neural AI Disabled" isFree isCross />
                    </div>
                  </div>

                  {/* Premium Plan */}
                  <div className="bg-blue-600 rounded-[3rem] p-10 border border-blue-400/50 shadow-[0_20px_60px_rgba(37,99,235,0.3)] relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
                    <div className="absolute top-[-20%] right-[-20%] w-48 h-48 bg-white/20 rounded-full blur-[60px] group-hover:scale-150 transition-transform duration-1000" />
                    
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-10">
                        <div>
                          <h3 className="text-2xl font-black text-white italic uppercase">Elite Core</h3>
                          <p className="text-[9px] font-black text-blue-100/60 tracking-[0.3em] mt-1 uppercase">Infinity Protocol</p>
                        </div>
                        <div className="text-3xl font-black text-white italic">100 <span className="text-xs uppercase tracking-widest text-blue-100/60">PKR/mo</span></div>
                      </div>

                      <div className="space-y-5">
                        <FeatureItem icon={Crown} text="Infinite Signals & Moments" isPremium />
                        <FeatureItem icon={ShieldCheck} text="Omniscient Mate Tracking" isPremium />
                        <FeatureItem icon={Zap} text="Aetheric AI Routing Engine" isPremium />
                        <FeatureItem icon={AlertTriangle} text="Priority SOS Signals" isPremium />
                        <FeatureItem icon={Crown} text="Elite Node Identification" isPremium />
                        <FeatureItem icon={Zap} text="Quantum Spectral Overlays" isPremium />
                        <FeatureItem icon={MessageSquare} text="Full Neural Integration" isPremium />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                  <button 
                    onClick={() => setStep(2)}
                    className="w-full sm:w-72 py-6 bg-white text-black rounded-[2rem] font-black text-sm uppercase tracking-[0.2rem] shadow-[0_20px_50px_rgba(255,255,255,0.2)] hover:scale-105 transition-all active:scale-95 italic overflow-hidden relative group"
                  >
                    <div className="absolute inset-0 bg-blue-500 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                    <span className="relative z-10 group-hover:text-white transition-colors">Initiate Elite Protocol</span>
                  </button>
                  <button 
                    onClick={onClose}
                    className="w-full sm:w-72 py-6 bg-white/5 text-white/40 rounded-[2rem] font-black text-sm uppercase tracking-[0.2rem] hover:bg-white/10 hover:text-white transition-all italic border border-white/5 hover:border-white/10"
                  >
                    Remain Synchronized
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-10 md:p-14">
                <button 
                  onClick={() => setStep(1)}
                  className="mb-10 flex items-center gap-3 text-[10px] font-black text-white/30 hover:text-white transition-all uppercase tracking-[0.3em] italic group border border-white/5 px-4 py-2 rounded-xl bg-white/5"
                >
                  <Send className="w-3.5 h-3.5 rotate-180 group-hover:-translate-x-1 transition-transform" /> Revert Configuration
                </button>

                <div className="max-w-2xl mx-auto">
                  <div className="mb-12">
                    <h2 className="text-4xl font-black tracking-[-0.05em] text-white mb-4 uppercase italic">Neural <span className="text-blue-500">Credit</span> Transfer</h2>
                    <p className="text-white/40 font-bold uppercase tracking-widest text-[10px] leading-loose">Transmit <span className="text-white">100 Neural Credits</span> to the terminal below via encrypted JazzCash or Easypaisa gateway.</p>
                  </div>

                  <div className="bg-black/40 backdrop-blur-3xl rounded-[3rem] p-10 mb-10 text-center border-2 border-blue-500/30 shadow-[0_30px_60px_rgba(37,99,235,0.15)] relative overflow-hidden group">
                    <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/10 rounded-full -mr-24 -mt-24 blur-[80px]" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-center gap-4 mb-6">
                        <div className="px-3 py-1.5 bg-red-600 rounded-lg flex items-center justify-center border border-white/20">
                          <span className="text-[10px] font-black text-white tracking-[0.2em]">JAZZCASH</span>
                        </div>
                        <div className="px-3 py-1.5 bg-emerald-600 rounded-lg flex items-center justify-center border border-white/20">
                          <span className="text-[10px] font-black text-white tracking-[0.2em]">EASYPAISA</span>
                        </div>
                      </div>
                      <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] mb-4 italic">Neural Target Address</p>
                      <div className="flex items-center justify-center gap-6">
                        <span className="text-4xl md:text-6xl font-black text-white tracking-[-0.05em] italic">03214242194</span>
                        <motion.button 
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => {
                            navigator.clipboard.writeText('03214242194');
                            toast.success("Signal Address Copied");
                          }}
                          className="w-14 h-14 bg-white/5 hover:bg-white/10 rounded-[1.2rem] text-blue-400 transition-all border border-white/5 flex items-center justify-center shadow-2xl"
                        >
                          <CreditCard className="w-6 h-6" />
                        </motion.button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 mb-10">
                    <div className="flex items-center gap-5 p-6 bg-blue-500/5 backdrop-blur-xl rounded-[2rem] border border-blue-500/20">
                      <div className="w-12 h-12 bg-blue-500/10 rounded-[1rem] flex items-center justify-center shrink-0 border border-blue-500/20">
                        <ShieldCheck className="w-5 h-5 text-blue-400" />
                      </div>
                      <p className="text-[10px] font-black text-blue-200/60 uppercase tracking-widest leading-relaxed">System Authentication Required: Upon transmission completion, capture visual proof and link Transaction Terminal ID.</p>
                    </div>
                  </div>

                  <div className="flex gap-6 mb-10">
                    <PaymentMethod 
                      name="JazzCash Gateway" 
                      isActive={paymentMethod === 'JazzCash'} 
                      onClick={() => setPaymentMethod('JazzCash')}
                    />
                    <PaymentMethod 
                      name="Easypaisa Gateway" 
                      isActive={paymentMethod === 'Easypaisa'} 
                      onClick={() => setPaymentMethod('Easypaisa')}
                    />
                  </div>

                  <AnimatePresence>
                    {paymentMethod && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="space-y-8 overflow-hidden"
                      >
                        <div className="space-y-4">
                          <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.3em] px-2 italic">Capture Transmission Proof</label>
                          <div className="relative">
                            <input 
                              type="file" 
                              onChange={handleScreenshotChange} 
                              accept="image/*"
                              className="hidden" 
                              id="screenshot-upload"
                            />
                            <label 
                              htmlFor="screenshot-upload"
                              className="w-full h-52 bg-white/5 border-2 border-dashed border-white/10 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-blue-500/50 hover:bg-white/[0.08] transition-all overflow-hidden group shadow-inner"
                            >
                              {screenshot ? (
                                <div className="relative w-full h-full">
                                  <img src={screenshot} alt="Proof" className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-blue-500/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Rescan Proof</span>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center border border-white/5 group-hover:scale-110 transition-transform">
                                    <Upload className="w-6 h-6 text-white/30 group-hover:text-blue-400 transition-colors" />
                                  </div>
                                  <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] italic">Link Optical proof</p>
                                </>
                              )}
                            </label>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.3em] px-2 italic">Transmission Terminal ID</label>
                          <div className="relative">
                            <input 
                              type="text" 
                              value={transactionId}
                              onChange={(e) => setTransactionId(e.target.value)}
                              placeholder="XXXX-XXXX-XXXX"
                              className="w-full px-8 py-5 bg-white/5 border border-white/10 rounded-[2rem] font-black text-sm text-white tracking-[0.1em] placeholder:text-white/10 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all uppercase"
                            />
                          </div>
                        </div>

                        <button 
                          onClick={handleSubmitPayment}
                          disabled={isSubmitting}
                          className="w-full py-6 bg-blue-600 text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.3em] shadow-[0_20px_50px_rgba(37,99,235,0.4)] hover:bg-blue-500 hover:shadow-[0_25px_60px_rgba(37,99,235,0.5)] transition-all active:scale-95 disabled:opacity-50 disabled:hover:scale-100 italic"
                        >
                          {isSubmitting ? (
                            <div className="flex items-center justify-center gap-3">
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              <span className="text-[10px]">Validating Signal...</span>
                            </div>
                          ) : 'Authorize Neural Upgrade'}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>

          <div className="p-6 bg-white/[0.02] backdrop-blur-3xl border-t border-white/5 flex items-center justify-center gap-10">
            <div className="flex items-center gap-3 opacity-40 hover:opacity-100 transition-opacity">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span className="text-[9px] font-black text-white uppercase tracking-[0.2em] italic">Encrypted Secure Node</span>
            </div>
            <div className="flex items-center gap-3 opacity-40 hover:opacity-100 transition-opacity">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span className="text-[9px] font-black text-white uppercase tracking-[0.2em] italic">30 Neural Cycles Access</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function FeatureItem({ icon: Icon, text, isPremium, isFree, isCross }: { icon: any, text: string, isPremium?: boolean, isFree?: boolean, isCross?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
        isPremium ? 'bg-white/20' : 
        isCross ? 'bg-red-500/10' : 'bg-green-500/10'
      }`}>
        {isCross ? (
          <X className={`w-3.5 h-3.5 ${isPremium ? 'text-white' : 'text-red-500'}`} />
        ) : (
          <Check className={`w-3.5 h-3.5 ${isPremium ? 'text-white' : 'text-green-500'}`} />
        )}
      </div>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
        isPremium ? 'bg-white/10' : 'bg-neutral-100 dark:bg-neutral-700'
      }`}>
        <Icon className={`w-4 h-4 ${isPremium ? 'text-white' : 'text-neutral-500 dark:text-neutral-400'}`} />
      </div>
      <span className={`text-sm font-bold ${isPremium ? 'text-white' : 'text-neutral-600 dark:text-neutral-300'}`}>
        {text}
      </span>
    </div>
  );
}

function PaymentMethod({ name, isActive, onClick }: { name: string, isActive: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`flex-1 p-6 rounded-3xl border-2 transition-all text-left relative overflow-hidden group ${
        isActive 
          ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/10' 
          : 'border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-neutral-300 dark:hover:border-neutral-700'
      }`}
    >
      {isActive && (
        <div className="absolute top-4 right-4">
          <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
            <Check className="w-4 h-4 text-white" />
          </div>
        </div>
      )}
      <div className="flex flex-col items-center gap-3 text-center">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform ${
          name === 'JazzCash' ? 'bg-red-600' : 'bg-green-600'
        }`}>
          <Phone className="w-6 h-6 text-white" />
        </div>
        <h4 className="text-sm font-black text-neutral-900 dark:text-white uppercase tracking-tighter">{name}</h4>
      </div>
    </button>
  );
}
