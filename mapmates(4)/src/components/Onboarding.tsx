import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Play, Pause, Globe, Shield, MapPin, Users, Heart, AlertTriangle, Store, Zap, Radio } from 'lucide-react';
import { cn } from '../lib/utils';

interface OnboardingProps {
  onComplete: () => void;
}

const steps = [
  {
    id: 1,
    title: "Connection Bridge: Why Faizan Built MapMates",
    description: "Inspired by a lost connection from 6th grade, Faizan built MapMates to bridge the gap between physical neighbors and digital isolation. Connect with everyone around you safely, without needing their private phone numbers initially.",
    icon: <Users className="w-12 h-12 text-blue-500" />,
    image: "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?q=80&w=800&auto=format",
    accent: "bg-blue-600",
    voiceMessages: [
      { 
        lang: 'English', 
        text: "This feature was created by Faizan with a very special vision. Years ago, he wanted to reach out to a dear classmate from his 6th grade, someone he had lost touch with. But because he didn't have her phone number or any ID, it was impossible to find her. This gap inspired the creation of MAPMATES. You see, we live in neighborhoods for years but often don't know the people right next to us. Faizan built this so that you can see and talk to your neighbors and childhood friends directly on the map. It bridges the gap between being just physically near and actually being social, allowing you to connect safely with the people you see every day without needing private details first. No more lost friendships, only a stronger community." 
      }
    ]
  },
  {
    id: 2,
    title: "Mission Security: Sisters & Daughters",
    description: "Faizan built the Parent-Child feature specifically for the safety of our sisters and daughters. Track live movements, set safe zones, and ensure every girl reaches home without fear.",
    icon: <Shield className="w-12 h-12 text-green-500" />,
    image: "https://images.unsplash.com/photo-1542037104857-ffbb0b9155fb?q=80&w=800&auto=format",
    accent: "bg-green-600",
    voiceMessages: [
      { 
        lang: 'English', 
        text: "The Parent-Child feature is the most important mission for Faizan. He realized that every girl—our sisters, our daughters—deserves to travel and move around safely without their families constantly worrying. He built this specifically so that you can add your family members in the settings. Once they are added, you can watch their live journey on the map in real-time. If they take a wrong turn or find themselves in an unsafe situation, you will know exactly where they are. This is Faizan's contribution to a safer society where women can move freely and securely. It’s not just tracking; it’s a promise of safety for every family." 
      }
    ]
  },
  {
    id: 3,
    title: "Instant SOS: Neighbor Responders",
    description: "Ran out of petrol? Had an accident? Tradition apps like TikTok can't help you there. Faizan added SOS because in a crisis, your neighborhood is your first rescue team.",
    icon: <AlertTriangle className="w-12 h-12 text-red-500" />,
    image: "https://images.unsplash.com/photo-1516738901171-8eb4fc13bd20?q=80&w=800&auto=format",
    accent: "bg-red-600",
    voiceMessages: [
      { 
        lang: 'English', 
        text: "Imagine being stuck on a lonely road with a puncture or no fuel at night. Faizan realized that standard social media like TikTok or YouTube isn't built for these moments. That's why he created the SOS community help. With just one tap on the help button, every MapMates user within your area receives a priority notification with your exact location. It turns your local neighborhood into an instant rescue team. Faizan's goal is to ensure that no MapMates user ever feels alone when they are in trouble. Your neighbors are your brothers and your first responders." 
      }
    ]
  },
  {
    id: 4,
    title: "Empowering Local Market",
    description: "Register your shop to reach neighbors directly. Check rates, find shared vibes, and shop from your local community to empower small businesses.",
    icon: <Store className="w-12 h-12 text-purple-500" />,
    image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=800&auto=format",
    accent: "bg-purple-600",
    voiceMessages: [
      { 
        lang: 'English', 
        text: "Faizan strongly believes in supporting the local economy. Often, we don't know what is available in the shops right around us, or we waste time checking different markets. This is why he built the Business and Vibe filters. Local shop owners can register their businesses on the map, allowing neighbors to see their products and prices from home. You can even order home delivery or find people with the same interests as you. Faizan's vision is to bring the convenience of global apps to your local street, helping both the buyer save time and the small businessman grow." 
      }
    ]
  },
  {
    id: 5,
    title: "How to use MAPMATES",
    description: "Switch to 3D/Satellite via the Layer icon. Filter vibes from the top-left. Always keep your family added in settings for security. Master map themes like Night or Gold.",
    icon: <Zap className="w-12 h-12 text-yellow-500" />,
    image: "https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?q=80&w=800&auto=format",
    accent: "bg-yellow-600",
    voiceMessages: [
      { 
        lang: 'English', 
        text: "Let’s learn how to make the most of MapMates. On the top right corner, you will see a Layer icon. Tap it to change the map style to Satellite, HD, or even beautiful 3D themes like Midnight and Gold. On the top left, use the Vibe filters to see how people around you are feeling—maybe they are happy or looking for a chat. Most importantly, go to your profile, tap settings, and use the Parent-Child feature to add your family members for their protection. Faizan has kept everything simple so that every mother, father, and child can use it comfortably. Welcome to a smarter world." 
      }
    ]
  }
];

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [voicesLoaded, setVoicesLoaded] = useState(false);

  // Warm up voices more aggressively
  useEffect(() => {
    const loadVoices = () => {
      const v = window.speechSynthesis.getVoices();
      if (v.length > 0) {
        setVoicesLoaded(true);
      }
    };
    
    loadVoices();
    if (typeof window.speechSynthesis.onvoiceschanged !== 'undefined') {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    
    // Safety kickstart for some browsers
    const dummy = new SpeechSynthesisUtterance("ready");
    dummy.volume = 0;
    dummy.rate = 10;
    window.speechSynthesis.speak(dummy);

    // Polling fallback
    const interval = setInterval(() => {
      const currentVoices = window.speechSynthesis.getVoices();
      if (currentVoices.length > 0) {
        setVoicesLoaded(true);
        clearInterval(interval);
      }
    }, 1000);

    return () => {
      if (typeof window.speechSynthesis.onvoiceschanged !== 'undefined') {
        window.speechSynthesis.onvoiceschanged = null;
      }
      window.speechSynthesis.cancel();
      clearInterval(interval);
    };
  }, []);

  const stopVoice = () => {
    window.speechSynthesis.cancel();
    setIsPlaying(null);
  };

  const next = () => {
    stopVoice();
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const prev = () => {
    stopVoice();
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const playVoice = (lang: string, text: string) => {
    if (isPlaying === lang) {
      stopVoice();
    } else {
      window.speechSynthesis.cancel();
      setIsPlaying(null);

      setTimeout(() => {
        const voices = window.speechSynthesis.getVoices();
        
        // Safety check: keep it alive
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }

        const utterance = new SpeechSynthesisUtterance();
        utteranceRef.current = utterance;
        utterance.text = text;

        const langMap: Record<string, string[]> = {
          'English': ['en-US', 'en-GB', 'en', 'Google US English']
        };

        const targets = langMap[lang] || ['en-US'];
        let selectedVoice: SpeechSynthesisVoice | null = null;

        // Search in voice list
        for (const target of targets) {
          selectedVoice = voices.find(v => 
            v.lang.toLowerCase().includes(target.toLowerCase()) || 
            v.name.toLowerCase().includes(target.toLowerCase())
          ) || null;
          if (selectedVoice) break;
        }

        if (selectedVoice) {
          utterance.voice = selectedVoice;
          utterance.lang = selectedVoice.lang;
        } else {
          utterance.lang = 'en-US';
        }

        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        utterance.onstart = () => setIsPlaying(lang);
        utterance.onend = () => {
          if (utteranceRef.current === utterance) setIsPlaying(null);
        };
        utterance.onerror = (e) => {
          console.warn('TTS Engine Report:', e);
          if (utteranceRef.current === utterance) setIsPlaying(null);
        };
        
        window.speechSynthesis.speak(utterance);
      }, 100);
    }
  };

  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 z-[2000] bg-white dark:bg-neutral-950 flex flex-col overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-blue-50 to-transparent dark:from-blue-900/10 pointer-events-none" />
      
      {/* indicator */}
      <div className="absolute top-8 left-0 w-full flex justify-center gap-2 px-8 z-20">
        {steps.map((_, i) => (
          <div 
            key={i} 
            className={cn(
              "h-1.5 rounded-full transition-all duration-500",
              i === currentStep ? "w-8 bg-blue-600" : i < currentStep ? "w-4 bg-blue-200" : "w-1.5 bg-neutral-200 dark:bg-neutral-800"
            )}
          />
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div 
            key={currentStep}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="min-h-full flex flex-col items-center p-6 md:p-12 pt-20 pb-32"
          >
            {/* Main Visual */}
            <div className="relative w-full max-w-lg aspect-[4/3] rounded-[3rem] overflow-hidden shadow-2xl mb-12 group shrink-0">
              <img 
                src={step.image} 
                alt={step.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
              />
              <div className="absolute inset-0 bg-black/20" />
              <div className="absolute top-6 left-6 p-4 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md rounded-3xl shadow-xl border border-white/20">
                {step.icon}
              </div>
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="absolute bottom-6 left-6 right-6 p-6 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md rounded-[2rem] shadow-xl border border-white/50 dark:border-white/10"
              >
                <p className="text-[10px] uppercase tracking-[0.2em] font-black text-blue-600 mb-1">Story Focus</p>
                <h3 className="text-xl font-black tracking-tight text-neutral-900 dark:text-white uppercase leading-tight">{step.title}</h3>
              </motion.div>
            </div>

            {/* Content */}
            <div className="max-w-xl w-full space-y-10">
              <div className="space-y-6">
                <div className="space-y-2">
                  <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-neutral-900 dark:text-white leading-none uppercase italic decoration-blue-600 decoration-8 underline-offset-4">
                    {step.title}
                  </h2>
                </div>
                <div className="space-y-4">
                  <p className="text-base md:text-lg font-bold text-neutral-600 dark:text-neutral-400 leading-relaxed border-l-4 border-blue-600 pl-6">
                    {step.description}
                  </p>
                </div>
              </div>

              {/* AI Voice Section */}
              <div className="bg-neutral-50 dark:bg-neutral-900 rounded-[3rem] p-8 md:p-10 space-y-8 border-2 border-neutral-100 dark:border-neutral-800 shadow-inner">
                 <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                   <div className="flex items-center gap-4">
                     <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg transform -rotate-3 transition hover:rotate-0">
                       <Radio className="w-7 h-7 text-white" />
                     </div>
                     <div>
                       <span className="block text-[10px] font-black uppercase tracking-widest text-neutral-400">Faizan's Narrative</span>
                       <span className="block text-lg font-black text-neutral-900 dark:text-white uppercase">Audio Guide</span>
                     </div>
                   </div>
                 </div>
                 
                 <div className="flex flex-col gap-3">
                   {step.voiceMessages.map((v) => (
                     <button
                       key={v.lang}
                       onClick={() => playVoice(v.lang, v.text)}
                       className={cn(
                         "group flex items-center justify-between p-5 rounded-3xl transition-all border-2 border-transparent",
                         isPlaying === v.lang 
                           ? "bg-blue-600 text-white shadow-xl scale-[1.02]" 
                           : "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white hover:border-blue-600/30"
                       )}
                     >
                       <div className="flex items-center gap-4">
                         <div className={cn(
                           "w-12 h-12 rounded-2xl flex items-center justify-center transition",
                           isPlaying === v.lang ? "bg-white/20" : "bg-neutral-100 dark:bg-neutral-700 group-hover:bg-blue-50"
                         )}>
                           {isPlaying === v.lang ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 text-blue-600" />}
                         </div>
                         <span className="text-base font-black uppercase tracking-widest">{v.lang} Story</span>
                       </div>
                       
                       {/* Animated Wave Indicator for Active Language */}
                       <div className="flex gap-1 h-6 items-center px-4">
                         {isPlaying === v.lang ? (
                           [1,2,3,4,5,6,7,8].map(i => (
                             <motion.div 
                               key={i} 
                               animate={{ height: ["20%", "100%", "40%", "90%", "20%"] }}
                               transition={{ duration: 0.4, repeat: Infinity, delay: i * 0.08 }}
                               className="w-1 rounded-full bg-white" 
                             />
                           ))
                         ) : (
                           <div className="flex gap-1">
                             {[1,2,3,4,5].map(i => (
                               <div key={i} className="w-1 h-1 rounded-full bg-neutral-200 dark:bg-neutral-700" />
                             ))}
                           </div>
                         )}
                       </div>
                     </button>
                   ))}
                 </div>
                 
                 <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl">
                    <p className="text-[11px] font-bold text-blue-600 dark:text-blue-400 text-center uppercase tracking-tight">
                      Hear the full details behind why Faizan spent months building this for your neighborhood.
                    </p>
                 </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer Controls */}
      <div className="absolute bottom-0 left-0 w-full p-6 md:p-10 bg-white/90 dark:bg-neutral-950/90 backdrop-blur-xl flex items-center justify-between border-t border-neutral-100 dark:border-neutral-900 z-30">
        <button 
          onClick={prev}
          disabled={currentStep === 0}
          className={cn(
            "p-5 rounded-3xl border-2 border-neutral-100 dark:border-neutral-800 transition-all disabled:opacity-0",
            "hover:bg-neutral-100 dark:hover:bg-neutral-800 active:scale-95"
          )}
        >
          <ChevronLeft className="w-7 h-7 text-neutral-500" />
        </button>

        <div className="flex items-center gap-6">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-[10px] font-black text-neutral-300 uppercase tracking-widest">Progress</span>
            <span className="text-sm font-black text-neutral-900 dark:text-white uppercase">{currentStep + 1} of {steps.length}</span>
          </div>
          <button 
            onClick={next}
            className={cn(
              "group p-6 px-12 rounded-[2.5rem] font-black uppercase tracking-[0.2em] text-sm flex items-center gap-4 transition-all shadow-2xl overflow-hidden relative",
              "bg-neutral-900 text-white hover:bg-blue-600 active:scale-95 shadow-blue-500/20"
            )}
          >
            <span className="relative z-10">{currentStep === steps.length - 1 ? 'Start MapMates' : 'Next Story'}</span>
            <ChevronRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>
      </div>
    </div>
  );
}
