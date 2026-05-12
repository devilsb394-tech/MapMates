import React, { useState, useEffect } from 'react';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../firebase/firebase';
import { collection, query, where, orderBy, onSnapshot, limit, deleteDoc, doc, getDoc, updateDoc, setDoc, getDocs, writeBatch, serverTimestamp } from 'firebase/firestore';
import { UserProfile, HistoryItem, AppNotification } from '../types';
import { User, Shield, Bell, Trash2, Save, Camera, ChevronRight, Globe, Lock, History, Check, X, Users, PlayCircle, Heart, Baby, Search, Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { deleteUser, reauthenticateWithPopup } from 'firebase/auth';
import { rtdb } from '../firebase/firebase';
import { uploadFile } from '../supabase/supabase';
import { cn, handleQuotaError } from '../lib/utils';
import { UserAvatar } from './UserAvatar';

interface SettingsProps {
  initialSection?: string;
  darkMode: boolean;
  onDarkModeToggle: () => void;
  onTabChange?: (tab: string) => void;
  onClose?: () => void;
  onMessage?: (id: string) => void;
  onFlyTo?: (lat: number, lng: number) => void;
}

const Settings: React.FC<SettingsProps> = ({ 
  initialSection, 
  darkMode, 
  onDarkModeToggle,
  onTabChange,
  onClose,
  onMessage,
  onFlyTo
}) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState(initialSection || 'profile');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showParentSetup, setShowParentSetup] = useState(false);
  const [showChildSetup, setShowChildSetup] = useState(false);
  const [childCount, setChildCount] = useState(1);
  const [tempSelectedChildren, setTempSelectedChildren] = useState<string[]>([]);
  const [tempSelectedParents, setTempSelectedParents] = useState<string[]>([]);
  const [parentType, setParentType] = useState<'mother' | 'father' | 'both' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);

  const [parentSetupStep, setParentSetupStep] = useState<'count' | 'select'>('count');
  const [childSetupStep, setChildSetupStep] = useState<'type' | 'select'>('type');
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (!auth.currentUser) return;
    const fetchProfile = async () => {
      const snap = await getDoc(doc(db, 'users', auth.currentUser!.uid));
      if (snap.exists()) setProfile(snap.data() as UserProfile);
      setLoading(false);
    };
    fetchProfile();

    // Fetch all users for selection
    const fetchAllUsers = async () => {
      const q = query(collection(db, 'users'), limit(100));
      const snap = await getDocs(q);
      const users = snap.docs.map(d => d.data() as UserProfile).filter(u => u.uid !== auth.currentUser?.uid);
      setAllUsers(users);
    };
    fetchAllUsers();

    // Fetch history
    const qHistory = query(
      collection(db, 'history'),
      where('uid', '==', auth.currentUser.uid),
      orderBy('timestamp', 'desc'),
      limit(20)
    );
    // Fetch history
    const fetchHistory = async () => {
      if (!auth.currentUser) return;
      try {
        const qHistory = query(
          collection(db, 'history'),
          where('uid', '==', auth.currentUser.uid),
          orderBy('timestamp', 'desc'),
          limit(20)
        );
        const snap = await getDocs(qHistory);
        setHistory(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as HistoryItem)));
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'history');
      }
    };

    // Fetch notifications
    const fetchNotifications = async () => {
      if (!auth.currentUser) return;
      try {
        const qNotif = query(
          collection(db, 'notifications'),
          where('uid', '==', auth.currentUser.uid),
          orderBy('timestamp', 'desc'),
          limit(20)
        );
        const snap = await getDocs(qNotif);
        setNotifications(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppNotification)));
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'notifications');
      }
    };

    fetchHistory();
    fetchNotifications();
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !profile) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'users', auth.currentUser.uid), { ...profile }, { merge: true });
      toast.success('Settings updated successfully!');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const togglePrivacy = async (field: 'showOnMap' | 'privateProfile' | 'showOnDiscover' | 'showFriendsOnlyOnMap' | 'showFriendsOnlyMoments') => {
    if (!auth.currentUser || !profile) return;
    const newVal = !profile[field];
    setProfile({ ...profile, [field]: newVal });
    try {
      await setDoc(doc(db, 'users', auth.currentUser.uid), { [field]: newVal }, { merge: true });
      toast.success(`${field.replace(/([A-Z])/g, ' $1')} updated!`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleClearAllNotifications = async () => {
    if (!auth.currentUser) return;
    try {
      const q = query(collection(db, 'notifications'), where('uid', '==', auth.currentUser.uid));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.forEach(d => batch.delete(d.ref));
      await batch.commit();
      setNotifications([]);
      toast.success('All notifications cleared!');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleClearAllHistory = async () => {
    if (!auth.currentUser) return;
    try {
      const q = query(collection(db, 'history'), where('uid', '==', auth.currentUser.uid));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.forEach(d => batch.delete(d.ref));
      await batch.commit();
      setHistory([]);
      toast.success('Activity history cleared!');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleAcceptFriend = async (notif: AppNotification) => {
    if (!auth.currentUser || !notif.fromId) return;
    try {
      const q = query(
        collection(db, 'friendRequests'),
        where('from', '==', notif.fromId),
        where('to', '==', auth.currentUser.uid),
        where('status', '==', 'pending')
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        await updateDoc(doc(db, 'friendRequests', snap.docs[0].id), {
          status: 'accepted',
          acceptedAt: serverTimestamp()
        });
        
        // Update notification
        await updateDoc(doc(db, 'notifications', notif.id), { read: true });
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
        
        toast.success('Friend request accepted!');
      }
    } catch (err) {
      console.error('Accept friend error:', err);
      toast.error('Failed to accept friend request');
    }
  };

  const handleRejectFriend = async (notif: AppNotification) => {
    if (!auth.currentUser || !notif.fromId) return;
    try {
      const q = query(
        collection(db, 'friendRequests'),
        where('from', '==', notif.fromId),
        where('to', '==', auth.currentUser.uid),
        where('status', '==', 'pending')
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        await deleteDoc(doc(db, 'friendRequests', snap.docs[0].id));
        
        // Delete notification
        await deleteDoc(doc(db, 'notifications', notif.id));
        setNotifications(prev => prev.filter(n => n.id !== notif.id));
        
        toast.success('Friend request rejected');
      }
    } catch (err) {
      console.error('Reject friend error:', err);
      toast.error('Failed to reject friend request');
    }
  };

  const handleUserSearch = async (queryStr: string) => {
    if (!queryStr.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const q = query(
        collection(db, 'users'),
        where('username', '>=', queryStr),
        where('username', '<=', queryStr + '\uf8ff'),
        limit(10)
      );
      const snap = await getDocs(q);
      setSearchResults(snap.docs.map(d => d.data() as UserProfile).filter(u => u.uid !== auth.currentUser?.uid));
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'users');
    } finally {
      setSearching(false);
    }
  };

  const saveParentMode = async () => {
    if (!auth.currentUser || !profile) return;
    if (tempSelectedChildren.length !== childCount) {
      toast.error(`Please select exactly ${childCount} children.`);
      return;
    }
    const parentMode = {
      enabled: true,
      children: tempSelectedChildren,
      childCount: childCount
    };
    try {
      await setDoc(doc(db, 'users', auth.currentUser.uid), { 
        parentMode,
        childMode: { enabled: false, parents: [], type: null } // Mutually exclusive
      }, { merge: true });
      setProfile({ ...profile, parentMode, childMode: { enabled: false, parents: [], type: null } });
      setShowParentSetup(false);
      toast.success('Parent Mode activated!');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const saveChildMode = async () => {
    if (!auth.currentUser || !profile) return;
    const limit = parentType === 'both' ? 2 : 1;
    if (tempSelectedParents.length !== limit) {
      toast.error(`Please select exactly ${limit} parent(s).`);
      return;
    }
    const childMode = {
      enabled: true,
      parents: tempSelectedParents,
      type: parentType
    };
    try {
      await setDoc(doc(db, 'users', auth.currentUser.uid), { 
        childMode,
        parentMode: { enabled: false, children: [], childCount: 0 } // Mutually exclusive
      }, { merge: true });
      setProfile({ ...profile, childMode, parentMode: { enabled: false, children: [], childCount: 0 } });
      setShowChildSetup(false);
      toast.success('Child Mode activated!');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-full gap-4 bg-[#020617]">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full" />
        <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin shadow-[0_0_15px_#3b82f6]" />
      </div>
      <p className="text-blue-400/60 font-black uppercase tracking-[0.3em] text-[10px]">Loading Profile...</p>
    </div>
  );

  const sections = [
    { id: 'profile', label: 'User Profile', icon: User },
    { id: 'privacy', label: 'Neural Protocols', icon: Shield },
    { id: 'notifications', label: 'Sync Logs', icon: Bell },
    { id: 'history', label: 'Relay Data', icon: History },
  ];

  return (
    <div className="w-full h-full bg-[#020617] overflow-hidden flex flex-col relative">
      {/* Background Glows */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-900/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Header Area */}
      <div className="px-6 sm:px-12 pt-10 pb-6 shrink-0 relative z-10 flex items-center justify-between">
        <div>
          <h2 className="text-4xl sm:text-5xl font-black tracking-tighter text-white uppercase italic leading-none">Settings</h2>
          <p className="text-[10px] text-blue-400 font-black uppercase tracking-[0.4em] mt-3">Registry Configuration</p>
        </div>
        <button 
          onClick={onClose}
          className="w-14 h-14 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center justify-center transition-all group hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.05)]"
        >
          <X className="w-8 h-8 text-white/40 group-hover:text-white transition-colors" />
        </button>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-8 sm:gap-12 px-6 sm:px-12 pb-12 overflow-hidden relative z-10">
        {/* Navigation Sidebar */}
        <div className="w-full md:w-80 flex flex-row md:flex-col gap-3 overflow-x-auto md:overflow-x-visible pb-4 md:pb-0 shrink-0 custom-scrollbar">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={cn(
                "flex items-center justify-between px-6 py-5 rounded-[1.8rem] font-black text-[11px] uppercase tracking-[0.15em] transition-all duration-500 whitespace-nowrap border relative group",
                activeSection === section.id 
                  ? "bg-blue-600 text-white border-blue-500 shadow-[0_0_30px_rgba(37,99,235,0.3)] scale-105 z-10" 
                  : "bg-white/5 text-white/40 border-white/5 hover:border-white/20 hover:bg-white/[0.08]"
              )}
            >
              <div className="flex items-center gap-4">
                <section.icon className={cn("w-5 h-5 transition-transform group-hover:scale-110", activeSection === section.id ? "text-white" : "text-white/20")} />
                <span>{section.label}</span>
              </div>
              <ChevronRight className={cn("w-4 h-4 opacity-0 transition-opacity hidden md:block", activeSection === section.id && "opacity-100")} />
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-white/[0.03] backdrop-blur-3xl rounded-[3rem] shadow-2xl border border-white/5 p-8 sm:p-14 overflow-y-auto custom-scrollbar relative overflow-x-hidden">
          {activeSection === 'profile' && profile && (
            <form onSubmit={handleUpdate} className="space-y-10 max-w-3xl mx-auto">
              <div className="flex flex-col sm:flex-row items-center gap-10 mb-12">
                <div className="relative group">
                  <div className="absolute -inset-2 bg-blue-500/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                  <UserAvatar 
                    src={profile.photoURL} 
                    username={profile.username} 
                    size="xl" 
                    className="border-3 border-blue-500/30 relative z-10 shadow-[0_0_30px_rgba(59,130,246,0.3)] w-32 h-32 sm:w-40 sm:h-40"
                  />
                  <input
                    type="file"
                    id="avatar-upload"
                    className="hidden"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file || !auth.currentUser) return;
                      
                      toast.promise(async () => {
                        const path = `avatars/${auth.currentUser?.uid}/${Date.now()}_${file.name}`;
                        const url = await uploadFile('moments', path, file);

                        if (!url) {
                          throw new Error("Avatar upload failed: No URL returned");
                        }

                        await updateDoc(doc(db, 'users', auth.currentUser!.uid), { photoURL: url });
                        setProfile({ ...profile, photoURL: url });
                      }, {
                        loading: 'Uploading photo...',
                        success: 'Profile photo updated!',
                        error: 'Failed to upload photo'
                      });
                    }}
                  />
                  <button 
                    type="button"
                    onClick={() => document.getElementById('avatar-upload')?.click()}
                    className="absolute inset-0 bg-blue-600/40 backdrop-blur-md rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-500 z-20 cursor-pointer"
                  >
                    <Camera className="w-8 h-8 text-white" />
                  </button>
                </div>
                <div className="text-center sm:text-left flex-1 min-w-0">
                  <h3 className="text-3xl sm:text-4xl font-black tracking-tighter text-white mb-2 uppercase italic truncate">{profile.username}</h3>
                  <p className="text-[11px] text-blue-400/60 font-black uppercase tracking-[0.3em] overflow-hidden text-ellipsis">{profile.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-2">Handle</label>
                  <input
                    type="text"
                    value={profile.username}
                    onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-8 focus:ring-2 focus:ring-blue-500/50 focus:bg-white/[0.08] outline-none font-black text-[13px] text-white tracking-widest uppercase transition-all shadow-inner"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-2">Specialization</label>
                  <input
                    type="text"
                    value={profile.profession}
                    onChange={(e) => setProfile({ ...profile, profession: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-8 focus:ring-2 focus:ring-blue-500/50 focus:bg-white/[0.08] outline-none font-black text-[13px] text-white tracking-widest uppercase transition-all shadow-inner placeholder:text-white/5"
                    placeholder="Enter Profession"
                  />
                </div>
                <div className="col-span-1 sm:col-span-2 space-y-3">
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-2">Neural Bio</label>
                  <textarea
                    value={profile.bio}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-[2rem] py-6 px-8 focus:ring-2 focus:ring-blue-500/50 focus:bg-white/[0.08] outline-none font-bold min-h-[150px] text-[14px] text-white/80 transition-all shadow-inner leading-relaxed"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-6 bg-blue-600 text-white rounded-[2rem] font-black tracking-[0.2em] text-sm uppercase hover:bg-blue-500 transition-all shadow-[0_0_40px_rgba(37,99,235,0.3)] disabled:opacity-50 flex items-center justify-center gap-4 group active:scale-95"
              >
                {saving ? 'Transmitting Data...' : 'Commit Changes'} 
                <Save className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </button>
            </form>
          )}

          {activeSection === 'privacy' && profile && (
            <div className="space-y-6 max-w-2xl mx-auto">
               <h3 className="text-xl font-black tracking-tighter text-white uppercase italic mb-8 flex items-center gap-3">
                 <Shield className="w-6 h-6 text-blue-500" />
                 Neural Protocols
               </h3>
               
               <div className="grid gap-6">
                 {[
                   { id: 'parentMode', label: 'Parent Link', desc: 'Secure tracking & protection relay', icon: Heart, color: 'text-red-500' },
                   { id: 'childMode', label: 'Offspring Node', desc: 'Active uplink to guardian nodes', icon: Baby, color: 'text-orange-500' },
                   { id: 'darkMode', label: 'Night Vision', desc: 'Override default luminance levels', icon: Globe, color: 'text-blue-400' }
                 ].map((item) => {
                   const isDarkModeItem = item.id === 'darkMode';
                   const isEnabled = isDarkModeItem ? darkMode : (profile[item.id as keyof UserProfile] as any)?.enabled;
                   
                   return (
                    <div key={item.id} className="flex items-center justify-between p-8 bg-white/5 rounded-3xl border border-white/5 hover:border-white/10 transition-colors">
                      <div className="flex items-center gap-6">
                        <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center border border-white/5 shadow-inner">
                          <item.icon className={cn("w-7 h-7", item.color)} />
                        </div>
                        <div>
                          <p className="font-black text-white uppercase tracking-widest text-sm italic">{item.label}</p>
                          <p className="text-[11px] text-white/30 uppercase tracking-[0.1em] mt-1.5">{item.desc}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          if (isDarkModeItem) {
                            onDarkModeToggle();
                          } else {
                            if (isEnabled) {
                              togglePrivacy(item.id as any);
                            } else {
                              item.id === 'parentMode' ? setShowParentSetup(true) : setShowChildSetup(true);
                            }
                          }
                        }}
                        className={cn(
                          "w-16 h-9 rounded-full p-1.5 transition-all duration-500 relative",
                          isEnabled ? "bg-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.4)]" : "bg-white/10"
                        )}
                      >
                        <div className={cn(
                          "w-6 h-6 bg-white rounded-full transition-transform duration-500 shadow-xl",
                          isEnabled ? "translate-x-7" : "translate-x-0"
                        )}></div>
                      </button>
                    </div>
                   );
                 })}
               </div>
            </div>
          )}

          {activeSection === 'notifications' && (
            <div className="space-y-8 max-w-3xl mx-auto">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-black tracking-tighter text-white uppercase italic flex items-center gap-3">
                   <Bell className="w-6 h-6 text-blue-500" />
                   System Logs
                </h3>
                {notifications.length > 0 && (
                  <button 
                    onClick={handleClearAllNotifications}
                    className="text-[10px] font-black text-red-500/60 hover:text-red-500 uppercase tracking-[0.2em] transition-colors"
                  >
                    Purge All
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {notifications.map((notif) => (
                  <div 
                    key={notif.id} 
                    className={cn(
                      "flex items-center gap-6 p-6 rounded-[2rem] border transition-all relative overflow-hidden group",
                      notif.read ? "bg-white/[0.02] border-white/5" : "bg-blue-600/10 border-blue-500/30 shadow-[0_0_25px_rgba(59,130,246,0.1)]"
                    )}
                  >
                    <div 
                      className="flex-1 flex items-center gap-6 cursor-pointer"
                      onClick={() => {
                        updateDoc(doc(db, 'notifications', notif.id), { read: true });
                        if (notif.type === 'message' && notif.fromId) {
                          onMessage?.(notif.fromId);
                        } else if (notif.type === 'help' && notif.lat && notif.lng) {
                          onFlyTo?.(notif.lat, notif.lng);
                        } else if (notif.type === 'friend_request') {
                          onTabChange?.('friends');
                        }
                      }}
                    >
                      <div className="relative shrink-0">
                         <img src={notif.fromPhoto} alt="" className={cn(
                           "w-14 h-14 rounded-2xl object-cover border-2 transition-colors",
                           notif.read ? "border-white/5" : "border-blue-500"
                         )} />
                         {!notif.read && <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full shadow-[0_0_8px_#3b82f6]" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white leading-relaxed">
                          <span className="text-blue-400 uppercase italic mr-1">{notif.fromName}</span> 
                          <span className="text-white/60">{notif.text}</span>
                        </p>
                        <p className="text-[9px] text-white/20 font-black uppercase tracking-widest mt-2">
                          {new Date(notif.timestamp).toLocaleString()}
                        </p>
                        {notif.type === 'friend_request' && !notif.read && (
                          <div className="flex gap-3 mt-4">
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleAcceptFriend(notif); }}
                              className="px-5 py-2.5 bg-blue-600 text-white text-[10px] font-black rounded-xl hover:bg-blue-500 transition-all uppercase tracking-widest flex items-center gap-2 shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                            >
                              <Check className="w-3.5 h-3.5" /> Initialize
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleRejectFriend(notif); }}
                              className="px-5 py-2.5 bg-white/5 text-white/40 text-[10px] font-black rounded-xl hover:bg-white/10 hover:text-white transition-all uppercase tracking-widest border border-white/5"
                            >
                              <X className="w-3.5 h-3.5" /> Discard
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <button 
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          await deleteDoc(doc(db, 'notifications', notif.id));
                          setNotifications(notifications.filter(n => n.id !== notif.id));
                          toast.success('Packet purged.');
                        } catch (err: any) {
                          toast.error(err.message);
                        }
                      }}
                      className="p-3 text-white/10 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
                {notifications.length === 0 && (
                  <div className="text-center py-20 bg-white/5 rounded-[2.5rem] border border-white/5 border-dashed">
                    <Bell className="w-12 h-12 text-white/5 mx-auto mb-4" />
                    <p className="text-[11px] text-white/20 font-black uppercase tracking-[0.3em]">No Logs Detected</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === 'history' && (
            <div className="space-y-8 max-w-3xl mx-auto">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-black tracking-tighter text-white uppercase italic flex items-center gap-3">
                   <History className="w-6 h-6 text-blue-500" />
                   Neural Relay Data
                </h3>
                {history.length > 0 && (
                  <button 
                    onClick={handleClearAllHistory}
                    className="text-[10px] font-black text-red-500/60 hover:text-red-500 uppercase tracking-[0.2em] transition-colors"
                  >
                    Wipe Terminal
                  </button>
                )}
              </div>
              <div className="space-y-4">
                {history.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-6 bg-white/5 rounded-[2rem] border border-white/5 group hover:bg-white/[0.08] transition-all">
                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center border border-white/5 shadow-inner">
                        {item.type === 'view' ? <User className="w-6 h-6 text-blue-400 shadow-[0_0_10px_#3b82f6]" /> : <Globe className="w-6 h-6 text-green-400 shadow-[0_0_10px_#10b981]" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black text-white/90 tracking-tight truncate">
                          {item.type === 'view' ? `Profile Core: ${item.targetId?.slice(0, 12)}...` : `Neural Query: "${item.query}"`}
                        </p>
                        <p className="text-[9px] text-white/20 font-black uppercase tracking-widest mt-2 flex items-center gap-2">
                          <Check className="w-3 h-3 text-blue-500" />
                          {new Date(item.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={async () => {
                        try {
                          await deleteDoc(doc(db, 'history', item.id));
                          setHistory(history.filter(h => h.id !== item.id));
                          toast.success('Relay data wiped.');
                        } catch (err: any) {
                          toast.error(err.message);
                        }
                      }}
                      className="p-3 text-white/10 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
                {history.length === 0 && (
                   <div className="text-center py-20 bg-white/5 rounded-[2.5rem] border border-white/5 border-dashed">
                    <History className="w-12 h-12 text-white/5 mx-auto mb-4" />
                    <p className="text-[11px] text-white/20 font-black uppercase tracking-[0.3em]">Neural Relay Empty</p>
                  </div>
                )}
              </div>
            </div>
          )}

          </div>
      </div>

      {/* Parent Mode Setup Modal */}
      {showParentSetup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-neutral-900 rounded-[3rem] p-8 sm:p-12 max-w-lg w-full shadow-2xl border border-neutral-100 dark:border-neutral-800 overflow-y-auto max-h-[90vh]"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-black tracking-tighter text-neutral-900 dark:text-white">Setup Parent Mode</h3>
              <div className="flex gap-1">
                <div className={cn("w-2 h-2 rounded-full", parentSetupStep === 'count' ? "bg-blue-600" : "bg-neutral-200")} />
                <div className={cn("w-2 h-2 rounded-full", parentSetupStep === 'select' ? "bg-blue-600" : "bg-neutral-200")} />
              </div>
            </div>
            
            <div className="space-y-6">
              {parentSetupStep === 'count' ? (
                <div className="space-y-6">
                  <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-3xl border border-blue-100 dark:border-blue-800/30">
                    <p className="text-sm font-bold text-blue-600 dark:text-blue-400 mb-4 leading-relaxed">
                      Parent Mode allows you to track your children's live location, view their travel history, and set safety destinations.
                    </p>
                    <label className="text-[10px] font-black text-blue-600/60 uppercase tracking-widest block mb-2">How many children will you track?</label>
                    <select 
                      value={childCount}
                      onChange={(e) => {
                        setChildCount(Number(e.target.value));
                        setTempSelectedChildren([]);
                      }}
                      className="w-full bg-white dark:bg-neutral-800 border border-blue-200 dark:border-neutral-700 rounded-2xl py-4 px-4 font-black text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    >
                      {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} {n === 1 ? 'Child' : 'Children'}</option>)}
                    </select>
                  </div>

                  <div className="flex flex-col gap-3 pt-4">
                    <button 
                      onClick={() => setParentSetupStep('select')}
                      className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black tracking-tight hover:bg-blue-700 transition shadow-xl shadow-blue-100"
                    >
                      Next: Select Children
                    </button>
                    <button 
                      onClick={() => setShowParentSetup(false)}
                      className="w-full py-4 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-2xl font-black tracking-tight hover:bg-neutral-200 dark:hover:bg-neutral-700 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest block">Select Child with ID</label>
                      <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg uppercase tracking-widest">
                        {tempSelectedChildren.length} / {childCount} Selected
                      </span>
                    </div>
                    
                    <div className="relative mb-4">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                      <input 
                        type="text"
                        placeholder="Search username or ID..."
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          handleUserSearch(e.target.value);
                        }}
                        className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl py-3 pl-12 pr-4 font-bold text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      />
                    </div>

                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                      {(searchQuery ? searchResults : allUsers).map(u => (
                        <button 
                          key={u.uid} 
                          onClick={() => {
                            if (tempSelectedChildren.includes(u.uid)) {
                              setTempSelectedChildren(prev => prev.filter(id => id !== u.uid));
                            } else if (tempSelectedChildren.length < childCount) {
                              setTempSelectedChildren(prev => [...prev, u.uid]);
                            } else {
                              toast.error(`Limit reached: ${childCount} children max.`);
                            }
                          }}
                          className={cn(
                            "w-full flex items-center justify-between p-4 rounded-2xl border transition-all text-left group",
                            tempSelectedChildren.includes(u.uid) 
                              ? "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800" 
                              : "bg-neutral-50 dark:bg-neutral-800 border-neutral-100 dark:border-neutral-700 hover:border-blue-200"
                          )}
                        >
                          <div className="flex items-center gap-4">
                            <div className="relative">
                              <UserAvatar src={u.photoURL} username={u.username} size="sm" />
                              {tempSelectedChildren.includes(u.uid) && (
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center border-2 border-white dark:border-neutral-900">
                                  <Check className="w-2 h-2 text-white" />
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-black text-neutral-900 dark:text-white tracking-tight">{u.username}</p>
                              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">ID: {u.uid.slice(0, 8)}...</p>
                            </div>
                          </div>
                          
                          <div className={cn(
                            "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                            tempSelectedChildren.includes(u.uid)
                              ? "bg-blue-600 border-blue-600"
                              : "border-neutral-300 dark:border-neutral-600 group-hover:border-blue-400"
                          )}>
                            {tempSelectedChildren.includes(u.uid) && <div className="w-2 h-2 bg-white rounded-full" />}
                          </div>
                        </button>
                      ))}
                      {searchQuery && searchResults.length === 0 && !searching && (
                        <div className="text-center py-12">
                          <div className="w-16 h-16 bg-neutral-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
                            <Search className="w-8 h-8 text-neutral-300" />
                          </div>
                          <p className="text-sm font-bold text-neutral-400">No users found with that name</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 pt-4">
                    <button 
                      onClick={saveParentMode}
                      disabled={tempSelectedChildren.length === 0}
                      className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black tracking-tight hover:bg-blue-700 transition shadow-xl shadow-blue-100 disabled:opacity-50"
                    >
                      Confirm & Activate
                    </button>
                    <button 
                      onClick={() => setParentSetupStep('count')}
                      className="w-full py-4 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-2xl font-black tracking-tight hover:bg-neutral-200 dark:hover:bg-neutral-700 transition"
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

      {/* Child Mode Setup Modal */}
      {showChildSetup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-neutral-900 rounded-[3rem] p-8 sm:p-12 max-w-lg w-full shadow-2xl border border-neutral-100 dark:border-neutral-800 overflow-y-auto max-h-[90vh]"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-black tracking-tighter text-neutral-900 dark:text-white">Setup Child Mode</h3>
              <div className="flex gap-1">
                <div className={cn("w-2 h-2 rounded-full", childSetupStep === 'type' ? "bg-blue-600" : "bg-neutral-200")} />
                <div className={cn("w-2 h-2 rounded-full", childSetupStep === 'select' ? "bg-blue-600" : "bg-neutral-200")} />
              </div>
            </div>
            
            <div className="space-y-6">
              {childSetupStep === 'type' ? (
                <div className="space-y-6">
                  <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-3xl border border-blue-100 dark:border-blue-800/30">
                    <p className="text-sm font-bold text-blue-600 dark:text-blue-400 mb-4 leading-relaxed">
                      Child Mode allows your parents to see your live location for safety. You can send SOS alerts if you need help.
                    </p>
                    <label className="text-[10px] font-black text-blue-600/60 uppercase tracking-widest block mb-2">Who is your parent?</label>
                    <div className="flex gap-2">
                      {['mother', 'father', 'both'].map((type) => (
                        <button
                          key={type}
                          onClick={() => {
                            setParentType(type as any);
                            setTempSelectedParents([]);
                          }}
                          className={cn(
                            "flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all",
                            parentType === type 
                              ? "bg-blue-600 text-white shadow-lg shadow-blue-100" 
                              : "bg-white dark:bg-neutral-800 text-neutral-500 border border-neutral-100 dark:border-neutral-700 hover:bg-neutral-50"
                          )}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 pt-4">
                    <button 
                      onClick={() => {
                        if (!parentType) {
                          toast.error('Please select parent type');
                          return;
                        }
                        setChildSetupStep('select');
                      }}
                      className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black tracking-tight hover:bg-blue-700 transition shadow-xl shadow-blue-100"
                    >
                      Next: Select Parents
                    </button>
                    <button 
                      onClick={() => setShowChildSetup(false)}
                      className="w-full py-4 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-2xl font-black tracking-tight hover:bg-neutral-200 dark:hover:bg-neutral-700 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest block">Select Parent with ID</label>
                      <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg uppercase tracking-widest">
                        {tempSelectedParents.length} / {parentType === 'both' ? 2 : 1} Selected
                      </span>
                    </div>
                    
                    <div className="relative mb-4">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                      <input 
                        type="text"
                        placeholder="Search username or ID..."
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          handleUserSearch(e.target.value);
                        }}
                        className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl py-3 pl-12 pr-4 font-bold text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      />
                    </div>

                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                      {(searchQuery ? searchResults : allUsers).map(u => (
                        <button 
                          key={u.uid} 
                          onClick={() => {
                            const limit = parentType === 'both' ? 2 : 1;
                            if (tempSelectedParents.includes(u.uid)) {
                              setTempSelectedParents(prev => prev.filter(id => id !== u.uid));
                            } else if (tempSelectedParents.length < limit) {
                              setTempSelectedParents(prev => [...prev, u.uid]);
                            } else {
                              toast.error(`Limit reached: ${limit} parent(s) max.`);
                            }
                          }}
                          className={cn(
                            "w-full flex items-center justify-between p-4 rounded-2xl border transition-all text-left group",
                            tempSelectedParents.includes(u.uid) 
                              ? "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800" 
                              : "bg-neutral-50 dark:bg-neutral-800 border-neutral-100 dark:border-neutral-700 hover:border-blue-200"
                          )}
                        >
                          <div className="flex items-center gap-4">
                            <div className="relative">
                              <UserAvatar src={u.photoURL} username={u.username} size="sm" />
                              {tempSelectedParents.includes(u.uid) && (
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center border-2 border-white dark:border-neutral-900">
                                  <Check className="w-2 h-2 text-white" />
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-black text-neutral-900 dark:text-white tracking-tight">{u.username}</p>
                              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">ID: {u.uid.slice(0, 8)}...</p>
                            </div>
                          </div>
                          
                          <div className={cn(
                            "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                            tempSelectedParents.includes(u.uid)
                              ? "bg-blue-600 border-blue-600"
                              : "border-neutral-300 dark:border-neutral-600 group-hover:border-blue-400"
                          )}>
                            {tempSelectedParents.includes(u.uid) && <div className="w-2 h-2 bg-white rounded-full" />}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 pt-4">
                    <button 
                      onClick={saveChildMode}
                      disabled={tempSelectedParents.length === 0}
                      className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black tracking-tight hover:bg-blue-700 transition shadow-xl shadow-blue-100 disabled:opacity-50"
                    >
                      Confirm & Activate
                    </button>
                    <button 
                      onClick={() => setChildSetupStep('type')}
                      className="w-full py-4 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-2xl font-black tracking-tight hover:bg-neutral-200 dark:hover:bg-neutral-700 transition"
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

    </div>
  );
};

export default Settings;
