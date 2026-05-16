import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PenLine, X, Smile, Search, Sparkles, Send } from 'lucide-react';
import { db, auth } from '../firebase/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

interface StatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: any;
  initialText?: string;
}

const COMMON_EMOJIS = [
  '😊', '😄', '😁', '😅', '😂', '🤣', '☺️', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕'
];

export default function StatusModal({ isOpen, onClose, userProfile, initialText = '' }: StatusModalProps) {
  const [text, setText] = useState(() => {
    // If initialText starts with an emoji from our list, extract it
    if (initialText) {
      const match = initialText.match(/^([\uD800-\uDBFF][\uDC00-\uDFFF])\s(.*)$/);
      if (match) return match[2];
      return initialText;
    }
    return '';
  });
  const [selectedEmoji, setSelectedEmoji] = useState(() => {
    if (initialText) {
      const match = initialText.match(/^([\uD800-\uDBFF][\uDC00-\uDFFF])/);
      if (match) return match[1];
    }
    return '💭';
  });
  const [search, setSearch] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const filteredEmojis = COMMON_EMOJIS.filter(e => e.includes(search) || search === '');

  const handleConfirm = async () => {
    if (!auth.currentUser) return;
    if (text.length > 70) {
      toast.error("Status too long! Max 70 characters.");
      return;
    }

    setLoading(true);
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        status: `${selectedEmoji} ${text}`,
        statusExpiresAt: expiresAt.toISOString()
      });

      toast.success("Status updated! It will auto-delete in 1 hour.", { icon: '✨' });
      onClose();
    } catch (err) {
      toast.error("Failed to update status.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="status-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            className="w-full max-w-md h-full sm:h-auto bg-[#020617] border border-white/5 rounded-none sm:rounded-[3rem] shadow-[0_30px_100px_rgba(0,0,0,0.8)] overflow-hidden relative"
          >
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-pink-600/10 blur-[80px] rounded-full pointer-events-none" />

            <div className="p-10 relative z-10">
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-pink-500/10 border border-pink-500/20 rounded-[1.4rem] flex items-center justify-center text-pink-400 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-white/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <PenLine className="w-6 h-6 relative z-10" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black tracking-[-0.05em] text-white italic uppercase">Signal Status</h3>
                    <p className="text-[9px] font-black text-pink-400/50 uppercase tracking-[0.3em] italic mt-1">Neural Presence</p>
                  </div>
                </div>
                <button 
                  onClick={onClose}
                  className="w-12 h-12 bg-white/5 backdrop-blur-xl border border-white/5 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all active:scale-95"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-8">
                <div className="relative">
                  <div className="flex items-center gap-4 bg-white/[0.03] backdrop-blur-xl p-5 rounded-[2rem] border border-white/5 focus-within:border-pink-500/30 transition-all">
                    <button 
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="w-14 h-14 bg-black rounded-[1.2rem] shadow-2xl border border-white/10 flex items-center justify-center text-2xl hover:scale-110 transition-all active:scale-95 shrink-0 relative overflow-hidden group"
                    >
                      <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <span className="relative z-10">{selectedEmoji}</span>
                    </button>
                    <div className="flex-1 min-w-0">
                      <input 
                        type="text" 
                        placeholder="Intercepting thoughts..."
                        maxLength={70}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        className="w-full bg-transparent border-none outline-none font-black text-sm text-white placeholder-white/20 uppercase tracking-wide italic"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 px-4">
                    <p className="text-[8px] font-black text-white/20 uppercase tracking-widest italic">Temporal duration: 1 Neural Hour</p>
                    <p className={cn(
                      "text-[8px] font-black uppercase tracking-widest italic",
                      text.length > 60 ? "text-pink-400" : "text-white/20"
                    )}>
                      {text.length} / 70 CRDS
                    </p>
                  </div>
                </div>

                <AnimatePresence>
                  {showEmojiPicker && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-black/40 backdrop-blur-3xl rounded-[2rem] border border-white/5 p-6 shadow-inner">
                        <div className="relative mb-5">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
                          <input 
                            type="text"
                            placeholder="Neural emoji search..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-white/[0.03] border border-white/5 rounded-xl py-3 pl-10 pr-4 text-[10px] font-black text-white placeholder-white/10 focus:outline-none focus:border-white/20 uppercase tracking-widest"
                          />
                        </div>
                        <div className="grid grid-cols-6 gap-3 max-h-48 overflow-y-auto custom-scrollbar p-2">
                          {filteredEmojis.map(emoji => (
                            <button
                              key={emoji}
                              onClick={() => {
                                setSelectedEmoji(emoji);
                                setShowEmojiPicker(false);
                              }}
                              className="w-12 h-12 bg-white/5 hover:bg-pink-500/20 rounded-xl flex items-center justify-center text-2xl transition-all hover:scale-110 active:scale-95 border border-transparent hover:border-pink-500/30"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex gap-4">
                  <button 
                    onClick={onClose}
                    className="flex-1 py-5 bg-white/5 text-white/30 rounded-[1.8rem] font-black tracking-[0.2em] hover:bg-white/10 hover:text-white transition-all text-[10px] uppercase italic border border-white/5 active:scale-95"
                  >
                    Abort
                  </button>
                  <button 
                    disabled={loading || !text.trim()}
                    onClick={handleConfirm}
                    className="flex-[2] py-5 bg-pink-600 text-white rounded-[1.8rem] font-black tracking-[0.2em] hover:bg-pink-500 transition-all shadow-[0_15px_35px_rgba(236,72,153,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-[10px] uppercase italic active:scale-95 group relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      <span className="relative z-10 flex items-center gap-2"><Send className="w-3.5 h-3.5" /> Broadcast Signal</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
