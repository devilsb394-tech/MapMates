import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { auth, db, messaging, rtdb, ref, onDisconnect, set, onValue, rtdbTimestamp, handleFirestoreError, OperationType } from './firebase/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, getDoc, onSnapshot, setDoc, serverTimestamp, addDoc, collection, updateDoc, query, where, orderBy, limit, getDocs, getCountFromServer } from 'firebase/firestore';
import { Toaster, toast } from 'sonner';
import { UserProfile, HistoryItem } from './types';
import { cn } from './lib/utils';
import { Map, Users, Shuffle, MessageSquare, User as UserIcon, Settings as SettingsIcon, X, Compass, Eye, Search, Trophy, Flame, Zap, PlayCircle, Plane, Radio, ArrowLeft } from 'lucide-react';

// Components
import SplashScreen from './components/SplashScreen';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import MapVibe from './components/MapVibe';
import type { MapVibeHandle } from './components/MapVibe';
import Onboarding from './components/Onboarding';
import RightSidebar from './components/RightSidebar';
import Achievements from './components/Achievements';
import MoodPicker from './components/MoodPicker';
import AuthModal from './components/AuthModal';
import ProfilePage from './components/ProfilePage';
import ChatInbox from './components/ChatInbox';
import ActiveUsers from './components/ActiveUsers';
import DiscoverPage from './components/DiscoverPage';
import RandomProfiles from './components/RandomProfiles';
import FriendList from './components/FriendList';
import Settings from './components/Settings';
import SearchPage from './components/SearchPage';
import FriendBar from './components/FriendBar';
import VoiceCall from './components/VoiceCall';
import { UserAvatar } from './components/UserAvatar';
import Moments from './components/Moments';
import MomentFlow from './components/Moment/MomentFlow';
import MomentDiscoveryFeed from './components/Moment/MomentDiscoveryFeed';
import StoryOverlay from './components/StoryOverlay';
import StatusModal from './components/StatusModal';
import AchievementModal from './components/AchievementModal';
import RankingView from './components/RankingView';
import { MapLabelSystem } from './components/MapLabelSystem';
import NearbyHelp from './components/NearbyHelp';
import PremiumModal from './components/PremiumModal';
import { Plus, PenLine, Camera, Crown } from 'lucide-react';

