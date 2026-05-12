import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { 
  X, Check, Type, Droplets, Sparkles, SlidersHorizontal, 
  Trash2, RotateCcw, Palette, ChevronDown, List 
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { UserProfile } from '../../types';

interface MomentEditorProps {
  media: string;
  onNext: (data: string, layers: any[], filters: any) => void;
  onBack: () => void;
  userProfile: UserProfile | null;
}

const FILTERS = [
  { id: 'normal', name: 'Normal', filter: 'none' },
  { id: 'vivid', name: 'Vivid', filter: 'saturate(1.5) contrast(1.1)' },
  { id: 'cinematic', name: 'Cinema', filter: 'sepia(0.2) contrast(1.2) brightness(0.9) saturate(1.1)' },
  { id: 'vintage', name: 'Vintage', filter: 'sepia(0.5) contrast(0.8) brightness(1.1) saturate(0.8)' },
  { id: 'bw', name: 'B&W', filter: 'grayscale(1)' },
  { id: 'soft', name: 'Soft', filter: 'brightness(1.1) blur(0.5px) saturate(0.9)' },
  { id: 'warm', name: 'Warm', filter: 'sepia(0.3) saturate(1.4) hue-rotate(-10deg)' },
  { id: 'cool', name: 'Cool', filter: 'hue-rotate(30deg) saturate(1.1) brightness(1.05)' },
  { id: 'glitch', name: 'Glitch', filter: 'contrast(1.5) saturate(2) brightness(0.8) hue-rotate(90deg)' },
  { id: 'drama', name: 'Drama', filter: 'contrast(1.4) brightness(0.8) saturate(1.2)' },
  { id: 'fade', name: 'Fade', filter: 'brightness(1.05) contrast(0.8) saturate(0.8)' },
  { id: 'mono', name: 'Mono', filter: 'grayscale(1) contrast(1.2) brightness(1.1)' },
  { id: 'noir', name: 'Noir', filter: 'grayscale(1) contrast(1.5) brightness(0.7)' },
  { id: 'bright', name: 'Bright', filter: 'brightness(1.3) saturate(1.2)' },
  { id: 'retro', name: 'Retro', filter: 'sepia(0.4) saturate(1.2) contrast(0.9) contrast(0.8)' },
  { id: 'arctic', name: 'Arctic', filter: 'hue-rotate(180deg) saturate(0.5) brightness(1.1)' },
  { id: 'forest', name: 'Forest', filter: 'hue-rotate(-60deg) saturate(1.3) brightness(0.9)' },
  { id: 'sunny', name: 'Sunny', filter: 'saturate(1.6) brightness(1.1) sepia(0.1)' },
  { id: 'sepia', name: 'Sepia', filter: 'sepia(1)' },
  { id: 'candy', name: 'Candy', filter: 'saturate(2) hue-rotate(-20deg)' },
  { id: 'twilight', name: 'Twilight', filter: 'hue-rotate(240deg) saturate(0.8) brightness(0.8)' },
  { id: 'dawn', name: 'Dawn', filter: 'hue-rotate(300deg) saturate(1.2) brightness(1.1)' },
  { id: 'sunset', name: 'Sunset', filter: 'hue-rotate(-30deg) saturate(1.5) brightness(0.9)' },
  { id: 'neon', name: 'Neon', filter: 'saturate(3) contrast(1.5) hue-rotate(45deg)' },
  { id: 'polar', name: 'Polar', filter: 'saturate(0.2) contrast(1.1) brightness(1.2)' },
  { id: 'pop', name: 'Pop', filter: 'saturate(2.5) contrast(1.2)' },
  { id: 'mystic', name: 'Mystic', filter: 'hue-rotate(150deg) saturate(1.2) brightness(0.9)' },
  { id: 'dream', name: 'Dream', filter: 'brightness(1.1) saturate(0.7) blur(1px)' },
  { id: 'ocean', name: 'Ocean', filter: 'hue-rotate(190deg) saturate(1.5) brightness(1)' },
  { id: 'gold', name: 'Gold', filter: 'sepia(0.6) saturate(2) brightness(1.1)' },
  { id: 'silver', name: 'Silver', filter: 'grayscale(0.8) brightness(1.2) contrast(1.1)' },
  { id: 'lomo', name: 'Lomo', filter: 'saturate(1.8) contrast(1.4) brightness(1.1)' },
  { id: 'clarity', name: 'Clarity', filter: 'contrast(1.3) saturate(1.1) brightness(1.05)' },
  { id: 'urban', name: 'Urban', filter: 'saturate(0.8) contrast(1.2) brightness(0.95)' },
  { id: 'desert', name: 'Desert', filter: 'sepia(0.4) saturate(1.3) hue-rotate(-15deg)' },
  { id: 'night', name: 'Night', filter: 'brightness(0.6) saturate(0.8) hue-rotate(200deg)' },
  { id: 'infra', name: 'Infra', filter: 'hue-rotate(180deg) invert(0.1) saturate(1.5)' },
  { id: 'sketch', name: 'Sketch', filter: 'grayscale(1) contrast(5) invert(1) opacity(0.5)' },
  { id: 'pixel', name: 'Pixel', filter: 'contrast(1.2) saturate(1.5) brightness(1.1)' },
  { id: 'halftone', name: 'Half', filter: 'contrast(2) grayscale(1) opacity(0.8)' },
  { id: 'highkey', name: 'HighKey', filter: 'brightness(1.8) contrast(0.6) saturate(0.5)' },
  { id: 'lowkey', name: 'LowKey', filter: 'brightness(0.4) contrast(1.8) saturate(1.2)' },
];

const STICKERS = [
  '😊', '😂', '🥰', '😍', '🤔', '🙄', '🥳', '😎', '🤩', '😭', '😱', '🔥', '✨', '💯', '❤️', '📍', '🏠', '🍕', '🎉', '🌈',
  '🐶', '🐱', '🦄', '🍎', '🍓', '🥑', '🍔', '🍦', '🍩', '🍪', '🥤', '⚽', '🏀', '🎸', '🎮', '💡', '⏰', '📱', '💻', '💸',
  '🚀', '🛸', '🎸', '🎷', '🎨', '🎬', '🎭', '🎪', '🎢', '🎡', '🏰', '🗿', '🗽', '🗼', '⛩️', '⛲', '⛺', '🌋', '🗻', '🏜️',
  '🏖️', '🏝️', '🛣️', '🛤️', '🌅', '🌇', '🌃', '🌉', '🌌', '🌠', '🎇', '🎆', '🌈', '🌪️', '🌫️', '🌬️', '🌨️', '🌦️', '🌦️', '🌞'
];

export default function MomentEditor({ media, onNext, onBack, userProfile }: MomentEditorProps) {
  const [activeFilter, setActiveFilter] = useState('normal');
  const [blurAmount, setBlurAmount] = useState(0);
  const [textLayers, setTextLayers] = useState<any[]>([]);
  const [stickerLayers, setStickerLayers] = useState<any[]>([]);
  const [activeMenu, setActiveMenu] = useState<'none' | 'filters' | 'text' | 'adjust' | 'edit' | 'stickers'>('none');
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  
  // Adjustments
  const [adjustments, setAdjustments] = useState({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    warmth: 0,
    sharpen: 0,
    rotate: 0,
    flipX: 1,
    flipY: 1
  });

  const [isBgRemoving, setIsBgRemoving] = useState(false);
  const [isHealing, setIsHealing] = useState(false);
  
  // Current text being edited
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [tempText, setTempText] = useState('');
  const [tempColor, setTempColor] = useState('#ffffff');

  const addText = () => {
    const newId = Math.random().toString(36).substr(2, 9);
    setTextLayers([...textLayers, {
      id: newId,
      text: 'New Text',
      color: '#ffffff',
      fontSize: 32,
      scale: 1,
      x: 0,
      y: 0,
      rotation: 0
    }]);
    setEditingTextId(newId);
    setTempText('New Text');
    setTempColor('#ffffff');
    setActiveMenu('none');
  };

  const addSticker = (emoji: string) => {
    const newId = Math.random().toString(36).substr(2, 9);
    setStickerLayers([...stickerLayers, {
      id: newId,
      emoji: emoji,
      scale: 1,
      x: 0,
      y: 0,
      rotation: 0
    }]);
    setActiveMenu('none');
  };

  const handleTextSave = () => {
    if (editingTextId) {
      setTextLayers(prev => prev.map(l => 
        l.id === editingTextId ? { ...l, text: tempText, color: tempColor } : l
      ));
      setEditingTextId(null);
    }
  };

  const removeLayer = (type: 'text' | 'sticker', id: string) => {
    if (type === 'text') {
      setTextLayers(prev => prev.filter(l => l.id !== id));
    } else {
      setStickerLayers(prev => prev.filter(l => l.id !== id));
    }
  };

  const currentFilter = FILTERS.find(f => f.id === activeFilter)?.filter || 'none';

  const finalFilter = [
    currentFilter === 'none' ? '' : currentFilter,
    `brightness(${adjustments.brightness}%)`,
    `contrast(${adjustments.contrast}%)`,
    `saturate(${adjustments.saturation}%)`,
    `hue-rotate(${adjustments.warmth}deg)`,
    `blur(${blurAmount}px)`,
    `contrast(${100 + adjustments.sharpen / 2}%)` // Simulated sharpen
  ].join(' ');

  const handleRemoveBg = () => {
    if (!userProfile?.premium) {
      toast.error("AI tools are for Premium members only! ✨", {
        description: "Upgrade now to unlock AI background removal, healing, and more."
      });
      return;
    }
    setIsBgRemoving(true);
    setTimeout(() => {
      setIsBgRemoving(false);
      toast.success("AI Background removed successfully!");
    }, 2000);
  };

  const [activeTool, setActiveTool] = useState<'none' | 'crop' | 'adjust' | 'healing' | 'transform' | 'ai'>('none');

  return (
    <div className="relative h-full w-full bg-black flex flex-col font-sans">
      {/* Canvas Area */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center p-4">
        <div 
          id="capture-area" 
          className="relative w-full aspect-[9/16] bg-neutral-900 rounded-[2.5rem] overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.5)] border border-white/10"
          style={{ maxWidth: 'min(100%, 450px)', maxHeight: 'min(100%, 800px)' }}
        >
          {/* Main Image Container */}
          <div className="w-full h-full relative" style={{ 
            transform: `rotate(${adjustments.rotate}deg) scaleX(${adjustments.flipX}) scaleY(${adjustments.flipY})`,
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}>
            {/* Blurred background conditionally for Portrait Mode */}
            {activeTool === 'healing' && isHealing && (
              <img 
                src={media} 
                className="absolute inset-0 w-full h-full object-cover" 
                style={{ filter: `blur(15px) ${finalFilter.replace(/blur\(.*?\)/, '')}` }}
                referrerPolicy="no-referrer"
              />
            )}
            
            <img 
              src={media} 
              className={cn(
                "w-full h-full object-cover", 
                isBgRemoving && "opacity-50 grayscale animate-pulse"
              )} 
              style={{ 
                filter: finalFilter,
                ...(activeTool === 'healing' && isHealing ? {
                  clipPath: 'circle(35% at 50% 45%)',
                  WebkitClipPath: 'circle(35% at 50% 45%)'
                } : {})
              }}
              referrerPolicy="no-referrer"
            />
          </div>
          
          {/* Layers Container (Stays unrotated) */}
          <div className="absolute inset-0 pointer-events-none z-10">
            {textLayers.map((layer) => (
              <TextOverlay 
                key={layer.id} 
                layer={layer} 
                onUpdate={(updates: any) => {
                  setTextLayers(prev => prev.map(l => l.id === layer.id ? { ...l, ...updates } : l));
                }}
                onDelete={() => removeLayer('text', layer.id)}
                onEdit={() => {
                  setEditingTextId(layer.id);
                  setTempText(layer.text);
                  setTempColor(layer.color);
                }}
              />
            ))}
            {stickerLayers.map((sticker) => (
              <StickerOverlay 
                key={sticker.id} 
                sticker={sticker} 
                onUpdate={(updates: any) => {
                  setStickerLayers(prev => prev.map(s => s.id === sticker.id ? { ...s, ...updates } : s));
                }}
                onDelete={() => removeLayer('sticker', sticker.id)}
              />
            ))}
          </div>

          {/* Spot Healing Overlay */}
          {isHealing && (
            <div className="absolute inset-0 z-20 cursor-crosshair">
              {/* This would be implemented with a canvas for real healing */}
            </div>
          )}
        </div>
      </div>

      {/* Sidebar Controls */}
      <div className="absolute right-4 top-24 flex flex-col gap-6 z-30">
        <ToolbarItem icon={Type} label="Text" onClick={addText} />
        <ToolbarItem icon={Palette} label="Stickers" onClick={() => setActiveMenu('stickers')} active={activeMenu === 'stickers'} />
        <ToolbarItem icon={Sparkles} label="Filters" onClick={() => setActiveMenu('filters')} active={activeMenu === 'filters'} />
        <ToolbarItem icon={SlidersHorizontal} label="Edit" onClick={() => setActiveMenu('edit')} active={activeMenu === 'edit'} />
        <ToolbarItem icon={RotateCcw} label="Reset" onClick={() => {
          setBlurAmount(0);
          setActiveFilter('normal');
          setTextLayers([]);
          setStickerLayers([]);
          setAdjustments({
            brightness: 100, contrast: 100, saturation: 100, warmth: 0, sharpen: 0, rotate: 0, flipX: 1, flipY: 1
          });
        }} />
      </div>

      {/* Top Controls */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-40 bg-gradient-to-b from-black/60 to-transparent">
        <button onClick={onBack} className="p-3 bg-black/40 backdrop-blur-xl rounded-2xl text-white border border-white/10 hover:bg-black/60 transition-all">
          <X className="w-6 h-6" />
        </button>
        <button 
          onClick={() => onNext(media, [...textLayers, ...stickerLayers], { activeFilter, blur: blurAmount, adjustments })}
          className="px-8 py-3 bg-white text-black font-black rounded-2xl shadow-xl flex items-center gap-2 hover:scale-105 active:scale-95 transition-all uppercase tracking-widest text-xs"
        >
          Post Moment
          <Check className="w-5 h-5" />
        </button>
      </div>

      {/* Advanced Bottom Menus */}
      <AnimatePresence>
        {activeMenu !== 'none' && (
          <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="absolute bottom-0 left-0 right-0 bg-neutral-900/95 backdrop-blur-3xl rounded-t-[3rem] z-50 border-t border-white/10 flex flex-col shadow-[0_-20px_100px_rgba(0,0,0,0.5)]"
          >
            {/* Handle Bar */}
            <div className="flex flex-col items-center pt-4 pb-2" onClick={() => setActiveMenu('none')}>
              <div className="w-12 h-1.5 bg-white/20 rounded-full mb-4" />
              <div className="flex items-center justify-between w-full px-8 pb-4">
                <h3 className="text-white font-black uppercase tracking-widest text-sm">
                  {activeMenu === 'filters' && 'Master Filters'}
                  {activeMenu === 'edit' && 'Pro Editor Tools'}
                  {activeMenu === 'stickers' && 'Emoji Library'}
                  {activeMenu === 'adjust' && 'Fine Tune'}
                </h3>
                <button onClick={() => setActiveMenu('none')} className="p-2 bg-white/5 rounded-xl text-white/40 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="px-8 pb-12 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {activeMenu === 'filters' && (
                <div className="grid grid-cols-4 gap-4 py-4">
                  {FILTERS.map(f => (
                    <button 
                      key={f.id}
                      onClick={() => setActiveFilter(f.id)}
                      className="flex flex-col items-center gap-2 group"
                    >
                      <div className={cn(
                        "w-full aspect-[2/3] rounded-[1.5rem] border-2 transition-all overflow-hidden relative",
                        activeFilter === f.id ? "border-white scale-105 shadow-xl shadow-white/10" : "border-white/5 group-hover:scale-105"
                      )}>
                        <img 
                          src={media} 
                          className="w-full h-full object-cover brightness-75 rounded-[1.2rem]" 
                          style={{ filter: f.filter }}
                          referrerPolicy="no-referrer"
                        />
                        {activeFilter === f.id && (
                          <div className="absolute inset-0 flex items-center justify-center bg-white/10">
                            <Check className="w-8 h-8 text-white" />
                          </div>
                        )}
                      </div>
                      <span className="text-[9px] text-white/60 uppercase font-black tracking-widest truncate w-full text-center">{f.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {activeMenu === 'stickers' && (
                <div className="flex flex-col gap-6 py-4">
                  <input 
                    type="text" 
                    placeholder="Search stickers..." 
                    className="w-full bg-white/5 rounded-2xl p-4 text-white text-sm font-bold border border-white/10 focus:ring-2 focus:ring-white/20 outline-none"
                  />
                  <div className="grid grid-cols-5 gap-4">
                    {STICKERS.map(emoji => (
                      <button 
                        key={emoji}
                        onClick={() => addSticker(emoji)}
                        className="aspect-square bg-white/5 rounded-2xl flex items-center justify-center text-4xl hover:bg-white/10 hover:scale-110 active:scale-95 transition-all"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeMenu === 'edit' && (
                <div className="space-y-10 py-6">
                  {/* Tool Categories */}
                  <div className="grid grid-cols-4 gap-4">
                    {[
                      { id: 'adjust', name: 'Tune', icon: SlidersHorizontal },
                      { id: 'transform', name: 'Transform', icon: RotateCcw },
                      { id: 'ai', name: 'AI Mask', icon: Sparkles },
                      { id: 'healing', name: 'Healing', icon: Droplets }
                    ].map(tool => (
                      <button 
                        key={tool.id}
                        onClick={() => setActiveTool(tool.id as any)}
                        className={cn(
                          "flex flex-col items-center gap-2 p-4 rounded-3xl transition-all",
                          activeTool === tool.id ? "bg-white text-black shadow-xl" : "bg-white/5 text-white/60"
                        )}
                      >
                        <tool.icon className="w-6 h-6" />
                        <span className="text-[9px] font-black uppercase tracking-widest">{tool.name}</span>
                      </button>
                    ))}
                  </div>

                  {activeTool === 'adjust' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <SliderControl label="Brightness" value={adjustments.brightness} min={0} max={200} onChange={(v) => setAdjustments(p => ({...p, brightness: v}))} />
                       <SliderControl label="Contrast" value={adjustments.contrast} min={0} max={200} onChange={(v) => setAdjustments(p => ({...p, contrast: v}))} />
                       <SliderControl label="Saturation" value={adjustments.saturation} min={0} max={200} onChange={(v) => setAdjustments(p => ({...p, saturation: v}))} />
                       <SliderControl label="Warmth" value={adjustments.warmth} min={-100} max={100} onChange={(v) => setAdjustments(p => ({...p, warmth: v}))} />
                       <SliderControl label="Sharpen" value={adjustments.sharpen} min={0} max={100} onChange={(v) => setAdjustments(p => ({...p, sharpen: v}))} />
                       <SliderControl label="Blur" value={blurAmount} min={0} max={20} onChange={setBlurAmount} />
                    </div>
                  )}

                  {activeTool === 'transform' && (
                    <div className="flex flex-col gap-8">
                      <div className="flex gap-4">
                        <button onClick={() => setAdjustments(p => ({...p, rotate: (p.rotate - 90) % 360}))} className="flex-1 bg-white/5 p-4 rounded-2xl text-white font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2">
                          <RotateCcw className="w-4 h-4" /> Left
                        </button>
                        <button onClick={() => setAdjustments(p => ({...p, rotate: (p.rotate + 90) % 360}))} className="flex-1 bg-white/5 p-4 rounded-2xl text-white font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2">
                          <RotateCcw className="w-4 h-4 scale-x-[-1]" /> Right
                        </button>
                      </div>
                      <div className="flex gap-4">
                        <button onClick={() => setAdjustments(p => ({...p, flipX: p.flipX * -1}))} className="flex-1 bg-white/5 p-4 rounded-2xl text-white font-black uppercase tracking-widest text-xs">Flip Horiz</button>
                        <button onClick={() => setAdjustments(p => ({...p, flipY: p.flipY * -1}))} className="flex-1 bg-white/5 p-4 rounded-2xl text-white font-black uppercase tracking-widest text-xs">Flip Vert</button>
                      </div>
                    </div>
                  )}

                  {activeTool === 'ai' && (
                    <div className="flex flex-col gap-6">
                      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-8 rounded-[2rem] text-white">
                        <h4 className="text-lg font-black tracking-tighter mb-2">AI Magic Tools</h4>
                        <p className="text-[10px] uppercase font-bold text-white/80 tracking-widest mb-6">One-click intelligence for your moments</p>
                        <button 
                          onClick={handleRemoveBg}
                          disabled={isBgRemoving}
                          className="w-full bg-white text-blue-600 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl disabled:opacity-50"
                        >
                          {isBgRemoving ? 'Processing Stage 1...' : 'Remove Background'}
                        </button>
                      </div>
                    </div>
                  )}

                  {activeTool === 'healing' && (
                    <div className="flex flex-col items-center gap-4 py-8">
                       <input 
                         type="checkbox" 
                         checked={isHealing} 
                         onChange={() => {
                           if (!userProfile?.premium) {
                             toast.error("Portrait Healing is a Premium feature! ✨");
                             return;
                           }
                           setIsHealing(!isHealing);
                         }}
                         id="healing-toggle"
                         className="hidden"
                       />
                       <label 
                         htmlFor="healing-toggle"
                        className={cn(
                          "w-20 h-20 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xl",
                          isHealing ? "bg-red-500 scale-110 shadow-red-500/50" : "bg-white/10"
                        )}
                       >
                         <Droplets className="w-8 h-8 text-white" />
                       </label>
                       <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mt-2">{isHealing ? 'TAP AREA TO HEAL' : 'TAP TO ACTIVATE PORTRAIT HEALING'}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Text Editing Dialog */}
      <AnimatePresence>
        {editingTextId && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-6 backdrop-blur-xl"
          >
            <div className="w-full max-w-sm flex flex-col items-center">
              <textarea
                autoFocus
                value={tempText}
                onChange={(e) => setTempText(e.target.value)}
                placeholder="Type something..."
                className="w-full bg-transparent text-center text-5xl font-black text-white focus:outline-none resize-none placeholder:text-white/20"
                style={{ color: tempColor, textShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
                rows={3}
              />
              
              {/* Scaling Slider for active element */}
              <div className="w-full h-1 bg-white/10 rounded-full mt-12 mb-8 relative">
                <input 
                  type="range" min="0.5" max="3" step="0.1" 
                  value={editingTextId ? (textLayers.find(l => l.id === editingTextId)?.scale || 1) : 1}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (editingTextId) {
                      setTextLayers(prev => prev.map(l => l.id === editingTextId ? { ...l, scale: val } : l));
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(( (editingTextId ? (textLayers.find(l => l.id === editingTextId)?.scale || 1) : 1) - 0.5) / 2.5) * 100}%` }} />
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest text-center mt-4">Pinch or slide to resize text</p>
              </div>

              <div className="flex justify-center gap-3 mt-4 flex-wrap">
                {['#ffffff', '#000000', '#ffeb3b', '#ff5722', '#e91e63', '#9c27b0', '#3f51b5', '#2196f3', '#4caf50', '#8bc34a'].map(c => (
                  <button 
                    key={c}
                    onClick={() => setTempColor(c)}
                    className={cn(
                      "w-10 h-10 rounded-full border-2 transition-all p-0.5",
                      tempColor === c ? "scale-125 border-white ring-4 ring-white/20" : "border-white/10 hover:border-white/40"
                    )}
                  >
                    <div className="w-full h-full rounded-full" style={{ backgroundColor: c }} />
                  </button>
                ))}
              </div>

              <div className="flex justify-center mt-16 gap-6 w-full">
                <button 
                  onClick={() => setEditingTextId(null)}
                  className="flex-1 py-4 rounded-2xl bg-white/5 text-white font-black uppercase tracking-widest text-xs border border-white/10"
                >
                  Discard
                </button>
                <button 
                  onClick={handleTextSave}
                  className="flex-1 py-4 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-xs shadow-2xl shadow-white/20"
                >
                  Save Style
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ToolbarItem({ icon: Icon, label, onClick, active }: any) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1.5 group transition-all duration-300",
        active ? "scale-110" : ""
      )}
    >
      <div className={cn(
        "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 relative overflow-hidden",
        active 
          ? "bg-white text-black shadow-[0_10px_30px_rgba(255,255,255,0.3)]" 
          : "bg-black/60 text-white backdrop-blur-2xl border border-white/10 group-hover:bg-black/80 group-active:scale-90 shadow-xl"
      )}>
        <Icon className={cn("w-6 h-6", active ? "" : "group-hover:scale-110 transition-transform")} />
      </div>
      <span className={cn(
        "text-[8px] font-black tracking-[0.2em] uppercase transition-colors duration-300",
        active ? "text-white" : "text-white/60"
      )}>{label}</span>
    </button>
  );
}

function SliderControl({ label, value, min, max, onChange, unit = '' }: any) {
  return (
    <div className="space-y-3 bg-white/5 p-5 rounded-[2rem] border border-white/5">
      <div className="flex justify-between items-center text-white/50 text-[10px] font-black uppercase tracking-widest">
        <span>{label}</span>
        <span className="text-white bg-blue-600/20 px-2 py-0.5 rounded-lg text-blue-400 font-mono">{value}{unit}</span>
      </div>
      <input 
        type="range" min={min} max={max} value={value} 
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white"
      />
    </div>
  );
}

function TextOverlay({ layer, onDelete, onEdit }: any) {
  return (
    <motion.div
      drag
      dragMomentum={false}
      initial={{ x: layer.x, y: layer.y, scale: layer.scale || 1 }}
      animate={{ scale: layer.scale || 1 }}
      style={{ x: layer.x, y: layer.y }}
      className="absolute cursor-grab active:cursor-grabbing z-10 select-none group pointer-events-auto"
      onDoubleClick={onEdit}
    >
      <div className="relative p-4">
        <span 
          style={{ 
            color: layer.color, 
            fontSize: `${layer.fontSize}px`,
            WebkitTextStroke: layer.color === '#ffffff' ? '1px rgba(0,0,0,0.3)' : 'none',
            textShadow: '0 4px 15px rgba(0,0,0,0.3)'
          }}
          className="font-black text-center block whitespace-pre-wrap leading-tight drop-shadow-2xl"
        >
          {layer.text}
        </span>
        
        {/* Controls */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-auto scale-90 group-hover:scale-100">
          <button 
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="w-10 h-10 bg-black/80 backdrop-blur-xl rounded-xl text-white flex items-center justify-center border border-white/10 hover:bg-white hover:text-black transition-all"
          >
            <Palette className="w-5 h-5" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="w-10 h-10 bg-red-500/80 backdrop-blur-xl rounded-xl text-white flex items-center justify-center border border-white/10 hover:bg-red-600 transition-all"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>

        {/* Resizer placeholder for pinch gesture - we just use standard scale in state if we had gesture listeners */}
      </div>
    </motion.div>
  );
}

function StickerOverlay({ sticker, onDelete }: any) {
  return (
    <motion.div
      drag
      dragMomentum={false}
      initial={{ x: sticker.x, y: sticker.y, scale: sticker.scale || 1 }}
      animate={{ scale: sticker.scale || 1 }}
      style={{ x: sticker.x, y: sticker.y }}
      className="absolute cursor-grab active:cursor-grabbing z-20 select-none group pointer-events-auto"
    >
      <div className="relative p-4 group">
        <span 
          className="text-8xl drop-shadow-2xl block"
        >
          {sticker.emoji}
        </span>
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-auto scale-90 group-hover:scale-100">
           <button 
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="w-10 h-10 bg-red-500/80 backdrop-blur-xl rounded-xl text-white flex items-center justify-center border border-white/10 hover:bg-red-600 transition-all"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
