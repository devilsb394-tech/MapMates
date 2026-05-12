import React, { useState, useEffect } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase/firebase';
import { doc, getDoc, updateDoc, setDoc, collection, addDoc, onSnapshot, query, where, getDocs, limit, serverTimestamp, orderBy } from 'firebase/firestore';
import { uploadFile } from '../supabase/supabase';
import { UserProfile, Moment } from '../types';
import { UserPlus, MessageCircle, MapPin, Map, Compass, Check, UserCheck, Clock, Settings as SettingsIcon, Plane, Store, Camera, ShieldCheck, Trash2, AlertTriangle, Search as SearchIcon, Power, BellRing, Eye, EyeOff, Package, Truck, ShoppingBag, X, ArrowLeft, Plus, Trophy, Crown, Medal, Zap } from 'lucide-react';
import MoodPicker from './MoodPicker';
// Main Profile Component
import { BusinessDashboard } from './BusinessFeatures';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { cn, handleQuotaError } from '../lib/utils';
import { UserAvatar } from './UserAvatar';
import Webcam from 'react-webcam';
import { GoogleGenAI } from "@google/genai";

const getAi = () => {
  const apiKey = process.env.GEMINI_API_KEY || (import.meta as any).env.VITE_GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

interface ProfilePageProps {
  profileId: string;
  onMessage: (id: string) => void;
  onViewProfile: (id: string) => void;
  onSettings?: () => void;
  addToHistory: (type: 'search' | 'view', targetId?: string, query?: string) => void;
  onAddMoment?: () => void;
  onMomentClick?: (userId: string) => void;
}

export default function ProfilePage({ profileId, onMessage, onViewProfile, onSettings, addToHistory, onAddMoment, onMomentClick }: ProfilePageProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFriendModal, setShowFriendModal] = useState(false);
  const [friendshipData, setFriendshipData] = useState({ type: 'Regular', closeness: 50 });
  const [friendStatus, setFriendStatus] = useState<'none' | 'pending' | 'friends'>('none');
  const [isIncoming, setIsIncoming] = useState(false);
  const [hasActiveMoment, setHasActiveMoment] = useState(false);
  const [showBusinessModal, setShowBusinessModal] = useState(false);
  const [registrationStep, setRegistrationStep] = useState(1);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [aiVerificationResult, setAiVerificationResult] = useState<'success' | 'error' | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [businessData, setBusinessData] = useState({
    shopName: '',
    category: '',
    phoneNumber: '',
    openTime: '09:00',
    closeTime: '21:00',
    shopPhoto: '',
    ownerSelfie: ''
  });
  const [categorySearch, setCategorySearch] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBioModal, setShowBioModal] = useState(false);
  const [newBio, setNewBio] = useState('');
  const [moments, setMoments] = useState<Moment[]>([]);
  const webcamRef = React.useRef<Webcam>(null);

  useEffect(() => {
    if (!profileId) return;
    const q = query(
      collection(db, 'moments'),
      where('uid', '==', profileId),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setMoments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Moment)));
    });
    return () => unsub();
  }, [profileId]);

  const categories = [
    "Pan Shop", "Bakery", "Pharmacy", "Grocery Store", "Hair Salon", "Restaurant", "Cafe", "Boutique", "Hardware Store", "Electronics", "Mobile Shop", "Gym", "Laundry", "Bookstore", "Flower Shop", "Pet Shop", "Toy Store", "Jewelry Shop", "Tailor", "Optician", "Dentist", "Clinic", "Supermarket", "Stationery", "Gift Shop", "Sports Shop", "Music Store", "Art Gallery", "Furniture Store", "Interior Design", "Real Estate", "Travel Agency", "Bank", "ATM", "Petrol Pump", "Car Wash", "Auto Repair", "Bike Repair", "Photo Studio", "Printing Press", "Courier Service", "Internet Cafe", "Coaching Center", "School", "Nursery", "Yoga Center", "Spa", "Massage Parlor", "Tattoo Parlor", "Wine Shop", "Bar", "Night Club", "Cinema", "Theater", "Museum", "Park", "Zoo", "Library", "Temple", "Mosque", "Church", "Gurudwara", "Community Center", "Post Office", "Police Station", "Hospital", "Fire Station", "Government Office", "Court", "Embassy", "NGO", "Warehouse", "Factory", "Workshop", "Studio", "Office", "Coworking Space", "Hotel", "Resort", "Guest House", "Hostel", "Dormitory", "Camping Site", "Beach", "Mountain", "Waterfall", "Lake", "River", "Forest", "Wildlife Sanctuary", "Historical Site", "Monument", "Statue", "Bridge", "Dam", "Tunnel", "Airport", "Railway Station", "Bus Stand", "Taxi Stand", "Metro Station", "Port", "Harbor", "Marina", "Lighthouse", "Windmill", "Solar Farm", "Power Plant", "Substation", "Water Tank", "Garbage Dump", "Recycling Center", "Cemetery", "Crematorium", "Public Toilet", "Parking Lot", "Playground", "Stadium", "Swimming Pool", "Golf Course", "Tennis Court", "Basketball Court", "Badminton Court", "Cricket Ground", "Football Ground", "Hockey Ground", "Skating Rink", "Bowling Alley", "Gaming Zone", "Casino", "Race Course", "Stable", "Farm", "Orchard", "Vineyard", "Dairy", "Poultry", "Fishery", "Bee Farm", "Nursery", "Greenhouse", "Botanical Garden"
  ];

  const filteredCategories = categories.filter(c => c.toLowerCase().includes(categorySearch.toLowerCase())).slice(0, 10);

  const isOwnProfile = auth.currentUser?.uid === profileId;

  useEffect(() => {
    if (!profileId) return;
    const now = new Date().toISOString();
    const q = query(
      collection(db, 'moments'), 
      where('uid', '==', profileId), 
      where('expiresAt', '>', now),
      limit(1)
    );
    const unsub = onSnapshot(q, (snap) => {
      setHasActiveMoment(!snap.empty);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'moments');
    });
    return () => unsub();
  }, [profileId]);

  useEffect(() => {
    if (!profileId) {
      setLoading(false);
      return;
    }
    
    // Fail-safe timeout
    const timeout = setTimeout(() => {
      if (loading) setLoading(false);
    }, 10000);

    const unsubProfile = onSnapshot(doc(db, 'users', profileId), (snap) => {
      clearTimeout(timeout);
      if (snap.exists()) {
        setProfile(snap.data() as UserProfile);
      } else {
        setProfile(null);
      }
      setLoading(false);
    }, (err) => {
      clearTimeout(timeout);
      console.error("Profile fetch error:", err);
      handleFirestoreError(err, OperationType.GET, `users/${profileId}`);
      setLoading(false);
    });

    // Check friend status
    if (auth.currentUser && !isOwnProfile) {
      const q = query(
        collection(db, 'friendRequests'),
        where('participants', 'array-contains', auth.currentUser.uid)
      );
      const unsubFriendStatus = onSnapshot(q, (snap) => {
        const reqDoc = snap.docs.find(d => {
          const data = d.data();
          return data.participants.includes(profileId);
        });

        if (!reqDoc) {
          setFriendStatus('none');
          setIsIncoming(false);
        } else {
          const req = reqDoc.data();
          setFriendStatus(req.status === 'accepted' ? 'friends' : 'pending');
          setIsIncoming(req.to === auth.currentUser?.uid);
        }
      }, (err) => {
        if (err.code !== 'resource-exhausted') {
          handleFirestoreError(err, OperationType.GET, 'friendRequests');
        }
      });
      return () => {
        unsubProfile();
        unsubFriendStatus();
      };
    }

    return () => unsubProfile();
  }, [profileId, isOwnProfile]);

  const handleAcceptFriend = async () => {
    if (!auth.currentUser || !profileId) return;
    try {
      const q = query(
        collection(db, 'friendRequests'),
        where('from', '==', profileId),
        where('to', '==', auth.currentUser.uid),
        where('status', '==', 'pending')
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        await updateDoc(doc(db, 'friendRequests', snap.docs[0].id), {
          status: 'accepted',
          acceptedAt: serverTimestamp()
        });
        toast.success('Friend request accepted!');
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'friendRequests');
      toast.error('Failed to accept friend request');
    }
  };

  const handleAddFriend = async () => {
    if (!auth.currentUser || !profile || friendStatus !== 'none' || isOwnProfile) return;

    // --- Premium Limit Check ---
    try {
      const myProfileSnap = await getDoc(doc(db, 'users', auth.currentUser.uid));
      const myProfileData = myProfileSnap.data() as UserProfile;
      
      if (!myProfileData?.premium) {
        // Count confirmed friends
        const q = query(
          collection(db, 'friendRequests'),
          where('participants', 'array-contains', auth.currentUser.uid),
          where('status', '==', 'accepted')
        );
        const snap = await getDocs(q);
        if (snap.size >= 10) {
          toast.error("Free limit reached: 10 friend maximum. Upgrade to Premium for unlimited mates!", {
            duration: 6000
          });
          return;
        }
      }
    } catch (e) {
      console.error("Limit check error:", e);
    }

    try {
      await addDoc(collection(db, 'friendRequests'), {
        from: auth.currentUser.uid,
        to: profile.uid,
        participants: [auth.currentUser.uid, profile.uid],
        status: 'pending',
        friendshipType: friendshipData.type,
        closeness: friendshipData.closeness,
        createdAt: new Date().toISOString()
      });

      // Create notification for recipient
      const currentUserSnap = await getDoc(doc(db, 'users', auth.currentUser.uid));
      const currentUserData = currentUserSnap.data() as UserProfile;

      await addDoc(collection(db, 'notifications'), {
        uid: profile.uid,
        fromId: auth.currentUser.uid,
        fromName: currentUserData.username,
        fromPhoto: currentUserData.photoURL,
        type: 'friend_request',
        text: `sent you a ${friendshipData.type.toLowerCase()} friend request!`,
        timestamp: new Date().toISOString(),
        read: false
      });

      setShowFriendModal(false);
      toast.success('Friend request sent!');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const toggleVisibility = async (field: 'showOnMap' | 'showOnDiscover') => {
    if (!profile) return;
    try {
      await setDoc(doc(db, 'users', profile.uid), {
        [field]: !profile[field]
      }, { merge: true });
      toast.success(`${field === 'showOnMap' ? 'Map' : 'Discover'} visibility updated!`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleAiVerification = async (imageSrc: string) => {
    if (!profile?.premium) {
      toast.error("AI Verification is a Premium feature!", {
        description: "Upgrade to Premium to verify your business with AI."
      });
      return;
    }
    setIsVerifying(true);
    setAiVerificationResult(null);
    try {
      const ai = getAi();
      if (!ai) {
        toast.error('AI Verification unavailable (API Key missing)');
        setIsVerifying(false);
        return;
      }
      const prompt = "Analyze this image. Is it a selfie of a person with a shop/business in the background? Answer only with 'YES' or 'NO'.";
      const result = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{
          parts: [
            { text: prompt },
            { inlineData: { mimeType: "image/jpeg", data: imageSrc.split(',')[1] } }
          ]
        }]
      });
      
      const response = result.text?.trim().toUpperCase() || '';
      if (response.includes('YES')) {
        setAiVerificationResult('success');
      } else {
        setAiVerificationResult('error');
      }
    } catch (err) {
      console.error('Verification error:', err);
      toast.error('AI Verification failed. Please try again.');
      setAiVerificationResult('error');
    } finally {
      setIsVerifying(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  if (!profile) return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center min-h-[400px]">
      <div className="w-20 h-20 bg-white/5 rounded-[2.5rem] flex items-center justify-center text-white/20 mb-6 border border-white/5">
        <AlertTriangle className="w-10 h-10" />
      </div>
      <h3 className="text-2xl font-black text-white italic uppercase mb-2">Profile not found</h3>
      <p className="text-[10px] text-white/30 max-w-xs font-black uppercase tracking-widest">This user might have deleted their account or the profile was not properly created.</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-4 lg:p-8">
      <div className="bg-[#020617]/90 rounded-3xl lg:rounded-[3rem] shadow-2xl overflow-hidden border border-blue-500/20 backdrop-blur-3xl relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.1),transparent_70%)] pointer-events-none" />
        <div className="h-32 lg:h-48 bg-gradient-to-r from-blue-950 via-blue-900 to-blue-800 relative">
          <div className="absolute inset-0 bg-blue-600/5 backdrop-blur-sm" />
          <div className="absolute -bottom-12 lg:-bottom-16 left-6 lg:left-12">
            <div 
              className={cn("relative group", hasActiveMoment && "cursor-pointer")}
              onClick={() => hasActiveMoment && onMomentClick?.(profileId)}
            >
              <div className={cn(
                "p-1 rounded-2xl lg:rounded-[2.5rem] transition-all duration-500",
                hasActiveMoment && "bg-gradient-to-tr from-blue-500 via-blue-400 to-blue-500 animate-pulse shadow-[0_0_30px_rgba(59,130,246,0.6)]"
              )}>
                <UserAvatar 
                  src={profile.photoURL} 
                  username={profile.username} 
                  size="xl" 
                  className="w-24 h-24 lg:w-40 lg:h-40 rounded-2xl lg:rounded-[2.5rem] border-4 lg:border-8 border-[#020617] shadow-2xl" 
                />
                
                {/* XP Level Badge Overlay */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[8px] lg:text-[10px] font-black px-2 lg:px-3 py-0.5 lg:py-1 rounded-full border-2 border-[#020617] shadow-xl z-20 whitespace-nowrap">
                  LVL {Math.floor((profile.xp || 0) / 100) + 1}
                </div>
              </div>
              {profile.mood?.emoji ? (
                <div className="absolute -bottom-2 -right-2 lg:-bottom-3 lg:-right-3 w-10 h-10 lg:w-14 lg:h-14 bg-[#020617] rounded-2xl lg:rounded-3xl border-4 border-blue-500/30 shadow-2xl flex items-center justify-center text-xl lg:text-3xl animate-bounce-slow">
                  {profile.mood.emoji}
                </div>
              ) : profile.isOnline && (
                <div className="absolute bottom-1 right-1 lg:bottom-2 lg:right-2 w-4 h-4 lg:w-6 lg:h-6 bg-green-500 rounded-full border-2 lg:border-4 border-[#020617] shadow-lg shadow-green-500/20"></div>
              )}
            </div>
          </div>
          {isOwnProfile && (
            <div className="absolute top-4 right-4 flex gap-2">
              <button 
                onClick={() => toggleVisibility('showOnMap')}
                className={cn("p-2 rounded-xl transition shadow-lg border border-white/10", profile.showOnMap ? "bg-blue-600 text-white" : "bg-black/20 text-white backdrop-blur-md")}
                title="Toggle Map Visibility"
              >
                <Map className="w-5 h-5" />
              </button>
              <button 
                onClick={() => toggleVisibility('showOnDiscover')}
                className={cn("p-2 rounded-xl transition shadow-lg border border-white/10", profile.showOnDiscover ? "bg-blue-600 text-white" : "bg-black/20 text-white backdrop-blur-md")}
                title="Toggle Discover Visibility"
              >
                <Compass className="w-5 h-5" />
              </button>
              <button 
                onClick={onSettings}
                className="p-2 rounded-xl bg-black/20 text-white backdrop-blur-md hover:bg-black/40 border border-white/10 transition shadow-lg"
                title="Settings"
              >
                <SettingsIcon className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        <div className="pt-16 lg:pt-20 px-6 lg:px-12 pb-8 lg:pb-12 bg-transparent">
          <div className="flex flex-col lg:flex-row justify-between items-start gap-4 lg:gap-6 mb-8">
            <div className="w-full lg:w-auto">
              <h1 className="text-2xl lg:text-4xl font-black tracking-tighter text-white mb-1 italic uppercase">{profile.username}</h1>
              <div className="flex items-center gap-2 text-white/40 font-black text-[10px] lg:text-[11px] uppercase tracking-widest">
                <MapPin className="w-3 h-3 lg:w-4 lg:h-4 text-blue-400" />
                <span>{profile.profession}</span>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <div className="flex items-center gap-1.5 bg-blue-600/10 text-blue-400 px-2 py-1 rounded-lg border border-blue-500/20">
                  <Trophy className="w-3 h-3" />
                  <span className="text-[9px] lg:text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Top 5% Explorer</span>
                </div>
                <div className="flex items-center gap-1.5 bg-purple-600/10 text-purple-400 px-2 py-1 rounded-lg border border-purple-500/20">
                  <Medal className="w-3 h-3" />
                  <span className="text-[9px] lg:text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Master Rank</span>
                </div>
                <div className="flex items-center gap-1.5 bg-yellow-600/10 text-yellow-500 px-2 py-1 rounded-lg border border-yellow-500/20">
                  <Zap className="w-3 h-3" />
                  <span className="text-[9px] lg:text-[10px] font-black uppercase tracking-widest whitespace-nowrap">{profile.xp || 0} XP</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:flex lg:flex-wrap gap-2 lg:gap-3 w-full lg:w-auto">
              {isOwnProfile && (
                <>
                  <div className="col-span-2 lg:col-span-1">
                    <MoodPicker userProfile={profile} onUpdate={setProfile} />
                  </div>
                </>
              )}
              {!isOwnProfile ? (
                <>
                  <button 
                    onClick={() => {
                      if (friendStatus === 'none') setShowFriendModal(true);
                      else if (friendStatus === 'pending' && isIncoming) handleAcceptFriend();
                    }}
                    disabled={friendStatus === 'pending' && !isIncoming}
                    className={cn(
                      "px-4 lg:px-6 py-3 rounded-xl lg:rounded-2xl font-black tracking-tight transition shadow-xl flex items-center justify-center gap-2 text-xs lg:text-base italic uppercase",
                      friendStatus === 'friends' ? "bg-blue-600/20 text-blue-400 border border-blue-500/30" : 
                      (friendStatus === 'pending' && isIncoming) ? "bg-green-600 text-white hover:bg-green-700 shadow-green-500/20" :
                      friendStatus === 'pending' ? "bg-white/5 text-white/20 border border-white/5" : "bg-blue-600 text-white hover:bg-blue-500 shadow-blue-500/20"
                    )}
                  >
                    {friendStatus === 'friends' ? <Check className="w-4 h-4 lg:w-5 lg:h-5" /> : 
                     (friendStatus === 'pending' && isIncoming) ? <UserCheck className="w-4 h-4 lg:w-5 lg:h-5" /> :
                     friendStatus === 'pending' ? <Clock className="w-4 h-4 lg:w-5 lg:h-5" /> :
                     <UserPlus className="w-4 h-4 lg:w-5 lg:h-5" />}
                    <span className="truncate">
                      {friendStatus === 'friends' ? 'Mates' : 
                       (friendStatus === 'pending' && isIncoming) ? 'Accept' :
                       friendStatus === 'pending' ? 'Requested' : 'Add Friend'}
                    </span>
                  </button>
                  {friendStatus === 'friends' && (
                    <button 
                      onClick={() => onMessage(profile.uid)}
                      className="px-4 lg:px-6 py-3 bg-white/5 text-white border border-white/10 rounded-xl lg:rounded-2xl font-black tracking-tight hover:bg-white/10 transition shadow-xl flex items-center justify-center gap-2 text-xs lg:text-base italic uppercase"
                    >
                      <MessageCircle className="w-4 h-4 lg:w-5 lg:h-5" /> <span className="truncate">Message</span>
                    </button>
                  )}
                  <div className="col-span-2 flex gap-2">
                    <button 
                      onClick={() => {
                        toast.info(`Locating ${profile.username} on map...`);
                      }}
                      className="flex-1 p-3 bg-white/5 text-white border border-white/10 rounded-xl lg:rounded-2xl hover:bg-white/10 transition flex items-center justify-center"
                    >
                      <Plane className="w-5 h-5 lg:w-6 lg:h-6" />
                    </button>
                  </div>
                </>
              ) : (
                <div className="col-span-2 grid grid-cols-2 gap-2">
                  <button 
                    onClick={onSettings}
                    className="col-span-2 lg:col-span-1 px-8 py-4 bg-white/5 text-white border border-white/10 rounded-2xl font-black tracking-tight hover:bg-white/10 transition flex items-center justify-center gap-3 text-sm lg:text-lg shadow-xl italic uppercase"
                  >
                    <SettingsIcon className="w-5 h-5 lg:w-6 lg:h-6" /> Settings
                  </button>
                  {!profile.business ? null : (
                    <div className="col-span-2 flex flex-col gap-2">
                      <div className="flex gap-2">
                        <button 
                          onClick={async () => {
                            try {
                              await setDoc(doc(db, 'users', profile.uid), {
                                business: {
                                  ...profile.business,
                                  isShopOpen: !profile.business?.isShopOpen
                                }
                              }, { merge: true });
                              toast.success(`Shop is now ${!profile.business?.isShopOpen ? 'Open' : 'Closed'}`);
                            } catch (err) {
                              toast.error('Failed to update status');
                            }
                          }}
                          className={cn(
                            "flex-1 py-4 rounded-2xl font-black tracking-tight transition flex items-center justify-center gap-3 text-sm shadow-xl italic uppercase",
                            profile.business?.isShopOpen ? "bg-green-600/20 text-green-400 border border-green-500/30" : "bg-red-600/20 text-red-400 border border-red-500/30"
                          )}
                        >
                          <Power className="w-5 h-5" /> {profile.business?.isShopOpen ? 'Open' : 'Closed'}
                        </button>
                        <button 
                          onClick={async () => {
                            try {
                              await setDoc(doc(db, 'users', profile.uid), {
                                business: {
                                  ...profile.business,
                                  hasPowerOutage: !profile.business?.hasPowerOutage
                                }
                              }, { merge: true });
                              toast.success(`Power status updated!`);
                            } catch (err) {
                              toast.error('Failed to update power status');
                            }
                          }}
                          className={cn(
                            "flex-1 py-4 rounded-2xl font-black tracking-tight transition flex items-center justify-center gap-3 text-sm shadow-xl italic uppercase",
                            profile.business?.hasPowerOutage ? "bg-amber-600/20 text-amber-500 border border-amber-500/30" : "bg-white/5 text-white/40 border border-white/5"
                          )}
                        >
                          <BellRing className="w-5 h-5" /> {profile.business?.hasPowerOutage ? 'Outage' : 'Power OK'}
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={async () => {
                            try {
                              await setDoc(doc(db, 'users', profile.uid), {
                                business: {
                                  ...profile.business,
                                  showShopOnMap: !profile.business?.showShopOnMap
                                }
                              }, { merge: true });
                              toast.success(`Shop visibility updated!`);
                            } catch (err) {
                              toast.error('Failed to update visibility');
                            }
                          }}
                          className={cn(
                            "flex-1 py-4 rounded-2xl font-black tracking-tight transition flex items-center justify-center gap-3 text-sm shadow-xl bg-white/5 text-white border border-white/10 italic uppercase"
                          )}
                        >
                          {profile.business?.showShopOnMap ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                          {profile.business?.showShopOnMap ? 'On Map' : 'Hidden'}
                        </button>
                        <button 
                          onClick={() => setShowDeleteConfirm(true)}
                          className="px-6 py-4 bg-red-600/20 text-red-500 border border-red-500/30 rounded-2xl font-black tracking-tight hover:bg-red-600/30 transition flex items-center justify-center gap-3 text-sm shadow-xl"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6 lg:space-y-8">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] lg:text-xs font-black text-white/30 uppercase tracking-[0.3em] ml-1">Bio Protocol</h3>
                {isOwnProfile && (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setNewBio(profile.bio || '');
                        setShowBioModal(true);
                      }}
                      className="px-4 py-1.5 bg-blue-600/10 text-blue-400 border border-blue-500/20 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-blue-600/20 transition italic"
                    >
                      {profile.bio ? 'Mod Bio' : 'Add Bio'}
                    </button>
                  </div>
                )}
              </div>
              <p className="text-white/60 leading-relaxed font-black bg-white/5 p-4 lg:p-6 rounded-2xl lg:rounded-3xl border border-white/10 text-sm lg:text-base italic uppercase tracking-wider">{profile.bio || 'No bio found in memory.'}</p>
            </div>

            {/* Business Dashboard */}
            {isOwnProfile && profile.business && (
              <div className="mt-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-blue-600/20 border border-blue-500/30 rounded-2xl flex items-center justify-center text-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.2)]">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white leading-tight italic uppercase">Business Dashboard</h3>
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mt-1">Manage your shop & orders</p>
                  </div>
                </div>
                <BusinessDashboard userProfile={profile} />
              </div>
            )}

              {isOwnProfile && !profile.business && (
                <div className="mt-8 p-6 bg-blue-600/5 rounded-[2.5rem] border border-blue-500/20 flex items-center justify-between group overflow-hidden relative">
                  <div className="flex items-center gap-4 z-10">
                    <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] animate-pulse">
                      <Store className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-black text-white leading-tight italic uppercase">Map Your Business</h4>
                      <p className="text-[10px] font-bold text-blue-400/50 uppercase tracking-widest mt-1">Connect with local customers</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowBusinessModal(true)}
                    className="relative z-10 px-8 py-3 bg-white text-black rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-blue-400 hover:text-white transition"
                  >
                    Register
                  </button>
                  <div className="absolute right-0 top-0 w-24 h-24 bg-blue-500/10 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700 blur-2xl" />
                </div>
              )}

              {/* Moments Grid */}
            <div className="mt-12">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-pink-600/10 border border-pink-500/20 rounded-2xl flex items-center justify-center text-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.1)]">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white leading-tight italic uppercase">Moments</h3>
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mt-1">{moments.length} Memories shared</p>
                  </div>
                </div>
                {isOwnProfile && (
                  <button 
                    onClick={onAddMoment}
                    className="flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition shadow-[0_10px_25px_rgba(236,72,153,0.3)] italic"
                  >
                    <Plus className="w-3 h-3" />
                    New Moment
                  </button>
                )}
              </div>

              {moments.length > 0 ? (
                <div className="grid grid-cols-3 gap-2 lg:gap-4">
                  {moments.map((moment) => {
                    const isExpired = new Date(moment.expiresAt) < new Date();
                    return (
                      <button 
                        key={moment.id}
                        onClick={() => onMomentClick?.(moment.uid)}
                        className={cn(
                          "relative aspect-[9/16] rounded-2xl lg:rounded-3xl overflow-hidden group border border-white/5 bg-white/5",
                          isExpired && "opacity-50 grayscale"
                        )}
                      >
                        <img 
                          src={moment.mediaUrl} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                          alt="Moment" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex items-center gap-1 text-white">
                            <Eye className="w-3 h-3" />
                            <span className="text-[10px] font-black">{moment.viewsCount || 0}</span>
                          </div>
                          {isExpired && (
                            <span className="text-[8px] font-black text-white/60 bg-black/40 px-1.5 py-0.5 rounded-full uppercase">Expired</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="py-20 text-center bg-white/5 rounded-[3rem] border border-dashed border-white/10">
                  <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-white/5">
                    <Camera className="w-8 h-8 text-white/10" />
                  </div>
                  <h4 className="text-sm font-black text-white mb-1 italic uppercase">No moments shared</h4>
                  <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest italic">Moments disappear after 24h</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Friend Request Modal */}
      <AnimatePresence>
        {showFriendModal && (
          <div key="friend-request-modal-overlay" className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowFriendModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl">
              <h3 className="text-2xl font-black tracking-tighter text-neutral-900 mb-6">Add {profile.username}</h3>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-neutral-400 uppercase tracking-widest">Friendship Type</label>
                  <select 
                    value={friendshipData.type}
                    onChange={(e) => setFriendshipData({ ...friendshipData, type: e.target.value })}
                    className="w-full p-4 bg-neutral-50 border border-neutral-100 rounded-2xl font-bold text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option>Regular</option>
                    <option>Close Friend</option>
                    <option>Best Friend</option>
                    <option>Family</option>
                    <option>Work</option>
                    <option>Other</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-black text-neutral-400 uppercase tracking-widest">Closeness Level</label>
                    <span className="text-sm font-bold text-blue-600">{friendshipData.closeness}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" max="100" 
                    value={friendshipData.closeness} 
                    onChange={(e) => setFriendshipData({ ...friendshipData, closeness: parseInt(e.target.value) })}
                    className="w-full h-2 bg-neutral-100 rounded-full appearance-none cursor-pointer accent-blue-600"
                  />
                </div>
              </div>

              <button 
                onClick={handleAddFriend}
                className="w-full mt-8 py-4 bg-blue-600 text-white rounded-2xl font-black tracking-tight hover:bg-blue-700 transition shadow-xl shadow-blue-100"
              >
                Send Request
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Business Registration Modal */}
      <AnimatePresence>
        {showBusinessModal && (
          <div key="business-registration-modal-overlay" className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowBusinessModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }} 
              className="relative bg-white dark:bg-neutral-900 w-full max-w-xl rounded-[2.5rem] shadow-2xl max-h-[90vh] overflow-y-auto flex flex-col"
            >
              <div className="sticky top-0 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md z-10 p-8 pb-4 flex justify-between items-center border-b border-neutral-100 dark:border-neutral-800">
                <div>
                  <h3 className="text-2xl font-black tracking-tighter text-neutral-900 dark:text-white">Register Business</h3>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Step {registrationStep} of 3</p>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3].map(s => (
                    <div key={s} className={cn("w-8 h-1.5 rounded-full transition-all duration-500", registrationStep >= s ? "bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.3)]" : "bg-neutral-100 dark:bg-neutral-800")} />
                  ))}
                </div>
              </div>

              <div className="p-8 space-y-8">
                {registrationStep === 1 && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Shop Name</label>
                      <input 
                        type="text"
                        value={businessData.shopName}
                        onChange={(e) => setBusinessData({ ...businessData, shopName: e.target.value })}
                        placeholder="e.g. Ali's Pan Shop"
                        className="w-full p-5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl font-bold text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Category</label>
                      <div className="relative">
                        <input 
                          type="text"
                          value={categorySearch}
                          onChange={(e) => {
                            setCategorySearch(e.target.value);
                            setBusinessData({ ...businessData, category: e.target.value });
                          }}
                          placeholder="Search category..."
                          className="w-full p-5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl font-bold text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                        {categorySearch && filteredCategories.length > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl shadow-2xl z-20 overflow-hidden">
                            {filteredCategories.map(c => (
                              <button 
                                key={c}
                                onClick={() => {
                                  setBusinessData({ ...businessData, category: c });
                                  setCategorySearch(c);
                                }}
                                className="w-full p-4 text-left hover:bg-neutral-50 dark:hover:bg-neutral-700 font-bold text-sm border-b border-neutral-50 dark:border-neutral-700 last:border-0 transition-colors"
                              >
                                {c}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Open Time</label>
                        <input 
                          type="time"
                          value={businessData.openTime}
                          onChange={(e) => setBusinessData({ ...businessData, openTime: e.target.value })}
                          className="w-full p-5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl font-bold text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Close Time</label>
                        <input 
                          type="time"
                          value={businessData.closeTime}
                          onChange={(e) => setBusinessData({ ...businessData, closeTime: e.target.value })}
                          className="w-full p-5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl font-bold text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Phone Number</label>
                      <input 
                        type="tel"
                        value={businessData.phoneNumber}
                        onChange={(e) => setBusinessData({ ...businessData, phoneNumber: e.target.value })}
                        placeholder="+92 300 1234567"
                        className="w-full p-5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl font-bold text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>

                    <button 
                      onClick={() => {
                        if (!businessData.shopName || !businessData.category || !businessData.phoneNumber) {
                          toast.error('Please fill all fields');
                          return;
                        }
                        setRegistrationStep(2);
                      }}
                      className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black tracking-tight hover:bg-blue-700 transition shadow-xl shadow-blue-100 dark:shadow-none"
                    >
                      Next: Location Check
                    </button>
                  </div>
                )}

                {registrationStep === 2 && (
                  <div className="space-y-8 text-center py-4">
                    <div className="w-24 h-24 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-xl shadow-blue-100 dark:shadow-none">
                      <MapPin className="w-12 h-12" />
                    </div>
                    <div className="space-y-3">
                      <h4 className="text-2xl font-black tracking-tighter text-neutral-900 dark:text-white">Location Verification</h4>
                      <p className="text-sm text-neutral-500 font-medium max-w-xs mx-auto">You must be physically present at your shop to register.</p>
                    </div>
                    
                    <div className="bg-neutral-50 dark:bg-neutral-800 p-8 rounded-[2rem] border border-neutral-100 dark:border-neutral-700 text-left shadow-inner">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Live Coordinates</span>
                      </div>
                      <p className="font-mono text-sm font-bold text-neutral-600 dark:text-neutral-300 space-y-1">
                        <span className="block">Lat: {profile.location?.lat.toFixed(6)}</span>
                        <span className="block">Lng: {profile.location?.lng.toFixed(6)}</span>
                      </p>
                    </div>

                    <div className="flex gap-4">
                      <button 
                        onClick={() => setRegistrationStep(1)}
                        className="flex-1 py-5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-2xl font-black tracking-tight hover:bg-neutral-200 dark:hover:bg-neutral-700 transition"
                      >
                        Back
                      </button>
                      <button 
                        onClick={() => setRegistrationStep(3)}
                        className="flex-[2] py-5 bg-blue-600 text-white rounded-2xl font-black tracking-tight hover:bg-blue-700 transition shadow-xl shadow-blue-100 dark:shadow-none"
                      >
                        Confirm Location
                      </button>
                    </div>
                  </div>
                )}

                {registrationStep === 3 && (
                  <div className="space-y-8 py-4">
                    <div className="space-y-3 text-center">
                      <h4 className="text-2xl font-black tracking-tighter text-neutral-900 dark:text-white">Owner Selfie & Shop Check</h4>
                      <p className="text-sm text-neutral-500 font-medium max-w-xs mx-auto">Take a selfie with your shop in the background for AI verification.</p>
                    </div>

                    <div className="relative rounded-[2.5rem] overflow-hidden bg-neutral-100 dark:bg-neutral-800 aspect-video shadow-2xl border-4 border-white dark:border-neutral-800 group">
                      {businessData.ownerSelfie ? (
                        <img src={businessData.ownerSelfie} className="w-full h-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                          <div className="w-16 h-16 bg-white dark:bg-neutral-700 rounded-full flex items-center justify-center shadow-xl">
                            <Camera className="w-8 h-8 text-blue-600" />
                          </div>
                          <p className="text-xs font-black text-neutral-400 uppercase tracking-widest">No Image Captured</p>
                        </div>
                      )}
                      
                      {businessData.ownerSelfie && (
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button 
                            onClick={() => {
                              setBusinessData({ ...businessData, ownerSelfie: '' });
                              setAiVerificationResult(null);
                              setCapturedImage(null);
                            }}
                            className="p-4 bg-white text-red-600 rounded-2xl shadow-2xl hover:scale-110 transition active:scale-95"
                          >
                            <Trash2 className="w-6 h-6" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      {!businessData.ownerSelfie ? (
                        <button 
                          onClick={() => setIsCameraOpen(true)}
                          className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black tracking-tight hover:bg-blue-700 transition shadow-xl shadow-blue-100 dark:shadow-none flex items-center justify-center gap-3"
                        >
                          <Camera className="w-6 h-6" />
                          Open Full Camera
                        </button>
                      ) : (
                        <div className="space-y-4">
                          {aiVerificationResult === 'success' && (
                            <div className="bg-green-50 dark:bg-green-900/20 p-5 rounded-2xl border border-green-100 dark:border-green-800 flex items-center gap-4">
                              <div className="w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center shadow-lg">
                                <Check className="w-6 h-6" />
                              </div>
                              <div>
                                <p className="text-sm font-black text-green-700 dark:text-green-400">AI Verified Successfully!</p>
                                <p className="text-[10px] font-bold text-green-600/70 dark:text-green-500/70 uppercase tracking-widest">Shop detected in background</p>
                              </div>
                            </div>
                          )}

                          {aiVerificationResult === 'error' && (
                            <div className="bg-red-50 dark:bg-red-900/20 p-5 rounded-2xl border border-red-100 dark:border-red-800 flex items-center gap-4">
                              <div className="w-10 h-10 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg">
                                <AlertTriangle className="w-6 h-6" />
                              </div>
                              <div>
                                <p className="text-sm font-black text-red-700 dark:text-red-400">Verification Failed</p>
                                <p className="text-[10px] font-bold text-red-600/70 dark:text-red-500/70 uppercase tracking-widest">Shop not detected, please try again</p>
                              </div>
                            </div>
                          )}

                          {aiVerificationResult === 'success' ? (
                            <button 
                              onClick={async () => {
                                setIsVerifying(true);
                                try {
                                  // Convert base64 to Blob
                                  const response = await fetch(businessData.ownerSelfie);
                                  const blob = await response.blob();
                                  
                                  const path = `business/${profile.uid}/${Date.now()}_selfie.jpg`;
                                  const selfieUrl = await uploadFile('moments', path, blob);

                                  if (!selfieUrl) {
                                    throw new Error("Selfie upload failed: No URL returned");
                                  }

                                  const businessProfile = {
                                    shopName: businessData.shopName,
                                    category: businessData.category,
                                    shopPhotoURL: selfieUrl,
                                    ownerSelfieURL: selfieUrl,
                                    isVerified: true,
                                    isBlueTick: true,
                                    timings: {
                                      open: businessData.openTime,
                                      close: businessData.closeTime
                                    },
                                    phoneNumber: businessData.phoneNumber,
                                    location: {
                                      lat: profile.location?.lat || 0,
                                      lng: profile.location?.lng || 0
                                    },
                                    showShopOnMap: true,
                                    isShopOpen: true,
                                    hasPowerOutage: false,
                                    lastInteraction: new Date().toISOString(),
                                    rushStatus: 'low'
                                  };

                                  await setDoc(doc(db, 'users', profile.uid), {
                                    business: businessProfile
                                  }, { merge: true });

                                  toast.success('Business Registered Successfully!', {
                                    description: 'Your shop is now verified with a Blue Tick.'
                                  });
                                  setShowBusinessModal(false);
                                } catch (err) {
                                  handleFirestoreError(err, OperationType.UPDATE, `users/${profile.uid}`);
                                  toast.error('Registration failed. Please try again.');
                                } finally {
                                  setIsVerifying(false);
                                }
                              }}
                              disabled={isVerifying}
                              className="w-full py-5 bg-green-600 text-white rounded-2xl font-black tracking-tight hover:bg-green-700 transition flex items-center justify-center gap-3 shadow-xl shadow-green-100 dark:shadow-none disabled:opacity-50"
                            >
                              {isVerifying ? (
                                <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                              ) : (
                                <ShieldCheck className="w-6 h-6" />
                              )}
                              Upload & Verify
                            </button>
                          ) : (
                            <button 
                              onClick={() => setIsCameraOpen(true)}
                              className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black tracking-tight hover:bg-blue-700 transition flex items-center justify-center gap-3"
                            >
                              <Camera className="w-6 h-6" />
                              Retake Photo
                            </button>
                          )}
                        </div>
                      )}

                      <button 
                        onClick={() => setRegistrationStep(2)}
                        disabled={isVerifying}
                        className="w-full py-5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-2xl font-black tracking-tight hover:bg-neutral-200 dark:hover:bg-neutral-700 transition disabled:opacity-50"
                      >
                        Back
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Bio Modal */}
      <AnimatePresence>
        {showBioModal && (
          <div key="bio-modal-overlay" className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowBioModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }} 
              className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl flex flex-col max-h-[80vh]"
            >
              <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-black tracking-tighter text-neutral-900">Update Bio</h3>
                  <button onClick={() => setShowBioModal(false)} className="p-2 hover:bg-neutral-100 rounded-full transition">
                    <X className="w-5 h-5 text-neutral-500" />
                  </button>
                </div>
                
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Your Bio</label>
                    <textarea 
                      value={newBio}
                      onChange={(e) => setNewBio(e.target.value)}
                      placeholder="Write your bio..."
                      className="w-full h-40 p-5 bg-neutral-50 border border-neutral-100 rounded-2xl font-bold text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                      maxLength={500}
                    />
                    <div className="text-right text-[10px] font-black text-neutral-300 uppercase tracking-widest">
                      {newBio.length}/500
                    </div>
                  </div>
                </div>

                <button 
                  onClick={async () => {
                    if (!auth.currentUser) return;
                    try {
                      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
                        bio: newBio
                      });
                      toast.success('Bio updated successfully!');
                      setShowBioModal(false);
                    } catch (err) {
                      toast.error('Failed to update bio');
                    }
                  }}
                  className="w-full mt-8 py-4 bg-blue-600 text-white rounded-2xl font-black tracking-tight hover:bg-blue-700 transition shadow-xl shadow-blue-100"
                >
                  Confirm Bio
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Full Screen Camera Overlay */}
      <AnimatePresence>
        {isCameraOpen && (
          <motion.div 
            key="camera-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[5000] bg-black flex flex-col"
          >
            {!capturedImage ? (
              <>
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  className="absolute inset-0 w-full h-full object-cover"
                  videoConstraints={{
                    facingMode: "user",
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                  }}
                  disablePictureInPicture={true}
                  forceScreenshotSourceSize={true}
                  imageSmoothing={true}
                  mirrored={false}
                  onUserMedia={() => {}}
                  onUserMediaError={() => {}}
                  screenshotQuality={1}
                />
                
                {/* Camera UI */}
                <div className="relative h-full w-full flex flex-col justify-between p-8">
                  <button 
                    onClick={() => setIsCameraOpen(false)}
                    className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white hover:bg-white/30 transition"
                  >
                    <ArrowLeft className="w-6 h-6" />
                  </button>

                  <div className="flex justify-center pb-12">
                    <button 
                      onClick={() => {
                        const imageSrc = webcamRef.current?.getScreenshot();
                        if (imageSrc) {
                          setCapturedImage(imageSrc);
                          handleAiVerification(imageSrc);
                        }
                      }}
                      className="w-20 h-20 bg-white rounded-full border-8 border-white/30 flex items-center justify-center shadow-2xl hover:scale-110 transition active:scale-95"
                    >
                      <div className="w-14 h-14 bg-white rounded-full border-2 border-neutral-200" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="relative h-full w-full bg-black">
                <img src={capturedImage} className="w-full h-full object-cover" />
                
                <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center p-8 text-center">
                  {isVerifying ? (
                    <div className="space-y-6">
                      <div className="w-20 h-20 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
                      <div className="space-y-2">
                        <h4 className="text-2xl font-black text-white tracking-tighter">Verifying Shop...</h4>
                        <p className="text-sm text-white/60 font-medium">AI is analyzing your background</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-8 w-full max-w-xs">
                      {aiVerificationResult === 'success' ? (
                        <>
                          <div className="w-24 h-24 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-green-500/40">
                            <Check className="w-12 h-12" />
                          </div>
                          <div className="space-y-2">
                            <h4 className="text-2xl font-black text-white tracking-tighter">Verification Success!</h4>
                            <p className="text-sm text-white/60 font-medium">Shop detected. You can now proceed.</p>
                          </div>
                          <button 
                            onClick={() => {
                              setBusinessData({ ...businessData, ownerSelfie: capturedImage });
                              setIsCameraOpen(false);
                            }}
                            className="w-full py-5 bg-white text-blue-600 rounded-2xl font-black tracking-tight hover:bg-neutral-100 transition shadow-2xl"
                          >
                            Use This Photo
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="w-24 h-24 bg-red-500 text-white rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-red-500/40">
                            <AlertTriangle className="w-12 h-12" />
                          </div>
                          <div className="space-y-2">
                            <h4 className="text-2xl font-black text-white tracking-tighter">Verification Failed</h4>
                            <p className="text-sm text-white/60 font-medium">Shop not detected in background. Please try again.</p>
                          </div>
                          <button 
                            onClick={() => {
                              setCapturedImage(null);
                              setAiVerificationResult(null);
                            }}
                            className="w-full py-5 bg-white text-red-600 rounded-2xl font-black tracking-tight hover:bg-neutral-100 transition shadow-2xl"
                          >
                            Retake Photo
                          </button>
                          <button 
                            onClick={() => setIsCameraOpen(false)}
                            className="w-full py-5 bg-white/10 text-white rounded-2xl font-black tracking-tight hover:bg-white/20 transition"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Business Confirmation */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div key="delete-business-confirm-overlay" className="fixed inset-0 z-[4000] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDeleteConfirm(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black tracking-tighter text-neutral-900 mb-2">Delete Business?</h3>
              <p className="text-sm text-neutral-500 font-medium mb-8">This will remove your shop from the map and all business data. This action cannot be undone.</p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-4 bg-neutral-100 text-neutral-600 rounded-2xl font-black tracking-tight hover:bg-neutral-200 transition"
                >
                  Cancel
                </button>
                <button 
                  onClick={async () => {
                    if (!profile) return;
                    try {
                      const userRef = doc(db, 'users', profile.uid);
                      await updateDoc(userRef, {
                        business: null
                      });
                      toast.success('Business account deleted');
                      setShowDeleteConfirm(false);
                    } catch (err) {
                      handleFirestoreError(err, OperationType.UPDATE, `users/${profile.uid}`);
                      toast.error('Failed to delete business');
                    }
                  }}
                  className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black tracking-tight hover:bg-red-700 transition"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