// App Component Entry
function App() {

  const [loading, setLoading] = useState(true);
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isDestinyActive, setIsDestinyActive] = useState(false);
  const [isDestinySettingUp, setIsDestinySettingUp] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean>(() => {
    return localStorage.getItem('has_seen_onboarding') === 'true';
  });

  // Online status heartbeat (RTDB + Firestore Sync)
  useEffect(() => {
    if (!currentUser?.uid) return;

    const userRef = doc(db, 'users', currentUser.uid);
    const presenceRef = ref(rtdb, `status/${currentUser.uid}`);
    const connectedRef = ref(rtdb, '.info/connected');

    const unsubscribe = onValue(connectedRef, (snap) => {
      if (snap.val() === false) return;

      // When I disconnect, update RTDB and Firestore
      onDisconnect(presenceRef).set({
        state: 'offline',
        lastSeen: rtdbTimestamp()
      }).then(() => {
        // Also set online status in RTDB
        set(presenceRef, {
          state: 'online',
          lastSeen: rtdbTimestamp()
        });
        
        // Update Firestore
        setDoc(userRef, {
          isOnline: true,
          lastSeen: serverTimestamp()
        }, { merge: true });
      });
    });

    // Heartbeat for Firestore (every 2 minutes as backup)
    const heartbeat = setInterval(() => {
      setDoc(userRef, {
        isOnline: true,
        lastSeen: serverTimestamp()
      }, { merge: true });
    }, 120000);

    // Visibility change handling
    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible';
      set(presenceRef, {
        state: isVisible ? 'online' : 'away',
        lastSeen: rtdbTimestamp()
      });
      setDoc(userRef, {
        isOnline: isVisible,
        lastSeen: serverTimestamp()
      }, { merge: true });
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      unsubscribe();
      clearInterval(heartbeat);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      // Set offline on unmount
      set(presenceRef, {
        state: 'offline',
        lastSeen: rtdbTimestamp()
      });
      setDoc(userRef, {
        isOnline: false,
        lastSeen: serverTimestamp()
      }, { merge: true });
    };
  }, [currentUser?.uid]);


  const [onlineCount, setOnlineCount] = useState(0);
  const [activeTab, setActiveTab] = useState('map');
  const [settingsSection, setSettingsSection] = useState('profile');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);
  const [showMomentMapLayer, setShowMomentMapLayer] = useState(false);
  const [navbarSearchQuery, setNavbarSearchQuery] = useState('');
  const [showSignupPopup, setShowSignupPopup] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [activeCall, setActiveCall] = useState<{ targetId: string, isIncoming: boolean } | null>(null);
  const [showMatesPanel, setShowMatesPanel] = useState(false);
  const [showMomentUpload, setShowMomentUpload] = useState(false);
  const [showMomentDiscovery, setShowMomentDiscovery] = useState(false);
  const [showAccountDeletion, setShowAccountDeletion] = useState(false);
  const [playingMomentUserId, setPlayingMomentUserId] = useState<string | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const [showStory, setShowStory] = useState(false);
  const [showMapLabelSystem, setShowMapLabelSystem] = useState(false);
  const [isMapSelecting, setIsMapSelecting] = useState(false);
  const [selectedMapPos, setSelectedMapPos] = useState<{ lat: number; lng: number } | null>(null);
  const [mapLabelConfirmTrigger, setMapLabelConfirmTrigger] = useState(0);
  const [isMapMenuOpen, setIsMapMenuOpen] = useState(false);
  const [isNavbarMenuOpen, setIsNavbarMenuOpen] = useState(false);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [isMissionMode, setIsMissionMode] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showRanking, setShowRanking] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusEditingText, setStatusEditingText] = useState<string | null>(null);

  useEffect(() => {
    const handleEditStatus = (e: any) => {
      setStatusEditingText(e.detail);
      setShowStatusModal(true);
    };
    window.addEventListener('edit_status', handleEditStatus);
    return () => window.removeEventListener('edit_status', handleEditStatus);
  }, []);

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('dark_mode');
    return saved === 'true';
  });
  const [lastDismissedTime, setLastDismissedTime] = useState<number>(() => {
    const saved = localStorage.getItem('signup_popup_dismissed');
    return saved ? parseInt(saved) : 0;
  });

  // Premium Expiry Check & Auto-Popup System
  useEffect(() => {
    if (!currentUser || !userProfile) return;

    // 1. Expiry Check
    if (userProfile.premium && userProfile.premiumUntil) {
      const expiry = new Date(userProfile.premiumUntil);
      if (new Date() > expiry) {
        updateDoc(doc(db, 'users', currentUser.uid), {
          premium: false
        }).then(() => {
          toast.info("Your premium subscription has expired. Join again for continued benefits!");
        });
      }
    }

    // 2. Auto-Popup System
    if (!userProfile.premium) {
      const lastShown = localStorage.getItem('premium_popup_last_shown');
      const dismissCount = parseInt(localStorage.getItem('premium_popup_dismiss_count') || '0');
      
      const now = Date.now();
      // Intervals: 0, 1h, 3h, 6h, 24h
      const intervals = [0, 3600000, 10800000, 21600000, 86400000];
      const currentInterval = intervals[Math.min(dismissCount, intervals.length - 1)];
      
      if (!lastShown || (now - parseInt(lastShown)) > currentInterval) {
        // Show after a slight delay for better UX
        const timer = setTimeout(() => {
          setIsPremiumModalOpen(true);
        }, 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [currentUser?.uid, userProfile?.premium, userProfile?.premiumUntil]);

  const handleClosePremiumModal = () => {
    setIsPremiumModalOpen(false);
    const now = Date.now();
    localStorage.setItem('premium_popup_last_shown', now.toString());
    const count = parseInt(localStorage.getItem('premium_popup_dismiss_count') || '0');
    localStorage.setItem('premium_popup_dismiss_count', (count + 1).toString());
  };

  const mapRef = useRef<MapVibeHandle>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    window.addEventListener('appinstalled', () => {
      setShowInstallBtn(false);
      setDeferredPrompt(null);
      toast.success('MapMates installed successfully!');
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      toast.info('Installation prompt is not available yet. Please try later or check if MapMates is already installed!', {
        description: 'You can also use "Add to Home Screen" manually in your browser menu.',
        duration: 5000
      });
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBtn(false);
      setDeferredPrompt(null);
      toast.success('Thank you for installing MapMates!');
    } else {
      toast.info('Installation cancelled. You can install anytime from the menu.');
    }
  };

  const dismissPopup = (showAuth = false) => {
    const now = Date.now();
    setLastDismissedTime(now);
    localStorage.setItem('signup_popup_dismissed', now.toString());
    setShowSignupPopup(false);
    
    if (showAuth) {
      setShowAuthModal(true);
    } else {
      toast.info("We'll remind you later!");
    }
  };

  const addToHistory = async (type: 'search' | 'view', targetId?: string, query?: string) => {
    if (!auth.currentUser) return;
    try {
      const historyData: any = {
        uid: auth.currentUser.uid,
        type,
        timestamp: new Date().toISOString()
      };
      if (targetId !== undefined) historyData.targetId = targetId;
      if (query !== undefined) historyData.query = query;

      await addDoc(collection(db, 'history'), historyData);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'history');
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthChecked(true);
      if (user) {
        localStorage.setItem('signup_popup_permanently_disabled', 'true');
      } else {
        setProfileLoaded(true);
        // We still wait for mapLoaded in the useEffect below
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (authChecked && currentUser) {
      const userRef = doc(db, 'users', currentUser.uid);
      const unsub = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          const profile = docSnap.data() as UserProfile;
          setUserProfile(profile);
          
          // Patch incomplete profiles (migration for existing users)
          if (currentUser && (!profile.photoURL || !profile.username || !profile.provider || !profile.uid)) {
            let photoURL = profile.photoURL || currentUser.photoURL || currentUser.providerData[0]?.photoURL;
            if (photoURL && photoURL.includes('googleusercontent.com') && !photoURL.includes('=s800-c')) {
              photoURL = photoURL.replace(/=s\d+-c/, '=s800-c');
            } else if (!photoURL) {
              photoURL = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.username || currentUser.displayName || 'U')}&background=random&size=512`;
            }

            const patchData: Partial<UserProfile> = {};
            if (!profile.photoURL || profile.photoURL !== photoURL) patchData.photoURL = photoURL;
            if (!profile.uid) patchData.uid = currentUser.uid;
            
            if (!profile.username) {
              let generatedUsername = '';
              if (currentUser.displayName) {
                generatedUsername = currentUser.displayName.split(' ')[0].toLowerCase();
              } else if (currentUser.email) {
                generatedUsername = currentUser.email.split('@')[0].toLowerCase();
              }
              if (generatedUsername) patchData.username = generatedUsername;
            }

            if (!profile.provider) {
              const providerId = currentUser.providerData[0]?.providerId || 'password';
              patchData.provider = providerId.includes('google') ? 'google' : 
                                   providerId.includes('facebook') ? 'facebook' : 
                                   providerId.includes('apple') ? 'apple' : 'email';
            }

            if (Object.keys(patchData).length > 0) {
              console.log("Patching profile:", patchData);
              updateDoc(userRef, patchData).catch(e => console.error('Error patching profile:', e));
            }
          }

          // Check if profile is complete
          const isComplete = !!profile.username && !!profile.photoURL && !!profile.provider;
          
          if (isComplete) {
            setProfileLoaded(true);
            setIsSigningUp(false);
          } else {
            // Profile is not complete (e.g. newly created via social)
            // But we already auto-create below, so this handles edge cases
            setProfileLoaded(true);
            setIsSigningUp(false);
          }
        } else {
          // Fresh start: if user exists in Auth but not in Firestore
          // Auto-create profile for Social users (Google, Apple, Facebook)
          const isSocialUser = currentUser.providerData.some(p => 
            p.providerId === 'google.com' || 
            p.providerId === 'apple.com' || 
            p.providerId === 'facebook.com'
          );

          if (isSocialUser) {
            setIsSigningUp(true);
            // Safety timeout for profile creation
            const creationTimeout = setTimeout(() => {
              if (!profileLoaded) {
                console.warn("Profile creation taking too long, forcing load");
                setProfileLoaded(true);
                setIsSigningUp(false);
              }
            }, 8000);

            // Get location before creating profile
            navigator.geolocation.getCurrentPosition((pos) => {
              clearTimeout(creationTimeout);
              const { latitude, longitude } = pos.coords;
              // Standard Google photo URL fix
              let photoURL = currentUser.photoURL || currentUser.providerData[0]?.photoURL;
              if (photoURL && photoURL.includes('googleusercontent.com')) {
                photoURL = photoURL.replace(/=s\d+-c/, '=s800-c'); // Even higher quality
              } else if (!photoURL) {
                photoURL = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName || 'U')}&background=random&size=512`;
              }
              
              // Provider identification
              const providerId = currentUser.providerData[0]?.providerId || 'password';
              const provider = providerId.includes('google') ? 'google' : 
                               providerId.includes('facebook') ? 'facebook' : 
                               providerId.includes('apple') ? 'apple' : 'email';

              // Username generation rules: First word of display name or email prefix
              let generatedUsername = '';
              if (currentUser.displayName) {
                generatedUsername = currentUser.displayName.split(' ')[0].toLowerCase();
              } else if (currentUser.email) {
                generatedUsername = currentUser.email.split('@')[0].toLowerCase();
              }
              
              if (!generatedUsername) {
                generatedUsername = `user_${currentUser.uid.slice(0, 5)}`;
              }

              const profileData: UserProfile = {
                uid: currentUser.uid,
                username: generatedUsername,
                fullName: currentUser.displayName || 'Social User',
                email: currentUser.email || '',
                photoURL: photoURL,
                provider: provider,
                bio: 'Hey there! I am using MAPMATES.',
                gender: '',
                religion: '',
                language: '',
                age: 18,
                relationshipStatus: '',
                profession: '',
                economicClass: '',
                location: { 
                  lat: latitude, 
                  lng: longitude, 
                  lastUpdated: new Date().toISOString() 
                },
                isOnline: true,
                lastSeen: new Date().toISOString(),
                showOnMap: true,
                privateProfile: false,
                showOnDiscover: true,
                role: 'user',
                stats: { views: 0, likes: 0, friendsCount: 0 }
              };
              
              setDoc(userRef, profileData, { merge: true })
                .then(() => {
                  setUserProfile(profileData);
                  setProfileLoaded(true);
                  setIsSigningUp(false);
                  toast.success('Welcome to MAPMATES!');
                })
                .catch(err => {
                  console.error('Auto-profile creation failed:', err);
                  setUserProfile(profileData); 
                  setProfileLoaded(true);
                  setIsSigningUp(false);
                });
            }, () => {
              clearTimeout(creationTimeout);
              // Fallback if location fails
              let photoURL = currentUser.photoURL || currentUser.providerData[0]?.photoURL;
              if (photoURL && photoURL.includes('googleusercontent.com')) {
                photoURL = photoURL.replace(/=s\d+-c/, '=s800-c');
              } else if (!photoURL) {
                photoURL = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName || 'U')}&background=random&size=512`;
              }
              
              // Provider identification
              const providerId = currentUser.providerData[0]?.providerId || 'password';
              const provider = providerId.includes('google') ? 'google' : 
                               providerId.includes('facebook') ? 'facebook' : 
                               providerId.includes('apple') ? 'apple' : 'email';

              // Username generation rules: First word of display name or email prefix
              let generatedUsername = '';
              if (currentUser.displayName) {
                generatedUsername = currentUser.displayName.split(' ')[0].toLowerCase();
              } else if (currentUser.email) {
                generatedUsername = currentUser.email.split('@')[0].toLowerCase();
              }
              
              if (!generatedUsername) {
                generatedUsername = `user_${currentUser.uid.slice(0, 5)}`;
              }

              const profileData: UserProfile = {
                uid: currentUser.uid,
                username: generatedUsername,
                fullName: currentUser.displayName || 'Social User',
                email: currentUser.email || '',
                photoURL: photoURL,
                provider: provider,
                bio: 'Hey there! I am using MAPMATES.',
                gender: '',
                religion: '',
                language: '',
                age: 18,
                relationshipStatus: '',
                profession: '',
                economicClass: '',
                location: { lat: 31.5204, lng: 74.3587, lastUpdated: new Date().toISOString() },
                isOnline: true,
                lastSeen: new Date().toISOString(),
                showOnMap: true,
                privateProfile: false,
                showOnDiscover: true,
                role: 'user',
                stats: { views: 0, likes: 0, friendsCount: 0 }
              };
              
              setDoc(userRef, profileData, { merge: true })
                .then(() => {
                  setUserProfile(profileData);
                  setProfileLoaded(true);
                  setIsSigningUp(false);
                  toast.success('Welcome to MAPMATES!');
                })
                .catch(err => {
                  setUserProfile(profileData); 
                  setProfileLoaded(true);
                  setIsSigningUp(false);
                });
            }, { timeout: 5000 });
          }
 else {
            setUserProfile(null);
            setProfileLoaded(true);
          }
        }
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, `users/${currentUser.uid}`);
        setProfileLoaded(true);
        setLoading(false); // Safety
      });
      return () => unsub();
    } else if (authChecked && !currentUser) {
      setUserProfile(null);
      setProfileLoaded(true);
      // If not logged in, we can show map/home
    }
  }, [authChecked, currentUser]);

  useEffect(() => {
    // Wait for everything: Auth, Profile (if logged in), and Map
    const isAuthReady = authChecked;
    const isProfileReady = profileLoaded && !isSigningUp;
    const isMapReady = mapLoaded;

    // Fast path: if we have auth and profile (or confirmed no profile), and map is ready
    if (isAuthReady && isProfileReady && isMapReady) {
      if (currentUser && !userProfile) {
        return;
      }
      
      // If we have a user, wait until we have a fresh location update before hiding splash
      if (currentUser && userProfile?.location?.lastUpdated) {
        const lastUpdate = new Date(userProfile.location.lastUpdated).getTime();
        const now = Date.now();
        // If location is older than 5 seconds, wait for a fresh fix (real-time requirement)
        if (now - lastUpdate > 5000 && !loadingTimedOut) {
          return;
        }
      }

      const timer = setTimeout(() => {
        setLoading(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [authChecked, profileLoaded, mapLoaded, currentUser, userProfile, loadingTimedOut]);

  // Safety timeout: Increased to 15 seconds for slow connections
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        console.log("Splash screen safety reached");
        setLoadingTimedOut(true);
        setLoading(false);
      }, 15000);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  // Signup popup logic - REMOVED as per user request
  useEffect(() => {
    setShowSignupPopup(false);
  }, [currentUser]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('dark_mode', darkMode.toString());
  }, [darkMode]);

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;
    let unsubCalls: (() => void) | null = null;
    let onlineInterval: any = null;
    let signupFlowTimeout: any = null;

    const fetchOnlineCount = () => {
      const onlineQ = query(collection(db, 'users'), where('isOnline', '==', true));
      return onSnapshot(onlineQ, (snap) => {
        const now = Date.now();
        const activeUsersCount = snap.docs.filter(docSnap => {
          const data = docSnap.data();
          if (!data.lastSeen) return true;
          try {
            const lastSeenDate = data.lastSeen?.toDate ? data.lastSeen.toDate() : new Date(data.lastSeen);
            const diff = now - lastSeenDate.getTime();
            // Allow up to 10 minutes for slower heartbeats/connectivity
            return diff < 10 * 60 * 1000;
          } catch (e) {
            return true;
          }
        }).length;
        
        setOnlineCount(activeUsersCount);
      }, (err) => {
        if (err.code !== 'resource-exhausted') {
          console.warn('Online count fetch failed:', err);
        }
      });
    };

    if (currentUser) {
      const userRef = doc(db, 'users', currentUser.uid);
      
      setDoc(userRef, {
        isOnline: true,
        lastSeen: new Date().toISOString(),
        showOnMap: true
      }, { merge: true }).catch(err => console.warn('Initial status update deferred'));

      const unsubOnline = fetchOnlineCount();
      return () => {
        unsubOnline();
        if (unsubCalls) unsubCalls();
        if (signupFlowTimeout) clearTimeout(signupFlowTimeout);
      };
    }

    return () => {
      if (unsubProfile) unsubProfile();
      if (unsubCalls) unsubCalls();
      if (signupFlowTimeout) clearTimeout(signupFlowTimeout);
    };
  }, [currentUser]);

  const [unreadCount, setUnreadCount] = useState(0);

  // Notification Permission & PWA Badge
  useEffect(() => {
    if (!currentUser) return;

    const requestPermission = async () => {
      if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
      }
    };
    requestPermission();

    // Update PWA Badge
    if ('setAppBadge' in navigator) {
      if (unreadCount > 0) {
        (navigator as any).setAppBadge(unreadCount).catch(() => {});
      } else {
        (navigator as any).clearAppBadge().catch(() => {});
      }
    }
  }, [currentUser, unreadCount]);

  // Live location tracking & Notifications
  useEffect(() => {
    if (!currentUser) {
      setUnreadCount(0);
      return;
    }

    let watchId: number | null = null;
    let refreshInterval: any = null;
    let lastUpdateTime = 0;
    let lastLat = 0;
    let lastLng = 0;
    let heading = 0;
    const UPDATE_INTERVAL = 3000; 

    let lastHeadingUpdate = 0;
    const HEADING_THRESHOLD = 10; 
    const HEADING_MIN_INTERVAL = 10000; 

    const handleOrientation = (e: any) => {
      let currentHeading = 0;
      if (e.webkitCompassHeading) {
        currentHeading = e.webkitCompassHeading;
      } else if (e.alpha !== null) {
        currentHeading = 360 - e.alpha; 
      } else {
        return;
      }

      heading = currentHeading;

      const now = Date.now();
      if (now - lastHeadingUpdate > HEADING_MIN_INTERVAL && Math.abs(currentHeading - lastHeadingUpdateValue) > HEADING_THRESHOLD) {
        const userRef = doc(db, 'users', currentUser.uid);
        updateDoc(userRef, {
          'location.heading': currentHeading ?? null,
          'location.lastUpdated': new Date().toISOString()
        }).catch(() => {});
        lastHeadingUpdate = now;
        lastHeadingUpdateValue = currentHeading;
      }
    };

    let lastHeadingUpdateValue = 0;
    window.addEventListener('deviceorientation', handleOrientation);
    window.addEventListener('deviceorientationabsolute', handleOrientation);

    if (userProfile && navigator.geolocation) {
      const getExactLocation = () => {
        if (!userProfile.isOnline) return;

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude, accuracy, speed } = pos.coords;
            
            // Tight accuracy threshold for exact GPS tracking
            if (accuracy > 30) return;

            // EXACT GPS - NO JITTER
            const finalLat = latitude;
            const finalLng = longitude;
            
            if (!isNaN(finalLat) && !isNaN(finalLng)) {
              const userRef = doc(db, 'users', currentUser.uid);
              setDoc(userRef, {
                location: {
                  lat: finalLat,
                  lng: finalLng,
                  accuracy: accuracy,
                  speed: speed || 0,
                  heading: heading ?? null,
                  lastUpdated: new Date().toISOString()
                },
                isOnline: true,
                lastSeen: serverTimestamp()
              }, { merge: true }).catch(e => {
                if (e.code !== 'resource-exhausted') console.warn("Live update failed", e);
              });
            }
          },
          (err) => console.warn("Live tracking error", err),
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
      };

      // Force initial fetch
      getExactLocation();

      // Listen for manual refreshes
      const handleLocationRefresh = () => getExactLocation();
      window.addEventListener('refresh_location', handleLocationRefresh);

      // Periodic refresh every 3 seconds for battery/quota balance
      refreshInterval = setInterval(getExactLocation, 3000);

      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          if (!userProfile.isOnline) return;
          
          const { latitude, longitude, accuracy, speed } = pos.coords;
          
          // Tight accuracy threshold to keep pic in exact location
          if (accuracy > 30) return;

          const finalLat = latitude;
          const finalLng = longitude;
          
          if (isNaN(finalLat) || isNaN(finalLng)) return;
          
          const userRef = doc(db, 'users', currentUser.uid);
          
          setDoc(userRef, {
            location: {
              lat: finalLat,
              lng: finalLng,
              heading: heading ?? null,
              speed: speed || 0,
              lastUpdated: new Date().toISOString(),
              accuracy: accuracy
            },
            isOnline: true,
            lastSeen: serverTimestamp()
          }, { merge: true }).catch(err => {
            if (err.code !== 'resource-exhausted') console.error('Watch error:', err);
          });
        },
        (err) => console.error('Watch error:', err),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );

      return () => {
        if (refreshInterval) clearInterval(refreshInterval);
        if (watchId) navigator.geolocation.clearWatch(watchId);
        window.removeEventListener('refresh_location', handleLocationRefresh);
      };
    }

    // Status & Presence Management
    // Removed duplicate logic as it's handled in the top-level useEffect

    // Notification listener & count
    const qCount = query(
      collection(db, 'notifications'),
      where('uid', '==', currentUser.uid),
      where('read', '==', false)
    );
    const unsubCount = onSnapshot(qCount, (snap) => {
      const count = snap.size;
      setUnreadCount(count);
      
      // Update App Badge (PWA)
      if ('setAppBadge' in navigator) {
        if (count > 0) {
          (navigator as any).setAppBadge(count).catch(console.error);
        } else {
          (navigator as any).clearAppBadge().catch(console.error);
        }
      }
    }, (err) => {
      if (err.code !== 'resource-exhausted') {
        console.error('Unread count error:', err);
      }
    });

    const q = query(
      collection(db, 'notifications'),
      where('uid', '==', currentUser.uid),
      where('read', '==', false),
      orderBy('timestamp', 'desc'),
      limit(1)
    );
    const unsubNotif = onSnapshot(q, (snap) => {
      snap.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const notif = change.doc.data();
          
          // Trigger Browser Notification if in background
          if (document.visibilityState !== 'visible' && Notification.permission === 'granted') {
            new Notification(notif.fromName, {
              body: notif.text,
              icon: notif.fromPhoto || 'https://img.icons8.com/fluency/192/map-marker.png',
              tag: notif.type,
              renotify: true
            } as any);
          }

          if (notif.type === 'help') {
            toast.custom((t) => (
              <div className="bg-white dark:bg-neutral-900 border border-red-100 dark:border-red-900/30 p-4 rounded-3xl shadow-2xl flex flex-col gap-4 min-w-[320px] animate-in slide-in-from-right-full">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img src={notif.fromPhoto} className="w-12 h-12 rounded-2xl object-cover border-2 border-red-500 shadow-lg" />
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full flex items-center justify-center text-white border-2 border-white">
                      <Radio className="w-2 h-2" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-neutral-900 dark:text-white truncate">{notif.fromName}</p>
                    <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest">Needs Help!</p>
                  </div>
                  <button onClick={() => toast.dismiss(t)} className="text-neutral-400 hover:text-neutral-900">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 italic bg-red-50 dark:bg-red-900/20 p-3 rounded-2xl border border-red-100/50 dark:border-red-900/30">
                  "{notif.text}"
                </p>

                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      toast.dismiss(t);
                      updateDoc(doc(db, 'notifications', change.doc.id), { read: true });
                      setSelectedProfileId(notif.fromId);
                      setActiveTab('chat');
                    }}
                    className="flex-1 py-3 bg-blue-600 text-white text-[10px] font-black rounded-xl hover:bg-blue-700 transition uppercase tracking-widest flex items-center justify-center gap-2"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    Chat
                  </button>
                  <button 
                    onClick={() => {
                      toast.dismiss(t);
                      updateDoc(doc(db, 'notifications', change.doc.id), { read: true });
                      setViewingProfileId(notif.fromId);
                      setActiveTab('view');
                    }}
                    className="flex-1 py-3 bg-neutral-900 text-white text-[10px] font-black rounded-xl hover:bg-neutral-800 transition uppercase tracking-widest flex items-center justify-center gap-2"
                  >
                    <UserIcon className="w-3.5 h-3.5" />
                    Profile
                  </button>
                  {notif.lat && notif.lng && (
                    <button 
                      onClick={() => {
                        toast.dismiss(t);
                        updateDoc(doc(db, 'notifications', change.doc.id), { read: true });
                        setActiveTab('map');
                        setTimeout(() => mapRef.current?.flyToUser(notif.fromId), 100);
                      }}
                      className="w-12 h-12 bg-neutral-100 text-neutral-600 rounded-xl flex items-center justify-center hover:bg-neutral-200 transition"
                    >
                      <Plane className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ), { duration: 10000 });
          } else {
            toast.custom((t) => (
              <div 
                onClick={() => {
                  toast.dismiss(t);
                  updateDoc(doc(db, 'notifications', change.doc.id), { read: true });
                  if (notif.type === 'message') {
                    setSelectedProfileId(notif.fromId);
                    setActiveTab('chat');
                  } else if (notif.type === 'like' || notif.type === 'friend_request') {
                    setViewingProfileId(notif.fromId);
                    setActiveTab('view');
                  }
                }}
                className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 p-4 rounded-3xl shadow-2xl flex items-center gap-4 min-w-[320px] cursor-pointer hover:scale-[1.02] transition-transform animate-in slide-in-from-right-full"
              >
                <UserAvatar src={notif.fromPhoto} username={notif.fromName} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-neutral-900 dark:text-white truncate">{notif.fromName}</p>
                  <p className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 truncate uppercase tracking-widest">
                    {notif.type === 'message' ? 'New Message' : notif.type === 'like' ? 'Liked your profile' : 'Friend Request'}
                  </p>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 truncate mt-0.5 italic">"{notif.text}"</p>
                </div>
                <div className="w-8 h-8 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center text-blue-600">
                  {notif.type === 'message' ? <MessageSquare className="w-4 h-4" /> : <UserIcon className="w-4 h-4" />}
                </div>
              </div>
            ), { duration: 5000 });
          }
        }
      });
    }, (err) => {
      if (err.code === 'resource-exhausted') {
        console.warn('Notifications quota exceeded');
      }
    });

    // FCM Registration & Foreground Messaging
    let unsubFCM: (() => void) | undefined;
    if (messaging && typeof window !== 'undefined' && 'Notification' in window) {
      const requestPermissionAndGetToken = async () => {
        try {
          if (Notification.permission === 'default') {
            await Notification.requestPermission();
          }
          
          if (Notification.permission === 'granted') {
            const currentToken = await getToken(messaging, { vapidKey: 'BA_Gx0A-FjpR-A6fDMwtGRRH9na5WTiBUeXDWTAkcXS5pPwfoQxj4eZeDLaRGWEYLmszJbWusepHqV9l5fBVDXY' });
            if (currentToken) {
              await setDoc(doc(db, 'users', currentUser.uid), { fcmToken: currentToken }, { merge: true });
            }
          } else {
            console.warn('Notification permission not granted. Push notifications disabled.');
          }
        } catch (err: any) {
          if (err.code === 'messaging/permission-blocked') {
            console.warn('Messaging: The notification permission was not granted and blocked instead.');
          } else {
            console.error('FCM Token Error:', err);
          }
        }
      };

      requestPermissionAndGetToken();

      if (messaging) {
        try {
          unsubFCM = onMessage(messaging, (payload) => {
            console.log('Foreground message:', payload);
            if (document.visibilityState !== 'visible') {
              new Notification(payload.notification?.title || 'New Message', {
                body: payload.notification?.body,
                icon: payload.notification?.image || '/logo.png'
              });
            }
          });
        } catch (e) {
          console.warn('FCM onMessage subscription failed:', e);
        }
      }
    }

    return () => {
      if (unsubFCM) unsubFCM();
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
      window.removeEventListener('deviceorientation', handleOrientation);
      unsubCount();
      unsubNotif();
    };
  }, [currentUser, !!userProfile]);

  if (loading || isSigningUp) {
    return <SplashScreen isSigningUp={isSigningUp} />;
  }

  if (!currentUser && authChecked && !hasSeenOnboarding) {
    return <Onboarding onComplete={() => {
      setHasSeenOnboarding(true);
      localStorage.setItem('has_seen_onboarding', 'true');
    }} />;
  }

  const handleInteraction = () => {
    if (!currentUser && !showAuthModal) {
      setShowSignupPopup(true);
    }
  };

  const isNavigationTab = ['map', 'search', 'friends', 'chat', 'profile'].includes(activeTab);
  const isFullScreen = showMomentUpload || isMapSelecting || showMapLabelSystem || activeTab === 'settings' || activeTab === 'view' || activeTab === 'moments' || activeTab === 'help' || showMomentDiscovery || isDestinySettingUp || isMapMenuOpen || showAchievements || showRanking;

  return (
    <div className={cn("h-screen w-full bg-[#020617] text-neutral-900 font-sans selection:bg-blue-100 overflow-hidden flex flex-col", darkMode ? "dark" : "")} onClick={handleInteraction}>
      <Toaster position="top-right" />
      
      <StoryOverlay isOpen={showStory} onClose={() => setShowStory(false)} />
      
      {isFullScreen && !isNavigationTab && activeTab !== 'settings' && !isMapMenuOpen && !showAchievements && !showRanking && (
        <div className="fixed top-6 left-6 z-[10000] flex items-center gap-4">
          <button 
            onClick={() => {
              setShowMomentUpload(false);
              setIsMapSelecting(false);
              setShowMapLabelSystem(false);
              setShowMomentDiscovery(false);
              // Navigation logic: go back to map from full-screen tabs
              const fullScreenTabs = ['settings', 'search', 'view', 'profile', 'moments', 'chat', 'help'];
              if (fullScreenTabs.includes(activeTab)) {
                setActiveTab('map');
              }
              setSelectedProfileId(null);
            }}
            className="w-12 h-12 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-2xl rounded-2xl shadow-2xl border border-neutral-100 dark:border-neutral-800 flex items-center justify-center text-neutral-900 dark:text-white transition-all hover:scale-110 active:scale-95"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          
          <div className="px-4 py-2 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-2xl rounded-2xl shadow-xl border border-neutral-100 dark:border-neutral-800 hidden sm:block">
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-900 dark:text-white">
              {showMomentUpload ? 'Create Moment' : 
               (isMapSelecting || showMapLabelSystem) ? 'Map Labeling' :
               activeTab === 'settings' ? 'Settings' :
               activeTab === 'help' ? 'Nearby Help' :
               activeTab === 'chat' ? 'Chat Box' :
               activeTab === 'profile' ? 'My Profile' :
               activeTab === 'view' ? 'User Profile' :
               activeTab === 'search' ? 'Search' : 'MapMates'}
            </p>
          </div>
        </div>
      )}

      {activeTab === 'map' && !showMomentUpload && !isMapSelecting && !showMapLabelSystem && !showMomentDiscovery && !isDestinySettingUp && !isMapMenuOpen && !showAchievements && !showRanking && (
        <Navbar 
          user={userProfile} 
          onlineCount={onlineCount} 
          unreadCount={unreadCount}
          onLogin={() => setShowAuthModal(true)} 
          onSignup={() => setShowAuthModal(true)} 
          onMenuToggle={setIsNavbarMenuOpen}
          onTabChange={(tab: any) => {
            if (tab === 'chat' && !currentUser) {
              setShowAuthModal(true);
              return;
            }
            if (tab === 'settings') {
              setSettingsSection('notifications'); 
            } else {
              setSettingsSection('profile');
            }
            setActiveTab(tab);
          }}
          onViewProfile={(id) => { setViewingProfileId(id); setActiveTab('view'); }}
          onShowStory={() => setShowStory(true)}
          onSearch={(q) => {
            setNavbarSearchQuery(q);
            setActiveTab('search');
          }}
          onOpenPremium={() => setIsPremiumModalOpen(true)}
          onShowAchievements={() => setShowAchievements(true)}
          onShowRanking={() => setShowRanking(true)}
          onShowStatus={() => setShowStatusModal(true)}
          showInstallBtn={showInstallBtn}
          onInstall={handleInstall}
        />
      )}

      <div className="flex flex-1 w-full overflow-hidden relative">
          {!isFullScreen && (
            <div className="hidden lg:flex flex-col bg-[#020617] border-r border-blue-500/20 w-72 shrink-0 overflow-y-auto custom-scrollbar h-full">
            {userProfile && (
              <div className="p-4 border-b border-white/5">
                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5">
                  <UserAvatar 
                    src={userProfile.photoURL} 
                    username={userProfile.username} 
                    size="xs" 
                  />
                  <div className="min-w-0">
                    <p className="font-black text-sm text-white truncate">{userProfile.username}</p>
                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest truncate">{userProfile.profession}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <MoodPicker userProfile={userProfile} onUpdate={setUserProfile} />
                </div>
              </div>
            )}
            <Sidebar 
              activeTab={activeTab} 
              onTabChange={setActiveTab} 
              user={currentUser}
              onLogin={() => setShowAuthModal(true)}
              onSignup={() => setShowAuthModal(true)}
              onOpenPremium={() => setIsPremiumModalOpen(true)}
              onShowAchievements={() => setShowAchievements(true)}
              onShowRanking={() => setShowRanking(true)}
              onShowStatus={() => setShowStatusModal(true)}
            />
          </div>
        )}
        
        <main className={cn(
          "flex-1 relative transition-all duration-500 h-full overflow-hidden",
          activeTab === 'map' ? "bg-transparent" : "bg-[#020617]",
          "pb-[100px] lg:pb-0" 
        )}>
          {/* Animated Background for Non-Map Tabs */}
          {!isFullScreen && activeTab !== 'map' && (
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] animate-pulse" />
              <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-pink-500/10 rounded-full blur-[120px] animate-pulse delay-700" />
            </div>
          )}
          {/* MapVibe is kept mounted to preserve its state and position */}
          <div className={cn("absolute inset-x-0 bottom-0 top-0 transition-opacity duration-300", activeTab === 'map' ? "opacity-100 z-10" : "opacity-0 z-[-1] pointer-events-none")}>
            <MapVibe 
              ref={mapRef}
              userProfile={userProfile}
              darkMode={darkMode}
              onLoad={() => setMapLoaded(true)}
              onProfileClick={(id) => {
                setViewingProfileId(id);
                setActiveTab('view');
                addToHistory('view', id);
              }} 
              onDirectChat={(id) => {
                setSelectedProfileId(id);
                setActiveTab('chat');
                addToHistory('view', id);
              }}
              addToHistory={addToHistory}
              onToggleMates={() => setShowMatesPanel(!showMatesPanel)}
              showMatesPanel={showMatesPanel}
              onMomentClick={(id) => setPlayingMomentUserId(id)}
              hideControls={isNavbarMenuOpen || showMomentUpload || showMomentDiscovery || showMapLabelSystem || isMapSelecting}
              isLabelSelecting={isMapSelecting}
              onStartLabelSelect={() => setIsMapSelecting(true)}
              onLabelPosSelect={setSelectedMapPos}
              selectedLabelPos={selectedMapPos}
              onConfirmLabelPos={() => setMapLabelConfirmTrigger(t => t + 1)}
              onAddMoment={() => setShowMomentUpload(true)}
              onHelpClick={() => setActiveTab('help')}
              showMomentMapLayer={showMomentMapLayer}
              onToggleMomentMapLayer={() => setShowMomentMapLayer(!showMomentMapLayer)}
              onMissionModeChange={setIsMissionMode}
              onDestinyModeChange={setIsDestinyActive}
              onDestinySetupChange={setIsDestinySettingUp}
              onSideMenuToggle={setIsMapMenuOpen}
            />
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'profile' && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="h-full overflow-y-auto"
              >
                <ProfilePage 
                  profileId={userProfile?.uid || currentUser?.uid || ''} 
                  onMessage={(id) => {
                    setSelectedProfileId(id);
                    setActiveTab('chat');
                  }}
                  onViewProfile={(id) => {
                    setViewingProfileId(id);
                    setActiveTab('view');
                  }}
                  onSettings={() => setActiveTab('settings')}
                  addToHistory={addToHistory}
                  onAddMoment={() => setShowMomentUpload(true)}
                  onMomentClick={(id) => setPlayingMomentUserId(id)}
                />
              </motion.div>
            )}
            {activeTab === 'view' && (
              <motion.div
                key="view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="h-full overflow-y-auto"
              >
                {viewingProfileId ? (
                  <ProfilePage 
                    profileId={viewingProfileId} 
                    onMessage={(id) => {
                      setSelectedProfileId(id);
                      setActiveTab('chat');
                    }}
                    onViewProfile={(id) => {
                      setViewingProfileId(id);
                      setActiveTab('view');
                    }}
                    onSettings={() => setActiveTab('settings')}
                    addToHistory={addToHistory}
                    onAddMoment={() => setShowMomentUpload(true)}
                    onMomentClick={(id) => setPlayingMomentUserId(id)}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                    <div className="w-20 h-20 bg-neutral-50 rounded-3xl flex items-center justify-center mb-6">
                      <Compass className="w-10 h-10 text-neutral-300" />
                    </div>
                    <h3 className="text-xl font-black text-neutral-900 mb-2">No profile selected</h3>
                    <p className="text-neutral-500 font-medium">Search for people or explore the map to view profiles.</p>
                  </div>
                )}
              </motion.div>
            )}
            {activeTab === 'search' && (
              <motion.div
                key="search"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="h-full overflow-y-auto"
              >
                <SearchPage 
                  initialQuery={navbarSearchQuery}
                  onViewProfile={(id) => {
                    setViewingProfileId(id);
                    setActiveTab('view');
                  }}
                  onMessage={(id) => {
                    setSelectedProfileId(id);
                    setActiveTab('chat');
                  }}
                  onBack={() => setActiveTab('map')}
                />
              </motion.div>
            )}
            {activeTab === 'chat' && (
              <motion.div
                key="chat"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="h-full"
              >
                <ChatInbox 
                  selectedChatId={selectedProfileId} 
                  onSelectChat={(id) => setSelectedProfileId(id)}
                  onCall={(id) => toast.info("This feature is coming soon!")}
                />
              </motion.div>
            )}
            {activeTab === 'active' && (
              <motion.div
                key="active"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full overflow-y-auto p-4 md:p-8"
              >
                <div className="max-w-4xl mx-auto">
                  <h2 className="text-2xl font-black tracking-tighter text-neutral-900 dark:text-white mb-6">Active Now</h2>
                  <ActiveUsers 
                    onProfileClick={(id) => { 
                      setViewingProfileId(id); 
                      setActiveTab('view'); 
                    }} 
                  />
                </div>
              </motion.div>
            )}
            {activeTab === 'discover' && (
              <motion.div
                key="discover"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="h-full overflow-y-auto"
              >
                <DiscoverPage 
                  userProfile={userProfile}
                  onProfileClick={(id) => { setViewingProfileId(id); setActiveTab('view'); }}
                  onMessage={(id) => { setSelectedProfileId(id); setActiveTab('chat'); }}
                  onFlyTo={(id) => {
                    setActiveTab('map');
                    setTimeout(() => mapRef.current?.flyToUser(id), 100);
                  }}
                />
              </motion.div>
            )}
            {activeTab === 'random' && (
              <motion.div
                key="random"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="h-full"
              >
                <RandomProfiles 
                  onProfileClick={(id) => { setViewingProfileId(id); setActiveTab('view'); addToHistory('view', id); }} 
                  onFlyTo={(id) => {
                    setActiveTab('map');
                    setTimeout(() => mapRef.current?.flyToUser(id), 100);
                  }}
                />
              </motion.div>
            )}
            {activeTab === 'achievements' && (
              <motion.div 
                key="achievements"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="h-full"
              >
                <Achievements 
                  onViewProfile={(id) => { setViewingProfileId(id); setActiveTab('view'); }}
                  onMessage={(id) => { setSelectedProfileId(id); setActiveTab('chat'); }}
                  onLocate={(id) => { 
                    setViewingProfileId(id); 
                    setActiveTab('map');
                    setTimeout(() => mapRef.current?.flyToUser(id), 100);
                  }}
                />
              </motion.div>
            )}
            {activeTab === 'friends' && (
              <motion.div
                key="friends"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="h-full"
              >
                <FriendList 
                  onProfileClick={(id) => { setViewingProfileId(id); setActiveTab('view'); }} 
                  onMessage={(id) => { setSelectedProfileId(id); setActiveTab('chat'); }}
                  onFlyTo={(id) => {
                    setActiveTab('map');
                    setTimeout(() => mapRef.current?.flyToUser(id), 100);
                  }}
                />
              </motion.div>
            )}
            {activeTab === 'moments' && (
              <motion.div
                key="moments"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full"
              >
                <Moments 
                  onProfileClick={(id) => { setViewingProfileId(id); setActiveTab('view'); }} 
                  onClose={() => setActiveTab('map')}
                />
              </motion.div>
            )}
            {activeTab === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="h-full w-full relative z-[1000]"
              >
                <div className="absolute inset-0 bg-[#020617] -z-10" />
                <Settings 
                  initialSection={settingsSection} 
                  darkMode={darkMode} 
                  onDarkModeToggle={() => setDarkMode(!darkMode)} 
                  onTabChange={setActiveTab}
                  onClose={() => setActiveTab('map')}
                  onMessage={(id) => { setSelectedProfileId(id); setActiveTab('chat'); }}
                  onFlyTo={(lat, lng) => { 
                    setActiveTab('map'); 
                    setTimeout(() => mapRef.current?.flyTo(lat, lng, 18), 100); 
                  }}
                />
              </motion.div>
            )}
            {activeTab === 'help' && (
              <motion.div
                key="help"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="h-full w-full relative z-10"
              >
                <NearbyHelp 
                  userProfile={userProfile} 
                  onClose={() => setActiveTab('map')} 
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {activeTab === 'map' && showMatesPanel && (
          <div className="hidden lg:flex flex-col w-96 border-l border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden">
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="p-4 border-b border-neutral-100 dark:border-neutral-800">
                <h3 className="text-xl font-black tracking-tighter text-neutral-900 dark:text-white">Discover Mates</h3>
              </div>
              <DiscoverPage 
                userProfile={userProfile}
                onProfileClick={(id) => { setViewingProfileId(id); setActiveTab('view'); }}
                onMessage={(id) => { setSelectedProfileId(id); setActiveTab('chat'); }}
                onFlyTo={(id) => {
                  setActiveTab('map');
                  setTimeout(() => mapRef.current?.flyToUser(id), 100);
                }}
              />
              <div className="border-t border-neutral-100 dark:border-neutral-800">
                <div className="p-4 border-b border-neutral-100 dark:border-neutral-800">
                  <h3 className="text-xl font-black tracking-tighter text-neutral-900 dark:text-white">Your Mates</h3>
                </div>
                <FriendBar 
                  onProfileClick={(id) => { setViewingProfileId(id); setActiveTab('view'); }}
                  onMessage={(id) => { setSelectedProfileId(id); setActiveTab('chat'); }}
                  onCall={(id) => toast.info("This feature is coming soon!")}
                  onFlyTo={(id) => {
                    setActiveTab('map');
                    setTimeout(() => mapRef.current?.flyToUser(id), 100);
                  }}
                  className="border-b border-neutral-100 dark:border-neutral-800"
                />
                <RightSidebar onProfileClick={(id) => { setViewingProfileId(id); setActiveTab('view'); addToHistory('view', id); }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Map Action Buttons (Floating) */}
      {!isFullScreen && activeTab === 'map' && currentUser && !showMapLabelSystem && !isMapSelecting && !showMomentUpload && !showMomentDiscovery && !isDestinyActive && (
        <div className="fixed bottom-28 right-8 z-[5998] flex flex-col items-end gap-5">
          <AnimatePresence mode="wait">
            {showMomentMapLayer && (
              <div className="flex flex-col items-end gap-4 mb-2">
                <motion.button 
                  key="vibe-btn"
                  initial={{ scale: 0, opacity: 0, x: 20 }} 
                  animate={{ scale: 1, opacity: 1, x: 0 }} 
                  exit={{ scale: 0, opacity: 0, x: 20 }}
                  whileHover={{ scale: 1.1, rotate: 5 }} 
                  whileTap={{ scale: 0.9 }} 
                  onClick={() => setShowMomentDiscovery(true)} 
                  className="w-14 h-14 bg-cyan-500 text-white rounded-[1.8rem] shadow-[0_15px_40px_rgba(6,182,212,0.4)] flex items-center justify-center border-2 border-white/20 group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-white/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Zap className="w-6 h-6 fill-white group-hover:scale-110 transition-transform relative z-10" />
                </motion.button>

                <motion.button 
                  key="moment-btn"
                  initial={{ scale: 0, opacity: 0, x: 20 }} 
                  animate={{ scale: 1, opacity: 1, x: 0 }} 
                  exit={{ scale: 0, opacity: 0, x: 20 }}
                  transition={{ delay: 0.05 }}
                  whileHover={{ scale: 1.1, rotate: -5 }} 
                  whileTap={{ scale: 0.9 }} 
                  onClick={() => setShowMomentUpload(true)} 
                  className="w-14 h-14 bg-pink-500 text-white rounded-[1.8rem] shadow-[0_15px_40px_rgba(236,72,153,0.4)] flex items-center justify-center border-2 border-white/20 group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-white/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Camera className="w-6 h-6 group-hover:scale-110 transition-transform relative z-10" />
                </motion.button>
              </div>
            )}
          </AnimatePresence>

          <motion.button 
            initial={{ scale: 0, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            whileHover={{ scale: 1.1 }} 
            whileTap={{ scale: 0.9 }} 
            onClick={() => setShowMapLabelSystem(true)} 
            className="w-14 h-14 bg-blue-600/20 backdrop-blur-3xl text-white rounded-[1.8rem] shadow-[0_15px_60px_rgba(37,99,235,0.4)] flex flex-col items-center justify-center border border-blue-400/50 relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-blue-400/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            <PenLine className="w-6 h-6 relative z-10 drop-shadow-[0_0_8px_#3b82f6]" />
            <div className="absolute -inset-1 bg-blue-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
          </motion.button>
        </div>
      )}

      {/* Global Modals / Overlays */}
      {showMapLabelSystem && (
        <MapLabelSystem 
          onClose={() => { setShowMapLabelSystem(false); setIsMapSelecting(false); setSelectedMapPos(null); }}
          userCoords={userProfile?.location || { lat: 31.5204, lng: 74.3587 }}
          onSelectMode={setIsMapSelecting}
          onConfirmLocation={setSelectedMapPos}
          selectedPos={selectedMapPos}
          confirmTrigger={mapLabelConfirmTrigger}
          onAddLabel={(label) => mapRef.current?.addOptimisticLabel(label)}
        />
      )}

      {quotaExceeded && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[4000] w-full max-w-lg px-4">
          <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-red-600 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-4 border border-red-500">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
                <SettingsIcon className="w-4 h-4 animate-spin" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-widest">Limit Reached</p>
                <p className="text-[10px] font-bold text-red-100">Live features paused. Browse map normally.</p>
              </div>
            </div>
            <button onClick={() => setQuotaExceeded(false)} className="p-2 hover:bg-white/10 rounded-xl transition"><X className="w-4 h-4" /></button>
          </motion.div>
        </div>
      )}

      {/* NEW SYSTEM MODALS */}
      <AnimatePresence>
        {showStatusModal && (
          <StatusModal 
            isOpen={showStatusModal} 
            onClose={() => {
              setShowStatusModal(false);
              setStatusEditingText(null);
            }} 
            userProfile={userProfile} 
            initialText={statusEditingText || ''}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAchievements && (
          <AchievementModal 
            isOpen={showAchievements} 
            onClose={() => setShowAchievements(false)} 
            userProfile={userProfile} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRanking && (
          <RankingView 
            onClose={() => setShowRanking(false)} 
            onViewProfile={(id) => { setViewingProfileId(id); setActiveTab('view'); setShowRanking(false); }}
            userProfile={userProfile}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeCall && (
          <VoiceCall 
            key="voice-call-overlay"
            targetId={activeCall.targetId} 
            isIncoming={activeCall.isIncoming} 
            onEnd={() => setActiveCall(null)} 
          />
        )}
      </AnimatePresence>

      {/* Mobile Friend Bar */}
      {currentUser && (activeTab === 'active') && (
        <div className="lg:hidden fixed bottom-16 left-0 right-0 z-[5998]">
          <FriendBar 
            onProfileClick={(id) => { setViewingProfileId(id); setActiveTab('view'); }}
            onMessage={(id) => { setSelectedProfileId(id); setActiveTab('chat'); }}
            onCall={(id) => toast.info("This feature is coming soon!")}
            onFlyTo={(id) => {
              setActiveTab('map');
              setTimeout(() => mapRef.current?.flyToUser(id), 100);
            }}
            className="border-t border-neutral-100 shadow-[0_-8px_30px_rgb(0,0,0,0.05)]"
          />
        </div>
      )}

      {/* Floating Mood (Map Only) */}
      {activeTab === 'map' && userProfile && (
        <div className="fixed top-20 right-4 z-[4000] flex flex-col gap-3">
        </div>
      )}

      {/* Mobile Bottom Nav */}
      {!isFullScreen && !isNavbarMenuOpen && (
      <div className="fixed bottom-0 left-0 right-0 h-[88px] bg-[#020617]/90 backdrop-blur-3xl border-t border-blue-500/30 flex items-start justify-around px-2 z-[9000] shadow-[0_-20px_60px_rgba(0,0,0,0.8)] transition-all duration-300 overflow-hidden pb-safe">
          {/* Neon Glow Accents */}
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-60 shadow-[0_0_15px_#3b82f6]" />
          <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none" />
          
          {[
            { id: 'map', icon: Map, label: 'Sector' },
            { id: 'search', icon: Search, label: 'Neural' },
            { id: 'friends', icon: Users, label: 'Nodes' },
            { id: 'chat', icon: MessageSquare, label: 'Comm' },
            { id: 'profile', icon: UserIcon, label: 'Core' },
          ].map((item, idx) => (
            <button
              key={item.id || `nav-${idx}`}
              onClick={() => {
                if (item.id === activeTab) {
                  if (item.id === 'chat') setSelectedProfileId(null);
                  if (item.id === 'profile') setViewingProfileId(currentUser?.uid || null);
                  if (item.id === 'view') setViewingProfileId(null);
                }
                setActiveTab(item.id as any);
              }}
              className={cn(
                "flex flex-col items-center justify-center transition-all duration-300 flex-1 min-w-0 relative px-1 h-16 mt-1",
                activeTab === item.id ? "text-white" : "text-white/30 hover:text-white/60"
              )}
            >
              <div className={cn(
                "p-2.5 rounded-2xl transition-all duration-500 relative flex items-center justify-center",
                activeTab === item.id ? "bg-blue-600/20 scale-110 shadow-[0_0_25px_rgba(37,99,235,0.4)]" : ""
              )}>
                {activeTab === item.id && (
                  <motion.div layoutId="nav-bg" className="absolute inset-0 bg-blue-600/10 rounded-2xl border border-blue-400/30 shadow-[inset_0_0_10px_rgba(59,130,246,0.3)]" />
                )}
                <item.icon className={cn("w-6 h-6 relative z-10", activeTab === item.id ? "drop-shadow-[0_0_12px_#3b82f6] text-blue-400" : "")} />
              </div>
            </button>
          ))}
        </div>
      )}
      {/* Auth Form - Shown when not logged in */}
      {!currentUser && authChecked && !loading && (
        <div className="fixed inset-0 z-[10000] bg-white dark:bg-neutral-900 overflow-y-auto">
          <AuthModal isOpen={true} onClose={() => {}} isFullPage={true} />
        </div>
      )}

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      
      {showMomentUpload && (
        <MomentFlow 
          userProfile={userProfile} 
          onClose={() => {
            setShowMomentUpload(false);
            setActiveTab('map');
          }} 
          onSuccess={() => {
            setShowMomentUpload(false);
            toast.success("Moment shared successfully!");
          }} 
          onOptimisticMoment={(moment) => mapRef.current?.addOptimisticMoment(moment)}
        />
      )}

      {showMomentDiscovery && (
        <MomentDiscoveryFeed 
          userLocation={userProfile?.location}
          onClose={() => setShowMomentDiscovery(false)}
          onFlyTo={(lat, lng) => {
            setActiveTab('map');
            setTimeout(() => mapRef.current?.flyTo(lat, lng, 18), 100);
            setShowMomentDiscovery(false);
          }}
          onViewProfile={(id) => {
            setViewingProfileId(id);
            setActiveTab('view');
            setShowMomentDiscovery(false);
          }}
          friends={userProfile?.friends || []}
        />
      )}

      <AnimatePresence>
        {playingMomentUserId && (
          <div key="playing-moment-overlay" className="fixed inset-0 z-[9000] bg-black">
            <Moments 
              initialUserId={playingMomentUserId}
              onProfileClick={(id) => { 
                setViewingProfileId(id); 
                setActiveTab('view'); 
                setPlayingMomentUserId(null); 
              }}
              onClose={() => setPlayingMomentUserId(null)}
            />
          </div>
        )}
      </AnimatePresence>
      <PremiumModal 
        isOpen={isPremiumModalOpen} 
        onClose={handleClosePremiumModal} 
        user={userProfile}
      />
    </div>
  );
}

export default App;
