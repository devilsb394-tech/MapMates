import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, MapPin, Radio, Send, Check, Clock, DollarSign, Plane, MessageCircle, Trash2, Package, Truck, Search, Plus, Minus, Star, ChevronRight, Bell } from 'lucide-react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase/firebase';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, orderBy, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { ShoppingList, Bid, UserProfile, StockQuery, StockReply, DeliveryRequest } from '../types';
import { toast } from 'sonner';
import { cn, calculateDistance } from '../lib/utils';

interface ShoppingListModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
}

export const ShoppingListModal: React.FC<ShoppingListModalProps> = ({ isOpen, onClose, userProfile }) => {
  const [items, setItems] = useState<{ id: string; text: string }[]>([{ id: Math.random().toString(36).substr(2, 9), text: '' }]);
  const [radius, setRadius] = useState(500); // meters
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addItem = () => setItems([...items, { id: Math.random().toString(36).substr(2, 9), text: '' }]);
  const removeItem = (id: string) => setItems(items.filter(item => item.id !== id));
  const updateItem = (id: string, value: string) => {
    setItems(items.map(item => item.id === id ? { ...item, text: value } : item));
  };

  const handleSubmit = async () => {
    const validItems = items.map(i => i.text).filter(t => t.trim() !== '');
    if (validItems.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'shopping_lists'), {
        uid: userProfile.uid,
        username: userProfile.username,
        userPhoto: userProfile.photoURL,
        items: validItems,
        radiusKm: radius / 1000,
        location: userProfile.location,
        status: 'active',
        createdAt: new Date().toISOString()
      });
      toast.success('Shopping list broadcasted to nearby shops!');
      onClose();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'shopping_lists');
      toast.error('Failed to broadcast list');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-[#020617] w-full max-w-md rounded-[32px] overflow-hidden shadow-[0_0_100px_rgba(37,99,235,0.2)] border border-blue-500/20"
      >
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white leading-tight italic uppercase">Shopping List</h2>
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mt-1">Broadcast to nearby shops</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
            <X className="w-5 h-5 text-white/40" />
          </button>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-6 custom-scrollbar">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Items to Buy</label>
            {items.map((item) => (
              <div key={item.id} className="flex gap-2">
                <input
                  type="text"
                  value={item.text}
                  onChange={(e) => updateItem(item.id, e.target.value)}
                  placeholder="e.g. 1kg Sugar..."
                  className="flex-1 bg-white/5 border border-white/5 rounded-2xl px-4 py-3 text-sm font-bold text-white focus:ring-2 focus:ring-blue-500/50 transition-all outline-none"
                />
                {items.length > 1 && (
                  <button onClick={() => removeItem(item.id)} className="p-3 text-red-500 hover:bg-red-500/10 rounded-2xl transition-colors">
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
            <button 
              onClick={addItem}
              className="w-full py-3 border-2 border-dashed border-white/5 rounded-2xl text-white/20 hover:text-blue-400 hover:border-blue-500/30 transition-all flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest italic"
            >
              <Plus className="w-4 h-4" /> Add Item
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between ml-1">
              <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Broadcast Radius</label>
              <span className="text-[10px] font-black text-blue-400 bg-blue-600/10 border border-blue-500/20 px-2 py-0.5 rounded-full">{radius}m</span>
            </div>
            <input
              type="range"
              min="100"
              max="1000"
              step="100"
              value={radius}
              onChange={(e) => setRadius(parseInt(e.target.value))}
              className="w-full h-2 bg-white/5 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-[8px] font-bold text-white/20 uppercase tracking-tighter">
              <span>100m</span>
              <span>500m</span>
              <span>1km</span>
            </div>
          </div>
        </div>

        <div className="p-6 bg-white/5 border-t border-white/5">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-2xl font-black text-sm shadow-[0_10px_30px_rgba(37,99,235,0.3)] transition-all flex items-center justify-center gap-2 italic uppercase tracking-widest"
          >
            {isSubmitting ? 'Processing...' : (
              <>
                <Send className="w-4 h-4" /> Broadcast List
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

interface BidsViewProps {
  listId: string;
  onClose: () => void;
}

export const BidsView: React.FC<BidsViewProps> = ({ listId, onClose }) => {
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'bids'), where('listId', '==', listId), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setBids(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bid)));
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'bids');
      setLoading(false);
    });
    return unsubscribe;
  }, [listId]);

  const handleAcceptBid = async (bid: Bid) => {
    try {
      await updateDoc(doc(db, 'bids', bid.id), { status: 'accepted' });
      await updateDoc(doc(db, 'shopping_lists', listId), { status: 'completed' });
      toast.success('Bid accepted! You can now chat with the shop.');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `bids/${bid.id}`);
      toast.error('Failed to accept bid');
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex flex-col bg-[#020617]">
      <div className="p-6 bg-[#020617]/80 backdrop-blur-3xl border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
            <X className="w-6 h-6 text-white/40" />
          </button>
          <div>
            <h2 className="text-2xl font-black text-white leading-tight italic uppercase">Shop Bids</h2>
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mt-1">Market Protocol Active</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full space-y-4">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-black text-blue-400/50 animate-pulse uppercase tracking-[0.3em] italic">Waiting for feeds...</p>
          </div>
        ) : bids.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-20 h-20 bg-white/5 rounded-[32px] flex items-center justify-center mb-4 border border-white/5">
              <ShoppingBag className="w-10 h-10 text-white/10" />
            </div>
            <h3 className="text-xl font-black text-white mb-2 italic uppercase">No signals detected</h3>
            <p className="text-sm text-white/30 max-w-xs font-bold uppercase tracking-widest text-[10px]">Nearby shops will send offers soon.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bids.map((bid) => (
              <motion.div 
                key={bid.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 backdrop-blur-md rounded-[32px] p-6 shadow-2xl border border-white/5 group hover:border-blue-500/30 transition-all"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-white/10 shadow-lg group-hover:scale-105 transition-transform">
                    <img src={bid.shopPhoto} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-black text-white leading-tight italic uppercase">{bid.shopName}</h3>
                    <div className="flex items-center gap-1 text-[10px] font-black text-blue-400 uppercase tracking-widest mt-1">
                      <Star className="w-3 h-3 fill-current" /> Verified Node
                    </div>
                  </div>
                </div>

                <div className="bg-black/40 rounded-2xl p-4 mb-6 flex items-center justify-between border border-white/5">
                  <span className="text-[10px] font-black text-white/30 uppercase tracking-widest italic">Credits Required</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-white">{bid.totalPrice}</span>
                    <span className="text-[10px] font-black text-blue-400 uppercase">{bid.currency}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => handleAcceptBid(bid)}
                    className="flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-xs shadow-[0_10px_20px_rgba(37,99,235,0.3)] transition-all italic uppercase tracking-widest"
                  >
                    <Check className="w-4 h-4" /> Accept
                  </button>
                  <button className="flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 text-white/60 rounded-2xl font-black text-xs border border-white/5 transition-all italic uppercase tracking-widest">
                    <MessageCircle className="w-4 h-4" /> Message
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface StockQueryModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
}

export const StockQueryModal: React.FC<StockQueryModalProps> = ({ isOpen, onClose, userProfile }) => {
  const [itemName, setItemName] = useState('');
  const [radius, setRadius] = useState(500);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!itemName.trim()) {
      toast.error('Please enter an item name');
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'stock_queries'), {
        uid: userProfile.uid,
        username: userProfile.username,
        itemName: itemName.trim(),
        radiusKm: radius / 1000,
        location: userProfile.location,
        createdAt: new Date().toISOString()
      });
      toast.success(`Query for "${itemName}" broadcasted!`);
      onClose();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'stock_queries');
      toast.error('Failed to broadcast query');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-[#020617] w-full max-w-md rounded-[32px] overflow-hidden shadow-[0_0_100px_rgba(245,158,11,0.1)] border border-amber-500/20"
      >
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-[0_0_20px_rgba(245,158,11,0.4)]">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white leading-tight italic uppercase">Stock Query</h2>
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mt-1">Scan Nearby Nodes</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
            <X className="w-5 h-5 text-white/40" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Target Item</label>
            <input
              type="text"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="e.g. Panadol..."
              className="w-full bg-white/5 border border-white/5 rounded-2xl px-4 py-4 text-sm font-bold text-white focus:ring-2 focus:ring-amber-500/50 outline-none transition-all"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between ml-1">
              <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Search Radius</label>
              <span className="text-[10px] font-black text-amber-500 bg-amber-600/10 border border-amber-500/20 px-2 py-0.5 rounded-full">{radius}m</span>
            </div>
            <input
              type="range"
              min="100"
              max="1000"
              step="100"
              value={radius}
              onChange={(e) => setRadius(parseInt(e.target.value))}
              className="w-full h-2 bg-white/5 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>
        </div>

        <div className="p-6 bg-white/5 border-t border-white/5">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full py-4 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-2xl font-black text-sm shadow-[0_10px_30px_rgba(245,158,11,0.3)] transition-all flex items-center justify-center gap-2 italic uppercase tracking-widest"
          >
            {isSubmitting ? 'Transmitting...' : (
              <>
                <Send className="w-4 h-4" /> Broadcast Query
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

interface DeliveryRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
}

export const DeliveryRequestModal: React.FC<DeliveryRequestModalProps> = ({ isOpen, onClose, userProfile }) => {
  const [itemName, setItemName] = useState('');
  const [fee, setFee] = useState(50);
  const [radius, setRadius] = useState(500);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!itemName.trim()) {
      toast.error('Please enter an item name');
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'delivery_requests'), {
        uid: userProfile.uid,
        username: userProfile.username,
        itemName: itemName.trim(),
        deliveryFee: fee,
        currency: 'PKR',
        radiusKm: radius / 1000,
        location: userProfile.location,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      toast.success(`Delivery request for "${itemName}" broadcasted!`);
      onClose();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'delivery_requests');
      toast.error('Failed to broadcast request');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-[#020617] w-full max-w-md rounded-[32px] overflow-hidden shadow-[0_0_100px_rgba(34,197,94,0.1)] border border-green-500/20"
      >
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-600 rounded-2xl flex items-center justify-center text-white shadow-[0_0_20px_rgba(34,197,94,0.4)]">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white leading-tight italic uppercase">Logistic Request</h2>
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mt-1">Crowdsourced Link</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
            <X className="w-5 h-5 text-white/40" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Payload Description</label>
            <input
              type="text"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="e.g. Medicine, Package..."
              className="w-full bg-white/5 border border-white/5 rounded-2xl px-4 py-4 text-sm font-bold text-white focus:ring-2 focus:ring-green-500/50 outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Credit Reward</label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input
                  type="number"
                  value={fee}
                  onChange={(e) => setFee(parseInt(e.target.value))}
                  className="w-full bg-white/5 border border-white/5 rounded-2xl pl-10 pr-4 py-4 text-sm font-bold text-white focus:ring-2 focus:ring-green-500/50 outline-none transition-all"
                />
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Radius (m)</label>
              <input
                type="number"
                value={radius}
                onChange={(e) => setRadius(parseInt(e.target.value))}
                className="w-full bg-white/5 border border-white/5 rounded-2xl px-4 py-4 text-sm font-bold text-white focus:ring-2 focus:ring-green-500/50 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        <div className="p-6 bg-white/5 border-t border-white/5">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full py-4 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-2xl font-black text-sm shadow-[0_10px_30px_rgba(34,197,94,0.3)] transition-all flex items-center justify-center gap-2 italic uppercase tracking-widest"
          >
            {isSubmitting ? 'Syncing...' : (
              <>
                <Send className="w-4 h-4" /> Broadcast Request
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// Business Dashboard Components
interface BusinessDashboardProps {
  userProfile: UserProfile;
}

function BusinessDashboard({ userProfile }: BusinessDashboardProps) {
  const [nearbyLists, setNearbyLists] = useState<ShoppingList[]>([]);
  const [nearbyQueries, setNearbyQueries] = useState<StockQuery[]>([]);
  const [nearbyDeliveries, setNearbyDeliveries] = useState<DeliveryRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'lists' | 'queries' | 'deliveries'>('lists');

  useEffect(() => {
    if (!userProfile.business?.location) return;

    // Listen for nearby shopping lists
    const listsQ = query(collection(db, 'shopping_lists'), where('status', '==', 'active'));
    const unsubscribeLists = onSnapshot(listsQ, (snap) => {
      const lists = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ShoppingList));
      const filtered = lists.filter(l => {
        const dist = calculateDistance(userProfile.business!.location.lat, userProfile.business!.location.lng, l.location.lat, l.location.lng);
        const distNum = parseFloat(dist.replace(/[^0-9.]/g, ''));
        return distNum <= l.radiusKm;
      });
      setNearbyLists(filtered);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'shopping_lists'));

    // Listen for nearby stock queries
    const queriesQ = query(collection(db, 'stock_queries'));
    const unsubscribeQueries = onSnapshot(queriesQ, (snap) => {
      const queries = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as StockQuery));
      const filtered = queries.filter(q => {
        const dist = calculateDistance(userProfile.business!.location.lat, userProfile.business!.location.lng, q.location.lat, q.location.lng);
        const distNum = parseFloat(dist.replace(/[^0-9.]/g, ''));
        return distNum <= q.radiusKm;
      });
      setNearbyQueries(filtered);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'stock_queries'));

    // Listen for nearby delivery requests
    const deliveriesQ = query(collection(db, 'delivery_requests'), where('status', '==', 'pending'));
    const unsubscribeDeliveries = onSnapshot(deliveriesQ, (snap) => {
      const deliveries = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as DeliveryRequest));
      const filtered = deliveries.filter(d => {
        const dist = calculateDistance(userProfile.business!.location.lat, userProfile.business!.location.lng, d.location.lat, d.location.lng);
        const distNum = parseFloat(dist.replace(/[^0-9.]/g, ''));
        return distNum <= d.radiusKm;
      });
      setNearbyDeliveries(filtered);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'delivery_requests'));

    return () => {
      unsubscribeLists();
      unsubscribeQueries();
      unsubscribeDeliveries();
    };
  }, [userProfile.business?.location]);

  const handleBid = async (listId: string) => {
    const price = prompt('Enter total price for this list:');
    if (!price || isNaN(Number(price))) return;

    try {
      await addDoc(collection(db, 'bids'), {
        listId,
        shopId: userProfile.uid,
        shopName: userProfile.business?.shopName,
        shopPhoto: userProfile.business?.shopPhotoURL,
        totalPrice: Number(price),
        currency: 'PKR',
        timestamp: new Date().toISOString(),
        status: 'pending'
      });
      toast.success('Bid sent successfully!');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'bids');
      toast.error('Failed to send bid');
    }
  };

  const handleStockReply = async (queryId: string, available: boolean) => {
    try {
      await addDoc(collection(db, 'stock_replies'), {
        queryId,
        shopId: userProfile.uid,
        shopName: userProfile.business?.shopName,
        shopPhoto: userProfile.business?.shopPhotoURL,
        available,
        timestamp: new Date().toISOString()
      });
      toast.success(available ? 'Confirmed in stock!' : 'Marked as out of stock');
    } catch (error) {
      console.error('Error replying to query:', error);
      toast.error('Failed to send reply');
    }
  };

  const handleAcceptDelivery = async (deliveryId: string) => {
    try {
      await updateDoc(doc(db, 'delivery_requests', deliveryId), {
        status: 'accepted',
        acceptedBy: userProfile.uid,
        acceptedByName: userProfile.business?.shopName || userProfile.username
      });
      toast.success('Delivery request accepted!');
    } catch (error) {
      console.error('Error accepting delivery:', error);
      toast.error('Failed to accept delivery');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 p-1 bg-white/5 rounded-2xl border border-white/5">
        <button 
          onClick={() => setActiveTab('lists')}
          className={cn("flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all italic", activeTab === 'lists' ? "bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)]" : "text-white/30 hover:text-white/60")}
        >
          Lists ({nearbyLists.length})
        </button>
        <button 
          onClick={() => setActiveTab('queries')}
          className={cn("flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all italic", activeTab === 'queries' ? "bg-amber-500 text-white shadow-[0_0_20px_rgba(245,158,11,0.3)]" : "text-white/30 hover:text-white/60")}
        >
          Queries ({nearbyQueries.length})
        </button>
        <button 
          onClick={() => setActiveTab('deliveries')}
          className={cn("flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all italic", activeTab === 'deliveries' ? "bg-green-600 text-white shadow-[0_0_20px_rgba(34,197,94,0.3)]" : "text-white/30 hover:text-white/60")}
        >
          Deliveries ({nearbyDeliveries.length})
        </button>
      </div>

      <div className="space-y-4">
        {activeTab === 'lists' && (
          nearbyLists.length === 0 ? (
            <div className="text-center py-12 bg-white/5 rounded-[32px] border border-dashed border-white/10">
              <ShoppingBag className="w-10 h-10 text-white/10 mx-auto mb-3" />
              <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] italic">No active lists detected</p>
            </div>
          ) : (
            nearbyLists.map(list => (
              <motion.div key={list.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white/5 backdrop-blur-sm p-6 rounded-[32px] shadow-2xl border border-white/5 group hover:border-blue-500/20 transition-all">
                <div className="flex items-center gap-3 mb-4">
                  <img src={list.userPhoto} className="w-12 h-12 rounded-2xl object-cover border-2 border-white/10 shadow-lg" />
                  <div>
                    <p className="text-sm font-black text-white italic uppercase tracking-wider">{list.username}</p>
                    <p className="text-[10px] font-black text-blue-400/50 uppercase tracking-widest mt-1">Nearby Source</p>
                  </div>
                </div>
                <div className="space-y-2 mb-6">
                  {list.items.map((item, i) => (
                    <div key={`list-item-${list.id}-${item}-${i}`} className="flex items-center gap-3 text-xs font-bold text-white/60 bg-black/40 px-4 py-3 rounded-2xl border border-white/5">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(37,99,235,0.8)]" /> {item}
                    </div>
                  ))}
                </div>
                <button onClick={() => handleBid(list.id)} className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-[0_10px_25px_rgba(37,99,235,0.3)] italic">
                  Transmit Bid
                </button>
              </motion.div>
            ))
          )
        )}

        {activeTab === 'queries' && (
          nearbyQueries.length === 0 ? (
            <div className="text-center py-12 bg-white/5 rounded-[32px] border border-dashed border-white/10">
              <Package className="w-10 h-10 text-white/10 mx-auto mb-3" />
              <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] italic">No active queries found</p>
            </div>
          ) : (
            nearbyQueries.map(query => (
              <motion.div key={query.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white/5 backdrop-blur-sm p-6 rounded-[32px] shadow-2xl border border-white/5 group hover:border-amber-500/20 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                      <Search className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-white/30 uppercase tracking-widest italic">Query Signal</p>
                      <p className="text-sm font-black text-white italic uppercase tracking-wider">"{query.itemName}"</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => handleStockReply(query.id, true)} className="py-4 bg-green-600 hover:bg-green-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-[0_10px_25px_rgba(34,197,94,0.3)] italic">
                    Affirmative
                  </button>
                  <button onClick={() => handleStockReply(query.id, false)} className="py-4 bg-red-600/30 hover:bg-red-600/50 text-red-500 border border-red-500/30 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all italic">
                    Negative
                  </button>
                </div>
              </motion.div>
            ))
          )
        )}

        {activeTab === 'deliveries' && (
          nearbyDeliveries.length === 0 ? (
            <div className="text-center py-12 bg-white/5 rounded-[32px] border border-dashed border-white/10">
              <Truck className="w-10 h-10 text-white/10 mx-auto mb-3" />
              <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] italic">No logistics needed</p>
            </div>
          ) : (
            nearbyDeliveries.map(delivery => (
              <motion.div key={delivery.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white/5 backdrop-blur-sm p-6 rounded-[32px] shadow-2xl border border-white/5 group hover:border-green-500/20 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-[10px] font-black text-white/30 uppercase tracking-widest italic">Logistic Unit</p>
                    <p className="text-sm font-black text-white italic uppercase tracking-wider">{delivery.itemName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-white/30 uppercase tracking-widest italic">Reward</p>
                    <p className="text-lg font-black text-green-500 italic uppercase">+{delivery.deliveryFee} {delivery.currency}</p>
                  </div>
                </div>
                <button onClick={() => handleAcceptDelivery(delivery.id)} className="w-full py-4 bg-green-600 hover:bg-green-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-[0_10px_25px_rgba(34,197,94,0.3)] italic">
                  Accept Job
                </button>
              </motion.div>
            ))
          )
        )}
      </div>
    </div>
  );
}

export { BusinessDashboard };
