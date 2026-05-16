export interface UserProfile {
  uid: string;
  username: string;
  fullName: string;
  email: string;
  photoURL: string;
  provider?: string;
  bio: string;
  gender: string;
  religion: string;
  language: string;
  age: number;
  relationshipStatus: string;
  profession: string;
  economicClass: string;
  location: {
    lat: number;
    lng: number;
    lastUpdated: string;
    accuracy?: number;
    heading?: number;
  };
  isOnline: boolean;
  lastSeen: string;
  mood?: {
    emoji: string;
    text: string;
  };
  currentMood?: string;
  lastMoodUpdate?: string;
  showOnMap: boolean;
  privateProfile: boolean;
  showOnDiscover: boolean;
  role?: 'user' | 'admin';
  stats: {
    views: number;
    likes: number;
    friendsCount: number;
    ratingsCount?: number;
    avgPersonality?: number;
    avgFriendliness?: number;
    avgAttractiveness?: number;
    avgTrustLevel?: number;
  };
  xp?: number;
  streak?: number;
  lastActive?: string;
  badges?: string[];
  hasActiveMoment?: boolean;
  lastMomentExpiry?: string;
  showFriendsOnlyOnMap?: boolean;
  showFriendsOnlyMoments?: boolean;
  friends?: string[];
  mates?: string[];
  status?: string;
  statusExpiresAt?: string;
  business?: BusinessProfile;
  recentPath?: { lat: number; lng: number; timestamp: number }[];
  parentMode?: {
    enabled: boolean;
    children: string[];
    childCount: number;
  };
  childMode?: {
    enabled: boolean;
    parents: string[];
    type: 'mother' | 'father' | 'both' | null;
  };
  premium?: boolean;
  premiumUntil?: string; // ISO string or timestamp
}

export interface PremiumPayment {
  id: string;
  uid: string;
  username: string;
  amount: number;
  currency: string;
  screenshotUrl: string;
  transactionId: string;
  paymentMethod: 'JazzCash' | 'Easypaisa';
  status: 'pending' | 'approved' | 'rejected';
  timestamp: string;
}

export interface BusinessProfile {
  shopName: string;
  category: string;
  shopPhotoURL: string;
  ownerSelfieURL: string;
  isVerified: boolean;
  isBlueTick: boolean;
  timings: {
    open: string; // e.g., "12:00 AM"
    close: string; // e.g., "12:00 PM"
  };
  phoneNumber: string;
  location: {
    lat: number;
    lng: number;
  };
  showShopOnMap: boolean;
  isShopOpen: boolean;
  hasPowerOutage: boolean;
  lastInteraction: string;
  flashSale?: FlashSale;
  rushStatus?: 'low' | 'medium' | 'high' | 'crowded';
}

export interface FlashSale {
  discountPercent: number;
  durationHours: number;
  startTime: string;
  expiresAt: string;
  radiusKm: number;
}

