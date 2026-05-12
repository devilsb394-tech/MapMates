import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase/firebase';
import { doc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { UserProfile } from '../types';
import { Smile, Frown, Meh, Heart, Zap, Coffee, Moon, Sun, Cloud, Wind, Flame, Ghost, PartyPopper, X, Search, Check, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

interface MoodPickerProps {
  userProfile: UserProfile | null;
  onUpdate: (profile: UserProfile) => void;
}

const MOOD_CATEGORIES = [
  {
    name: 'Activities',
    emojis: [
      { emoji: '🛀', text: 'Bathing' }, { emoji: '🎮', text: 'Gaming' }, { emoji: '🏏', text: 'Cricket' },
      { emoji: '⚽', text: 'Football' }, { emoji: '🏀', text: 'Basketball' }, { emoji: '🎾', text: 'Tennis' },
      { emoji: '🏐', text: 'Volleyball' }, { emoji: '🏈', text: 'Rugby' }, { emoji: '🎱', text: 'Billiards' },
      { emoji: '🏓', text: 'Ping Pong' }, { emoji: '🏸', text: 'Badminton' }, { emoji: '🏒', text: 'Hockey' },
      { emoji: '🥊', text: 'Boxing' }, { emoji: '🥋', text: 'Martial Arts' }, { emoji: '⛸️', text: 'Skating' },
      { emoji: '🎣', text: 'Fishing' }, { emoji: '🏇', text: 'Racing' }, { emoji: '🚴', text: 'Cycling' },
      { emoji: '🏊', text: 'Swimming' }, { emoji: '🏄', text: 'Surfing' }, { emoji: '🚣', text: 'Rowing' },
      { emoji: '🧗', text: 'Climbing' }, { emoji: '🧘', text: 'Yoga' }, { emoji: '🏋️', text: 'Gym' },
      { emoji: '🤸', text: 'Gymnastics' }, { emoji: '🤺', text: 'Fencing' }, { emoji: '🏌️', text: 'Golf' },
      { emoji: '🧖', text: 'Sauna' }, { emoji: '💆', text: 'Massage' }, { emoji: '💇', text: 'Haircut' },
      { emoji: '🚶', text: 'Walking' }, { emoji: '🏃', text: 'Running' }, { emoji: '💃', text: 'Dancing' },
      { emoji: '🕺', text: 'Disco' }, { emoji: '🕴️', text: 'Suit' }, { emoji: '🗣️', text: 'Talking' },
      { emoji: '👤', text: 'Alone' }, { emoji: '👥', text: 'Group' }, { emoji: '🫂', text: 'Hugging' },
      { emoji: '🛌', text: 'Sleeping' }, { emoji: '🛋️', text: 'Chilling' }, { emoji: '🛍️', text: 'Shopping' },
      { emoji: '🛒', text: 'Grocery' }, { emoji: '🎁', text: 'Gifting' }, { emoji: '🎈', text: 'Party' },
      { emoji: '🎂', text: 'Birthday' }, { emoji: '🎄', text: 'Christmas' }, { emoji: '🎆', text: 'Fireworks' },
      { emoji: '🎇', text: 'Sparklers' }, { emoji: '🧨', text: 'Firecracker' }, { emoji: '✨', text: 'Sparkles' },
      { emoji: '🎉', text: 'Celebration' }, { emoji: '🎊', text: 'Confetti' }, { emoji: '🎋', text: 'Tanabata' },
      { emoji: '🎍', text: 'Kadomatsu' }, { emoji: '🎎', text: 'Dolls' }, { emoji: '🎏', text: 'Carp' },
      { emoji: '🎐', text: 'Wind Chime' }, { emoji: '🎑', text: 'Moon' }, { emoji: '🧧', text: 'Red Envelope' },
      { emoji: '🎀', text: 'Ribbon' }, { emoji: '🎟️', text: 'Ticket' }, { emoji: '🎫', text: 'Pass' },
      { emoji: '🎖️', text: 'Medal' }, { emoji: '🏆', text: 'Trophy' }, { emoji: '🏅', text: 'Gold' },
      { emoji: '🥈', text: 'Silver' }, { emoji: '🥉', text: 'Bronze' }, { emoji: '⚾', text: 'Baseball' },
      { emoji: '🥎', text: 'Softball' }, { emoji: '🏑', text: 'Field Hockey' }, { emoji: '🥍', text: 'Lacrosse' },
      { emoji: '🏹', text: 'Archery' }, { emoji: '🥅', text: 'Goal' }, { emoji: '🎿', text: 'Skiing' },
      { emoji: '🛷', text: 'Sledding' }, { emoji: '🥌', text: 'Curling' }, { emoji: '🎯', text: 'Darts' },
      { emoji: '🎰', text: 'Slot Machine' }, { emoji: '🎲', text: 'Dice' }, { emoji: '🧩', text: 'Puzzle' },
      { emoji: '🧸', text: 'Teddy Bear' }, { emoji: '♠️', text: 'Spades' }, { emoji: '♥️', text: 'Hearts' },
      { emoji: '♦️', text: 'Diamonds' }, { emoji: '♣️', text: 'Clubs' }, { emoji: '♟️', text: 'Chess' },
      { emoji: '🃏', text: 'Joker' }, { emoji: '🀄', text: 'Mahjong' }, { emoji: '🎴', text: 'Flower Cards' },
      { emoji: '🎭', text: 'Theater' }, { emoji: '🖼️', text: 'Art' }, { emoji: '🎨', text: 'Painting' },
      { emoji: '🧵', text: 'Sewing' }, { emoji: '🧶', text: 'Knitting' }, { emoji: '🎤', text: 'Singing' },
      { emoji: '🎧', text: 'Music' }, { emoji: '🎼', text: 'Score' }, { emoji: '🎹', text: 'Piano' },
      { emoji: '🥁', text: 'Drums' }, { emoji: '🎷', text: 'Sax' }, { emoji: '🎺', text: 'Trumpet' },
      { emoji: '🎸', text: 'Guitar' }, { emoji: '🎻', text: 'Violin' }, { emoji: '🎬', text: 'Movie' },
      { emoji: '🎥', text: 'Camera' }, { emoji: '📹', text: 'Video' }, { emoji: '📽️', text: 'Projector' },
      { emoji: '📺', text: 'TV' }, { emoji: '📻', text: 'Radio' }, { emoji: '🎙️', text: 'Mic' },
      { emoji: '🎚️', text: 'Slider' }, { emoji: '🎛️', text: 'Knobs' }, { emoji: '🧭', text: 'Compass' },
      { emoji: '⏱️', text: 'Stopwatch' }, { emoji: '⏲️', text: 'Timer' }, { emoji: '⏰', text: 'Alarm' },
      { emoji: '🕰️', text: 'Clock' }, { emoji: '⌛', text: 'Hourglass' }, { emoji: '⏳', text: 'Sand' },
      { emoji: '📡', text: 'Satellite' }, { emoji: '🔋', text: 'Battery' }, { emoji: '🔌', text: 'Plug' },
      { emoji: '💡', text: 'Idea' }, { emoji: '🔦', text: 'Flashlight' }, { emoji: '🕯️', text: 'Candle' },
      { emoji: '🗑️', text: 'Trash' }, { emoji: '🛢️', text: 'Oil' }, { emoji: '💸', text: 'Money' },
      { emoji: '💵', text: 'Cash' }, { emoji: '💴', text: 'Yen' }, { emoji: '💶', text: 'Euro' },
      { emoji: '💷', text: 'Pound' }, { emoji: '💰', text: 'Bag' }, { emoji: '💳', text: 'Card' },
      { emoji: '💎', text: 'Gem' }, { emoji: '⚖️', text: 'Scale' }, { emoji: '🔧', text: 'Wrench' },
      { emoji: '🔨', text: 'Hammer' }, { emoji: '⚒️', text: 'Pick' }, { emoji: '🛠️', text: 'Tools' },
      { emoji: '⛏️', text: 'Mine' }, { emoji: '🔩', text: 'Bolt' }, { emoji: '⚙️', text: 'Gear' },
      { emoji: '⛓️', text: 'Chain' }, { emoji: '🔫', text: 'Gun' }, { emoji: '💣', text: 'Bomb' },
      { emoji: '🔪', text: 'Knife' }, { emoji: '🗡️', text: 'Dagger' }, { emoji: '⚔️', text: 'Swords' },
      { emoji: '🛡️', text: 'Shield' }, { emoji: '🚬', text: 'Smoking' }, { emoji: '⚰️', text: 'Coffin' },
      { emoji: '⚱️', text: 'Urn' }, { emoji: '🏺', text: 'Amphora' }, { emoji: '🔮', text: 'Crystal' },
      { emoji: '📿', text: 'Beads' }, { emoji: '🧿', text: 'Evil Eye' }, { emoji: '💈', text: 'Barber' },
      { emoji: '⚗️', text: 'Alembic' }, { emoji: '🔭', text: 'Telescope' }, { emoji: '🔬', text: 'Microscope' },
      { emoji: '🕳️', text: 'Hole' }, { emoji: '💊', text: 'Pill' }, { emoji: '💉', text: 'Syringe' },
      { emoji: '🌡️', text: 'Temp' }, { emoji: '🏷️', text: 'Tag' }, { emoji: '🔖', text: 'Bookmark' },
      { emoji: '🚽', text: 'Toilet' }, { emoji: '🚿', text: 'Shower' }, { emoji: '🛁', text: 'Bath' },
      { emoji: '🔑', text: 'Key' }, { emoji: '🗝️', text: 'Old Key' }
    ]
  },
  {
    name: 'Moods',
    emojis: [
      { emoji: '😊', text: 'Happy' }, { emoji: '😔', text: 'Sad' }, { emoji: '😐', text: 'Neutral' },
      { emoji: '🥰', text: 'Loved' }, { emoji: '⚡', text: 'Energetic' }, { emoji: '☕', text: 'Relaxed' },
      { emoji: '😴', text: 'Sleepy' }, { emoji: '😎', text: 'Cool' }, { emoji: '🤔', text: 'Thinking' },
      { emoji: '💨', text: 'Busy' }, { emoji: '🔥', text: 'Excited' }, { emoji: '👻', text: 'Playful' },
      { emoji: '🎉', text: 'Party' }, { emoji: '😡', text: 'Angry' }, { emoji: '😭', text: 'Crying' },
      { emoji: '😱', text: 'Scared' }, { emoji: '🤢', text: 'Sick' }, { emoji: '🥳', text: 'Celebrating' },
      { emoji: '🤩', text: 'Starstruck' }, { emoji: '🥺', text: 'Pleading' }, { emoji: '😴', text: 'Tired' },
      { emoji: '🤤', text: 'Hungry' }, { emoji: '😤', text: 'Triumphant' }, { emoji: '🤯', text: 'Mind Blown' },
      { emoji: '🤠', text: 'Cowboy' }, { emoji: '🤡', text: 'Clown' }, { emoji: '🤥', text: 'Liar' },
      { emoji: '🤫', text: 'Shushing' }, { emoji: '🤭', text: 'Giggling' }, { emoji: '🧐', text: 'Monocle' },
      { emoji: '🤓', text: 'Nerd' }, { emoji: '😈', text: 'Devil' }, { emoji: '👿', text: 'Angry Devil' },
      { emoji: '👹', text: 'Ogre' }, { emoji: '👺', text: 'Goblin' }, { emoji: '💀', text: 'Skull' },
      { emoji: '👽', text: 'Alien' }, { emoji: '👾', text: 'Robot' }, { emoji: '🤖', text: 'Bot' },
      { emoji: '💩', text: 'Poop' }, { emoji: '😺', text: 'Cat Happy' },
      { emoji: '😸', text: 'Cat Grin' }, { emoji: '😻', text: 'Cat Love' }, { emoji: '😼', text: 'Cat Smirk' },
      { emoji: '😽', text: 'Cat Kiss' }, { emoji: '🙀', text: 'Cat Shock' }, { emoji: '😿', text: 'Cat Sad' },
      { emoji: '😾', text: 'Cat Mad' }, { emoji: '🙈', text: 'No See' }, { emoji: '🙉', text: 'No Hear' },
      { emoji: '🙊', text: 'No Speak' }, { emoji: '💋', text: 'Kiss' }, { emoji: '💌', text: 'Letter' },
      { emoji: '💘', text: 'Arrow' }, { emoji: '💝', text: 'Gift' }, { emoji: '💖', text: 'Sparkle' },
      { emoji: '💗', text: 'Growing' }, { emoji: '💓', text: 'Beating' }, { emoji: '💞', text: 'Swirl' },
      { emoji: '💕', text: 'Two Hearts' }, { emoji: '💟', text: 'Decoration' }, { emoji: '❣️', text: 'Exclamation' },
      { emoji: '💔', text: 'Broken' }, { emoji: '❤️', text: 'Heart' }, { emoji: '🧡', text: 'Orange' },
      { emoji: '💛', text: 'Yellow' }, { emoji: '💚', text: 'Green' }, { emoji: '💙', text: 'Blue' },
      { emoji: '💜', text: 'Purple' }, { emoji: '🖤', text: 'Black' }, { emoji: '🤍', text: 'White' },
      { emoji: '🤎', text: 'Brown' }, { emoji: '💯', text: '100' }, { emoji: '💢', text: 'Anger' },
      { emoji: '💥', text: 'Boom' }, { emoji: '💫', text: 'Dizzy' }, { emoji: '💦', text: 'Sweat' },
      { emoji: '💬', text: 'Speech' }, { emoji: '👁️‍🗨️', text: 'Eye' }, { emoji: '🗨️', text: 'Left' },
      { emoji: '🗯️', text: 'Right' }, { emoji: '💭', text: 'Thought' }, { emoji: '💤', text: 'Zzz' }
    ]
  },
  {
    name: 'Food & Drink',
    emojis: [
      { emoji: '🍏', text: 'Apple' }, { emoji: '🍎', text: 'Red Apple' }, { emoji: '🍐', text: 'Pear' },
      { emoji: '🍊', text: 'Orange' }, { emoji: '🍋', text: 'Lemon' }, { emoji: '🍌', text: 'Banana' },
      { emoji: '🍉', text: 'Melon' }, { emoji: '🍇', text: 'Grapes' }, { emoji: '🍓', text: 'Berry' },
      { emoji: '🍒', text: 'Cherry' }, { emoji: '🍑', text: 'Peach' },
      { emoji: '🍍', text: 'Pineapple' }, { emoji: '🥭', text: 'Mango' }, { emoji: '🥥', text: 'Coco' },
      { emoji: '🥝', text: 'Kiwi' }, { emoji: '🍅', text: 'Tomato' }, { emoji: '🍆', text: 'Eggplant' },
      { emoji: '🥑', text: 'Avocado' }, { emoji: '🥦', text: 'Broccoli' }, { emoji: '🥬', text: 'Leafy' },
      { emoji: '🥒', text: 'Cucumber' }, { emoji: '🌶️', text: 'Chili' }, { emoji: '🌽', text: 'Corn' },
      { emoji: '🥕', text: 'Carrot' }, { emoji: '🥔', text: 'Potato' }, { emoji: '🍠', text: 'Yam' },
      { emoji: '🥐', text: 'Croissant' }, { emoji: '🍞', text: 'Bread' }, { emoji: '🥖', text: 'Baguette' },
      { emoji: '🥨', text: 'Pretzel' }, { emoji: '🥯', text: 'Bagel' }, { emoji: '🥞', text: 'Pancake' },
      { emoji: '🧀', text: 'Cheese' }, { emoji: '🍖', text: 'Meat' }, { emoji: '🍗', text: 'Poultry' },
      { emoji: '🥩', text: 'Steak' }, { emoji: '🥓', text: 'Bacon' }, { emoji: '🍔', text: 'Burger' },
      { emoji: '🍟', text: 'Fries' }, { emoji: '🍕', text: 'Pizza' }, { emoji: '🌭', text: 'Hotdog' },
      { emoji: '🥪', text: 'Sandwich' }, { emoji: '🌮', text: 'Taco' }, { emoji: '🌯', text: 'Burrito' },
      { emoji: '🥙', text: 'Stuffed' }, { emoji: '🍳', text: 'Egg' }, { emoji: '🥘', text: 'Pan' },
      { emoji: '🍲', text: 'Stew' }, { emoji: '🥣', text: 'Bowl' }, { emoji: '🥗', text: 'Salad' },
      { emoji: '🍿', text: 'Popcorn' }, { emoji: '🧂', text: 'Salt' }, { emoji: '🥫', text: 'Can' },
      { emoji: '🍱', text: 'Bento' }, { emoji: '🍘', text: 'Cracker' }, { emoji: '🍙', text: 'Rice Ball' },
      { emoji: '🍚', text: 'Rice' }, { emoji: '🍛', text: 'Curry' }, { emoji: '🍜', text: 'Noodle' },
      { emoji: '🍝', text: 'Pasta' }, { emoji: '🍢', text: 'Oden' }, { emoji: '🍣', text: 'Sushi' },
      { emoji: '🍤', text: 'Shrimp' }, { emoji: '🍥', text: 'Fish Cake' }, { emoji: '🥮', text: 'Mooncake' },
      { emoji: '🍡', text: 'Dango' }, { emoji: '🥟', text: 'Dumpling' }, { emoji: '🥠', text: 'Fortune' },
      { emoji: '🥡', text: 'Takeout' }, { emoji: '🍦', text: 'Soft Serve' }, { emoji: '🍧', text: 'Shaved Ice' },
      { emoji: '🍨', text: 'Ice Cream' }, { emoji: '🍩', text: 'Donut' }, { emoji: '🍪', text: 'Cookie' },
      { emoji: '🍰', text: 'Shortcake' }, { emoji: '🧁', text: 'Cupcake' },
      { emoji: '🥧', text: 'Pie' }, { emoji: '🍫', text: 'Choco' }, { emoji: '🍬', text: 'Candy' },
      { emoji: '🍭', text: 'Lolly' }, { emoji: '🍮', text: 'Custard' }, { emoji: '🍯', text: 'Honey' },
      { emoji: '🍼', text: 'Bottle' }, { emoji: '🥛', text: 'Milk' }, { emoji: '🍶', text: 'Sake' }, { emoji: '🍾', text: 'Champagne' },
      { emoji: '🍷', text: 'Wine' }, { emoji: '🍸', text: 'Cocktail' }, { emoji: '🍹', text: 'Tropical' },
      { emoji: '🍺', text: 'Beer' }, { emoji: '🍻', text: 'Beers' }, { emoji: '🥂', text: 'Cheers' },
      { emoji: '🥃', text: 'Whiskey' }, { emoji: '🥤', text: 'Soda' }, { emoji: '🧃', text: 'Juice' },
      { emoji: '🧉', text: 'Mate' }, { emoji: '🧊', text: 'Ice' }, { emoji: '🥢', text: 'Chopsticks' },
      { emoji: '🍽️', text: 'Plate' }, { emoji: '🍴', text: 'Fork' }, { emoji: '🥄', text: 'Spoon' }
    ]
  }
];

export default function MoodPicker({ userProfile, onUpdate }: MoodPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedMood, setSelectedMood] = useState<{ emoji: string; text: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!userProfile) return;
    if (userProfile.mood) {
      setSelectedMood(userProfile.mood);
    }
  }, [userProfile]);

  const handleSelectMood = async () => {
    if (!auth.currentUser || !userProfile || !selectedMood) return;
    setLoading(true);
    try {
      const updateData = {
        mood: selectedMood,
        lastMoodUpdate: new Date().toISOString()
      };
      await setDoc(doc(db, 'users', auth.currentUser.uid), updateData, { merge: true });
      
      onUpdate({
        ...userProfile,
        ...updateData
      });
      
      setIsOpen(false);
      toast.success(`Mood updated to ${selectedMood.text}!`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = MOOD_CATEGORIES.map(cat => ({
    ...cat,
    emojis: cat.emojis.filter(e => 
      e.text.toLowerCase().includes(searchQuery.toLowerCase()) || 
      e.emoji.includes(searchQuery)
    )
  })).filter(cat => cat.emojis.length > 0);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-3 lg:px-6 py-2.5 lg:py-3 rounded-xl lg:rounded-2xl bg-white border border-neutral-100 hover:bg-neutral-50 font-black tracking-tight transition shadow-xl flex items-center justify-center gap-2 text-sm lg:text-base group"
      >
        <span className="text-xl group-hover:scale-125 transition-transform duration-300">
          {userProfile?.mood?.emoji || '🎭'}
        </span>
        <span className="text-[10px] lg:text-xs font-black text-neutral-900 uppercase tracking-widest">
          {userProfile?.mood?.text || 'Set Vibe'}
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <div key="mood-picker-overlay" className="fixed inset-0 z-[6000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-[2.5rem] p-8 shadow-2xl border border-neutral-100 overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 to-indigo-700"></div>
              
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-neutral-900">What's your vibe?</h2>
                  <p className="text-sm text-neutral-500 font-medium">Select an emoji that represents your current activity or mood.</p>
                </div>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-neutral-100 rounded-xl transition"
                >
                  <X className="w-6 h-6 text-neutral-400" />
                </button>
              </div>

              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search emojis or activities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-neutral-50 border border-neutral-100 rounded-2xl font-bold text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-8 custom-scrollbar">
                {filteredCategories.map((category) => (
                  <div key={category.name}>
                    <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-4 sticky top-0 bg-white py-2 z-10">
                      {category.name} ({category.emojis.length})
                    </h3>
                    <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 gap-2">
                      {category.emojis.map((mood) => (
                        <button
                          key={`${category.name}-${mood.text}`}
                          onClick={() => setSelectedMood(mood)}
                          className={cn(
                            "flex flex-col items-center gap-1 p-3 rounded-2xl transition-all duration-300 group hover:scale-105",
                            selectedMood?.emoji === mood.emoji ? "bg-blue-600 text-white shadow-lg shadow-blue-100" : "bg-neutral-50 hover:bg-neutral-100"
                          )}
                        >
                          <span className="text-2xl group-hover:scale-110 transition-transform duration-300">{mood.emoji}</span>
                          <span className={cn(
                            "text-[8px] font-black uppercase tracking-tighter truncate w-full text-center",
                            selectedMood?.emoji === mood.emoji ? "text-white" : "text-neutral-500"
                          )}>
                            {mood.text}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {filteredCategories.length === 0 && (
                  <div className="py-20 text-center">
                    <p className="text-neutral-400 font-bold">No emojis found for "{searchQuery}"</p>
                  </div>
                )}
              </div>

              <div className="mt-8 pt-6 border-t border-neutral-100 flex gap-3">
                <button 
                  onClick={() => setIsOpen(false)}
                  className="flex-1 py-4 text-neutral-400 font-black uppercase tracking-widest text-[10px] hover:text-neutral-600 transition"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSelectMood}
                  disabled={loading || !selectedMood}
                  className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black tracking-tight hover:bg-blue-700 transition shadow-xl shadow-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Updating...' : 'Confirm Mood'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