export interface ShoppingList {
  id: string;
  uid: string;
  username: string;
  userPhoto: string;
  items: string[];
  radiusKm: number;
  location: {
    lat: number;
    lng: number;
  };
  status: 'active' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface Bid {
  id: string;
  listId: string;
  shopId: string;
  shopName: string;
  shopPhoto: string;
  totalPrice: number;
  currency: string;
  timestamp: string;
  status: 'pending' | 'accepted' | 'rejected';
}

export interface StockQuery {
  id: string;
  uid: string;
  username: string;
  itemName: string;
  radiusKm: number;
  location: {
    lat: number;
    lng: number;
  };
  createdAt: string;
}

export interface StockReply {
  id: string;
  queryId: string;
  shopId: string;
  shopName: string;
  shopPhoto: string;
  available: boolean;
  timestamp: string;
}

export interface DeliveryRequest {
  id: string;
  uid: string;
  username: string;
  itemName: string;
  deliveryFee: number;
  currency: string;
  radiusKm: number;
  location: {
    lat: number;
    lng: number;
  };
  status: 'pending' | 'accepted' | 'completed';
  acceptedBy?: string; // UID of the person who accepted
  acceptedByName?: string;
  createdAt: string;
}

export interface GiftBox {
  id: string;
  lat: number;
  lng: number;
  points: number;
  claimedBy?: string[];
}

export interface AppNotification {
  id: string;
  uid: string; // Recipient
  fromId: string; // Sender
  fromName: string;
  fromPhoto: string;
  type: 'message' | 'friend_request' | 'like' | 'rate' | 'help';
  text: string;
  chatId?: string; // For message notifications
  lat?: number; // For help signals
  lng?: number; // For help signals
  read: boolean;
  timestamp: string;
}

export interface FriendRequest {
  id: string;
  from: string;
  to: string;
  status: 'pending' | 'accepted' | 'rejected';
  friendshipType: string;
  closeness: number;
  attractiveness: number;
  createdAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: string;
  read: boolean;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio' | 'pdf' | 'file' | 'other';
  attachmentName?: string;
}

export interface Conversation {
  id: string;
  participants: string[];
  lastMessage: string;
  lastMessageTimestamp: string;
  lastMessageSenderId: string;
  unreadCount: { [uid: string]: number };
  typing?: { [uid: string]: boolean };
  targetUser?: UserProfile; // Joined for UI
}

export interface MapPing {
  id: string;
  uid: string;
  username: string;
  photoURL: string;
  lat: number;
  lng: number;
  timestamp: string;
  type: 'vibe' | 'ping' | 'help';
}

export interface SocialAction {
  id: string;
  fromId: string;
  toId: string;
  fromName: string;
  fromPhoto: string;
  type: 'view' | 'like' | 'rate';
  ratingValues?: {
    personality: number;
    friendliness: number;
    attractiveness: number;
    trustLevel: number;
  };
  timestamp: string;
  user?: UserProfile; // Joined for UI
}

export interface Rating {
  id: string;
  from: string;
  to: string;
  personality: number;
  friendliness: number;
  attractiveness: number;
  trustLevel: number;
}

export interface HistoryItem {
  id: string;
  uid: string;
  type: 'search' | 'view';
  targetId?: string;
  query?: string;
  timestamp: string;
}

export interface Moment {
  id: string;
  uid: string;
  username: string;
  userPhoto: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  description?: string;
  location: {
    lat: number;
    lng: number;
    name?: string;
  };
  textLayers?: Array<{
    id: string;
    text: string;
    color: string;
    fontSize: number;
    x: number;
    y: number;
    rotation: number;
  }>;
  filters?: {
    blur?: number;
    brightness?: number;
    saturation?: number;
    activeFilter?: string;
  };
  createdAt: string;
  expiresAt: string;
  viewsCount: number;
  viewerIds: string[];
}

export interface Destiny {
  id: string;
  uid: string;
  username: string;
  userPhoto: string;
  startLocation: {
    lat: number;
    lng: number;
  };
  targetLocation: {
    lat: number;
    lng: number;
  };
  status: 'active' | 'completed' | 'failed' | 'cancelled';
  visibility: 'all' | 'mates' | 'custom';
  allowedUsers?: string[];
  createdAt: string;
  completedAt?: string;
  distance?: number;
  roadPath?: { lat: number; lng: number }[];
  travelMode?: 'walking' | 'bicycling' | 'driving';
  routePreference?: 'main' | 'street';
  safetyRadius?: number;
  rewardClaimed?: boolean;
}

export interface ParentChildPath {
  id: string;
  childUid: string;
  points: { lat: number; lng: number; timestamp: number }[];
  stops: { lat: number; lng: number; startTime: number; endTime: number }[];
  lastUpdated: number;
  createdAt: string;
}

export interface DestinyConfig {
  id: string;
  childUid: string;
  parentUid: string;
  target: { lat: number; lng: number };
  status: 'active' | 'completed' | 'failed' | 'cancelled';
  details: {
    timeOfDay: 'day' | 'night';
    gender: 'boy' | 'girl';
    preference: 'rush' | 'quiet';
  };
  radiusLimit: number;
  geofenceRadius?: number;
  spectators?: string[];
  roadPath?: { lat: number; lng: number }[];
  createdAt: string;
  completedAt?: string;
}

export interface MapLabel {
  id: string;
  uid: string;
  userId?: string; // Added for compatibility with new rules
  creatorName: string;
  creatorPhoto: string;
  name: string;
  category: string;
  subCategory: string;
  photos: string[];
  location: {
    lat: number;
    lng: number;
  };
  markerIcon: string;
  status: 'pending' | 'approved' | 'rejected' | 'deleted';
  createdAt: string;
  approvedAt?: string;
  hiddenBy?: string[]; // IDs of users who hid this label
}

export interface LabelApprovalRequest {
  id: string;
  labelId: string;
  uid: string;
  creatorName: string;
  creatorPhoto: string;
  labelName: string;
  labelCategory: string;
  labelPhotos: string[];
  status: 'pending' | 'approved' | 'rejected' | 'deleted';
  timestamp: string;
  reason?: string; // For rejection
}

export interface UserLabelStats {
  uid: string;
  acceptedCount: number;
  rejectedCount: number;
  lastRejectedAt?: string;
  featureDisabledUntil?: string;
  dailyCount: number;
  lastLabelDate: string;
}
