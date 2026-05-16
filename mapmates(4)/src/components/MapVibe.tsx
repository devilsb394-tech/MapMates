import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef, useMemo } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, Circle, Polyline, OverlayView, TrafficLayer, TransitLayer, BicyclingLayer, StreetViewPanorama } from '@react-google-maps/api';
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "AIzaSyAIybvjQDUfJTDQ79aioaJ0ZMVIrPCcz8w";
import { db, auth, handleFirestoreError, OperationType } from '../firebase/firebase';
import { collection, onSnapshot, query, where, limit, getDocs, getDoc, addDoc, serverTimestamp, orderBy, deleteDoc, doc, updateDoc, setDoc, or, increment } from 'firebase/firestore';
import { UserProfile, Destiny, ParentChildPath, DestinyConfig } from '../types';
import type { MapLabel } from '../types';
import { Search, Map as MapIcon, Layers, Navigation, Crosshair, Send, X, ZoomIn, UserPlus, MessageCircle, Plane, MapPin, Radio, Zap, Compass, User as UserIcon, Users, Play, MessageSquare, Trash2, MoreHorizontal, MoreVertical, Box, RotateCw, Navigation2, Bus, Bike, Maximize2, UserCheck, Store, Package, Truck, Trophy, Flag, Crown, Shield, ShieldCheck, Check, AlertTriangle as AlertTriangleIcon, CheckCircle2, Globe, Baby, Activity, Map as MapIcon2, Info, BellRing, Eye, EyeOff, ChevronLeft, ChevronRight, Menu, Sun, Cloud, CloudRain, Moon, CloudLightning, PenLine, Sunrise, Sunset, Mountain, Snowflake, Camera, Settings as SettingsIcon, Car, Lock, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { cn, calculateDistance, getDistanceNumber } from '../lib/utils';
import { UserAvatar } from './UserAvatar';
import { ShoppingListModal, BidsView, StockQueryModal, DeliveryRequestModal } from './BusinessFeatures';

const GOOGLE_MAPS_STYLES: Record<string, google.maps.MapTypeStyle[]> = {
  standard: [
    { elementType: "geometry", stylers: [{ color: "#000b1e" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#000b1e" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#7dc9ff" }] },
    { featureType: "administrative", elementType: "labels.text.fill", stylers: [{ color: "#45fafb" }] },
    { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#00f2ff" }] },
    { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#001a1a" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#002a4d" }] },
    { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#00f2ff" }, { weight: 0.1 }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#003e75" }] },
    { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#00f2ff" }, { weight: 0.5 }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#000000" }] },
    { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#00050a" }] }
  ],
  night: [
    { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
    { featureType: "administrative", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
    { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
    { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#263c3f" }] },
    { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#6b9a76" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
    { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
    { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#746855" }] },
    { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f2835" }] },
    { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#f3d19c" }] },
    { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f3948" }] },
    { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
    { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
    { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#17263c" }] }
  ],
  lighting: [
    { elementType: "geometry", stylers: [{ color: "#1a202c" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#1a202c" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#718096" }] },
    { featureType: "administrative", elementType: "labels.text.fill", stylers: [{ color: "#a0aec0" }] },
    { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#2d3748" }] },
    { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#1a252f" }] },
    { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
    { featureType: "road.highway", elementType: "geometry.fill", stylers: [{ color: "#fcd34d" }, { visibility: "on" }] },
    { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#92400e" }, { weight: 4 }] },
    { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#f3d19c" }] },
    { featureType: "road.arterial", elementType: "geometry.fill", stylers: [{ color: "#fbbf24" }] },
    { featureType: "road.arterial", elementType: "geometry.stroke", stylers: [{ color: "#78350f" }, { weight: 2 }] },
    { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f3948" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#0f172a" }] },
    { featureType: "building", elementType: "geometry.fill", stylers: [{ color: "#2d3748" }] },
    { featureType: "building", elementType: "geometry.stroke", stylers: [{ color: "#fcd34d" }, { weight: 0.5 }] },
    { featureType: "building", elementType: "labels.text.fill", stylers: [{ color: "#fcd34d" }, { lightness: 20 }] },
    { featureType: "landscape", elementType: "geometry.fill", stylers: [{ color: "#111827" }] }
  ],
  neon: [
    { elementType: "geometry", stylers: [{ color: "#1d2c4d" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#8ec3b9" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#1a3646" }] },
    { featureType: "administrative.country", elementType: "geometry.stroke", stylers: [{ color: "#4b6878" }] },
    { featureType: "administrative.province", elementType: "geometry.stroke", stylers: [{ color: "#4b6878" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#304a7d" }] },
    { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#98a5be" }] },
    { featureType: "road", elementType: "labels.text.stroke", stylers: [{ color: "#1d2c4d" }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#2c6675" }] },
    { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#255762" }] },
    { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#b0d5ce" }] },
    { featureType: "road.highway", elementType: "labels.text.stroke", stylers: [{ color: "#023e58" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#0e1626" }] },
    { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#4e6d70" }] }
  ],
  blue: [
    { elementType: "geometry", stylers: [{ color: "#0f172a" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#38bdf8" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#0f172a" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#1e293b" }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#0369a1" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#0c4a6e" }] }
  ],
  sunlight: [
    { featureType: "all", stylers: [{ saturation: 20 }, { lightness: 10 }, { gamma: 1.2 }] },
    { featureType: "water", stylers: [{ color: "#e9eff1" }] }
  ],
  cloudy: [
    { featureType: "all", stylers: [{ saturation: -40 }, { lightness: 5 }, { gamma: 0.8 }] },
    { featureType: "road", stylers: [{ lightness: -10 }] }
  ],
  rainy: [
    { featureType: "all", stylers: [{ saturation: -60 }, { lightness: -10 }, { gamma: 0.7 }] },
    { featureType: "water", stylers: [{ color: "#3b4d61" }] },
    { featureType: "landscape", stylers: [{ color: "#d1d5db" }] }
  ],
  dark: [
    { elementType: "geometry", stylers: [{ color: "#212121" }] },
    { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#212121" }] },
    { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#757575" }] },
    { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#2c2c2c" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#000000" }] }
  ],
  silver: [
    { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
    { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#f5f5f5" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#c9c9c9" }] }
  ],
  retro: [
    { elementType: "geometry", stylers: [{ color: "#ebe3cd" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#523735" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#f5f1e6" }] },
    { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#c9b2a6" }] },
    { featureType: "poi", elementType: "geometry", stylers: [{ color: "#dfd2ae" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#f5f1e6" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#b9d3c2" }] }
  ],
  aubergine: [
    { elementType: "geometry", stylers: [{ color: "#1d2c4d" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#8ec3b9" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#1a3646" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#304a7d" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#0e1626" }] }
  ],
  holographic: [
    { elementType: "geometry", stylers: [{ color: "#dae5f0" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#6366f1" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#a5b4fc" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
    { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#4f46e5" }] },
    { featureType: "administrative", elementType: "labels.text.fill", stylers: [{ color: "#4338ca" }] }
  ],
  wargames: [
    { elementType: "geometry", stylers: [{ color: "#000000" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#00ff41" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#003300" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#001a00" }] },
    { featureType: "landscape", stylers: [{ color: "#000000" }] }
  ],
  glitch: [
    { elementType: "geometry", stylers: [{ color: "#111111" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#ff00ff" }, { weight: 1 }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#00ffff" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#ffff00" }] }
  ],
  topo: [
    { elementType: "geometry", stylers: [{ color: "#1a0f08" }] },
    { featureType: "landscape.natural.terrain", elementType: "geometry", stylers: [{ visibility: "on" }, { color: "#ff8c00" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#0d0704" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#3d2b1f" }] }
  ],
  chalkboard: [
    { elementType: "geometry", stylers: [{ color: "#2c3531" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#ffffff" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#4d4d4d" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#111111" }] }
  ],
  paper: [
    { elementType: "geometry", stylers: [{ color: "#eee9df" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#99badd" }] },
    { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#e2e0d7" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#555555" }] }
  ],
  midnight: [
    { elementType: "geometry", stylers: [{ color: "#000b1d" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#00a8ff" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#001d3d" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#000000" }] }
  ],
  minimalist: [
    { elementType: "labels", stylers: [{ visibility: "off" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#f8fafc" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#f1f5f9" }] },
    { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#ffffff" }] }
  ],
  popart: [
    { elementType: "geometry", stylers: [{ color: "#ffde03" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#ff0066" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#00bfff" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#000000" }] }
  ],
  isometric: [
    { elementType: "geometry", stylers: [{ color: "#f3f4f6" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#cbd5e1" }] }
  ],
  xray: [
    { elementType: "geometry", stylers: [{ color: "#000000" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#333333" }, { weight: 0.5 }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#111111" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#666666" }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#00ff00" }, { visibility: "on" }] }
  ],
  registan: [
    { elementType: "geometry", stylers: [{ color: "#edc9af" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#d2b48c" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#c19a6b" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#3e2723" }] }
  ],
  mission: [
    { elementType: "geometry", stylers: [{ color: "#000b1e" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#000b1e" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#00f2ff" }] },
    { featureType: "administrative", elementType: "labels.text.fill", stylers: [{ color: "#45fafb" }] },
    { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#00f2ff" }] },
    { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#001a1a" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#002a4d" }] },
    { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#00f2ff" }, { weight: 0.1 }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#003e75" }] },
    { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#00f2ff" }, { weight: 0.5 }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#000000" }] },
    { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#00050a" }] }
  ],
  morning: [
    { featureType: "all", stylers: [{ saturation: 10 }, { lightness: 20 }, { gamma: 1.5 }] },
    { featureType: "water", stylers: [{ color: "#b3e5fc" }] }
  ],
  fajr: [
    { featureType: "all", stylers: [{ brightness: -20 }, { saturation: -10 }, { hue: "#000033" }] },
    { featureType: "water", stylers: [{ color: "#000044" }] }
  ],
  sunset: [
    { featureType: "all", stylers: [{ hue: "#ff6600" }, { saturation: 30 }, { brightness: -10 }] },
    { featureType: "water", stylers: [{ color: "#ff4400" }] }
  ],
  snowOnGround: [
    { elementType: "geometry", stylers: [{ color: "#ffffff" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#e0f7fa" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#f5f5f5" }] }
  ],
  bijli: [
    { featureType: "all", stylers: [{ brightness: -40 }, { saturation: -20 }, { hue: "#330066" }] },
    { featureType: "water", stylers: [{ color: "#000033" }] },
    { featureType: "landscape", stylers: [{ color: "#111111" }] }
  ],
  satellite_premium: [
    { featureType: "all", stylers: [{ saturation: 40 }, { contrast: 20 }, { lightness: -5 }, { gamma: 1.3 }] },
    { featureType: "water", stylers: [{ color: "#0ea5e9" }, { saturation: 60 }] },
    { featureType: "landscape", stylers: [{ lightness: 5 }, { saturation: 10 }] },
    { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
    { featureType: "transit", elementType: "labels", stylers: [{ visibility: "off" }] },
    { featureType: "administrative", elementType: "labels.text.fill", stylers: [{ color: "#ffffff" }] },
    { featureType: "administrative", elementType: "labels.text.stroke", stylers: [{ color: "#000000" }, { weight: 2 }] }
  ],
  roadmap_lines: [
    { featureType: "all", stylers: [{ lightness: 10 }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#ffffff" }, { weight: 5 }] },
    { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#cccccc" }, { weight: 1 }] },
    
    { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#f2f2f2" }, { weight: 3 }] },
    { featureType: "road.arterial", elementType: "geometry.stroke", stylers: [{ color: "#dddddd" }, { weight: 0.5 }] },
    
    { featureType: "road.local", elementType: "geometry", stylers: [{ color: "#e6e6e6" }, { weight: 2 }] },
    
    { featureType: "water", stylers: [{ color: "#c9d1d9" }] },
    { featureType: "landscape", stylers: [{ color: "#f8f9fa" }] },
    { featureType: "poi", stylers: [{ visibility: "off" }] }
  ]
};

// Map configuration constants
const MAP_CONTAINER_STYLE = {
  width: '100%',
  height: '100%'
};

interface SecretMessage {
  id: string;
  uid: string;
  username: string;
  photoURL: string;
  text: string;
  lat: number;
  lng: number;
  timestamp: string;
}

interface HelpSignal {
  id: string;
  uid: string;
  username: string;
  photoURL: string;
  text: string;
  lat: number;
  lng: number;
  radius: number;
  timestamp: string;
}

import MomentDiscoveryFeed from './Moment/MomentDiscoveryFeed';

export interface MapVibeProps {
  userProfile: UserProfile | null;
  onProfileClick: (id: string) => void;
  onDirectChat: (id: string) => void;
  addToHistory: (type: 'search' | 'view', targetId?: string, query?: string) => void;
  darkMode?: boolean;
  onToggleMates?: () => void;
  showMatesPanel?: boolean;
  onMomentClick?: (userId: string) => void;
  onLoad?: () => void;
  hideControls?: boolean;
  isLabelSelecting?: boolean;
  onLabelPosSelect?: (pos: { lat: number; lng: number } | null) => void;
  selectedLabelPos?: { lat: number; lng: number } | null;
  onStartLabelSelect?: () => void;
  onConfirmLabelPos?: () => void;
  onAddMoment?: () => void;
  showMomentMapLayer?: boolean;
  onToggleMomentMapLayer?: () => void;
  onHelpClick?: () => void;
  onMissionModeChange?: (active: boolean) => void;
  onDestinyModeChange?: (active: boolean) => void;
  onDestinySetupChange?: (open: boolean) => void;
  onSideMenuToggle?: (isOpen: boolean) => void;
}

export interface MapVibeHandle {
  flyToUser: (userId: string) => void;
  flyTo: (lat: number, lng: number, zoom?: number) => void;
  openFilterModal: () => void;
  addOptimisticLabel: (label: MapLabel) => void;
  addOptimisticMoment: (moment: any) => void;
}

function MapEvents({ onDoubleClick, onClick, isDestinyMode, destinySetupStep, setDestinyTarget, setDestinySetupStep, map }: { 
  onDoubleClick: (lat: number, lng: number) => void, 
  onClick: (lat: number, lng: number) => void,
  isDestinyMode: boolean,
  destinySetupStep: 'details' | 'target' | 'confirm' | null,
  setDestinyTarget: (pos: [number, number]) => void,
  setDestinySetupStep: (step: 'details' | 'target' | 'confirm' | null) => void,
  map: google.maps.Map | null
}) {
  useEffect(() => {
    if (!map) return;

    const clickListener = map.addListener('click', (e: google.maps.MapMouseEvent) => {
      const lat = e.latLng?.lat();
      const lng = e.latLng?.lng();
      if (!lat || !lng) return;

      if (destinySetupStep === 'target') {
        setDestinyTarget([lat, lng]);
        setDestinySetupStep('confirm');
        return;
      }
      if (isDestinyMode) onClick(lat, lng);
      else onClick(lat, lng); // Default click behavior
    });

    const dblClickListener = map.addListener('dblclick', (e: google.maps.MapMouseEvent) => {
      const lat = e.latLng?.lat();
      const lng = e.latLng?.lng();
      if (!lat || !lng) return;
      if (!isDestinyMode) onDoubleClick(lat, lng);
    });

    return () => {
      google.maps.event.removeListener(clickListener);
      google.maps.event.removeListener(dblClickListener);
    };
  }, [map, onDoubleClick, onClick, isDestinyMode, destinySetupStep]);

  return null;
}

function RecenterMap({ center, isFirstLoad, setIsFirstLoad, map }: { center: [number, number], isFirstLoad: boolean, setIsFirstLoad: (val: boolean) => void, map: google.maps.Map | null }) {
  useEffect(() => {
    if (map && isFirstLoad && Array.isArray(center) && center.length === 2) {
      const [lat, lng] = center;
      if (isValidLatLng(lat, lng)) {
        try {
          map.setZoom(15);
          map.panTo({ lat, lng });
          setIsFirstLoad(false);
        } catch (error) {
          console.error("RecenterMap panTo failed:", error, { lat, lng });
        }
      }
    }
  }, [center, isFirstLoad, map, setIsFirstLoad]);
  return null;
}

const SmoothMarker = ({ user, onClick, onProfileClick, onDirectChat, center, onMomentClick, activeMoments, userProfile, friends, showPathForUserId, setShowPathForUserId, setFilterMode, setSelectedUserIds, zoomToUser, setIsRefiningLocation, isRefiningLocation, setTempRefinePos, isDestinyMode, vibeFilter, activeDestiny, userHeading, isMissionMode, setStatusMenuData }: { 
  user: UserProfile, 
  onClick: () => void, 
  onProfileClick: (id: string) => void, 
  onDirectChat: (id: string) => void,
  center: google.maps.LatLngLiteral,
  onMomentClick?: (userId: string) => void,
  activeMoments: Set<string>,
  userProfile: UserProfile | null,
  friends: string[],
  showPathForUserId: string | null,
  setShowPathForUserId: (id: string | null) => void,
  setFilterMode: (mode: 'all' | 'mates' | 'custom') => void,
  setSelectedUserIds: (ids: Set<string>) => void,
  zoomToUser: (lat: number, lng: number, userId: string) => void,
  setIsRefiningLocation: (val: boolean) => void,
  isRefiningLocation: boolean,
  setTempRefinePos: (pos: google.maps.LatLngLiteral | null) => void,
  isDestinyMode: boolean,
  vibeFilter: string | null,
  activeDestiny?: any,
  userHeading?: number | null,
  isMissionMode: boolean,
  setStatusMenuData: (data: { text: string; pos: google.maps.LatLngLiteral } | null) => void
}) => {
  const [pos, setPos] = useState<google.maps.LatLngLiteral | null>(user.location && isValidLatLng(user.location.lat, user.location.lng) ? { lat: user.location.lat, lng: user.location.lng } : null);
  const [areaName, setAreaName] = useState<string>('Janipura');
  const [showInfo, setShowInfo] = useState(false);
  const isMe = auth.currentUser?.uid === user.uid;

  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (user.location && isValidLatLng(user.location.lat, user.location.lng) && !isRefiningLocation) {
      let target: google.maps.LatLngLiteral = { lat: user.location.lat, lng: user.location.lng };
      
      // Snapping logic if destiny is active
      if (activeDestiny && activeDestiny.roadPath && activeDestiny.roadPath.length > 0) {
        let minDist = Infinity;
        let snapPoint = target;
        
        activeDestiny.roadPath.forEach((p: any) => {
          const d = getDistanceNumber(target.lat, target.lng, p.lat, p.lng);
          if (d < minDist) {
            minDist = d;
            snapPoint = { lat: p.lat, lng: p.lng };
          }
        });
        
        // Snap if within 20 meters
        if (minDist <= 0.02) {
          target = snapPoint;
        }
      }

      if (!pos) {
        setPos(target);
      } else {
        const duration = 600;
        const start = Date.now();
        const startPos = pos;

        const animate = () => {
          const elapsed = Date.now() - start;
          const progress = Math.min(elapsed / duration, 1);
          const easeProgress = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
          
          const currentLat = startPos.lat + (target.lat - startPos.lat) * easeProgress;
          const currentLng = startPos.lng + (target.lng - startPos.lng) * easeProgress;
          
          setPos({ lat: currentLat, lng: currentLng });

          if (progress < 1) {
            animationFrameRef.current = requestAnimationFrame(animate);
          }
        };

        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [user.location?.lat, user.location?.lng, isRefiningLocation]);

  useEffect(() => {
    if (isMe && user.location) {
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${user.location.lat}&lon=${user.location.lng}`)
        .then(res => res.json())
        .then(data => {
          if (data.address) {
            const area = data.address.suburb || data.address.neighbourhood || data.address.city_district || 'Janipura';
            setAreaName(area);
          }
        })
        .catch(() => setAreaName('Janipura'));
    }
  }, [isMe, user.location?.lat, user.location?.lng]);

  const handleDragEnd = (e: google.maps.MapMouseEvent) => {
    if (!isMe || !isRefiningLocation || !user.location || !e.latLng) return;
    
    const newLat = e.latLng.lat();
    const newLng = e.latLng.lng();
    
    const currentOffset = JSON.parse(localStorage.getItem('location_offset') || '{"lat":0,"lng":0}');
    const rawLat = user.location.lat - currentOffset.lat;
    const rawLng = user.location.lng - currentOffset.lng;
    
    const distKm = getDistanceNumber(rawLat, rawLng, newLat, newLng);
    const distMeters = distKm * 1000;
    
    if (distMeters > 30) {
      toast.error(`Too far! You can only refine your spot within 30 meters of your GPS location to prevent faking.`);
      setPos({ lat: user.location.lat, lng: user.location.lng });
      return;
    }
    
    setTempRefinePos({ lat: newLat, lng: newLng });
    setPos({ lat: newLat, lng: newLng });
    toast.info('Position set! Click "Confirm Spot" to save.', { icon: '📍' });
  };

  if (!pos || isNaN(pos.lat) || isNaN(pos.lng)) return null;

  return (
    <React.Fragment>
      {isMe && user.location?.accuracy && (
        <Circle 
          center={pos} 
          radius={user.location.accuracy} 
          options={{ 
            fillColor: '#3b82f6', 
            fillOpacity: 0.1, 
            strokeColor: '#3b82f6', 
            strokeWeight: 1, 
            clickable: false
          }} 
        />
      )}
      {isMe && isRefiningLocation && user.location && isValidLatLng(user.location.lat, user.location.lng) && (
        <Circle 
          center={{
            lat: user.location.lat - (JSON.parse(localStorage.getItem('location_offset') || '{"lat":0,"lng":0}').lat), 
            lng: user.location.lng - (JSON.parse(localStorage.getItem('location_offset') || '{"lat":0,"lng":0}').lng)
          }} 
          radius={30} 
          options={{ 
            fillColor: '#10b981', 
            fillOpacity: 0.1, 
            strokeColor: '#10b981', 
            strokeWeight: 2,
            clickable: false
          }} 
        />
      )}
      
      <OverlayView
        position={pos}
        mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
      >
        <div 
          className="relative flex flex-col items-center marker-bounce -translate-x-1/2 -translate-y-full cursor-pointer"
          onClick={() => {
            setShowInfo(true);
            if (isValidLatLng(pos.lat, pos.lng)) {
              zoomToUser(pos.lat, pos.lng, user.uid);
            }
            onClick();
          }}
        >
          {isRefiningLocation && (
            <div className="absolute -top-12 bg-blue-600 text-white text-[8px] font-black px-3 py-1.5 rounded-full uppercase animate-bounce shadow-xl border-2 border-white whitespace-nowrap">
              Drag Me to House
            </div>
          )}

          {/* XP Level Badge */}
          <div className="absolute -left-2 top-0 bg-blue-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-lg border border-white z-30 shadow-lg">
            {Math.floor((user.xp || 0) / 100) + 1}
          </div>

          {/* Status Bubble */}
          <AnimatePresence>
            {user.status && (!user.statusExpiresAt || new Date(user.statusExpiresAt) > new Date()) && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.5, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                onClick={(e) => {
                  if (isMe) {
                    e.stopPropagation();
                    setStatusMenuData({ text: user.status!, pos: pos });
                  }
                }}
                className={cn(
                  "absolute -top-14 border z-40 whitespace-nowrap px-3 py-1.5 rounded-2xl shadow-xl transition-all",
                  isMe ? "bg-blue-600 border-blue-400 text-white hover:scale-105" : "bg-white dark:bg-neutral-900 border-neutral-100 dark:border-neutral-800 text-neutral-900 dark:text-white"
                )}
              >
                <div className="flex items-center gap-1.5">
                  <p className="text-[10px] font-black">
                    {user.status.length > 20 ? user.status.slice(0, 20) + '...' : user.status}
                  </p>
                  {isMe && <PenLine className="w-2.5 h-2.5 opacity-50" />}
                </div>
                <div className={cn(
                  "absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 border-r border-b rotate-45",
                  isMe ? "bg-blue-600 border-blue-400" : "bg-white dark:bg-neutral-900 border-neutral-100 dark:border-neutral-800"
                )} />
              </motion.div>
            )}
          </AnimatePresence>
          
          {(user.xp || 0) > 10000 && (
            <div className="absolute -top-6 -right-2 z-30 animate-bounce">
              <Crown className="w-5 h-5 text-yellow-400 drop-shadow-lg fill-current" />
            </div>
          )}
          
          {(user.business ? user.business.isShopOpen : user.isOnline) && (
            <React.Fragment>
              <div className="absolute top-0 w-12 h-12 bg-green-500/20 rounded-full animate-ping"></div>
              <div className="absolute top-0 w-12 h-12 bg-blue-500/10 rounded-full animate-pulse"></div>
            </React.Fragment>
          )}

          {user.location?.heading != null && (
            <div 
              className="absolute -top-10 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-xl transition-transform duration-500 border-2 border-white" 
              style={{ transform: `rotate(${user.location.heading}deg)`, transformOrigin: 'center center' }}
            >
              <Navigation className="w-3 h-3" />
            </div>
          )}

          {(activeDestiny || isMissionMode) ? (
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ 
                scale: 1,
                rotate: (user.uid === auth.currentUser?.uid ? userHeading : null) || user.location?.heading || 0
              }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="relative z-10"
              style={{ 
                transformOrigin: 'center center'
              }}
            >
              {/* Glass Surround for Profile Pic */}
              <div className={cn(
                "w-16 h-16 rounded-full p-1 shadow-[0_0_30px_rgba(37,99,235,0.6)] relative flex items-center justify-center overflow-visible border-2",
                isMissionMode ? "bg-gradient-to-tr from-cyan-500 via-cyan-400 to-blue-600 border-cyan-100/50 shadow-[0_0_30px_rgba(0,242,255,0.6)]" : "bg-gradient-to-tr from-blue-500 via-blue-400 to-indigo-600 border-white/50"
              )}>
                <div className="w-full h-full rounded-full overflow-hidden border-2 border-white relative z-10 bg-white">
                  <img src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=random`} className="w-full h-full object-cover" />
                </div>
                
                {/* Big Navigation Arrow on top of the sparkling profile pic */}
                <div className={cn(
                  "absolute -top-6 left-1/2 -translate-x-1/2 w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-2xl border-2 border-white z-20",
                  isMissionMode ? "bg-cyan-500" : "bg-blue-600"
                )}>
                  <Navigation2 className="w-6 h-6 fill-white" />
                </div>

                {/* Animated Glass Shine */}
                <motion.div 
                  className="absolute inset-0 bg-gradient-to-tr from-white/40 via-transparent to-transparent z-15"
                  animate={{ 
                    opacity: [0.2, 0.5, 0.2],
                    rotate: [0, 360]
                  }}
                  transition={{ duration: 3, repeat: Infinity }}
                />
              </div>
              {/* Dynamic Trail */}
              <div className={cn(
                "absolute -bottom-8 left-1/2 -translate-x-1/2 w-2 h-14 blur-lg opacity-40",
                isMissionMode ? "bg-gradient-to-t from-transparent to-cyan-400" : "bg-gradient-to-t from-transparent to-blue-500"
              )} />
            </motion.div>
          ) : (
            <div className={cn(
              "w-10 h-10 rounded-2xl border-2 shadow-xl overflow-hidden bg-white relative z-10 transition-transform hover:scale-110",
              user.isOnline ? 'border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.4)]' : 'border-white'
            )}>
              <img src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=random`} className="w-full h-full object-cover" />
            </div>
          )}
          
          {!activeDestiny && (
            <div className={cn(
              "absolute rounded-full border-2 border-white z-20 flex items-center justify-center overflow-hidden transition-all duration-300",
              vibeFilter ? 'top-[-8px] right-[-8px] w-6 h-6' : 'top-7 -right-1 w-3.5 h-3.5',
              (user.business ? user.business.isShopOpen : user.isOnline) ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'
            )}>
              {vibeFilter && user.mood?.emoji && <span className="text-xs leading-none">{user.mood.emoji}</span>}
            </div>
          )}
          
          <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-white -mt-0.5 shadow-lg relative z-10"></div>
        </div>
      </OverlayView>

      {showInfo && (
        <InfoWindow
          position={pos}
          onCloseClick={() => setShowInfo(false)}
        >
          <div className="p-3 min-w-[220px] bg-[#020617] text-white border border-blue-500/30 rounded-2xl">
            {isMe ? (
              <div className="text-center">
                <div className="flex flex-col items-center gap-3 mb-5">
                  <div className="relative p-1 rounded-full border border-blue-500/50 shadow-[0_0_15px_rgba(37,99,235,0.3)]">
                    <UserAvatar src={user.photoURL} username={user.username} size="xl" online={true} />
                  </div>
                  <div>
                    <h4 className="font-black text-white tracking-tighter text-lg uppercase italic">Core Identity</h4>
                    <p className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em] opacity-70">Grid Sector: {areaName}</p>
                    {user.location?.accuracy && (
                      <p className="text-[8px] font-black text-cyan-400 uppercase tracking-tighter mt-1 bg-cyan-400/10 px-2 py-0.5 rounded-full inline-block border border-cyan-400/20">
                        Accuracy: {Math.round(user.location.accuracy)}m
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2.5 mb-2.5">
                  <button 
                    onClick={() => onProfileClick(user.uid)}
                    className="flex items-center justify-center gap-2 py-3 bg-blue-600 text-white text-[10px] font-black rounded-xl hover:bg-blue-500 transition-all uppercase tracking-[0.15em] border border-blue-400/30 shadow-[0_5px_15px_rgba(37,99,235,0.3)]"
                  >
                    <UserIcon className="w-3.5 h-3.5" /> View Matrix Profile
                  </button>
                  <button 
                    onClick={() => {
                      const count = parseInt(localStorage.getItem('refine_count') || '0');
                      if (count >= 500) {
                        toast.error('Maximum refinement limit reached.');
                        return;
                      }
                      setIsRefiningLocation(true);
                      toast('Drag your pic exactly on your roof', {
                        icon: '🎯',
                        duration: 5000
                      });
                    }}
                    className="flex items-center justify-center gap-2 py-3 bg-white/5 text-cyan-400 border border-cyan-500/30 text-[10px] font-black rounded-xl hover:bg-white/10 transition-all uppercase tracking-[0.15em]"
                  >
                    <Crosshair className="w-3.5 h-3.5" /> Re-align Sector
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button 
                    onClick={() => {
                      if (isDestinyMode) {
                        toast.error('Cannot show path during Destiny Mode');
                        return;
                      }
                      setShowPathForUserId(showPathForUserId === user.uid ? null : user.uid);
                    }}
                    className={cn(
                      "flex items-center justify-center gap-2 py-2.5 text-[9px] font-black rounded-xl transition-all uppercase tracking-widest border",
                      showPathForUserId === user.uid 
                        ? "bg-blue-600 border-blue-400 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]" 
                        : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <MoreHorizontal className="w-3 h-3" /> {showPathForUserId === user.uid ? 'Hide Path' : 'Neural Path'}
                  </button>
                  <button 
                    onClick={() => {
                      setFilterMode('custom');
                      setSelectedUserIds(new Set([user.uid]));
                      toast.success(`Only showing your location`);
                    }}
                    className="flex items-center justify-center gap-2 py-2.5 bg-white/5 border border-white/10 text-white/50 text-[9px] font-black rounded-xl hover:bg-white/10 hover:text-white transition-all uppercase tracking-widest"
                  >
                    <CheckCircle2 className="w-3 h-3" /> Isolate Node
                  </button>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setFilterMode('mates')}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-900/20 text-blue-400 border border-blue-500/20 text-[8px] font-black rounded-lg hover:bg-blue-900/40 transition-all uppercase tracking-[0.2em]"
                  >
                    <Users className="w-3 h-3" /> Filter Mates
                  </button>
                </div>
              </div>
            ) : (
              <React.Fragment>
                <div className="flex items-center gap-4 mb-5">
                  <div className="relative">
                    <div className="p-0.5 rounded-full border border-white/10 shadow-lg">
                      <UserAvatar src={user.photoURL} username={user.username} size="lg" online={user.isOnline} />
                    </div>
                    <div className={cn("absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-[#020617] shadow-[0_0_10px_rgba(0,0,0,0.5)]", (user.business ? user.business.isShopOpen : user.isOnline) ? "bg-green-500 animate-pulse" : "bg-red-500")}></div>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-white tracking-tighter text-sm uppercase truncate">{user.business?.shopName || user.username}</h4>
                      {user.business?.isBlueTick && (
                        <div className="w-3.5 h-3.5 bg-blue-500 rounded-full flex items-center justify-center text-white shrink-0 shadow-[0_0_10px_rgba(37,99,235,0.5)]">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                        </div>
                      )}
                      {(activeMoments.has(user.uid) && (!userProfile?.showFriendsOnlyMoments || friends.includes(user.uid))) && (
                        <button 
                          onClick={() => onMomentClick?.(user.uid)}
                          className="bg-pink-500 text-white p-1 rounded-lg animate-pulse shadow-[0_0_15px_rgba(236,72,153,0.5)]"
                          title="View Moment Stream"
                        >
                          <Play className="w-2.5 h-2.5 fill-current" />
                        </button>
                      )}
                    </div>
                    <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mt-0.5 truncate">{user.business?.category || user.profession}</p>
                    <div className="flex items-center gap-1.5 text-[8px] font-black text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full w-fit mt-2 border border-blue-500/20 shadow-sm">
                      <MapPin className="w-2.5 h-2.5" />
                      {calculateDistance(center.lat, center.lng, user.location!.lat, user.location!.lng)}
                    </div>
                  </div>
                </div>

                {user.business && (
                  <div className="mb-4 p-3 bg-white/5 rounded-2xl border border-white/10 shadow-inner">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Protocol Hours</span>
                      <span className="text-[9px] font-black text-white italic">
                        {user.business.timings.open} - {user.business.timings.close}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Grid Status</span>
                      <span className={cn(
                        "text-[9px] font-black px-2.5 py-0.5 rounded-full border", 
                        user.business.isShopOpen 
                          ? "bg-green-500/20 text-green-400 border-green-500/30" 
                          : "bg-red-500/20 text-red-400 border-red-500/30"
                      )}>
                        {user.business.isShopOpen ? 'SIGNAL ACTIVE' : 'GRID OFFLINE'}
                      </span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2.5 mb-2.5">
                  <button 
                    onClick={() => onProfileClick(user.uid)}
                    className="flex items-center justify-center gap-2 py-3 bg-white/5 border border-white/10 text-white text-[10px] font-black rounded-xl hover:bg-white/10 hover:border-blue-500/30 transition-all uppercase tracking-widest"
                  >
                    <MapIcon className="w-3.5 h-3.5" /> Matrix
                  </button>
                  <button 
                    onClick={() => onDirectChat(user.uid)}
                    className="flex items-center justify-center gap-2 py-3 bg-blue-600 text-white text-[10px] font-black rounded-xl hover:bg-blue-500 transition-all uppercase tracking-widest shadow-[0_10px_20px_rgba(37,99,235,0.3)] border border-blue-400/30"
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> Comm
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button 
                    onClick={() => {
                      setShowPathForUserId(showPathForUserId === user.uid ? null : user.uid);
                      toast.success(showPathForUserId === user.uid ? `Hidden ${user.username}'s path` : `Decrypting ${user.username}'s path`);
                    }}
                    className={cn(
                      "flex items-center justify-center gap-2 py-2.5 text-[9px] font-black rounded-xl transition-all uppercase tracking-widest border",
                      showPathForUserId === user.uid 
                        ? "bg-blue-600 border-blue-400 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]" 
                        : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <MoreHorizontal className="w-3 h-3" /> {showPathForUserId === user.uid ? 'Hide Path' : 'Trace Path'}
                  </button>
                  <button 
                    onClick={() => {
                      setFilterMode('custom');
                      setSelectedUserIds(new Set([user.uid]));
                      toast.success(`Priority surveillance: ${user.username}`);
                    }}
                    className="flex items-center justify-center gap-2 py-2.5 bg-white/5 border border-white/10 text-white/50 text-[9px] font-black rounded-xl hover:bg-white/10 hover:text-white transition-all uppercase tracking-widest"
                  >
                    <UserCheck className="w-3 h-3" /> Focus Node
                  </button>
                </div>

                <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                  <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em] font-mono italic">Verified Signal • 3DES Encrypted</p>
                </div>
              </React.Fragment>
            )}
          </div>
        </InfoWindow>
      )}
    </React.Fragment>
  );
};

const fetchRoadPath = async (start: [number, number], end: [number, number], details?: DestinyConfig['details']): Promise<{ lat: number; lng: number }[]> => {
  // Try multiple OSRM endpoints in case one is down or blocked
  const endpoints = [
    `https://router.projectosrm.org/route/v1/foot/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`,
    `https://routing.openstreetmap.de/routed-foot/route/v1/foot/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`
  ];

  for (const url of endpoints) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        mode: 'cors'
      });
      
      if (!response.ok) {
        console.warn(`OSRM endpoint ${url} returned status ${response.status}`);
        continue;
      }
      
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        // OSRM returns a high-resolution geometry that follows every turn
        return data.routes[0].geometry.coordinates.map((coord: [number, number]) => ({
          lat: coord[1],
          lng: coord[0]
        }));
      }
    } catch (error) {
      console.warn(`Routing attempt failed for ${url}:`, error);
      // Continue to next endpoint
    }
  }

  // Final fallback if all routing attempts fail
  console.warn("All routing endpoints failed, using direct points as fallback");
  return [{ lat: start[0], lng: start[1] }, { lat: end[0], lng: end[1] }];
};

const SpectateModal = ({ 
  isOpen, 
  onClose, 
  users, 
  friends, 
  selectedIds, 
  onToggle 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  users: UserProfile[], 
  friends: string[], 
  selectedIds: Set<string>, 
  onToggle: (id: string) => void 
}) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'mates' | 'all'>('mates');
  
  const filtered = users.filter(u => {
    if (!u.username) return false;
    const matchesSearch = u.username.toLowerCase().includes(search.toLowerCase());
    if (filter === 'mates') return friends.includes(u.uid) && matchesSearch;
    return matchesSearch && u.uid !== auth.currentUser?.uid;
  });

  const handleSelectAll = () => {
    filtered.forEach(u => {
      if (!selectedIds.has(u.uid)) onToggle(u.uid);
    });
  };

  const handleDeselectAll = () => {
    filtered.forEach(u => {
      if (selectedIds.has(u.uid)) onToggle(u.uid);
    });
  };
  
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          key="spectate-modal-overlay" 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-full max-w-md bg-[#020617]/95 backdrop-blur-3xl rounded-[3rem] shadow-[0_30px_100px_rgba(0,0,0,0.8)] overflow-hidden border border-blue-500/30"
          >
            <div className="p-8 sm:p-10">
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] border border-blue-400/30 relative">
                    <div className="absolute inset-0 bg-blue-400/20 blur-md rounded-2xl animate-pulse" />
                    <Eye className="w-7 h-7 relative z-10" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black tracking-tighter text-white uppercase italic">Surveillance</h3>
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mt-1 opacity-70">Grid Spectators</p>
                  </div>
                </div>
                <button 
                  onClick={onClose}
                  className="w-12 h-12 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-center text-white/50 hover:text-white transition-all transform hover:rotate-90 border border-white/5"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="flex gap-2 p-1.5 bg-white/5 rounded-[2rem] border border-white/10">
                  <button
                    onClick={() => setFilter('mates')}
                    className={cn(
                      "flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 relative overflow-hidden",
                      filter === 'mates' ? "text-white" : "text-white/30 hover:text-white/60"
                    )}
                  >
                    {filter === 'mates' && (
                       <motion.div layoutId="filter-bg" className="absolute inset-0 bg-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.4)] border border-blue-400/30 rounded-2xl" />
                    )}
                    <span className="relative z-10">Neural Mates</span>
                  </button>
                  <button
                    onClick={() => setFilter('all')}
                    className={cn(
                      "flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 relative overflow-hidden",
                      filter === 'all' ? "text-white" : "text-white/30 hover:text-white/60"
                    )}
                  >
                    {filter === 'all' && (
                       <motion.div layoutId="filter-bg" className="absolute inset-0 bg-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.4)] border border-blue-400/30 rounded-2xl" />
                    )}
                    <span className="relative z-10">Global Net</span>
                  </button>
                </div>

                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400/50 w-5 h-5 group-focus-within:text-blue-400 transition-colors" />
                  <input 
                    type="text"
                    placeholder="Search Node IDs..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-xs font-black text-white placeholder:text-white/20 outline-none focus:ring-1 focus:ring-blue-500/50 focus:bg-white/10 transition-all uppercase tracking-widest"
                  />
                </div>

                <div className="flex items-center justify-between px-2">
                  <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">{filtered.length} Nodes Detected</p>
                  <div className="flex gap-4">
                    <button onClick={handleSelectAll} className="text-[10px] font-black text-blue-400 uppercase tracking-widest hover:text-blue-300 transition-colors">Select All</button>
                    <button onClick={handleDeselectAll} className="text-[10px] font-black text-white/20 uppercase tracking-widest hover:text-white/40 transition-colors">Abort</button>
                  </div>
                </div>

                <div className="max-h-[40vh] overflow-y-auto space-y-2 pr-3 custom-scrollbar">
                  {filtered.map(user => (
                    <label 
                      key={user.uid}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-3xl border transition-all cursor-pointer group",
                        selectedIds.has(user.uid) 
                          ? "bg-blue-600/10 border-blue-500/40 shadow-[0_0_20px_rgba(37,99,235,0.1)]" 
                          : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-0.5 rounded-full border border-white/10 shadow-sm transition-transform group-hover:scale-105">
                          <UserAvatar src={user.photoURL} username={user.username} size="xs" />
                        </div>
                        <div>
                          <p className={cn("text-xs font-black tracking-tight uppercase", selectedIds.has(user.uid) ? "text-white" : "text-white/70")}>{user.username}</p>
                          <p className="text-[8px] font-bold text-white/20 uppercase tracking-widest mt-0.5">Active Status Signal</p>
                        </div>
                      </div>
                      <div className={cn(
                        "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                        selectedIds.has(user.uid) 
                          ? "bg-blue-500 border-blue-400 shadow-[0_0_10px_rgba(37,99,235,0.5)]" 
                          : "border-white/20"
                      )}>
                        {selectedIds.has(user.uid) && <Zap className="w-3 h-3 text-white fill-white" />}
                      </div>
                      <input 
                        type="checkbox"
                        checked={selectedIds.has(user.uid)}
                        onChange={() => onToggle(user.uid)}
                        className="hidden"
                      />
                    </label>
                  ))}
                  {filtered.length === 0 && (
                    <div className="py-20 text-center opacity-30">
                      <Radio className="w-12 h-12 mx-auto mb-4 animate-pulse text-blue-400" />
                      <p className="text-[10px] font-black uppercase tracking-[0.3em]">No Pulse Detected</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-10 pt-6 border-t border-white/5 text-center">
                <button 
                  onClick={onClose}
                  className="w-full py-5 bg-white text-[#020617] rounded-[2rem] font-black uppercase tracking-[0.3em] text-[11px] shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Done Selecting ({selectedIds.size})
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

function MapSetter({ setMap, map }: { setMap: (map: google.maps.Map) => void, map: google.maps.Map | null }) {
  useEffect(() => {
    if (map) setMap(map);
  }, [map, setMap]);
  return null;
}

const isValidLatLng = (lat: number | undefined | null, lng: number | undefined | null): boolean => {
  return typeof lat === 'number' && typeof lng === 'number' && isFinite(lat) && isFinite(lng) && !isNaN(lat) && !isNaN(lng);
};

export const MapVibe = forwardRef<MapVibeHandle, MapVibeProps>((props, ref) => {
  const { 
    userProfile, onProfileClick, onDirectChat, addToHistory, darkMode, onToggleMates, 
    showMatesPanel, onMomentClick, onLoad, hideControls = false, isLabelSelecting, 
    onLabelPosSelect, selectedLabelPos, onStartLabelSelect, onConfirmLabelPos, onAddMoment,
    showMomentMapLayer, onToggleMomentMapLayer, onHelpClick, onMissionModeChange, onDestinyModeChange,
    onDestinySetupChange, onSideMenuToggle
  } = props;
  const { isLoaded } = useJsApiLoader({ id: 'google-map-script', googleMapsApiKey: GOOGLE_MAPS_API_KEY });
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [statusMenuData, setStatusMenuData] = useState<{ text: string; pos: google.maps.LatLngLiteral } | null>(null);

  useEffect(() => {
    onSideMenuToggle?.(showSideMenu);
  }, [showSideMenu, onSideMenuToggle]);
  const [center, setCenter] = useState<google.maps.LatLngLiteral>({ lat: 31.5204, lng: 74.3587 });
  const [hasInitialCentered, setHasInitialCentered] = useState(false);

  const safeFlyTo = (lat: number, lng: number, zoom?: number) => {
    if (isValidLatLng(lat, lng)) {
      if (mapSource === '3d' && maplibreInstanceRef.current) {
        maplibreInstanceRef.current.flyTo({
          center: [lng, lat],
          zoom: zoom !== undefined ? zoom : maplibreInstanceRef.current.getZoom(),
          duration: 2000,
          essential: true
        });
      } else if (mapInstance) {
        try {
          if (zoom !== undefined && zoom > 15) {
            // For closer zooms, if it's a vector map, we could use moveCamera
            // For standard pan, we combine with tilt for a premium feel
            mapInstance.setOptions({ tilt: mapType === 'satellite' || mapType === 'hybrid' ? 65 : 45 });
          }
          mapInstance.panTo({ lat, lng });
          if (zoom !== undefined) mapInstance.setZoom(zoom);
        } catch (e) {
          console.error("panTo failed", e);
        }
      }
    }
  };

  const safeSetView = (lat: number, lng: number, zoom?: number) => {
    if (isValidLatLng(lat, lng) && mapInstance) {
      try {
        mapInstance.setCenter({ lat, lng });
        if (zoom !== undefined) mapInstance.setZoom(zoom);
      } catch (e) {
        console.error("setCenter failed", e);
      }
    }
  };
  const [zoom, setZoom] = useState(4);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapIsLoading, setMapIsLoading] = useState(true);
  const [isDataReady, setIsDataReady] = useState(false);
  const [hasAutoZoomed, setHasAutoZoomed] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const onlineCount = users.filter(u => u.isOnline).length;
  const [mapType, setMapType] = useState<'satellite' | 'hybrid' | 'roadmap' | 'terrain' | 'default'>('roadmap');
  const [mapStyleVibe, setMapStyleVibe] = useState<'standard' | 'night' | 'lighting' | 'sunlight' | 'cloudy' | 'rainy' | 'neon' | 'blue' | 'dark' | 'silver' | 'retro' | 'aubergine' | 'holographic' | 'wargames' | 'glitch' | 'topo' | 'chalkboard' | 'paper' | 'midnight' | 'minimalist' | 'popart' | 'xray' | 'registan' | 'morning' | 'fajr' | 'sunset' | 'snowOnGround' | 'bijli' | 'isometric' | 'satellite_premium' | 'roadmap_lines' | 'mission'>('standard');
  const [mapSource, setMapSource] = useState<'google' | '3d'>('google');
  const [maplibreType, setMaplibreType] = useState<'roadmap' | 'hybrid' | 'terrain'>('roadmap');
  const [maplibrePitch, setMaplibrePitch] = useState(68);
  const [maplibreBearing, setMaplibreBearing] = useState(-35);
  const maplibreContainerRef = useRef<HTMLDivElement>(null);
  const maplibreInstanceRef = useRef<maplibregl.Map | null>(null);
  const maplibreAnimRef = useRef<number | null>(null);

  const [showTraffic, setShowTraffic] = useState(false);
  const [showTransit, setShowTransit] = useState(false);
  const [showBicycle, setShowBicycle] = useState(false);
  const [show3D, setShow3D] = useState(false);
  const [show3DBuildings, setShow3DBuildings] = useState(false);
  const [showStreetView, setShowStreetView] = useState(false);
  const [showCustomLabels, setShowCustomLabels] = useState(true);
  const [streetViewPos, setStreetViewPos] = useState<google.maps.LatLngLiteral | null>(null);
  const [isAdvancedMenuOpen, setIsAdvancedMenuOpen] = useState(false);
  const [roadDensity, setRoadDensity] = useState(100);
  const [landmarkDensity, setLandmarkDensity] = useState(100);
  const [labelDensity, setLabelDensity] = useState(100);
  const [showMomentDiscovery, setShowMomentDiscovery] = useState(false);
  const [isFollowingUser, setIsFollowingUser] = useState(true);
  const [mapTilt, setMapTilt] = useState(0);
  const [mapHeading, setMapHeading] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  // Cleaned up redundant tilt forcing
  useEffect(() => {
    if (mapInstance) {
      mapInstance.setHeading(mapHeading);
    }
  }, [mapInstance, mapHeading]);

  const getMapTypeId = () => {
    switch (mapType) {
      case 'satellite': return 'satellite';
      case 'hybrid': return 'hybrid';
      case 'roadmap': return 'roadmap';
      case 'terrain': return 'terrain';
      case 'default': return 'roadmap';
      default: return 'roadmap';
    }
  };

  // MapLibre Integration for 3D Perspectives
  useEffect(() => {
    if (mapSource === '3d' && maplibreContainerRef.current) {
      if (maplibreInstanceRef.current) {
        maplibreInstanceRef.current.remove();
      }

      const MAPTILER_KEY = "YnoXUtHqGq9lifNV5ypQ";
      
      // MapTiler Styles: Enhanced with Satellite and High-Res Terrain
      const styleUrls: any = {
        roadmap: `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`,
        hybrid: {
          version: 8,
          sources: {
            'esri-satellite': {
              type: 'raster',
              tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
              tileSize: 256,
              attribution: 'Esri, Maxar'
            },
            'maptiler-labels': {
              type: 'vector',
              url: `https://api.maptiler.com/tiles/v3/tiles.json?key=${MAPTILER_KEY}`
            }
          },
          layers: [
            {
              id: 'esri-satellite-layer',
              type: 'raster',
              source: 'esri-satellite',
              paint: {
                'raster-contrast': 0.1,
                'raster-brightness-max': 0.8,
                'raster-saturation': 0.1
              }
            },
            {
              id: 'roads-casing',
              type: 'line',
              source: 'maptiler-labels',
              'source-layer': 'transportation',
              layout: {
                'line-cap': 'round',
                'line-join': 'round'
              },
              paint: {
                'line-color': '#000000',
                'line-width': ['interpolate', ['linear'], ['zoom'], 12, 1, 16, 4],
                'line-opacity': 0.3
              }
            },
            {
              id: 'roads',
              type: 'line',
              source: 'maptiler-labels',
              'source-layer': 'transportation',
              layout: {
                'line-cap': 'round',
                'line-join': 'round'
              },
              paint: {
                'line-color': ['interpolate', ['linear'], ['zoom'], 12, '#ffffff', 14, '#f8fafc', 16, '#ffffff'],
                'line-width': ['interpolate', ['linear'], ['zoom'], 12, 0.5, 16, 2],
                'line-opacity': 0.8
              }
            },
            {
              id: 'labels',
              type: 'symbol',
              source: 'maptiler-labels',
              'source-layer': 'place',
              layout: {
                'text-field': '{name:latin}',
                'text-font': ['Noto Sans Regular'],
                'text-size': ['interpolate', ['linear'], ['zoom'], 10, 10, 15, 14],
                'text-letter-spacing': 0.1,
                'text-transform': 'uppercase'
              },
              paint: {
                'text-color': '#ffffff',
                'text-halo-color': 'rgba(0,0,0,0.8)',
                'text-halo-width': 1.5,
                'text-halo-blur': 0.5
              }
            }
          ]
        },
        terrain: `https://api.maptiler.com/maps/outdoor-v2/style.json?key=${MAPTILER_KEY}`
      };

      const map = new maplibregl.Map({
        container: maplibreContainerRef.current,
        style: styleUrls[maplibreType] || styleUrls.roadmap,
        center: [center.lng, center.lat],
        zoom: zoom - 1,
        pitch: maplibrePitch, 
        bearing: maplibreBearing,
        maxZoom: 23,
        // Smooth interaction enhancements
        dragRotate: true,
        touchZoomRotate: true,
        fadeDuration: 400,
        pitchWithRotate: true,
        maxPitch: 85,
        clickTolerance: 3
      });

      // Interactive Zoom Easing
      map.scrollZoom.setWheelZoomRate(1/600);
      map.scrollZoom.setZoomRate(1/600);

      map.on('load', () => {
        // Add 3D Terrain support
        try {
          map.addSource('maptiler-terrain', {
            type: 'raster-dem',
            url: `https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=${MAPTILER_KEY}`,
            tileSize: 512
          });
          map.setTerrain({ source: 'maptiler-terrain', exaggeration: 1.5 });
        } catch (e) {
          console.warn("Terrain setup failed:", e);
        }

        // Add 3D Building Layer (Fill Extrusion)
        try {
          const style = map.getStyle();
          const layers = style.layers;
          const sources = style.sources;
          
          let labelLayerId;
          if (layers) {
            for (let i = 0; i < layers.length; i++) {
              if (layers[i].type === 'symbol' && (layers[i].layout as any)?.['text-field']) {
                labelLayerId = layers[i].id;
                break;
              }
            }
          }

          // Force building extrusion using MapTiler's OSM building data
          if (show3DBuildings) {
            map.addLayer(
              {
                'id': '3d-buildings',
                'source': 'maptiler_planet' in sources ? 'maptiler_planet' : (Object.keys(sources).find(s => s.includes('maptiler')) || 'openmaptiles'),
                'source-layer': 'building',
                'type': 'fill-extrusion',
                'minzoom': 13,
                'paint': {
                  'fill-extrusion-color': mapStyleVibe === 'lighting' ? [
                    'interpolate', ['linear'], ['zoom'],
                    15, '#ffd27a',
                    18, '#ffedd5'
                  ] : [
                    'interpolate', ['linear'], ['zoom'],
                    15, '#aaaaaa',
                    16, '#dddddd',
                    18, '#ffffff'
                  ],
                  'fill-extrusion-height': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    14, 0,
                    15, 50,
                    18, 150
                  ],
                  'fill-extrusion-base': 0,
                  'fill-extrusion-opacity': mapStyleVibe === 'lighting' ? 0.8 : 0.5
                }
              },
              labelLayerId
            );
          }
        } catch (e) {
          console.warn("Building layer setup failed:", e);
        }
      });

      map.on('moveend', () => {
        const c = map.getCenter();
        setCenter({ lat: c.lat, lng: c.lng });
        setZoom(map.getZoom());
        setMaplibrePitch(map.getPitch());
        setMaplibreBearing(map.getBearing());
      });

      map.on('rotate', () => setMaplibreBearing(map.getBearing()));
      map.on('pitch', () => setMaplibrePitch(map.getPitch()));

      maplibreInstanceRef.current = map;
    }

    if (mapSource === 'google' && maplibreInstanceRef.current) {
      maplibreInstanceRef.current.remove();
      maplibreInstanceRef.current = null;
    }

    return () => {
      if (maplibreInstanceRef.current) {
        maplibreInstanceRef.current.remove();
        maplibreInstanceRef.current = null;
      }
    };
  }, [mapSource, maplibreType, show3DBuildings]);

  // Sync MapLibre center when Google Map pans or user flyTo calls
  useEffect(() => {
    if (mapSource === '3d' && maplibreInstanceRef.current) {
      const currentCenter = maplibreInstanceRef.current.getCenter();
      if (Math.abs(currentCenter.lat - center.lat) > 0.0001 || Math.abs(currentCenter.lng - center.lng) > 0.0001) {
        maplibreInstanceRef.current.easeTo({
          center: [center.lng, center.lat],
          duration: 1000,
          easing: (t) => t * (2 - t)
        });
      }
    }
  }, [center.lat, center.lng]);

  // Handle vibe integration for 3D View (Simulated via filter or style adjustments)
  useEffect(() => {
    if (mapSource === '3d' && maplibreInstanceRef.current) {
        const map = maplibreInstanceRef.current;
        
        const updateLighting = () => {
          if (!map.isStyleLoaded()) return;

          if (mapStyleVibe === 'lighting') {
            // Building Lights
            if (map.getLayer('3d-buildings')) {
              map.setPaintProperty('3d-buildings', 'fill-extrusion-color', [
                'interpolate', ['linear'], ['zoom'],
                15, '#ffd27a',
                18, '#ffedd5'
              ]);
              map.setPaintProperty('3d-buildings', 'fill-extrusion-opacity', 0.8);
            }

            // Road Glow Implementation
            if (map.getLayer('roads')) {
              map.setPaintProperty('roads', 'line-color', '#fff7ed');
            }
            if (map.getLayer('roads-casing')) {
              map.setPaintProperty('roads-casing', 'line-color', '#f59e0b');
              map.setPaintProperty('roads-casing', 'line-width', ['interpolate', ['linear'], ['zoom'], 12, 1.5, 16, 6]);
            }

            // Live Glow Effect animation
            if (maplibreAnimRef.current) cancelAnimationFrame(maplibreAnimRef.current);
            let start = performance.now();
            const animateFunc = (time: number) => {
              const elapsed = time - start;
              const roadsOpacity = 0.6 + Math.sin(elapsed / 1200) * 0.15;
              const buildingOpacity = 0.75 + Math.sin(elapsed / 2000) * 0.08;
              
              if (map.getLayer('roads-casing')) {
                map.setPaintProperty('roads-casing', 'line-opacity', roadsOpacity);
              }
              if (map.getLayer('3d-buildings')) {
                map.setPaintProperty('3d-buildings', 'fill-extrusion-opacity', buildingOpacity);
              }
              maplibreAnimRef.current = requestAnimationFrame(animateFunc);
            };
            maplibreAnimRef.current = requestAnimationFrame(animateFunc);
          } else {
            // Revert to non-lighting
            if (maplibreAnimRef.current) cancelAnimationFrame(maplibreAnimRef.current);
            if (map.getLayer('3d-buildings')) {
              map.setPaintProperty('3d-buildings', 'fill-extrusion-color', [
                'interpolate', ['linear'], ['zoom'],
                15, '#aaaaaa',
                16, '#dddddd',
                18, '#ffffff'
              ]);
              map.setPaintProperty('3d-buildings', 'fill-extrusion-opacity', 0.5);
            }
            if (map.getLayer('roads')) {
              map.setPaintProperty('roads', 'line-color', ['interpolate', ['linear'], ['zoom'], 12, '#ffffff', 14, '#f8fafc', 16, '#ffffff']);
            }
            if (map.getLayer('roads-casing')) {
              map.setPaintProperty('roads-casing', 'line-color', '#000000');
              map.setPaintProperty('roads-casing', 'line-width', ['interpolate', ['linear'], ['zoom'], 12, 1, 16, 4]);
              map.setPaintProperty('roads-casing', 'line-opacity', 0.3);
            }
          }
        };

        if (map.isStyleLoaded()) {
          updateLighting();
        } else {
          map.once('styledata', updateLighting);
        }
    }
    return () => {
      if (maplibreAnimRef.current) cancelAnimationFrame(maplibreAnimRef.current);
    }
  }, [mapStyleVibe, mapSource]);

  useEffect(() => {
    const now = new Date().toISOString();
    const q = query(
      collection(db, 'moments'),
      where('expiresAt', '>', now),
      orderBy('expiresAt', 'desc'),
      limit(20)
    );
    const unsub = onSnapshot(q, (snap) => {
      const dbMoments = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMoments(prev => {
        const optimistic = prev.filter(m => m.id?.startsWith('temp-'));
        // Deduplicate by uid or combination (assuming one active moment per user usually)
        return [...dbMoments, ...optimistic];
      });
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'moments');
    });
    return () => unsub();
  }, []);
    
  useEffect(() => {
    if (!mapInstance || !hasInitialCentered) return;
    
    const targetId = getMapTypeId();
    mapInstance.setMapTypeId(targetId);

    // When map type changes to terrain, jump zoom but don't snap center if we moved
    if (mapType === 'terrain') {
      mapInstance.setZoom(9);
    }
  }, [mapType, mapInstance, hasInitialCentered]);
  const [userSearchResults, setUserSearchResults] = useState<UserProfile[]>([]);
  const [showUserSuggestions, setShowUserSuggestions] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(false);

  // --- Destiny Navigation System States ---
  const [navDestinyState, setNavDestinyState] = useState<'off' | 'selecting' | 'active'>('off');
  const [navDestinyTarget, setNavDestinyTarget] = useState<{ lat: number; lng: number } | null>(null);
  const [navDestinyRoute, setNavDestinyRoute] = useState<{ lat: number; lng: number }[]>([]);
  const [userHeading, setUserHeading] = useState<number | null>(null);
  const [navShineOffset, setNavShineOffset] = useState(0);
  const [navDestinyConfig, setNavDestinyConfig] = useState<{
    mode: 'walking' | 'bicycling' | 'driving';
    preference: 'main' | 'street';
    radius: number;
    privacy: 'all' | 'mates' | 'private';
  }>({
    mode: 'driving',
    preference: 'main',
    radius: 150,
    privacy: 'all'
  });
  const [showNavDestinySetup, setShowNavDestinySetup] = useState(false);
  const [navDestinyCompleted, setNavDestinyCompleted] = useState(false);
  const [navDestinyHeading, setNavDestinyHeading] = useState(0);

  const checkFeatureLimit = async (featureId: string, limitCount: number, featureName: string) => {
    if (userProfile?.premium) return true;
    if (!auth.currentUser) return false;

    try {
      const statsRef = doc(db, 'userFeatureStats', `${auth.currentUser.uid}_${featureId}`);
      const statsSnap = await getDoc(statsRef);
      const today = new Date().toISOString().split('T')[0];

      if (statsSnap.exists()) {
        const stats = statsSnap.data();
        if (stats.date === today && stats.count >= limitCount) {
          toast.error(`Free limit reached: ${limitCount} ${featureName} uses/day. Upgrade to Premium!`);
          return false;
        }

        await setDoc(statsRef, {
          count: stats.date === today ? stats.count + 1 : 1,
          date: today
        }, { merge: true });
      } else {
        await setDoc(statsRef, {
          count: 1,
          date: today
        });
      }
      return true;
    } catch (e) {
      console.error("Error checking limits:", e);
      return true;
    }
  };

  const [vibeFilter, setVibeFilter] = useState<string | null>(null);
  const [showVibePicker, setShowVibePicker] = useState(false);
  const [isRefiningLocation, setIsRefiningLocation] = useState(false);
  const [tempRefinePos, setTempRefinePos] = useState<google.maps.LatLngLiteral | null>(null);
  const [refineCount, setRefineCount] = useState<number>(() => {
    return parseInt(localStorage.getItem('refine_count') || '0');
  });
  const [showShopMenu, setShowShopMenu] = useState(false);
  const [showMapControls, setShowMapControls] = useState(false);
  const [showDiscoverMobile, setShowDiscoverMobile] = useState(false);
  const [showMatesMobile, setShowMatesMobile] = useState(false);
  const [activeMoments, setActiveMoments] = useState<Set<string>>(new Set());
  const [helpSignals, setHelpSignals] = useState<HelpSignal[]>([]);
  const [showNearbyMoments, setShowNearbyMoments] = useState(false);
  const [moments, setMoments] = useState<any[]>([]);
  const [friends, setFriends] = useState<string[]>([]);
  const [hideProfilePics, setHideProfilePics] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [filterMode, setFilterMode] = useState<'all' | 'mates' | 'custom' | 'children'>('all');
  const [filterSearchQuery, setFilterSearchQuery] = useState('');
  const [showPathForUserId, setShowPathForUserId] = useState<string | null>(null);
  const [isShopMode, setIsShopMode] = useState(false);
  const [showShoppingListModal, setShowShoppingListModal] = useState(false);
  const [showBidsView, setShowBidsView] = useState(false);
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [showStockQueryModal, setShowStockQueryModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [isDestinyMode, setIsDestinyMode] = useState(false);
  const [isMissionMode, setIsMissionMode] = useState(false);
  const [missionPoints, setMissionPoints] = useState<any[]>([]);
  const [missionCelebration, setMissionCelebration] = useState<{ show: boolean, xp: number, badgeUnlocked?: string } | null>(null);
  const [lastMissionRefresh, setLastMissionRefresh] = useState<number>(0);

  const generateMissions = () => {
    if (!userProfile?.location) return;
    const { lat, lng } = userProfile.location;
    const points = [];
    const types: ('shop' | 'checkpoint' | 'special')[] = ['shop', 'checkpoint', 'special'];
    
    for (let i = 0; i < 6; i++) {
      // 60-70m away randomization
      const angle = Math.random() * Math.PI * 2;
      const dist = (60 + Math.random() * 10) / 111320; 
      const plat = lat + dist * Math.cos(angle);
      const plng = lng + dist * Math.sin(angle) / Math.cos(lat * Math.PI / 180);
      
      points.push({
        id: `mission-${Date.now()}-${i}`,
        lat: plat,
        lng: plng,
        type: types[Math.floor(Math.random() * types.length)],
        xp: 15,
        status: 'active'
      });
    }
    setMissionPoints(points);
    setLastMissionRefresh(Date.now());
  };

  useEffect(() => {
    if (isMissionMode && missionPoints.length === 0) {
      generateMissions();
    }
  }, [isMissionMode]);

  // Handle Proximity to Mission Points
  useEffect(() => {
    if (!isMissionMode || !userProfile?.location || missionPoints.length === 0) return;

    const checkProximity = async () => {
      let updatedPoints = [...missionPoints];
      let xpEarned = 0;
      let pointCompleted = false;

      for (let i = 0; i < updatedPoints.length; i++) {
        const p = updatedPoints[i];
        if (p.status !== 'active') continue;

        const distance = getDistanceNumber(userProfile.location.lat, userProfile.location.lng, p.lat, p.lng) * 1000;
        if (distance <= 20) { // 20m range
          p.status = 'completed';
          xpEarned += p.xp;
          pointCompleted = true;
          toast.success(`Mission Point Reached! +${p.xp} XP`, {
            icon: '💎',
            style: { background: '#1e293b', color: '#00f2ff', border: '1px solid #00f2ff' }
          });
        }
      }

      if (pointCompleted) {
        setMissionPoints(updatedPoints);
        
        // Update user XP in Firestore
        if (auth.currentUser) {
          const userRef = doc(db, 'users', auth.currentUser.uid);
          const currentXP = (userProfile.xp || 0) + xpEarned;
          
          let badgeUnlocked = undefined;
          const oldBadges = userProfile.badges || [];
          const newBadges = [...oldBadges];

          if (currentXP >= 1000 && !oldBadges.includes('Diamond')) {
            newBadges.push('Diamond');
            badgeUnlocked = 'Diamond';
          } else if (currentXP >= 500 && !oldBadges.includes('Gold')) {
            newBadges.push('Gold');
            badgeUnlocked = 'Gold';
          } else if (currentXP >= 200 && !oldBadges.includes('Silver')) {
            newBadges.push('Silver');
            badgeUnlocked = 'Silver';
          } else if (currentXP >= 50 && !oldBadges.includes('Bronze')) {
            newBadges.push('Bronze');
            badgeUnlocked = 'Bronze';
          }

          try {
            await updateDoc(userRef, {
              xp: increment(xpEarned),
              badges: newBadges
            });

            if (badgeUnlocked) {
              setMissionCelebration({ show: true, xp: xpEarned, badgeUnlocked });
            }
          } catch (err) {
            handleFirestoreError(err, OperationType.UPDATE, `users/${auth.currentUser.uid}`);
          }
        }

        // If all points completed, generate more
        if (updatedPoints.every(p => p.status === 'completed')) {
          toast.info('Phase Completed! Generating new mission sectors...', { icon: '🚀' });
          setTimeout(generateMissions, 2000);
        }
      }
    };

    const timer = setTimeout(checkProximity, 1000);
    return () => clearTimeout(timer);
  }, [userProfile?.location, isMissionMode, missionPoints]);

  const toggleMissionMode = () => {
    const newMode = !isMissionMode;
    setIsMissionMode(newMode);
    onMissionModeChange?.(newMode);

    if (newMode) {
      setMapStyleVibe('mission');
      setShowSideMenu(false);
      toast.info("Entering MISSION MODE: Seek the Neon Points!", { 
        icon: '🛰️',
        style: { background: '#000b1e', color: '#00f2ff', border: '2px solid #00f2ff' }
      });
    } else {
      setMapStyleVibe('standard');
      setMissionPoints([]);
      toast.info("Mission Mode Deactivated.");
    }
  };
  const [labels, setLabels] = useState<MapLabel[]>([]);
  const [selectedLabel, setSelectedLabel] = useState<MapLabel | null>(null);
  const [currentLabelPhotoIdx, setCurrentLabelPhotoIdx] = useState(0);
  const [hiddenLabels, setHiddenLabels] = useState<string[]>([]);
  const [mapZoom, setMapZoom] = useState(12);

  const maplibreLabelsRef = useRef<{ [id: string]: maplibregl.Marker }>({});

  useEffect(() => {
    if (mapSource === '3d' && maplibreInstanceRef.current) {
      const map = maplibreInstanceRef.current;
      
      const visibleLabels = labels.filter(l => l.status !== 'deleted' && !hiddenLabels.includes(l.id!));

      visibleLabels.forEach(label => {
        if (!label.location) return;
        
        if (maplibreLabelsRef.current[label.id!]) {
          maplibreLabelsRef.current[label.id!].setLngLat([label.location.lng, label.location.lat]);
        } else {
          const el = document.createElement('div');
          el.className = 'maplibre-label-marker';
          el.innerHTML = `
            <div class="maplibre-label-icon">${label.markerIcon || '📍'}</div>
            <div class="maplibre-label-text">${label.name}</div>
            <div class="maplibre-label-subtext">${label.subCategory || label.category}</div>
          `;
          el.onclick = () => setSelectedLabel(label);
          
          const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
            .setLngLat([label.location.lng, label.location.lat])
            .addTo(map);
            
          maplibreLabelsRef.current[label.id!] = marker;
        }
      });
      
      // Remove stale labels
      Object.keys(maplibreLabelsRef.current).forEach(id => {
        if (!visibleLabels.find(l => l.id === id)) {
          maplibreLabelsRef.current[id].remove();
          delete maplibreLabelsRef.current[id];
        }
      });
    } else {
      // Clear MapLibre labels if not in 3D
      Object.keys(maplibreLabelsRef.current).forEach(id => {
        maplibreLabelsRef.current[id].remove();
      });
      maplibreLabelsRef.current = {};
    }
  }, [mapSource, labels, hiddenLabels, mapSource === '3d' && maplibreInstanceRef.current]);

  const [destinySetupStep, setDestinySetupStep] = useState<'details' | 'target' | 'confirm' | null>(null);
  const [destinyTarget, setDestinyTarget] = useState<[number, number] | null>(null);
  const [showDestinyConfirm, setShowDestinyConfirm] = useState(false);
  const [showDestinyPrivacy, setShowDestinyPrivacy] = useState(false);
  const [destinyPrivacy, setDestinyPrivacy] = useState<'all' | 'mates' | 'custom'>('all');
  const [destinyCustomUsers, setDestinyCustomUsers] = useState<Set<string>>(new Set());
  const [activeDestiny, setActiveDestiny] = useState<Destiny | null>(null);
  const [allDestinies, setAllDestinies] = useState<Destiny[]>([]);
  const [showDestinySuccess, setShowDestinySuccess] = useState(false);
  const [showDestinyFailure, setShowDestinyFailure] = useState(false);
  const [destinyDistance, setDestinyDistance] = useState<number>(0);
  const [showParentPanel, setShowParentPanel] = useState(false);
  const [parentPaths, setParentPaths] = useState<{ [uid: string]: ParentChildPath }>({});
  const [childDestinies, setChildDestinies] = useState<{ [uid: string]: DestinyConfig }>({});
  const [myDestinyConfig, setMyDestinyConfig] = useState<DestinyConfig | null>(null);
  const [showDestinySetup, setShowDestinySetup] = useState(false);
  const [showSpectateModal, setShowSpectateModal] = useState(false);
  const [destinySpectators, setDestinySpectators] = useState<Set<string>>(new Set());
  const [geofenceRadius, setGeofenceRadius] = useState(100); // Default 100m
  const [selectedChildForDestiny, setSelectedChildForDestiny] = useState<string | null>(null);
  const [destinyDetails, setDestinyDetails] = useState({
    timeOfDay: 'day' as 'day' | 'night',
    gender: 'boy' as 'boy' | 'girl',
    preference: 'rush' as 'rush' | 'quiet'
  });

  const getFinalStyles = () => {
    const baseStyles = GOOGLE_MAPS_STYLES[mapStyleVibe] || [];
    
    // For roadmap_lines, mission, etc. we want to maintain the specific colors/widths
    const isSpecialTheme = mapStyleVibe === 'roadmap_lines' || mapStyleVibe === 'satellite_premium' || mapStyleVibe === 'mission';
    
    const densityAdjustments: google.maps.MapTypeStyle[] = isSpecialTheme ? [] : [
      { featureType: 'road', elementType: 'geometry', stylers: [{ visibility: roadDensity > 20 ? 'on' : 'off' }, { lightness: 100 - roadDensity }] },
      { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: landmarkDensity > 50 ? 'on' : 'off' }] },
      { elementType: 'labels.text', stylers: [{ visibility: labelDensity > 30 ? 'on' : 'off' }] }
    ];
    return [...baseStyles, ...densityAdjustments];
  };

  const filteredUsers = users.filter(u => {
    if (isMissionMode) {
      return u.uid === auth.currentUser?.uid;
    }
    if (navDestinyState === 'active') {
      return u.uid === auth.currentUser?.uid;
    }
    if (isRefiningLocation) {
      return u.uid === auth.currentUser?.uid;
    }
    
    // Destiny Mode Visibility
    if (isDestinyMode && selectedChildForDestiny) {
      // Only show the selected child, hide parent and others to focus
      return u.uid === selectedChildForDestiny;
    }

    // Active Destiny Tracking Visibility (Hide others to focus on child)
    const activeChildDestiny = Object.values(childDestinies).find(d => d.status === 'active');
    if (activeChildDestiny && userProfile?.parentMode?.enabled) {
      // Hide parent (self) and others, only show child
      return u.uid === activeChildDestiny.childUid;
    }

    // Child's own destiny visibility
    if (myDestinyConfig) {
      return u.uid === auth.currentUser?.uid;
    }

    // Parent/Child Destiny Visibility (General)
    const hasActiveChildDestiny = Object.keys(childDestinies).length > 0;
    if (hasActiveChildDestiny && userProfile?.parentMode?.enabled) {
      // If I'm a parent and a child has an active destiny, only show relevant children
      const activeChildUids = Object.keys(childDestinies);
      return u.uid === auth.currentUser?.uid || activeChildUids.includes(u.uid);
    }

    // Parent Mode Filter
    if (userProfile?.parentMode?.enabled && filterMode === 'children') {
      return u.uid === auth.currentUser?.uid || userProfile?.parentMode?.children?.includes(u.uid);
    }
    
    // Child Mode Filter
    if (userProfile?.childMode?.enabled && filterMode === 'children') {
      return u.uid === auth.currentUser?.uid || userProfile.childMode.parents?.includes(u.uid);
    }

    if (isShopMode) {
      return u.business && u.business.showShopOnMap;
    }
    
    if (u.uid === auth.currentUser?.uid) return true;
    if (vibeFilter && u.mood?.text !== vibeFilter) return false;
    
    // Custom selection filter
    if (filterMode === 'mates') {
      if (!friends.includes(u.uid)) return false;
      // If custom selection exists within mates, apply it
      if (selectedUserIds.size > 0 && !selectedUserIds.has(u.uid)) return false;
    }
    if (filterMode === 'custom') {
      if (!selectedUserIds.has(u.uid)) return false;
    }
    
    return true;
  });

  // MapLibre Markers Management
  const maplibreMarkersRef = useRef<{ [uid: string]: maplibregl.Marker }>({});
  
  useEffect(() => {
    if (mapSource === '3d' && maplibreInstanceRef.current) {
      const map = maplibreInstanceRef.current;
      
      // Update markers for all visible users
      filteredUsers.forEach(user => {
        if (!user.location) return;
        
        if (maplibreMarkersRef.current[user.uid]) {
          maplibreMarkersRef.current[user.uid].setLngLat([user.location.lng, user.location.lat]);
        } else {
          const el = document.createElement('div');
          el.className = 'maplibre-marker';
          el.style.width = '44px';
          el.style.height = '44px';
          el.style.borderRadius = '50%';
          el.style.border = '3px solid white';
          el.style.backgroundImage = `url(${user.photoURL || '/placeholder-avatar.png'})`;
          el.style.backgroundSize = 'cover';
          el.style.boxShadow = '0 4px 10px rgba(0,0,0,0.3)';
          el.style.cursor = 'pointer';
          el.onclick = () => onProfileClick(user.uid);
          
          const marker = new maplibregl.Marker(el)
            .setLngLat([user.location.lng, user.location.lat])
            .addTo(map);
            
          maplibreMarkersRef.current[user.uid] = marker;
        }
      });
      
      // Remove stale markers
      Object.keys(maplibreMarkersRef.current).forEach(uid => {
        if (!filteredUsers.find(u => u.uid === uid)) {
          maplibreMarkersRef.current[uid].remove();
          delete maplibreMarkersRef.current[uid];
        }
      });
    } else {
      // Clear all markers if not in 3D mode
      Object.keys(maplibreMarkersRef.current).forEach(uid => {
        maplibreMarkersRef.current[uid].remove();
      });
      maplibreMarkersRef.current = {};
    }
  }, [mapSource, filteredUsers, mapSource === '3d' && maplibreInstanceRef.current]);

  useEffect(() => {
    mapRef.current = mapInstance;
  }, [mapInstance]);

  const mapRef = useRef<google.maps.Map | null>(null);

  // --- User Compass Heading ---
  useEffect(() => {
    const handleOrientation = (e: any) => {
      if (e.webkitCompassHeading) {
        setUserHeading(e.webkitCompassHeading);
        setNavDestinyHeading(e.webkitCompassHeading);
      } else if (e.alpha !== null) {
        // Fallback for non-iOS
        const heading = 360 - e.alpha;
        setUserHeading(heading);
        setNavDestinyHeading(heading);
      }
    };

    if (window.DeviceOrientationEvent && navDestinyState === 'active') {
      // For iOS 13+ we might need permission, but we'll try to listen first
      window.addEventListener('deviceorientation', handleOrientation, true);
    }
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, [navDestinyState]);

  // --- Moving Shine Animation ---
  useEffect(() => {
    if (navDestinyState !== 'active') return;
    let animationFrame: number;
    const animate = () => {
      setNavShineOffset(prev => (prev + 0.5) % 100);
      animationFrame = requestAnimationFrame(animate);
    };
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [navDestinyState]);

  // --- Destiny Navigation Logic ---
  useEffect(() => {
    const handleOrientation = (e: any) => {
      let heading = e.webkitCompassHeading || e.compassHeading;
      if (heading === undefined && e.alpha !== null) {
        heading = 360 - e.alpha;
      }
      if (heading !== undefined) {
        setUserHeading(heading);
        if (navDestinyState === 'active') {
          setNavDestinyHeading(heading);
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('deviceorientationabsolute', handleOrientation, true);
      window.addEventListener('deviceorientation', handleOrientation, true);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('deviceorientationabsolute', handleOrientation);
        window.removeEventListener('deviceorientation', handleOrientation);
      }
    };
  }, [navDestinyState]);

  useEffect(() => {
    onDestinySetupChange?.(showNavDestinySetup);
  }, [showNavDestinySetup, onDestinySetupChange]);

  const activeNavRoute = useMemo(() => {
    if (navDestinyState !== 'active' || !navDestinyRoute.length || !userProfile?.location) return [];
    
    // Find closest point on route to hide traveled part
    let closestIndex = 0;
    let minDist = Infinity;
    
    const userLat = userProfile.location.lat;
    const userLng = userProfile.location.lng;

    navDestinyRoute.forEach((point, index) => {
      const d = getDistanceNumber(userLat, userLng, point.lat, point.lng);
      if (d < minDist) {
        minDist = d;
        closestIndex = index;
      }
    });

    // SNAPPING LOGIC (Safety Snapping)
    // If user is within 20m of the road path, we can optionally snap their displayed 
    // icon to the road. 
    const snappedPos = (minDist < 0.02) ? navDestinyRoute[closestIndex] : { lat: userLat, lng: userLng };

    // To make it look smoother and clear the trail perfectly
    return [
      snappedPos,
      ...navDestinyRoute.slice(closestIndex + 1)
    ];
  }, [navDestinyRoute, userProfile?.location, navDestinyState]);

  const fetchRoute = async (start: { lat: number; lng: number }, end: { lat: number; lng: number }, mode: 'walking' | 'bicycling' | 'driving', preference: 'main' | 'street') => {
    try {
      const osrmMode = mode === 'driving' ? 'driving' : mode === 'bicycling' ? 'cycling' : 'walking';
      console.log(`FETCHING OSRM ROUTE: ${osrmMode} mode for high-fidelity roads...`);
      
      // Use full geometry as primary source of truth for high-fidelity road following
      // Ensure we use the exact URL format requested by user
      const osrmUrl = `https://router.project-osrm.org/route/v1/${osrmMode}/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson&steps=true&annotations=true`;
      
      const res = await fetch(osrmUrl);
      const data = await res.json();
      
      if (data.code === 'Ok' && data.routes?.[0]?.geometry?.coordinates) {
        // High-precision road path mapping
        const rawCoords = data.routes[0].geometry.coordinates;
        return rawCoords.map((c: [number, number]) => ({
          lat: c[1],
          lng: c[0]
        }));
      }

      // Try Modern Google Maps Routes API (V2) only if OSRM fails
      if (window.google?.maps?.importLibrary) {
        try {
          const routesLib = await google.maps.importLibrary("routes") as any;
          if (routesLib && routesLib.Route) {
            const { routes } = await routesLib.Route.computeRoutes({
              origin: { location: { latLng: start } },
              destination: { location: { latLng: end } },
              travelMode: mode === 'walking' ? 'WALKING' : mode === 'bicycling' ? 'BICYCLING' : 'DRIVING',
              routingPreference: preference === 'main' ? 'TRAFFIC_AWARE' : 'BALANCED',
              polylineQuality: 'HIGH_QUALITY',
              fields: ['path'], 
            });
            
            if (routes?.[0]?.path) {
              return routes[0].path.map((p: any) => ({ lat: p.lat(), lng: p.lng() }));
            }
          }
        } catch (routesErr) {
          console.warn("Modern Google Routes API failed.", routesErr);
        }
      }

      return [start, end];
    } catch (e: any) {
      console.error("Critical Routing Failure:", e);
      return [start, end];
    }
  };

  const startNavDestiny = async (target: { lat: number; lng: number }) => {
    if (!auth.currentUser || !userProfile?.location) return;

    const canUse = await checkFeatureLimit('destiny', 3, 'Destiny Navigation');
    if (!canUse) return;

    toast.loading("Calculating road path...", { id: 'nav-routing' });
    try {
      const path = await fetchRoute(
        { lat: userProfile.location.lat, lng: userProfile.location.lng },
        target,
        navDestinyConfig.mode,
        navDestinyConfig.preference
      );

      setNavDestinyRoute(path);
      setNavDestinyTarget(target);
      setNavDestinyState('active');
      setShowNavDestinySetup(false);
      setIsDestinyMode(true);
      onDestinyModeChange?.(true);
      toast.success("Navigation LIVE!", { id: 'nav-routing' });

      await setDoc(doc(db, 'destinies', auth.currentUser.uid), {
        uid: auth.currentUser.uid,
        username: userProfile.username,
        userPhoto: userProfile.photoURL,
        targetLocation: target,
        roadPath: path,
        travelMode: navDestinyConfig.mode,
        routePreference: navDestinyConfig.preference,
        status: 'active',
        safetyRadius: navDestinyConfig.radius,
        visibility: navDestinyConfig.privacy,
        allowedUsers: navDestinyConfig.privacy === 'mates' ? Array.from(destinySpectators) : [],
        createdAt: serverTimestamp()
      });

    } catch (err) {
      toast.error("Road path failed. Direct line enabled.", { id: 'nav-routing' });
      setNavDestinyTarget(target);
      setNavDestinyState('active');
      setShowNavDestinySetup(false);
    }
  };

  const cancelNavDestiny = async () => {
    if (!auth.currentUser) return;
    setNavDestinyState('off');
    setNavDestinyTarget(null);
    setNavDestinyRoute([]);
    setIsDestinyMode(false);
    onDestinyModeChange?.(false);
    
    try {
      await deleteDoc(doc(db, 'destinies', auth.currentUser.uid));
      toast.info("Navigation cancelled.");
    } catch (e) {
      console.warn("Error deleting destiny doc:", e);
    }
  };

  const completeNavDestiny = async () => {
    if (!auth.currentUser) return;
    setNavDestinyState('off');
    setNavDestinyTarget(null);
    setNavDestinyRoute([]);
    setIsDestinyMode(false);
    onDestinyModeChange?.(false);
    
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      
      // New Reward: 10-20 XP
      const xpGained = Math.floor(Math.random() * 11) + 10;
      await updateDoc(userRef, {
        xp: increment(xpGained)
      });
      
      await deleteDoc(doc(db, 'destinies', auth.currentUser.uid)).catch(() => {});
      
      // Play Satisfaction Sound
      try {
        const context = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(523.25, context.currentTime); // C5
        oscillator.frequency.exponentialRampToValueAtTime(1046.50, context.currentTime + 0.3); // C6
        gain.gain.setValueAtTime(0.1, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.5);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + 0.5);
      } catch (soundErr) {
        console.warn("Sound play failed:", soundErr);
      }

      setNavDestinyCompleted(true);
      toast.success(`Destiny Reached! +${xpGained} XP Earned!`, { icon: '✨' });
    } catch (err) {
      console.error("Reward error:", err);
    }
  };

  useEffect(() => {
    if (navDestinyState === 'active' && userProfile?.location && navDestinyTarget) {
      const dist = getDistanceNumber(
        userProfile.location.lat,
        userProfile.location.lng,
        navDestinyTarget.lat,
        navDestinyTarget.lng
      );
      
      if (dist < 0.015) { // 15 meters strict threshold
        completeNavDestiny();
      }

      if (userProfile.location.heading !== undefined) {
        setUserHeading(userProfile.location.heading);
        setNavDestinyHeading(userProfile.location.heading);
      }
    }
  }, [userProfile?.location, navDestinyState, navDestinyTarget]);

  useImperativeHandle(ref, () => ({
    flyToUser: (userId: string) => {
      const user = users.find(u => u.uid === userId);
      if (user?.location && isValidLatLng(user.location.lat, user.location.lng)) {
        zoomToUser(user.location.lat, user.location.lng, userId);
      }
    },
    flyTo: (lat: number, lng: number, zoom: number = 18) => {
      if (isValidLatLng(lat, lng)) {
        safeFlyTo(lat, lng, zoom);
      }
    },
    openFilterModal: () => {
      setShowFilterModal(true);
    },
    addOptimisticLabel: (label: MapLabel) => {
      setLabels(prev => {
        // Prevent duplicate temp labels
        if (prev.some(l => l.name === label.name && l.location.lat === label.location.lat)) return prev;
        return [label, ...prev];
      });
    },
    addOptimisticMoment: (moment: any) => {
      setMoments(prev => [moment, ...prev]);
      if (moment.uid) {
        setActiveMoments(prev => new Set([...Array.from(prev), moment.uid]));
      }
    }
  }));

  useEffect(() => {
    if (!mapLoaded) {
      const timer = setTimeout(() => {
        console.log("Map loading safety timeout reached");
        setMapLoaded(true);
        setMapIsLoading(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [mapLoaded]);

  useEffect(() => {
    if (!userProfile?.parentMode?.enabled && filterMode === 'children') {
      setFilterMode('all');
    }
  }, [userProfile?.parentMode?.enabled]);

  useEffect(() => {
    if (mapLoaded && !hasAutoZoomed && isDataReady) {
      onLoad?.();
      
      // Only start the timer if userProfile exists OR if user is not logged in (to fallback zoom)
      const timer = setTimeout(() => {
        if (hasAutoZoomed) return;

        if (userProfile?.location) {
          const lat = userProfile.location.lat;
          const lng = userProfile.location.lng;
          if (isValidLatLng(lat, lng)) {
            const userPos: google.maps.LatLngLiteral = { lat, lng };
            setCenter(userPos);
            setZoom(27);
            if (mapRef.current) {
              mapRef.current.panTo(userPos);
              mapRef.current.setZoom(27);
            }
            setHasAutoZoomed(true);
            return;
          }
        }
        
        // Fallback for general city view zoom if no profile location yet
        setZoom(18);
        if (mapRef.current) {
          mapRef.current.setZoom(18);
        }
        setHasAutoZoomed(true);
      }, 4000);
      
      return () => clearTimeout(timer);
    }
  }, [mapLoaded, isDataReady, hasAutoZoomed, userProfile?.location]);

  const forceRecenter = () => {
    if (navigator.geolocation) {
      toast.promise(
        new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const lat = pos.coords.latitude;
              const lng = pos.coords.longitude;
                if (isValidLatLng(lat, lng)) {
                  const newPos: google.maps.LatLngLiteral = { lat, lng };
                  setCenter(newPos);
                  setIsFollowingUser(true);
                  safeFlyTo(newPos.lat, newPos.lng, 22);
                  // Force update to Firestore for immediate calibration
                  if (auth.currentUser) {
                  const userRef = doc(db, 'users', auth.currentUser.uid);
                  updateDoc(userRef, {
                    'location.lat': lat,
                    'location.lng': lng,
                    'location.accuracy': pos.coords.accuracy,
                    'location.lastUpdated': new Date().toISOString()
                  }).catch(err => handleFirestoreError(err, OperationType.UPDATE, `users/${auth.currentUser?.uid}`));
                }
                resolve(pos);
              } else {
                reject(new Error("Invalid coordinates received"));
              }
            },
            (err) => reject(err),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
          );
        }),
        {
          loading: 'Calibrating exact location...',
          success: 'Location calibrated!',
          error: 'Could not get exact location. Please check GPS.'
        }
      );
    }
  };

  useEffect(() => {
    // High-Accuracy Geolocation (The Foundation)
    if (navigator.geolocation) {
      // Immediate one-time check for exact location
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          if (isValidLatLng(lat, lng)) {
            const initialPos: google.maps.LatLngLiteral = { lat, lng };
            
            // Initial Centering Logic: Zoom in once at start
            if (!hasInitialCentered) {
              setCenter(initialPos);
              if (mapInstance) {
                mapInstance.setCenter(initialPos);
                mapInstance.setZoom(25); // High-detail zoom for user location
                setHasInitialCentered(true);
                setIsFollowingUser(false); // Stop following after initial center
              }
            }
          }
        },
        (err) => console.error("Initial geolocation error:", err),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );

      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          if (isValidLatLng(lat, lng)) {
            const newPos: google.maps.LatLngLiteral = { lat, lng };
            // Only update center if explicitly following AND not in terrain mode
            if (isFollowingUser && mapType !== 'terrain') {
              setCenter(newPos);
            }

            // CONTINUOUS LIVE TRACKING: Update Firestore if significant movement
            if (auth.currentUser) {
              const lastUpdateStr = localStorage.getItem('last_location_update');
              const lastLat = parseFloat(localStorage.getItem('last_location_lat') || '0');
              const lastLng = parseFloat(localStorage.getItem('last_location_lng') || '0');
              const now = Date.now();
              const dist = getDistanceNumber(lastLat, lastLng, lat, lng);

              // Update if moved > 5 meters OR more than 30 seconds passed
              if (dist > 0.005 || !lastUpdateStr || (now - parseInt(lastUpdateStr)) > 30000) {
                const userRef = doc(db, 'users', auth.currentUser.uid);
                updateDoc(userRef, {
                  location: {
                    lat,
                    lng,
                    accuracy: pos.coords.accuracy,
                    lastUpdated: new Date().toISOString(),
                    heading: pos.coords.heading ?? null
                  },
                  isOnline: true,
                  lastActive: serverTimestamp()
                }).catch(err => console.error("Auto-sync error:", err));
                
                localStorage.setItem('last_location_update', now.toString());
                localStorage.setItem('last_location_lat', lat.toString());
                localStorage.setItem('last_location_lng', lng.toString());
              }
            }
          }
        },
        (err) => console.error("Geolocation error:", err),
        { 
          enableHighAccuracy: true, 
          timeout: 10000, 
          maximumAge: 0 
        }
      );

      return () => {
        navigator.geolocation.clearWatch(watchId);
      };
    }
  }, [mapInstance, mapType, isFollowingUser, hasInitialCentered]);

  useEffect(() => {
    if (!auth.currentUser) return;

    // Fetch users with onSnapshot for real-time tracking
    // Broaden query to ensure we fetch enough potential mates, even if fields are missing
    const usersQ = query(
      collection(db, 'users'), 
      limit(250)
    );
    const unsubscribeUsers = onSnapshot(usersQ, (snap) => {
      const usersData = snap.docs
        .map(doc => ({ ...doc.data(), uid: doc.id } as UserProfile))
        .filter(u => {
          // Rule 1: Exclude if explicitly set to private OR explicitly hidden from map
          if (u.privateProfile === true) return false;
          if (u.showOnMap === false) return false;
          
          // Rule 2: Must have a location
          if (!u.location || !isValidLatLng(u.location.lat, u.location.lng)) return false;
          
          return true;
        });

      // Always ensure current user is in the list
      if (auth.currentUser && !usersData.find(u => u.uid === auth.currentUser?.uid)) {
        if (userProfile) {
          usersData.push(userProfile);
        }
      }

      const filtered = usersData.filter(u => u.uid && u.location && isValidLatLng(u.location.lat, u.location.lng));
      setUsers(filtered);
      setIsDataReady(true);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'users'));

    // Also listen to OWN profile explicitly to ensure it's always up-to-date and in the users array
    let unsubscribeOwn = () => {};
    if (auth.currentUser) {
      unsubscribeOwn = onSnapshot(doc(db, 'users', auth.currentUser.uid), (snap) => {
        if (snap.exists()) {
          const myProfile = { ...snap.data(), uid: snap.id } as UserProfile;
          setUsers(prev => {
            const others = prev.filter(u => u.uid !== myProfile.uid);
            return [...others, myProfile].filter(u => u.location && isValidLatLng(u.location.lat, u.location.lng));
          });
        }
      }, (err) => console.error("Error listening to own profile:", err));
    }

    // Fetch active moments
    const nowStr = new Date().toISOString();
    const momentsQ = query(collection(db, 'moments'), where('expiresAt', '>', nowStr));
    const unsubscribeMoments = onSnapshot(momentsQ, (snap) => {
      const uids = new Set<string>(snap.docs.map(doc => doc.data().uid));
      setActiveMoments(prev => {
        // Keep optimistic uids (though they might already be in uids if we used the user's uid)
        // More importantly, we should ensure the UI reflects the change.
        return uids;
      });
    }, (err) => handleFirestoreError(err, OperationType.GET, 'moments'));

    // Fetch help signals
    let unsubscribeHelp = () => {};
    if (auth.currentUser) {
      const helpQ = query(collection(db, 'help_signals'), orderBy('timestamp', 'desc'), limit(50));
      unsubscribeHelp = onSnapshot(helpQ, (snap) => {
        const signals = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as HelpSignal));
        setHelpSignals(signals);
        
        // Notify for new help signals nearby
        snap.docChanges().forEach(change => {
          if (change.type === 'added') {
            const signal = change.doc.data() as HelpSignal;
            if (auth.currentUser && signal.uid !== auth.currentUser.uid) {
              const distance = getDistanceNumber(center.lat, center.lng, signal.lat, signal.lng);
              if (distance <= signal.radius / 1000) {
                toast.error(`SOS: ${signal.username} needs help!`, {
                  description: signal.text,
                  duration: 10000,
                  action: {
                    label: 'Locate',
                    onClick: () => zoomToUser(signal.lat, signal.lng, signal.uid)
                  }
                });
              }
            }
          }
        });
      }, (err) => handleFirestoreError(err, OperationType.GET, 'help_signals'));
    }

    // Fetch friends
    let unsubscribeFriends = () => {};
    if (auth.currentUser) {
      const friendsQ = query(collection(db, 'users', auth.currentUser.uid, 'friends'));
      unsubscribeFriends = onSnapshot(friendsQ, (snap) => {
        setFriends(snap.docs.map(doc => doc.id));
      }, (err) => handleFirestoreError(err, OperationType.GET, `users/${auth.currentUser?.uid}/friends`));
    }

    // Fetch parent data
    let unsubscribeParent = () => {};
    if (auth.currentUser && userProfile?.parentMode?.enabled && userProfile.parentMode?.children) {
      const children = userProfile.parentMode.children;
      if (children && children.length > 0) {
        const qPaths = query(collection(db, 'parentChildPaths'), where('childUid', 'in', children));
        const unsubPaths = onSnapshot(qPaths, (snap) => {
          const pathsMap: { [uid: string]: ParentChildPath } = {};
          snap.forEach(doc => {
            const data = doc.data() as ParentChildPath;
            pathsMap[data.childUid] = { id: doc.id, ...data };
          });
          setParentPaths(pathsMap);
        }, (err) => handleFirestoreError(err, OperationType.GET, 'parentChildPaths'));

        const qDest = query(collection(db, 'destinyConfigs'), where('childUid', 'in', children), where('status', '==', 'active'));
        const unsubDest = onSnapshot(qDest, (snap) => {
          const destMap: { [uid: string]: DestinyConfig } = {};
          snap.forEach(doc => {
            const data = doc.data() as DestinyConfig;
            destMap[data.childUid] = { id: doc.id, ...data };
          });
          setChildDestinies(destMap);
        }, (err) => handleFirestoreError(err, OperationType.GET, 'destinyConfigs'));

        unsubscribeParent = () => {
          unsubPaths();
          unsubDest();
        };
      }
    }

    // Fetch child's own destiny config
    let unsubscribeMyDestiny = () => {};
    if (auth.currentUser && userProfile?.childMode?.enabled) {
      const q = query(collection(db, 'destinyConfigs'), where('childUid', '==', auth.currentUser.uid), where('status', '==', 'active'));
      unsubscribeMyDestiny = onSnapshot(q, (snap) => {
        if (!snap.empty) {
          const data = { id: snap.docs[0].id, ...snap.docs[0].data() } as DestinyConfig;
          setMyDestinyConfig(data);
          setDestinySpectators(new Set(data.spectators || []));
        } else {
          setMyDestinyConfig(null);
          setDestinySpectators(new Set());
        }
      }, (err) => handleFirestoreError(err, OperationType.GET, 'destinyConfigs'));
    }

    // Fetch active destinies
    let unsubscribeDestiny = () => {};
    if (auth.currentUser) {
      const destinyQ = query(
        collection(db, 'destinies'), 
        where('status', '==', 'active'),
        where('visibility', '==', 'all')
      );
      unsubscribeDestiny = onSnapshot(destinyQ, (snap) => {
        const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Destiny));
        setAllDestinies(docs);
        
        // Check if current user has an active destiny
        const myDestiny = docs.find(d => d.uid === auth.currentUser?.uid);
        setActiveDestiny(myDestiny || null);
      }, (err) => handleFirestoreError(err, OperationType.GET, 'destinies'));
    }

    // Fetch Map Labels
    let unsubscribeLabels = () => {};
    if (auth.currentUser) {
      // Global Labels - show all labels to all users as requested
      const labelsQ = query(
        collection(db, 'labels'),
        or(where('status', '==', 'approved'), where('uid', '==', auth.currentUser.uid))
      );
      unsubscribeLabels = onSnapshot(labelsQ, (snap) => {
        const labelList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MapLabel));
        setLabels(prev => {
          const optimistic = prev.filter(l => l.id?.startsWith('temp-'));
          const combined = [...labelList, ...optimistic];
          // Deduplicate
          const unique = new Map();
          combined.forEach(l => {
            const key = l.id || `${l.name}-${l.location.lat}-${l.location.lng}`;
            // Prefer real ID over temp ID
            if (!unique.has(key) || (l.id && !l.id.startsWith('temp-'))) {
              unique.set(key, l);
            }
          });
          return Array.from(unique.values());
        });
      }, (err) => handleFirestoreError(err, OperationType.GET, 'labels'));
    }

    return () => {
      unsubscribeUsers();
      unsubscribeOwn();
      unsubscribeMoments();
      unsubscribeHelp();
      unsubscribeFriends();
      unsubscribeDestiny();
      unsubscribeParent();
      unsubscribeMyDestiny();
      unsubscribeLabels();
    };
  }, [auth.currentUser, userProfile?.parentMode?.enabled, userProfile?.parentMode?.children, userProfile?.childMode?.enabled]);

  useEffect(() => {
    if (!auth.currentUser || !userProfile?.location) return;
    
    // Only update path if Child Mode is enabled
    if (!userProfile.childMode?.enabled) return;

    const updatePath = async () => {
      try {
        const q = query(collection(db, 'parentChildPaths'), where('childUid', '==', auth.currentUser.uid));
        const snap = await getDocs(q);
        
        const newPoint = {
          lat: userProfile.location!.lat,
          lng: userProfile.location!.lng,
          timestamp: Date.now()
        };

        if (snap.empty) {
          await addDoc(collection(db, 'parentChildPaths'), {
            childUid: auth.currentUser!.uid,
            points: [newPoint],
            stops: [],
            lastUpdated: Date.now()
          });
        } else {
          const pathDoc = snap.docs[0];
          const pathData = pathDoc.data() as ParentChildPath;
          const lastPoint = pathData.points[pathData.points.length - 1];
          
          // Only add point if moved significantly (e.g. 5 meters)
          const dist = getDistanceNumber(lastPoint.lat, lastPoint.lng, newPoint.lat, newPoint.lng);
          if (dist > 0.005) {
            const updatedPoints = [...pathData.points, newPoint];
            // Check for stops (10 mins inactivity)
            const lastUpdate = pathData.lastUpdated;
            const now = Date.now();
            const updatedStops = [...pathData.stops];
            if (now - lastUpdate > 600000) { // 10 minutes
              updatedStops.push({
                lat: lastPoint.lat,
                lng: lastPoint.lng,
                startTime: lastUpdate,
                endTime: now
              });
            }

            // Keep only last 12 hours of points
            const twelveHoursAgo = Date.now() - 12 * 60 * 60 * 1000;
            const filteredPoints = updatedPoints.filter(p => p.timestamp > twelveHoursAgo);

            await updateDoc(doc(db, 'parentChildPaths', pathDoc.id), {
              points: filteredPoints,
              stops: updatedStops,
              lastUpdated: now
            });
          } else {
            // Update lastUpdated even if not moved to track inactivity
            await updateDoc(doc(db, 'parentChildPaths', pathDoc.id), {
              lastUpdated: Date.now()
            });
          }
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, 'parentChildPaths');
      }
    };

    const interval = setInterval(updatePath, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [userProfile?.location?.lat, userProfile?.location?.lng, userProfile?.childMode?.enabled]);

  useEffect(() => {
    if (!auth.currentUser || !userProfile?.location || !myDestinyConfig) return;

    const checkDeviation = async () => {
      if (!userProfile?.location || !myDestinyConfig) return;

      const distToTarget = getDistanceNumber(
        userProfile.location.lat,
        userProfile.location.lng,
        myDestinyConfig.target.lat,
        myDestinyConfig.target.lng
      );

      // If reached destination
      if (distToTarget <= 0.02) { // 20m
        await updateDoc(doc(db, 'destinyConfigs', myDestinyConfig.id), { 
          status: 'completed',
          completedAt: new Date().toISOString()
        });

        // Notify parent
        await addDoc(collection(db, 'notifications'), {
          uid: myDestinyConfig.parentUid,
          fromUid: auth.currentUser!.uid,
          fromUsername: userProfile.username,
          type: 'destiny_completed',
          text: `${userProfile.username} has reached the destiny!`,
          read: false,
          timestamp: serverTimestamp()
        });

        toast.success('You reached your destination! Parents notified.');
        return;
      }

      // Check if outside geofence radius
      const geofence = myDestinyConfig.geofenceRadius || 100;
      if (distToTarget > geofence / 1000) {
        // Notify parent and spectators
        const notifyUids = [myDestinyConfig.parentUid, ...(myDestinyConfig.spectators || [])];
        await Promise.all(notifyUids.map(uid => 
          addDoc(collection(db, 'notifications'), {
            uid: uid,
            fromUid: auth.currentUser!.uid,
            fromUsername: userProfile.username,
            type: 'destiny_deviation',
            text: `${userProfile.username} has left the safe radius!`,
            read: false,
            data: {
              lat: userProfile.location!.lat,
              lng: userProfile.location!.lng,
              time: new Date().toISOString()
            },
            timestamp: serverTimestamp()
          })
        ));
        toast.error('You are outside the safe radius! Please head back.');
      }

      // Erase path behind user and check path deviation
      if (myDestinyConfig.roadPath && myDestinyConfig.roadPath.length > 1) {
        let closestIdx = 0;
        let minDist = Infinity;
        
        myDestinyConfig.roadPath.forEach((p, idx) => {
          const d = getDistanceNumber(userProfile.location!.lat, userProfile.location!.lng, p.lat, p.lng);
          if (d < minDist) {
            minDist = d;
            closestIdx = idx;
          }
        });

        // If we are close to a point on the path, remove all points before it
        if (minDist < 0.03) { // 30m
          const newPath = myDestinyConfig.roadPath.slice(closestIdx);
          if (newPath.length !== myDestinyConfig.roadPath.length) {
            await updateDoc(doc(db, 'destinyConfigs', myDestinyConfig.id), {
              roadPath: newPath
            });
            
            // Also update the public destiny if it exists
            if (activeDestiny) {
              await updateDoc(doc(db, 'destinies', activeDestiny.id), {
                roadPath: newPath
              });
            }
          }
        } else if (minDist > 0.1) { // 100m away from path
          toast.warning('You are deviating from the suggested path!');
        }
      }
    };

    const interval = setInterval(checkDeviation, 10000); // Check every 10s for better accuracy
    return () => clearInterval(interval);
  }, [userProfile?.location?.lat, userProfile?.location?.lng, myDestinyConfig]);

  useEffect(() => {
    if (activeDestiny && userProfile?.location) {
      const dist = getDistanceNumber(
        userProfile.location.lat, 
        userProfile.location.lng, 
        activeDestiny.targetLocation.lat, 
        activeDestiny.targetLocation.lng
      );
      
      if (dist <= 0.01) { // 10 meters threshold
        completeDestiny(activeDestiny.id);
      }
    }
  }, [userProfile?.location, activeDestiny]);

  const startDestiny = async () => {
    if (!destinyTarget || !userProfile?.location) return;
    
    try {
      toast.loading('Calculating safe road path...', { id: 'routing' });
      const roadPath = await fetchRoadPath(
        [userProfile.location.lat, userProfile.location.lng],
        [destinyTarget[0], destinyTarget[1]]
      );
      toast.dismiss('routing');

      const destinyData: Omit<Destiny, 'id'> & { roadPath?: { lat: number; lng: number }[] } = {
        uid: userProfile.uid,
        username: userProfile.username,
        userPhoto: userProfile.photoURL,
        startLocation: {
          lat: userProfile.location.lat,
          lng: userProfile.location.lng
        },
        targetLocation: {
          lat: destinyTarget[0],
          lng: destinyTarget[1]
        },
        status: 'active',
        visibility: destinyPrivacy,
        allowedUsers: destinyPrivacy === 'custom' ? Array.from(destinyCustomUsers) : undefined,
        roadPath: roadPath,
        createdAt: new Date().toISOString()
      };
      
      await addDoc(collection(db, 'destinies'), destinyData);
      setIsDestinyMode(false);
      setDestinyTarget(null);
      setShowDestinyConfirm(false);
      toast.success('Destiny tracking started! Reach your destination safely.');
    } catch (err) {
      toast.dismiss('routing');
      handleFirestoreError(err, OperationType.WRITE, 'destinies');
      toast.error('Failed to start destiny tracking');
    }
  };

  const completeDestiny = async (id: string) => {
    try {
      const d = allDestinies.find(dest => dest.id === id);
      if (!d) return;
      
      const dist = getDistanceNumber(d.startLocation.lat, d.startLocation.lng, d.targetLocation.lat, d.targetLocation.lng);
      setDestinyDistance(dist);
      
      await updateDoc(doc(db, 'destinies', id), {
        status: 'completed',
        completedAt: new Date().toISOString(),
        distance: dist
      });
      
      setShowDestinySuccess(true);
      setTimeout(() => setShowDestinySuccess(false), 8000);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `destinies/${id}`);
    }
  };

  const cancelDestiny = async (id: string) => {
    try {
      await updateDoc(doc(db, 'destinies', id), {
        status: 'cancelled'
      });
      toast.info('Destiny tracking cancelled');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `destinies/${id}`);
    }
  };

  const failDestiny = async (id: string) => {
    try {
      await updateDoc(doc(db, 'destinies', id), {
        status: 'failed'
      });
      setShowDestinyFailure(true);
      setTimeout(() => setShowDestinyFailure(false), 5000);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `destinies/${id}`);
    }
  };

  const canSeeDestiny = (destiny: any) => {
    if (!auth.currentUser) return false;
    if (destiny.uid === auth.currentUser.uid) return true;
    if (destiny.visibility === 'all') return true;
    if (destiny.visibility === 'mates') {
      return friends.includes(destiny.uid);
    }
    if (destiny.allowedUsers?.includes(auth.currentUser.uid)) return true;
    return false;
  };

  const handleMapDoubleClick = async (lat: number, lng: number) => {
    // Default double click behavior or custom
  };

  const handleMapClick = async (lat: number, lng: number) => {
    if (navDestinyState === 'selecting') {
      setNavDestinyTarget({ lat, lng });
      setShowNavDestinySetup(true);
      setNavDestinyState('off');
      return;
    }
    if (isRefiningLocation) return;
    if (isLabelSelecting) {
      if (userProfile?.location) {
        const dist = getDistanceNumber(userProfile.location.lat, userProfile.location.lng, lat, lng);
        if (dist > 1) {
          toast.error("You can only add labels within 1km of your location.");
          return;
        }
      }
      onLabelPosSelect?.({ lat, lng });
      return;
    }
    if (isDestinyMode) {
      setDestinyTarget([lat, lng]);
      setShowDestinyConfirm(true);
      return;
    }
  };

  const handleSearch = async (e?: React.FormEvent | React.KeyboardEvent) => {
    e?.preventDefault();
    if (!searchQuery || !isLoaded || !mapInstance) return;
    try {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ address: searchQuery }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const lat = results[0].geometry.location.lat();
          const lng = results[0].geometry.location.lng();
          if (isValidLatLng(lat, lng)) {
            setCenter({ lat, lng });
            mapInstance.setZoom(25);
            toast.success(`Found: ${results[0].formatted_address}`, { icon: '📍' });
            addToHistory('search', undefined, searchQuery);
          }
        } else {
          toast.error("Location not found. Try street name or city.");
        }
      });
    } catch (err) {
      console.error(err);
      toast.error("Search failed");
    }
  };


  const zoomToUser = (lat: number, lng: number, userId: string) => {
    if (isValidLatLng(lat, lng)) {
      if (mapSource === '3d' && maplibreInstanceRef.current) {
        maplibreInstanceRef.current.flyTo({
          center: [lng, lat],
          zoom: 19,
          pitch: 65,
          duration: 2500,
          essential: true,
          easing: (t) => t * (2 - t)
        });
      } else if (mapInstance) {
        // Premium Google Maps transition
        mapInstance.setOptions({ 
          tilt: 65,
          heading: (mapInstance.getHeading() || 0) + 10 // Slight rotation for vibe
        });
        mapInstance.panTo({ lat, lng });
        mapInstance.setZoom(20);
      }
    }
  };

  const handleDeleteLabel = async (labelId: string) => {
    if (!auth.currentUser) return;
    
    if (!window.confirm("Are you sure you want to delete this label?")) return;

    try {
      // 1. Perform permanent deletion (mark as deleted)
      await setDoc(doc(db, 'labels', labelId), { 
        status: 'deleted',
        deletedAt: new Date().toISOString()
      }, { merge: true });
      
      // 2. Update UI only after success
      setLabels(prev => prev.filter(l => l.id !== labelId));
      setSelectedLabel(null);
      toast.success("Label deleted successfully.");
    } catch (err: any) {
      console.error('Error deleting label:', err);
      if (err.code === "permission-denied") {
        alert("Error: Permission denied. You can only delete your own labels.");
      } else {
        alert("Error deleting label: " + (err?.message || "Unknown error"));
      }
    }
  };

  // Help signal logic moved to separate component

  // Help logic removed

  const getShopIcon = (category: string) => {
    if (!category) return '🏪';
    const cat = category.toLowerCase();
    if (cat.includes('pan')) return '🚬';
    if (cat.includes('bakery')) return '🥐';
    if (cat.includes('pharmacy') || cat.includes('clinic')) return '💊';
    if (cat.includes('grocery') || cat.includes('supermarket')) return '🛒';
    if (cat.includes('restaurant') || cat.includes('cafe')) return '🍴';
    if (cat.includes('petrol') || cat.includes('fuel')) return '⛽';
    if (cat.includes('bank') || cat.includes('atm')) return '💰';
    if (cat.includes('hospital')) return '🏥';
    if (cat.includes('school')) return '🏫';
    if (cat.includes('gym')) return '💪';
    return '🏪';
  };

  // Generate CSS filter for Satellite/Hybrid/Imagery/3D vibes to ensure atmospheric consistency
  const getSimulatedFilter = () => {
    // If it's Roadmap (Google), styling is handled by JSON styles, return empty
    if (mapSource === 'google' && (mapType === 'roadmap' || mapType === 'terrain' || mapType === 'default')) return "";
    
    switch (mapStyleVibe) {
      case 'night': return "brightness(0.5) contrast(1.2) saturate(0.7) hue-rotate(200deg) invert(0.05)";
      case 'dark': return "brightness(0.35) contrast(1.6) grayscale(0.9)";
      case 'silver': return "grayscale(1) brightness(1.2) contrast(0.85)";
      case 'retro': return "sepia(0.7) brightness(0.9) contrast(1.15) saturate(0.8)";
      case 'aubergine': return "hue-rotate(250deg) brightness(0.55) saturate(0.7) contrast(1.1)";
      case 'neon': return "hue-rotate(160deg) brightness(0.65) saturate(1.8) contrast(1.3) drop-shadow(0 0 2px rgba(0,255,255,0.3))";
      case 'blue': return "hue-rotate(195deg) brightness(0.75) saturate(1.3) contrast(1.1)";
      case 'rainy': return "brightness(0.65) saturate(0.4) contrast(0.75) blur(0.4px)";
      case 'cloudy': return "brightness(0.85) saturate(0.6) contrast(0.9)";
      case 'sunlight': return "brightness(1.15) saturate(1.25) contrast(1.05)";
      default: return "";
    }
  };

  const uniqueVibes = Array.from(new Set(users.map(u => u.mood?.text).filter(Boolean))) as string[];

  // Auto Switch to Hybrid for HD view at high zoom
  // Add effect to auto-tilt when zooming in deep for 3D effect
  useEffect(() => {
    if (mapInstance && mapZoom >= 18 && mapTilt === 0) {
      setMapTilt(45);
    }
  }, [mapZoom, mapInstance]);

  return (
    <div className="relative h-full w-full">
      {userProfile && (
        <React.Fragment>
          {/* Weather/Atmospheric Overlays */}
          <AnimatePresence>
        {(mapStyleVibe === 'rainy' || mapStyleVibe === 'cloudy' || mapStyleVibe === 'fajr') && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none z-[1900] bg-blue-900/10 mix-blend-multiply"
          />
        )}
        {(mapStyleVibe === 'sunset') && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none z-[1900] bg-orange-500/20 mix-blend-overlay"
          />
        )}
        {mapStyleVibe === 'registan' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.2 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none z-[1900] bg-amber-900/20 mix-blend-sepia"
          />
        )}
        {mapStyleVibe === 'bijli' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.8, 0, 0.5, 0] }}
            transition={{ 
              duration: 2, 
              repeat: Infinity, 
              repeatDelay: 3,
              times: [0, 0.1, 0.2, 0.3, 1] 
            }}
            className="absolute inset-0 pointer-events-none z-[1900] bg-white mix-blend-overlay"
          />
        )}
      </AnimatePresence>

      {/* Modals & Business Views */}
      {userProfile && (
        <>
          <ShoppingListModal 
            isOpen={showShoppingListModal} 
            onClose={() => setShowShoppingListModal(false)} 
            userProfile={userProfile} 
          />
          <StockQueryModal 
            isOpen={showStockQueryModal} 
            onClose={() => setShowStockQueryModal(false)} 
            userProfile={userProfile} 
          />
          <DeliveryRequestModal 
            isOpen={showDeliveryModal} 
            onClose={() => setShowDeliveryModal(false)} 
            userProfile={userProfile} 
          />
        </>
      )}

      {showBidsView && activeListId && (
        <BidsView 
          listId={activeListId} 
          onClose={() => {
            setShowBidsView(false);
            setActiveListId(null);
          }} 
        />
      )}

      {/* Refinement Instructions */}
      <AnimatePresence>
        {isRefiningLocation && (
          <motion.div
            key="refine-location-overlay"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="absolute top-24 left-6 z-[2000] bg-white/95 backdrop-blur-xl p-4 rounded-3xl shadow-2xl border border-blue-100 max-w-[200px]"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white">
                <Crosshair className="w-3 h-3" />
              </div>
              <h4 className="text-xs font-black uppercase tracking-tighter">Fix Your Spot</h4>
            </div>
            <p className="text-[10px] font-bold text-neutral-500 leading-tight">
              Drag your profile pic exactly onto your house roof. 
              <span className="block mt-1 text-emerald-600 font-black uppercase">20m Limit Active</span>
            </p>
            <div className="flex flex-col gap-2 mt-3">
              <button 
                onClick={() => {
                  if (!tempRefinePos || !userProfile?.location) return;
                  
                  const currentOffset = JSON.parse(localStorage.getItem('location_offset') || '{"lat":0,"lng":0}');
                  const rawLat = userProfile.location.lat - currentOffset.lat;
                  const rawLng = userProfile.location.lng - currentOffset.lng;
                  
                  const newOffset = {
                    lat: tempRefinePos.lat - rawLat,
                    lng: tempRefinePos.lng - rawLng
                  };
                  
                  const currentCount = parseInt(localStorage.getItem('refine_count') || '0');
                  localStorage.setItem('refine_count', (currentCount + 1).toString());
                  localStorage.setItem('location_offset', JSON.stringify(newOffset));
                  setIsRefiningLocation(false);
                  setTempRefinePos(null);
                  toast.success('Location confirmed! Your pic is now locked on your roof.');
                }}
                disabled={!tempRefinePos}
                className="w-full py-2 bg-blue-600 text-white text-[9px] font-black rounded-xl uppercase tracking-widest hover:bg-blue-700 transition disabled:opacity-50"
              >
                Confirm Spot
              </button>
              <button 
                onClick={() => {
                  setIsRefiningLocation(false);
                  setTempRefinePos(null);
                }}
                className="w-full py-2 bg-neutral-100 text-neutral-900 text-[9px] font-black rounded-xl uppercase tracking-widest hover:bg-neutral-200 transition"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Parent Mode Sidebar */}
      <AnimatePresence>
        {userProfile?.parentMode?.enabled && showParentPanel && (
          <motion.div
            key="parent-panel-sidebar"
            initial={{ x: -400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -400, opacity: 0 }}
            className="absolute top-0 left-0 bottom-0 w-80 bg-white/95 backdrop-blur-2xl z-[2000] shadow-2xl border-r border-neutral-100 flex flex-col"
          >
            <div className="p-6 border-b border-neutral-100 bg-neutral-50/50">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                    <Baby className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black tracking-tighter text-neutral-900">Parent Mode</h2>
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Tracking {userProfile?.parentMode?.childCount} Children</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowParentPanel(false)}
                  className="p-2 hover:bg-neutral-200 rounded-xl transition"
                >
                  <X className="w-5 h-5 text-neutral-400" />
                </button>
              </div>

              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input 
                  type="text"
                  placeholder="Search children..."
                  className="w-full bg-white border border-neutral-200 rounded-2xl py-3 pl-12 pr-4 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition shadow-sm"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {users.filter(u => userProfile.parentMode?.children?.includes(u.uid)).map(child => {
                const isOnline = child.isOnline;
                const path = parentPaths[child.uid];
                const destiny = childDestinies[child.uid];

                return (
                  <div key={child.uid} className="bg-white rounded-[2rem] border border-neutral-100 p-4 shadow-sm hover:shadow-md transition group">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="relative">
                        <UserAvatar src={child.photoURL} username={child.username} size="md" className={cn("border-2", isOnline ? "border-green-500" : "border-neutral-200")} />
                        <div className={cn(
                          "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white",
                          isOnline ? "bg-green-500 animate-pulse" : "bg-neutral-300"
                        )} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-black text-neutral-900 tracking-tight">{child.username}</h3>
                        <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">
                          {isOnline ? 'Live Now' : `Last seen: ${new Date(child.lastSeen).toLocaleTimeString()}`}
                        </p>
                      </div>
                      <button 
                        onClick={() => zoomToUser(child.location!.lat, child.location!.lng, child.uid)}
                        className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition"
                      >
                        <Crosshair className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => {
                          if (isDestinyMode || myDestinyConfig || Object.values(childDestinies).some(d => d.status === 'active')) {
                            toast.error('Cannot show path during Destiny Mode');
                            return;
                          }
                          setShowPathForUserId(showPathForUserId === child.uid ? null : child.uid);
                          if (child.location && isValidLatLng(child.location.lat, child.location.lng)) {
                            safeFlyTo(child.location.lat, child.location.lng, 18);
                          }
                        }}
                        className={cn(
                          "flex items-center justify-center gap-2 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition border",
                          showPathForUserId === child.uid ? "bg-green-50 border-green-200 text-green-600" : "bg-neutral-50 border-neutral-100 text-neutral-500 hover:bg-neutral-100",
                          (isDestinyMode || myDestinyConfig || Object.values(childDestinies).some(d => d.status === 'active')) && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <Activity className="w-3 h-3" /> {showPathForUserId === child.uid ? 'Hide Path' : 'Show Path'}
                      </button>
                      <button 
                        onClick={() => {
                          setSelectedChildForDestiny(child.uid);
                          setDestinySetupStep('details');
                          setShowDestinySetup(true);
                        }}
                        className={cn(
                          "flex items-center justify-center gap-2 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition border",
                          destiny ? "bg-blue-50 border-blue-200 text-blue-600" : "bg-neutral-50 border-neutral-100 text-neutral-500 hover:bg-neutral-100"
                        )}
                      >
                        <Flag className="w-3 h-3" /> {destiny ? 'Destiny Active' : 'Set Destiny'}
                      </button>
                    </div>

                    {destiny && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-2xl border border-blue-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[8px] font-black text-blue-600 uppercase tracking-widest">Active Destiny</span>
                          <button 
                            onClick={async () => {
                              try {
                                await updateDoc(doc(db, 'destinyConfigs', destiny.id), { status: 'cancelled' });
                                toast.success('Destiny cancelled');
                                forceRecenter();
                              } catch (err) {
                                toast.error('Failed to cancel destiny');
                              }
                            }}
                            className="text-red-500 hover:text-red-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="text-[10px] font-bold text-neutral-600 leading-tight">
                          Heading to target location. Safety mode: {destiny.details.preference}.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Destiny Setup Modal */}
      <AnimatePresence>
        {showDestinySetup && (
          <motion.div 
            key="destiny-setup-overlay" 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              className="bg-white dark:bg-neutral-900 rounded-[3rem] overflow-hidden max-w-md w-full shadow-2xl border border-neutral-100 dark:border-neutral-800"
            >
              {/* Header with Live Activity */}
              <div className="p-8 bg-gradient-to-br from-blue-600 to-indigo-700 text-white relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
                    <Activity className="w-3 h-3 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest">{onlineCount + 20} Users Traveling</span>
                  </div>
                  <div className="flex items-center gap-2 bg-green-500/20 px-3 py-1 rounded-full backdrop-blur-sm">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-ping" />
                    <span className="text-[10px] font-black uppercase tracking-widest">32 Active Nearby</span>
                  </div>
                </div>
                <h3 className="text-3xl font-black tracking-tighter leading-tight">Journey Setup</h3>
                <p className="text-blue-100/80 text-[10px] font-bold uppercase tracking-widest mt-1">Configure your destination vibes</p>
                
                <button 
                  onClick={() => setShowDestinySetup(false)}
                  className="absolute top-8 right-8 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              <div className="p-8 space-y-8">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] block px-1">Phase</label>
                    <div className="flex bg-white/5 p-1.5 rounded-[1.8rem] border border-white/5">
                      {['day', 'night'].map(t => (
                        <button
                          key={t}
                          onClick={() => setDestinyDetails(prev => ({ ...prev, timeOfDay: t as any }))}
                          className={cn(
                            "flex-1 py-4 rounded-2xl text-[10px] font-black uppercase transition-all duration-300 italic tracking-tighter",
                            destinyDetails.timeOfDay === t ? "bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]" : "text-white/40 hover:text-white/60"
                          )}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] block px-1">Composition</label>
                    <div className="flex bg-white/5 p-1.5 rounded-[1.8rem] border border-white/5">
                      {['boy', 'girl'].map(g => (
                        <button
                          key={g}
                          onClick={() => setDestinyDetails(prev => ({ ...prev, gender: g as any }))}
                          className={cn(
                            "flex-1 py-4 rounded-2xl text-[10px] font-black uppercase transition-all duration-300 italic tracking-tighter",
                            destinyDetails.gender === g ? "bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]" : "text-white/40 hover:text-white/60"
                          )}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] block px-1">Route Sync</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'rush', label: 'Inertia', desc: 'Secure Path', icon: Users },
                      { id: 'quiet', label: 'Quantum', desc: 'Fast Path', icon: Zap }
                    ].map(p => (
                      <button
                        key={p.id}
                        onClick={() => setDestinyDetails(prev => ({ ...prev, preference: p.id as any }))}
                        className={cn(
                          "p-6 rounded-[2.5rem] border-2 transition-all text-left group overflow-hidden relative",
                          destinyDetails.preference === p.id 
                            ? "border-blue-600 bg-blue-600/10 shadow-[0_0_30px_rgba(37,99,235,0.15)]" 
                            : "border-white/5 bg-white/5 hover:border-white/10"
                        )}
                      >
                        {destinyDetails.preference === p.id && (
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent" />
                        )}
                        <p className={cn("font-black text-base tracking-tighter italic uppercase relative z-10", destinyDetails.preference === p.id ? "text-blue-400" : "text-white/70")}>{p.label}</p>
                        <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.15em] mt-1 relative z-10">{p.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-4">
                  <button 
                    onClick={() => {
                      setShowDestinySetup(false);
                      setDestinySetupStep('target');
                      toast.info('Grid Scanner Active: Select Destination Node.');
                    }}
                    className="w-full py-6 bg-blue-600 text-white rounded-[2.5rem] font-black uppercase tracking-[0.3em] text-[11px] hover:bg-blue-500 transition shadow-[0_20px_50px_rgba(37,99,235,0.4)] active:scale-95 border border-blue-400/30"
                  >
                    Deploy Target Node
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Destiny Confirmation Modal */}
      <AnimatePresence>
        {destinySetupStep === 'confirm' && destinyTarget && (
          <motion.div 
            key="destiny-confirm-overlay" 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-2xl"
          >
            <motion.div
              initial={{ scale: 0.9, y: 50, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 50, opacity: 0 }}
              className="bg-[#020617]/95 backdrop-blur-3xl rounded-[3.5rem] p-8 sm:p-12 max-w-md w-full shadow-[0_30px_100px_rgba(0,0,0,0.8)] border border-blue-500/30 text-center"
            >
              <div className="w-24 h-24 bg-blue-600 rounded-[2rem] flex items-center justify-center text-white mx-auto mb-8 shadow-2xl shadow-blue-500/20">
                <Flag className="w-10 h-10 fill-white" />
              </div>
              <h3 className="text-4xl font-black tracking-tighter text-white mb-3 italic uppercase leading-none">Arm System?</h3>
              <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em] mb-12">Confirm Final Destiny Protocol</p>
              
              <div className="flex flex-col gap-4">
                <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 flex flex-col gap-6 shadow-inner">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Neural Radius</span>
                    <span className="text-lg font-black text-blue-400 tracking-tighter italic">{geofenceRadius}m</span>
                  </div>
                  <input 
                    type="range" 
                    min="50" 
                    max="500" 
                    step="50"
                    value={geofenceRadius}
                    onChange={(e) => setGeofenceRadius(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <button 
                    onClick={() => setShowSpectateModal(true)}
                    className="flex items-center justify-center gap-3 py-5 bg-indigo-500/10 text-indigo-400 text-[10px] font-black rounded-[1.8rem] hover:bg-indigo-500/20 transition-all uppercase tracking-[0.2em] border border-indigo-500/30 shadow-sm"
                  >
                    <Eye className="w-4 h-4" /> Sync Nodes ({destinySpectators.size})
                  </button>
                </div>

                <button 
                  onClick={() => {
                    const saveDestiny = async () => {
                      try {
                        const childProfile = users.find(u => u.uid === selectedChildForDestiny);
                        if (!childProfile?.location) {
                          toast.error("Child location not found. Cannot set destiny.");
                          return;
                        }

                        const startLoc: [number, number] = [childProfile.location.lat, childProfile.location.lng];
                        const targetLoc: [number, number] = [destinyTarget[0], destinyTarget[1]];
                        
                        toast.loading('Calculating safe road path...', { id: 'routing' });
                        const roadPath = await fetchRoadPath(startLoc, targetLoc, destinyDetails);
                        toast.dismiss('routing');

                        await addDoc(collection(db, 'destinyConfigs'), {
                          childUid: selectedChildForDestiny,
                          parentUid: auth.currentUser?.uid,
                          target: { lat: destinyTarget[0], lng: destinyTarget[1] },
                          status: 'active',
                          details: destinyDetails,
                          radiusLimit: 500, // 500m default
                          geofenceRadius: geofenceRadius,
                          spectators: Array.from(destinySpectators),
                          roadPath: roadPath,
                          createdAt: new Date().toISOString()
                        });
                        toast.success('Destiny set! Path follows roads and alleys.');
                        setDestinySetupStep(null);
                        setDestinyTarget(null);
                        setDestinySpectators(new Set());
                        setIsDestinyMode(false);
                      } catch (err) {
                        toast.dismiss('routing');
                        toast.error('Failed to set destiny');
                      }
                    };
                    saveDestiny();
                  }}
                  className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black tracking-tight hover:bg-blue-700 transition shadow-xl shadow-blue-100"
                >
                  Yes, Start Tracking
                </button>
                <button 
                  onClick={() => setDestinySetupStep('target')}
                  className="w-full py-4 bg-neutral-100 text-neutral-900 rounded-2xl font-black tracking-tight hover:bg-neutral-200 transition"
                >
                  No, Reselect Location
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Child Destiny Overlay */}
      <AnimatePresence>
        {userProfile?.childMode?.enabled && myDestinyConfig && (
          <motion.div
            key="child-destiny-overlay"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[2000] w-[90%] max-w-sm"
          >
            <div className="bg-white/95 backdrop-blur-2xl rounded-[2.5rem] p-6 shadow-2xl border border-blue-100 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                    <Navigation className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black tracking-tighter text-neutral-900 uppercase">Heading to Destiny</h3>
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Safety Mode Active</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setShowSpectateModal(true)}
                    className="px-4 h-10 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center gap-2 shadow-sm hover:bg-purple-100 transition"
                    title="Add Spectators"
                  >
                    <Eye className="w-5 h-5" />
                    <span className="text-[10px] font-black">{destinySpectators.size}</span>
                  </button>
                  <button 
                    onClick={async () => {
                      try {
                        // Send SOS to parents
                        let batteryLevel = 'N/A';
                        if ('getBattery' in navigator) {
                          const battery: any = await (navigator as any).getBattery();
                          batteryLevel = `${Math.round(battery.level * 100)}%`;
                        }
                        
                        let signalType = 'N/A';
                        if ('connection' in navigator) {
                          signalType = (navigator as any).connection.effectiveType;
                        }

                        await addDoc(collection(db, 'notifications'), {
                          uid: myDestinyConfig.parentUid,
                          fromUid: auth.currentUser!.uid,
                          fromUsername: userProfile.username,
                          type: 'child_sos',
                          text: `SOS: ${userProfile.username} needs help!`,
                          read: false,
                          data: {
                            lat: userProfile.location!.lat,
                            lng: userProfile.location!.lng,
                            battery: batteryLevel,
                            signal: signalType,
                            time: new Date().toISOString()
                          },
                          timestamp: serverTimestamp()
                        });
                        toast.error('SOS Signal Sent to Parent!');
                      } catch (err) {
                        toast.error('Failed to send SOS');
                      }
                    }}
                    className="w-10 h-10 bg-red-600 text-white rounded-2xl flex items-center justify-center shadow-lg animate-pulse"
                    title="Send SOS"
                  >
                    <Zap className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-3xl border border-blue-100">
                <div className="flex-1">
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Target Distance</p>
                  <p className="text-xl font-black text-neutral-900 tracking-tighter">
                    {calculateDistance(userProfile.location!.lat, userProfile.location!.lng, myDestinyConfig.target.lat, myDestinyConfig.target.lng)}
                  </p>
                </div>
                <div className="w-px h-10 bg-blue-200" />
                <div className="flex-1 text-right">
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Status</p>
                  <p className="text-sm font-black text-neutral-900 tracking-tighter uppercase">On Track</p>
                </div>
              </div>

              <button 
                onClick={() => {
                  if (myDestinyConfig.target && isValidLatLng(myDestinyConfig.target.lat, myDestinyConfig.target.lng)) {
                    safeFlyTo(myDestinyConfig.target.lat, myDestinyConfig.target.lng, 18);
                  }
                }}
                className="w-full py-3 bg-neutral-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-neutral-800 transition"
              >
                View Destination
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Vibe Filter Button REMOVED from map as per user request (moved to menu) */}



      {/* Map Loading Indicator */}
      <AnimatePresence>
        {mapIsLoading && (
          <motion.div 
            key="map-loading-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[2000] bg-neutral-100 flex flex-col items-center justify-center"
          >
            <div className="relative">
              <div className="w-16 h-16 border-4 border-blue-600/20 rounded-full"></div>
              <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="mt-4 text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] animate-pulse">Loading map...</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Side Menu (Sidebar) */}
      <AnimatePresence>
        {showSideMenu && (
          <motion.div
            key="side-menu-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowSideMenu(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[8000]"
          />
        )}
        {showSideMenu && (
          <motion.div
            key="side-menu-content"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 left-0 bottom-0 w-full xs:w-80 bg-[#020617]/95 backdrop-blur-3xl z-[8001] shadow-[30px_0_100px_rgba(0,0,0,0.8)] border-r border-blue-500/30 flex flex-col"
          >
              <div className="flex-1 overflow-y-auto px-6 xs:px-8 pb-32 custom-scrollbar">
                <div className="pt-10 pb-6 mb-6 flex items-center justify-between sticky top-0 bg-[#020617]/95 backdrop-blur-md z-20 -mx-6 xs:-mx-8 px-6 xs:px-8 border-b border-white/5">
                  <div>
                    <h3 className="text-2xl xs:text-3xl font-black tracking-tighter text-white uppercase italic">Command</h3>
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] leading-none mt-1.5 opacity-70">Neural Interface</p>
                  </div>
                  <button 
                    onClick={() => setShowSideMenu(false)}
                    className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center text-white/50 hover:text-white transition-all transform hover:rotate-90 border border-white/5 shadow-lg active:scale-90"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* User Progress Mini Card */}
                {userProfile && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mb-8 bg-neutral-950 rounded-[2.2rem] p-5 shadow-2xl shadow-blue-500/10 border border-neutral-800/50 group"
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div className="relative">
                        <UserAvatar src={userProfile.photoURL} username={userProfile.username} size="md" className="border-2 border-cyan-500/50" />
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-cyan-500 rounded-full flex items-center justify-center text-[10px] font-black text-black">
                          {Math.floor((userProfile.xp || 0) / 100) + 1}
                        </div>
                      </div>
                      <div>
                        <p className="text-white font-black tracking-tight group-hover:text-cyan-400 transition-colors">{userProfile.username}</p>
                        <p className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.1em]">Elite Explorer</p>
                      </div>
                    </div>
                    <div className="space-y-2.5">
                       <div className="flex justify-between items-end">
                         <span className="text-[9px] font-black text-cyan-500 uppercase tracking-[0.1em] flex items-center gap-1.5">
                           <Zap className="w-3 h-3 fill-cyan-500" /> MISSION XP
                         </span>
                         <span className="text-[10px] font-black text-white/80 tabular-nums">{(userProfile.xp || 0)} / {(Math.floor((userProfile.xp || 0) / 100) + 1) * 100}</span>
                       </div>
                       <div className="w-full h-2 bg-neutral-900 rounded-full overflow-hidden p-0.5 border border-white/5">
                         <motion.div 
                           initial={{ width: 0 }}
                           animate={{ width: `${((userProfile.xp || 0) % 100)}%` }}
                           className="h-full bg-gradient-to-r from-cyan-600 to-blue-400 rounded-full shadow-[0_0_15px_rgba(6,182,212,0.5)]"
                         />
                       </div>
                    </div>
                    {userProfile.badges && userProfile.badges.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-5">
                        {userProfile.badges.map(b => (
                          <span key={b} className="px-3 py-1 bg-white/5 text-white text-[8px] font-black rounded-lg border border-white/10 uppercase tracking-widest shadow-sm hover:border-cyan-400/50 transition-colors">
                            {b === 'Diamond' ? '💎 ' : b === 'Gold' ? '⭐ ' : ''}{b}
                          </span>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                <div className="flex flex-col gap-4">
                  {/* Section 1: Discover */}
                  <button 
                    onClick={() => {
                      setShowDiscoverMobile(true);
                      setShowSideMenu(false);
                    }}
                    className="flex items-center gap-5 p-5 rounded-[2rem] bg-white/5 border border-white/10 hover:border-blue-500/30 hover:bg-white/10 transition-all text-left group"
                  >
                    <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.3)] group-hover:scale-110 transition shrink-0 border border-blue-400/30">
                      <Navigation className="w-7 h-7 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-white italic truncate uppercase">Mates Radar</p>
                      <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest opacity-60">Triangulate Signals</p>
                    </div>
                  </button>

                  <button 
                    onClick={async () => {
                      if (navDestinyState === 'active') {
                        setNavDestinyState('off');
                        setNavDestinyRoute([]);
                        setNavDestinyTarget(null);
                        setIsDestinyMode(false);
                        if (auth.currentUser) await deleteDoc(doc(db, 'destinies', auth.currentUser.uid));
                        toast.info("Navigation ended.");
                        setShowSideMenu(false);
                      } else {
                        setNavDestinyState('selecting');
                        setShowSideMenu(false);
                        toast.info("Tap map to select destination");
                      }
                    }}
                    className={cn(
                      "flex items-center gap-5 p-5 rounded-[2rem] transition-all text-left group border",
                      navDestinyState === 'active' ? "bg-indigo-600 border-indigo-400 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)]" : "bg-white/5 border-white/10 hover:border-indigo-500/30 hover:bg-white/10"
                    )}
                  >
                    <div className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center transition shrink-0 border",
                      navDestinyState === 'active' ? "bg-white/20 border-white/30" : "bg-indigo-600 border-indigo-400 text-white"
                    )}>
                      {navDestinyState === 'active' ? <X className="w-7 h-7" /> : <Flag className="w-7 h-7" />}
                    </div>
                    <div className="min-w-0">
                      <p className={cn("font-black italic uppercase", navDestinyState === 'active' ? "text-white" : "text-white")}>
                        {navDestinyState === 'active' ? "Abort Destiny" : "Add Destiny"}
                      </p>
                      <p className={cn("text-[10px] font-black uppercase tracking-widest", navDestinyState === 'active' ? "text-white/70" : "text-indigo-400 opacity-60")}>
                        {navDestinyState === 'active' ? "De-link Route" : "Coordinate Lock"}
                      </p>
                    </div>
                  </button>

                  <button 
                    onClick={toggleMissionMode}
                    className={cn(
                      "flex items-center gap-5 p-5 rounded-[2rem] transition-all text-left group border",
                      isMissionMode ? "bg-cyan-600 border-cyan-400 text-white shadow-[0_0_20px_rgba(6,182,212,0.5)]" : "bg-white/5 border-white/10 hover:border-cyan-500/30 hover:bg-white/10"
                    )}
                  >
                    <div className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center transition shrink-0 border",
                      isMissionMode ? "bg-white/20 border-white/30" : "bg-cyan-600 border-cyan-400 text-white"
                    )}>
                      {isMissionMode ? <X className="w-7 h-7" /> : <Zap className="w-7 h-7" />}
                    </div>
                    <div className="min-w-0">
                      <p className={cn("font-black italic uppercase", isMissionMode ? "text-white" : "text-white")}>
                        {isMissionMode ? "Mission Active" : "Start Mission"}
                      </p>
                      <p className={cn("text-[10px] font-black uppercase tracking-widest", isMissionMode ? "text-white/70" : "text-cyan-400 opacity-60")}>
                        {isMissionMode ? "Override Protocol" : "Harvest XP Bio-Data"}
                      </p>
                    </div>
                  </button>

                  {/* Section 2: Add Moment */}
                  <button 
                    onClick={() => {
                      onAddMoment?.();
                      setShowSideMenu(false);
                    }}
                    className="flex items-center gap-5 p-5 rounded-[2rem] bg-pink-600/10 border border-pink-500/20 hover:border-pink-500/50 hover:bg-pink-600/20 transition-all text-left group"
                  >
                    <div className="w-14 h-14 bg-pink-600 rounded-2xl flex items-center justify-center shadow-[0_0_15px_rgba(236,72,153,0.3)] group-hover:scale-110 transition text-white shrink-0 border border-pink-400/30">
                      <Camera className="w-7 h-7" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-white italic uppercase">Signal Burst</p>
                      <p className="text-[10px] font-black text-pink-400 uppercase tracking-widest opacity-60">Capture Bio-Moment</p>
                    </div>
                  </button>

                  {/* Section 3: Vibe Filter */}
                  <button 
                    onClick={async () => {
                      if (!userProfile?.mood) {
                        toast.error('Please set your vibe in settings first!');
                        return;
                      }
                      
                      // Only check limit when activating, not deactivating
                      if (!vibeFilter) {
                        const canUse = await checkFeatureLimit('vibe_filter', 10, 'Vibe Filter');
                        if (!canUse) return;
                      }

                      setVibeFilter(vibeFilter === userProfile.mood.text ? null : userProfile.mood.text);
                      setShowSideMenu(false);
                    }}
                    className={cn(
                      "flex items-center gap-5 p-5 rounded-[2rem] transition-all text-left group border",
                      vibeFilter ? "bg-cyan-600 border-cyan-400 text-white shadow-lg" : "bg-white/5 border-white/10 hover:border-blue-500/30"
                    )}
                  >
                    <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition shrink-0 border", vibeFilter ? "bg-white/20 border-white/30" : "bg-white/5 border-white/10")}>
                      {vibeFilter && userProfile?.mood ? (
                        <span className="text-3xl">{userProfile.mood.emoji}</span>
                      ) : (
                        <Zap className={cn("w-7 h-7", vibeFilter ? "text-white" : "text-cyan-400")} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className={cn("font-black italic uppercase", vibeFilter ? "text-white" : "text-white")}>Neural Filter</p>
                      <p className={cn("text-[10px] font-black uppercase tracking-widest", vibeFilter ? "text-white/70" : "text-blue-400 opacity-60")}>
                        {vibeFilter ? `Sync: ${vibeFilter}` : 'Frequency Sweep'}
                      </p>
                    </div>
                  </button>

                  {/* Section 4: Nearby Help */}
                  <div className="relative group">
                    <button 
                      onClick={() => {
                        onHelpClick?.();
                        setShowSideMenu(false);
                      }}
                      className="w-full flex items-center gap-5 p-5 rounded-[2rem] bg-red-600/10 border border-red-500/20 hover:border-red-500/50 hover:bg-red-600/20 transition-all text-left group"
                    >
                      <div className="w-14 h-14 bg-red-600 rounded-2xl flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.3)] group-hover:scale-110 transition shrink-0 border border-red-400/30">
                        <Radio className="w-7 h-7 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-white italic uppercase">Distress Signal</p>
                        <p className="text-[10px] font-black text-red-400 uppercase tracking-widest opacity-60">Emergency Protocol</p>
                      </div>
                    </button>
                  </div>

                  {/* Section 5: Filter (Satellite वाला) */}
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <button 
                      onClick={() => {
                        const types: ('satellite' | 'hybrid' | 'roadmap' | 'terrain' | 'default')[] = ['satellite', 'hybrid', 'roadmap', 'terrain', 'default'];
                        const next = types[(types.indexOf(mapType) + 1) % types.length];
                        setMapType(next);
                        setShowSideMenu(false);
                        toast.info(`Map Type: ${next}`, { icon: '🗺️' });
                      }}
                      className="flex flex-col items-center gap-3 p-5 rounded-[2rem] bg-white/5 hover:bg-white/10 transition-all group border border-white/10 hover:border-blue-500/30"
                    >
                      <Layers className="w-6 h-6 text-white/50 group-hover:text-blue-400 transition-all" />
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 italic group-hover:text-white/60">
                        Grid Style
                      </span>
                    </button>
                    <button 
                      onClick={() => {
                        setShowFilterModal(!showFilterModal);
                        setShowSideMenu(false);
                      }}
                      className={cn(
                        "flex flex-col items-center gap-3 p-5 rounded-[2rem] transition-all relative group border",
                        filterMode !== 'all' ? "bg-blue-600 border-blue-400 text-white shadow-lg" : "bg-white/5 border-white/10 hover:border-blue-500/30 hover:bg-white/10"
                      )}
                    >
                      <Users className={cn("w-6 h-6", filterMode !== 'all' ? "text-white" : "text-white/30 group-hover:text-blue-400")} />
                      <span className={cn("text-[9px] font-black uppercase tracking-[0.2em] italic", filterMode !== 'all' ? "text-white/90" : "text-white/30 group-hover:text-white/60")}>Nodes</span>
                    </button>
                  </div>

                  {/* Shop & Extras */}
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <button 
                      onClick={() => {
                        setIsShopMode(!isShopMode);
                        setShowSideMenu(false);
                      }}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-3xl transition-all",
                        isShopMode ? "bg-blue-600 text-white" : "bg-neutral-50 hover:bg-neutral-100"
                      )}
                    >
                      <Store className={cn("w-5 h-5", isShopMode ? "text-white" : "text-neutral-600")} />
                      <span className={cn("text-[8px] font-black uppercase tracking-widest", isShopMode ? "text-white/90" : "text-neutral-400")}>Shop</span>
                    </button>
                    <button 
                      onClick={() => {
                        forceRecenter();
                        setShowSideMenu(false);
                      }}
                      className="flex flex-col items-center gap-2 p-4 rounded-3xl bg-neutral-50 hover:bg-neutral-100 transition-all"
                    >
                      <Compass className="w-5 h-5 text-neutral-600" />
                      <span className="text-[8px] font-black uppercase tracking-widest text-neutral-400">Recenter</span>
                    </button>
                  </div>

                  {/* Section 6: Settings */}
                  <button 
                    onClick={() => {
                      toast.info('Opening Settings...');
                      setShowSideMenu(false);
                    }}
                    className="flex items-center gap-4 p-4 rounded-3xl bg-neutral-50 hover:bg-neutral-100 transition-all text-left group mt-4 mb-20"
                  >
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition text-neutral-600">
                      <SettingsIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-black text-neutral-900">Settings</p>
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">App Preferences</p>
                    </div>
                  </button>
                </div>
              </div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* Top-Left Controls Stack */}
      {!hideControls && (
        <div className={cn(
          "absolute top-6 left-6 z-[1001] flex flex-col gap-3 transition-opacity duration-300",
          showSearchBar && "opacity-0 pointer-events-none sm:opacity-100 sm:pointer-events-auto"
        )}>
          {/* Search Toggle Button */}
          {!isMissionMode && (
          <button 
            onClick={() => setShowSearchBar(!showSearchBar)}
            className={cn(
              "w-12 h-12 rounded-2xl shadow-[0_0_20px_rgba(59,130,246,0.3)] flex items-center justify-center transition-all duration-500 hover:scale-110 active:scale-95 border",
              showSearchBar 
                ? "bg-blue-600 border-blue-400 text-white shadow-[0_0_30px_rgba(37,99,235,0.6)]" 
                : "bg-[#020617]/80 backdrop-blur-3xl border-blue-500/30 text-blue-400 hover:border-blue-400/60"
            )}
          >
            <Search className="w-5 h-5 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
          </button>
          )}

          {/* Nearby moments icon - shows when moment map layer is ON */}
          {showMomentMapLayer && !hideControls && !isMissionMode && (
            <motion.button 
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowNearbyMoments(true)}
              className="w-12 h-12 bg-[#020617]/80 backdrop-blur-3xl rounded-2xl shadow-[0_10px_30px_rgba(244,63,94,0.3)] flex items-center justify-center text-rose-500 border border-rose-500/30 hover:bg-rose-500/10 transition-all group"
            >
              <Compass className="w-5 h-5 group-hover:rotate-45 transition-transform duration-500 animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.5)]" />
            </motion.button>
          )}

          {/* Menu Button */}
          {!isMissionMode && (
          <button 
            onClick={() => setShowSideMenu(true)}
            className="w-12 h-12 bg-blue-600/10 backdrop-blur-xl rounded-2xl shadow-[0_0_25px_rgba(59,130,246,0.2)] flex items-center justify-center text-blue-400 border border-blue-500/40 hover:scale-110 hover:bg-blue-600/20 hover:border-blue-400 transition-all duration-500 active:scale-95 group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-blue-400/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <Menu className="w-5 h-5 group-hover:rotate-180 transition-transform duration-700 relative z-10" />
            <div className="absolute -inset-0.5 bg-blue-500/20 blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
          )}

          {/* Child Icon (Parent Mode) - Moved to stack as per user request */}
          {userProfile?.parentMode?.enabled && !isMissionMode && (
            <button
              onClick={() => setShowParentPanel(!showParentPanel)}
              className={cn(
                "w-12 h-12 rounded-2xl shadow-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 map-control-glass",
                showParentPanel ? "bg-blue-600 text-white" : "text-blue-600"
              )}
            >
              <Baby className="w-5 h-5" />
            </button>
          )}
        </div>
      )}

      {/* Top-Right Advanced Map Menu Trigger (Hidden on mobile when search is open) */}
      {!hideControls && !isMissionMode && (
        <div className={cn(
          "absolute top-6 right-6 z-[1001] flex flex-col items-end gap-3 transition-opacity duration-300",
          showSearchBar && "opacity-0 pointer-events-none sm:opacity-100 sm:pointer-events-auto"
        )}>
          <button 
            onClick={() => setIsAdvancedMenuOpen(!isAdvancedMenuOpen)}
            className={cn(
              "w-12 h-12 bg-[#020617]/80 backdrop-blur-3xl rounded-2xl shadow-[0_0_20px_rgba(59,130,246,0.2)] border border-blue-500/30 flex items-center justify-center transition-all hover:scale-110 active:scale-95 duration-500 hover:border-blue-400/60 group",
              isAdvancedMenuOpen ? "bg-blue-600 border-blue-400 text-white shadow-[0_0_30px_rgba(37,99,235,0.6)]" : "text-blue-400"
            )}
          >
            <MoreVertical className="w-5 h-5 group-hover:rotate-180 transition-transform duration-700" />
          </button>
        </div>
      )}

      {/* Mission Exit Button (Top Right as requested) */}
      {isMissionMode && (
        <div className="absolute top-6 right-6 z-[1200]">
          <motion.button
            initial={{ scale: 0, x: 20 }}
            animate={{ scale: 1, x: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleMissionMode}
            className="w-14 h-14 bg-red-500 text-white rounded-2xl shadow-[0_0_30px_rgba(239,68,68,0.6)] flex items-center justify-center border-2 border-white/30 hover:bg-red-600 transition-all group"
          >
            <X className="w-7 h-7 group-hover:rotate-90 transition-transform duration-300" />
            <div className="absolute -bottom-6 right-0 text-[8px] font-black uppercase text-red-500 tracking-tighter bg-white shadow-sm px-2 py-0.5 rounded-full">
              Exit Mission
            </div>
          </motion.button>
        </div>
      )}
      <AnimatePresence>
        {showSearchBar && (
          <motion.div 
            key="search-bar-overlay"
            initial={{ opacity: 0, y: -20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -20, x: "-50%" }}
            className="absolute top-6 left-1/2 z-[1000] w-[90%] max-w-md sm:w-full sm:px-6"
          >
            <div className="relative group">
              <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-[2.5rem] group-hover:bg-blue-400/30 transition-all duration-700 animate-pulse"></div>
              <div className="relative bg-[#020617]/90 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-blue-500/30 p-2 flex items-center gap-3 transition-all duration-500 hover:border-blue-400/50">
                <div className="w-11 h-11 rounded-2xl bg-white/5 flex items-center justify-center text-blue-400 sm:flex hidden border border-white/5">
                  <Search className="w-5 h-5 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                </div>
                <input
                  type="text"
                  placeholder="Scan for Nodes, Zones, Vibes..."
                  value={searchQuery}
                  autoFocus
                  onChange={(e) => {
                    const val = e.target.value;
                    setSearchQuery(val);
                    if (val.length > 0) {
                      const filtered = users.filter(u => u.username && u.username.toLowerCase().includes(val.toLowerCase()));
                      setUserSearchResults(filtered.slice(0, 5));
                      setShowUserSuggestions(true);
                    } else {
                      setUserSearchResults([]);
                      setShowUserSuggestions(false);
                    }
                  }}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch(e)}
                  className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-black text-white italic uppercase tracking-widest placeholder:text-white/20 outline-none pl-4 sm:pl-0"
                />
                <button 
                  onClick={() => setShowSearchBar(false)}
                  className="w-10 h-10 rounded-[1.25rem] bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all transform hover:rotate-90 border border-white/5"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* User Suggestions */}
              <AnimatePresence>
                {showUserSuggestions && userSearchResults.length > 0 && (
                  <motion.div
                    key="user-suggestions-dropdown"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full mt-3 w-full bg-[#020617]/95 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_30px_80px_rgba(0,0,0,0.8)] border border-blue-500/20 overflow-hidden"
                  >
                    <div className="p-5 border-b border-white/5 flex items-center justify-between">
                      <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] opacity-70 italic shadow-[0_0_10px_rgba(59,130,246,0.3)]">Signature Search Results</h4>
                      <button 
                        onClick={() => {
                          const next = new Set(selectedUserIds);
                          userSearchResults.forEach(u => next.add(u.uid));
                          setSelectedUserIds(next);
                          setFilterMode('custom');
                          setShowUserSuggestions(false);
                          toast.success(`Encrypted ${userSearchResults.length} nodes`);
                        }}
                        className="text-[9px] font-black text-white/40 uppercase tracking-widest hover:text-blue-400 transition-colors"
                      >
                        Capture All
                      </button>
                    </div>
                    <div className="max-h-80 overflow-y-auto custom-scrollbar">
                      {userSearchResults.map((user) => (
                        <div
                          key={user.uid}
                          onClick={() => {
                            if (user.location) {
                              zoomToUser(user.location.lat, user.location.lng, user.uid);
                            } else {
                              onProfileClick(user.uid);
                            }
                            setShowUserSuggestions(false);
                            setShowSearchBar(false);
                          }}
                          className="flex items-center justify-between p-4 hover:bg-white/5 cursor-pointer transition group"
                        >
                          <div className="flex items-center gap-4">
                            <div className="relative">
                              <UserAvatar 
                                src={user.photoURL} 
                                username={user.username} 
                                size="xs" 
                              />
                              <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-green-500 rounded-full border border-[#020617] animate-pulse shadow-[0_0_5px_rgba(34,197,94,0.8)]" />
                            </div>
                            <div>
                              <p className="font-black text-sm text-white italic tracking-tight uppercase group-hover:text-blue-400 transition-colors">{user.username}</p>
                              <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-0.5">{user.profession || 'Ghost Node'}</p>
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const next = new Set(selectedUserIds);
                              if (next.has(user.uid)) next.delete(user.uid);
                              else next.add(user.uid);
                              setSelectedUserIds(next);
                              setFilterMode('custom');
                              toast.success(next.has(user.uid) ? `Link: ${user.username}` : `Severed: ${user.username}`);
                            }}
                            className={cn(
                              "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                              selectedUserIds.has(user.uid) 
                                ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]" 
                                : "bg-white/5 text-white/30 hover:bg-white/10 hover:text-white"
                            )}
                          >
                            {selectedUserIds.has(user.uid) ? 'Linked' : 'Coordinate'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Destiny Button removed from map as per user request (moved to menu) */}


      {/* Destiny Success Overlay */}
      <AnimatePresence>
        {showDestinySuccess && (
          <motion.div
            key="destiny-success-overlay"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6"
          >
            <div className="bg-[#020617]/90 backdrop-blur-3xl rounded-[4rem] p-10 max-w-sm w-full text-center shadow-[0_50px_100px_rgba(0,0,0,0.8)] border border-blue-500/30 relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent opacity-50" />
              <div className="w-28 h-28 bg-yellow-500/10 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 border border-yellow-500/30 shadow-[0_0_30px_rgba(234,179,8,0.2)]">
                <Trophy className="w-14 h-14 text-yellow-500 animate-bounce" />
              </div>
              <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic mb-3">Protocol Success</h2>
              <p className="text-white/40 font-black uppercase tracking-widest text-[10px] mb-8">
                Target coordinates synchronized
              </p>
              <div className="bg-white/5 rounded-[2rem] p-6 mb-8 border border-white/10 shadow-inner">
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-2 opacity-70">Grid Distance Captured</p>
                <div className="flex items-baseline justify-center gap-2">
                  <p className="text-4xl font-black text-white italic">{destinyDistance.toFixed(2)}</p>
                  <p className="text-xs font-black text-white/30 uppercase tracking-widest">KM</p>
                </div>
              </div>
              <button
                onClick={() => setShowDestinySuccess(false)}
                className="w-full py-6 bg-white text-[#020617] rounded-[2rem] font-black uppercase tracking-[0.3em] text-[11px] shadow-2xl hover:scale-[1.05] active:scale-[0.95] transition-all"
              >
                Initialize Next
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Destiny Failure Overlay */}
      <AnimatePresence>
        {showDestinyFailure && (
          <motion.div
            key="destiny-failure-overlay"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6"
          >
            <div className="bg-[#020617]/90 backdrop-blur-3xl rounded-[4rem] p-10 max-w-sm w-full text-center shadow-[0_50px_100px_rgba(0,0,0,0.8)] border border-red-500/30 relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-50" />
              <div className="w-28 h-28 bg-red-500/10 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 border border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                <AlertTriangleIcon className="w-14 h-14 text-red-500 animate-pulse" />
              </div>
              <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic mb-3">Link Severed</h2>
              <p className="text-white/40 font-black uppercase tracking-widest text-[10px] mb-8 leading-relaxed">
                Coordinate mismatch detected.<br/>Re-initialize interface.
              </p>
              <button
                onClick={() => setShowDestinyFailure(false)}
                className="w-full py-6 bg-red-600 text-white rounded-[2rem] font-black uppercase tracking-[0.3em] text-[11px] shadow-[0_10px_30px_rgba(239,68,68,0.4)] hover:bg-red-500 hover:scale-[1.05] active:scale-[0.95] transition-all"
              >
                Manual Reset
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Destiny Confirmation Modal */}
      <AnimatePresence>
        {showDestinyConfirm && (
          <motion.div
            key="destiny-confirm-modal"
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-24 left-4 right-4 z-[9000] bg-[#020617]/90 backdrop-blur-3xl rounded-[3rem] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.6)] border border-white/10 max-w-md mx-auto overflow-hidden"
          >
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-30" />
            
            <div className="flex items-center gap-5 mb-8">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(37,99,235,0.3)]">
                <Flag className="w-8 h-8 text-white relative z-10" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white tracking-tighter uppercase italic leading-none">Confirm Destiny?</h3>
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mt-2 opacity-70">Initialize target coordinates</p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowDestinyConfirm(false);
                  setDestinyTarget(null);
                }}
                className="flex-1 py-5 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all border border-white/5"
              >
                Abort
              </button>
              <button
                onClick={() => setShowDestinyPrivacy(true)}
                className="flex-1 py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-[0_10px_30px_rgba(37,99,235,0.4)] hover:bg-blue-500 transition-all flex items-center justify-center gap-2"
              >
                Proceed <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Destiny Privacy Modal */}
      <AnimatePresence>
        {showDestinyPrivacy && (
          <motion.div
            key="destiny-privacy-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-2xl p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-[#020617]/90 backdrop-blur-3xl rounded-[4rem] p-10 max-w-md w-full shadow-[0_50px_100px_rgba(0,0,0,0.8)] border border-white/20 relative overflow-hidden"
            >
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50" />
              
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <ShieldCheck className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white tracking-tighter uppercase italic">Encryption</h3>
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.25em] mt-1.5 opacity-70">Privacy Protocol Delta</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowDestinyPrivacy(false)}
                  className="w-12 h-12 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-center text-white/40 hover:text-white transition-all transform hover:rotate-90"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto custom-scrollbar pr-1 pb-4">
                <div className="space-y-4 mb-8">
                  {[
                    { id: 'all', label: 'Public Network', icon: Globe, desc: 'Visible to all active nodes' },
                    { id: 'mates', label: 'Authorized Mates', icon: Users, desc: 'Only trusted contacts can spectate' },
                    { id: 'custom', label: 'Secure Tunnel', icon: UserPlus, desc: 'Manually select spectating nodes' }
                  ].map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setDestinyPrivacy(option.id as any)}
                      className={cn(
                        "w-full p-6 rounded-[2.5rem] border transition-all flex items-center gap-5 text-left relative overflow-hidden group",
                        destinyPrivacy === option.id 
                          ? "border-indigo-500 bg-indigo-600 shadow-[0_15px_30px_rgba(79,70,229,0.3)]" 
                          : "border-white/10 bg-white/5 hover:bg-white/10"
                      )}
                    >
                      <div className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 relative z-10 transition-transform group-hover:scale-110",
                        destinyPrivacy === option.id ? "bg-white/20 text-white" : "bg-white/5 text-white/30"
                      )}>
                        <option.icon className="w-7 h-7" />
                      </div>
                      <div className="flex-1 min-w-0 relative z-10">
                        <p className={cn("font-black text-white tracking-tight uppercase italic", destinyPrivacy === option.id ? "opacity-100" : "opacity-80")}>{option.label}</p>
                        <p className={cn("text-[10px] font-bold uppercase tracking-widest mt-1", destinyPrivacy === option.id ? "text-indigo-200" : "text-white/30")}>{option.desc}</p>
                      </div>
                      {destinyPrivacy === option.id && <CheckCircle2 className="w-6 h-6 text-white relative z-10" />}
                    </button>
                  ))}
                </div>

                {destinyPrivacy === 'custom' && (
                  <div className="mb-10 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="relative mb-5 group">
                      <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 group-focus-within:text-indigo-400 transition-colors" />
                      <input
                        type="text"
                        placeholder="Scan for available nodes..."
                        className="w-full pl-14 pr-6 py-5 bg-white/5 border border-white/10 rounded-[2rem] text-sm font-bold text-white outline-none focus:ring-2 focus:ring-indigo-500/50 focus:bg-white/10 transition-all placeholder:text-white/20"
                      />
                    </div>
                    <div className="max-h-64 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                      {users.filter(u => friends.includes(u.uid)).map(user => (
                        <button
                          key={user.uid}
                          onClick={() => {
                            const next = new Set(destinyCustomUsers);
                            if (next.has(user.uid)) next.delete(user.uid);
                            else next.add(user.uid);
                            setDestinyCustomUsers(next);
                          }}
                          className={cn(
                             "w-full flex items-center justify-between p-4 rounded-2xl border transition-all",
                            destinyCustomUsers.has(user.uid)
                              ? "bg-indigo-600/20 border-indigo-500/50"
                              : "bg-white/5 border-white/5 hover:bg-white/10"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <UserAvatar src={user.photoURL} username={user.username} size="xs" />
                            <span className="text-xs font-black text-white uppercase tracking-widest">{user.username}</span>
                          </div>
                          <div className={cn(
                            "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
                            destinyCustomUsers.has(user.uid) ? "bg-indigo-500 border-indigo-400" : "border-white/10"
                          )}>
                            {destinyCustomUsers.has(user.uid) && <Check className="w-3 h-3 text-white" />}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4">
                <button
                  onClick={() => {
                    setShowDestinyPrivacy(false);
                    startDestiny();
                  }}
                  className="group relative w-full py-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[2.5rem] font-black uppercase tracking-[0.4em] text-xs shadow-[0_20px_50px_rgba(79,70,229,0.4)] transition-all overflow-hidden active:scale-95 flex items-center justify-center gap-4"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-400/0 via-white/20 to-indigo-400/0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                  <Zap className="w-5 h-5 fill-white text-white" />
                  Finalize Protocol
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Discover Overlay */}
      <AnimatePresence>
        {showDiscoverMobile && (
          <motion.div 
            key="discover-mobile-overlay"
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-x-0 bottom-0 z-[6000] bg-[#020617]/95 backdrop-blur-3xl rounded-t-[3.5rem] shadow-[0_-20px_60px_rgba(0,0,0,0.8)] border-t border-blue-500/30 flex flex-col h-[85vh] lg:hidden pb-safe"
          >
            <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto my-4 shrink-0 shadow-[0_0_10px_rgba(255,255,255,0.1)]" />
            <div className="px-8 pb-6 flex items-center justify-between sticky top-0 bg-[#020617]/90 backdrop-blur-3xl z-10 py-4 border-b border-white/5">
              <div>
                <h3 className="text-3xl font-black tracking-tighter text-white italic uppercase">Nodes Scan</h3>
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mt-1 opacity-70">Grid Proximity Survey</p>
              </div>
              <button 
                onClick={() => setShowDiscoverMobile(false)}
                className="w-12 h-12 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-center text-white/40 hover:text-white transition-all transform hover:rotate-90 border border-white/5 shadow-inner"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 custom-scrollbar">
              {users.filter(u => u.isOnline).length > 0 ? users.filter(u => u.isOnline).slice(0, 20).map((user) => (
                <div 
                  key={user.uid} 
                  className="bg-white/5 rounded-[2.5rem] border border-white/10 p-5 flex items-center gap-5 shadow-inner hover:bg-white/10 hover:border-blue-500/30 transition-all active:scale-[0.98] group"
                >
                  <div className="relative">
                    <UserAvatar src={user.photoURL} username={user.username} size="md" className="border-2 border-blue-500/30" />
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[#020617] shadow-[0_0_5px_rgba(34,197,94,0.8)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-base font-black text-white italic uppercase tracking-tight group-hover:text-blue-400 transition-colors">{user.username}</h4>
                    <div className="flex items-center gap-1.5">
                      <Zap className="w-3 h-3 text-blue-400" />
                      <p className="text-[10px] font-black text-white/30 uppercase tracking-widest leading-none">{user.profession || 'Grid Node'}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => onProfileClick(user.uid)}
                      className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                    >
                      <UserIcon className="w-4 h-4" />
                    </button>
                    {user.location && (
                      <button 
                        onClick={() => {
                          zoomToUser(user.location!.lat, user.location!.lng, user.uid);
                          setShowDiscoverMobile(false);
                        }}
                        className="w-10 h-10 bg-white/10 text-white rounded-xl flex items-center justify-center border border-white/10"
                      >
                        <Compass className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )) : (
                <div className="py-32 text-center opacity-30">
                  <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-white/5 animate-pulse">
                    <Radio className="w-10 h-10 text-blue-400" />
                  </div>
                  <p className="text-xs font-black uppercase tracking-[0.4em]">No Active Nodes Pulse</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Refine Location Overlay - REMOVED AS PER USER REQUEST */}

      <AnimatePresence>
        {showMatesMobile && (
          <motion.div 
            key="mates-mobile-overlay"
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 z-[6000] bg-[#020617]/95 backdrop-blur-3xl rounded-t-[3.5rem] shadow-[0_-20px_60px_rgba(0,0,0,0.8)] border-t border-blue-500/30 flex flex-col max-h-[85vh] lg:hidden pb-safe"
          >
            <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto my-4 shrink-0 shadow-[0_0_10px_rgba(255,255,255,0.1)]" />
            
            <div className="px-8 pb-6 flex items-center justify-between sticky top-0 bg-[#020617]/90 backdrop-blur-3xl z-10 py-4 border-b border-white/5">
              <div>
                <h3 className="text-3xl font-black tracking-tighter text-white italic uppercase">Mates Grid</h3>
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mt-1 opacity-70">Authenticated Connections</p>
              </div>
              <button 
                onClick={() => setShowMatesMobile(false)}
                className="w-12 h-12 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-center text-white/40 hover:text-white transition-all transform hover:rotate-90 border border-white/5"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 custom-scrollbar">
              {users.filter(u => friends.includes(u.uid)).length > 0 ? users.filter(u => friends.includes(u.uid)).map((user) => (
                <div 
                  key={user.uid}
                  className="bg-white/5 rounded-[2.5rem] border border-white/10 p-5 flex items-center gap-5 shadow-inner hover:bg-white/10 hover:border-blue-500/30 transition-all active:scale-[0.98] group"
                >
                  <UserAvatar 
                    src={user.photoURL} 
                    username={user.username} 
                    size="md" 
                    online={user.isOnline} 
                    className="border-2 border-blue-500/30"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-base font-black text-white italic uppercase tracking-tight group-hover:text-blue-400 transition-colors">{user.username}</h4>
                    <p className="text-[10px] font-black text-white/30 uppercase tracking-widest leading-none mt-1">{user.profession || 'Explorer'}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[9px] font-black bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/20 uppercase tracking-tighter">{user.gender}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => onProfileClick(user.uid)}
                      className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                    >
                      <UserIcon className="w-4 h-4" />
                    </button>
                    {user.location && (
                      <button 
                        onClick={() => {
                          zoomToUser(user.location!.lat, user.location!.lng, user.uid);
                          setShowMatesMobile(false);
                        }}
                        className="w-10 h-10 bg-white/10 text-white rounded-xl flex items-center justify-center border border-white/10 shadow-lg"
                      >
                        <Compass className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )) : (
                <div className="py-24 text-center opacity-30">
                  <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-white/5">
                    <Users className="w-10 h-10 text-blue-400" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.4em]">Grid Silent: No Mates</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top-Right Advanced Map Menu */}
      {!hideControls && (
        <React.Fragment>
          {/* Menu Trigger Button moved up to handle conditional visibility */}

          <AnimatePresence>
            {isAdvancedMenuOpen && (
              <React.Fragment>
                {/* Backdrop for Mobile */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsAdvancedMenuOpen(false)}
                  className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[5500]"
                />

                {/* Menu Panel / Bottom Sheet */}
                <motion.div
                  initial={{ 
                    opacity: 0, 
                    scale: 0.95, 
                    y: window.innerWidth < 768 ? 400 : 20,
                  }}
                  animate={{ 
                    opacity: 1, 
                    scale: 1, 
                    y: 0 
                  }}
                  exit={{ 
                    opacity: 0, 
                    scale: 0.95, 
                    y: window.innerWidth < 768 ? 400 : 20 
                  }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className={cn(
                    "fixed z-[5501] bg-[#020617]/95 backdrop-blur-3xl shadow-[0_30px_100px_rgba(0,0,0,0.8)] border border-blue-500/30 overflow-hidden flex flex-col",
                    "md:top-24 md:right-8 md:w-85 md:rounded-[3rem] md:bottom-auto md:max-h-[75vh]",
                    "bottom-0 left-0 right-0 w-full rounded-t-[3rem] max-h-[85vh]"
                  )}
                >
                  <div className="flex-1 overflow-y-auto px-8 pb-32 custom-scrollbar">
                    <div className="pt-10 pb-6 mb-6 flex items-center justify-between sticky top-0 bg-[#020617]/90 backdrop-blur-md z-10 border-b border-white/5">
                      <div>
                        <h3 className="text-3xl font-black tracking-tighter text-white uppercase italic">Grid Visuals</h3>
                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mt-1 opacity-70">Customizing Interface Vibe</p>
                      </div>
                      <button 
                        onClick={() => setIsAdvancedMenuOpen(false)}
                        className="w-12 h-12 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-center text-white/40 hover:text-white transition-all transform hover:rotate-90 border border-white/5 shadow-inner"
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </div>

                    <div className="space-y-12">
                      {/* Section 1: Perspective View (Google/MapLibre) */}
                      <div>
                        <p className="text-[10px] font-black text-blue-400/60 uppercase tracking-[0.3em] mb-4 ml-1">Enhanced Perspective</p>
                        <div className="grid grid-cols-4 gap-3">
                          {[
                            { id: 'roadmap', name: 'Road', icon: Globe, source: 'google' },
                            { id: 'satellite', name: 'Sat', icon: Layers, source: 'google' },
                            { id: 'terrain', name: 'Topo', icon: Layers, source: 'google' },
                            { id: 'google-3d-roadmap', name: '3D Road (G)', icon: Navigation2, source: 'google', type: 'roadmap', is3d: true },
                            { id: 'google-3d-satellite', name: '3D Sat (G)', icon: Navigation2, source: 'google', type: 'satellite', is3d: true },
                            { id: '3d-roadmap', name: '3D Road (M)', icon: Navigation2, source: '3d', type: 'roadmap' },
                            { id: '3d-hybrid', name: '3D Sat (M)', icon: Navigation2, source: '3d', type: 'hybrid' },
                          ].map((m) => (
                            <button
                              key={m.id}
                              onClick={() => {
                                if (m.source === '3d') {
                                  setMapSource('3d');
                                  setMaplibreType(m.type as any);
                                } else {
                                  setMapSource('google');
                                  setMapType(m.type || m.id as any);
                                  if ((m as any).is3d) {
                                    setMapTilt(65);
                                    setMapHeading(45);
                                    setMapStyleVibe(m.type === 'roadmap' ? 'roadmap_lines' : 'satellite_premium');
                                    if (mapInstance) {
                                      mapInstance.setTilt(65);
                                      mapInstance.setHeading(45);
                                    }
                                  } else {
                                    setMapTilt(0);
                                    setMapHeading(0);
                                    setMapStyleVibe('standard');
                                  }
                                }
                                setIsFollowingUser(false);
                              }}
                              className={cn(
                                "flex flex-col items-center gap-2 p-3 rounded-2xl transition-all border group",
                                (mapSource === m.source && (m.source === 'google' ? mapType === m.id : maplibreType === m.type)) 
                                  ? "bg-blue-600 border-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]" 
                                  : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:border-white/20"
                              )}
                            >
                              <m.icon className={cn("w-5 h-5", (mapSource === m.source && (m.source === 'google' ? mapType === m.id : maplibreType === m.type)) ? "text-white" : "text-blue-400")} />
                              <span className="text-[9px] font-black uppercase tracking-widest text-center leading-none">{m.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Section 2: Atmosphere & Lighting Styling */}
                      <div>
                        <p className="text-[10px] font-black text-blue-400/60 uppercase tracking-[0.3em] mb-4 ml-1">Atmosphere & Themes</p>
                        <div className="grid grid-cols-4 gap-3">
                          {[
                            { id: 'standard', label: 'Standard', icon: Sun, img: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=300&auto=format' },
                            { id: 'silver', label: 'Silver', icon: Layers, img: 'https://images.unsplash.com/photo-1586075010620-2d854ed2a6d7?q=80&w=300&auto=format' },
                            { id: 'retro', label: 'Retro', icon: RotateCw, img: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=300&auto=format' },
                            { id: 'dark', label: 'Dark', icon: Moon, img: 'https://images.unsplash.com/photo-1472552947727-4008985160ef?q=80&w=300&auto=format' },
                            { id: 'night', label: 'Night', icon: Moon, img: 'https://images.unsplash.com/photo-1514810771018-276192729582?q=80&w=300&auto=format' },
                            { id: 'lighting', label: 'Lighting', icon: Zap, img: 'https://images.unsplash.com/photo-1514302240736-b1fee598926c?q=80&w=300&auto=format' },
                            { id: 'aubergine', label: 'Aubergine', icon: Layers, img: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=300&auto=format' },
                            { id: 'sunlight', label: 'Sunlight', icon: Sun, img: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=300&auto=format' },
                            { id: 'morning', label: 'Morning', icon: Sun, img: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?q=80&w=300&auto=format' },
                            { id: 'fajr', label: 'Fajr', icon: Sunrise, img: 'https://images.unsplash.com/photo-1472552947727-4008985160ef?q=80&w=300&auto=format' },
                            { id: 'sunset', label: 'Sunset', icon: Sunset, img: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=300&auto=format' },
                            { id: 'rainy', label: 'Rainy', icon: CloudRain, img: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=300&auto=format' },
                            { id: 'registan', label: 'Desert', icon: Mountain, img: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=300&auto=format' },
                            { id: 'bijli', label: 'Bijli', icon: CloudLightning, img: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=300&auto=format' },
                            { id: 'snowOnGround', label: 'Snow Winter', icon: Snowflake, img: 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?q=80&w=300&auto=format' },
                            { id: 'isometric', label: 'Isometric', icon: Box, img: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=300&auto=format' },
                            { id: 'neon', label: 'Neon', icon: Zap, img: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=300&auto=format' },
                            { id: 'satellite_premium', label: 'Premium Sat', icon: Crown, img: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=300&auto=format' },
                            { id: 'roadmap_lines', label: 'Road Lines', icon: Flag, img: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=300&auto=format' },
                          ].map((vibe) => (
                            <button 
                              key={`vibe-${vibe.id}`}
                              onClick={() => {
                                setMapStyleVibe(vibe.id as any);
                                if (vibe.id === 'isometric') {
                                  setMapTilt(45);
                                  setMapHeading(45);
                                }
                              }}
                              className="flex flex-col items-center gap-2 group"
                            >
                              <div className={cn(
                                "w-full aspect-square rounded-[1.25rem] overflow-hidden transition-all shadow-lg group-hover:scale-110 relative flex items-center justify-center bg-white/5",
                                mapStyleVibe === vibe.id ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-[#020617] scale-105" : "opacity-40 border border-white/10"
                              )}>
                                <img src={vibe.img} alt={vibe.label} className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity" referrerPolicy="no-referrer" />
                                <vibe.icon className={cn("w-5 h-5 relative z-10 drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]", mapStyleVibe === vibe.id ? "text-white" : "text-white/40")} />
                              </div>
                              <span className={cn("text-[9px] font-black uppercase tracking-widest text-center truncate w-full transition-colors", mapStyleVibe === vibe.id ? "text-blue-400" : "text-white/30")}>{vibe.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Section 3: Density Controls */}
                      <div>
                        <p className="text-[10px] font-black text-blue-400/60 uppercase tracking-[0.3em] mb-4 ml-1">Density Hardware</p>
                        <div className="space-y-6 px-6 py-8 bg-white/5 rounded-[2.5rem] border border-white/10 shadow-inner">
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <label className="text-[10px] font-black text-white/50 uppercase tracking-widest">Road Networks</label>
                              <span className="text-[10px] font-black text-blue-400 italic">{roadDensity}%</span>
                            </div>
                            <input 
                              type="range" min="0" max="100" value={roadDensity} 
                              onChange={(e) => setRoadDensity(parseInt(e.target.value))}
                              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.2)]"
                            />
                          </div>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <label className="text-[10px] font-black text-white/50 uppercase tracking-widest">Landmark Nodes</label>
                              <span className="text-[10px] font-black text-blue-400 italic">{landmarkDensity}%</span>
                            </div>
                            <input 
                              type="range" min="0" max="100" value={landmarkDensity} 
                              onChange={(e) => setLandmarkDensity(parseInt(e.target.value))}
                              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.2)]"
                            />
                          </div>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <label className="text-[10px] font-black text-white/50 uppercase tracking-widest">Signal Labels</label>
                              <span className="text-[10px] font-black text-blue-400 italic">{labelDensity}%</span>
                            </div>
                            <input 
                              type="range" min="0" max="100" value={labelDensity} 
                              onChange={(e) => setLabelDensity(parseInt(e.target.value))}
                              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.2)]"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Section 4: Social and Customize Map */}
                      <div>
                        <p className="text-[10px] font-black text-blue-400/60 uppercase tracking-[0.3em] mb-4 ml-1">Grid Operations</p>
                        <div className="grid grid-cols-3 gap-4">
                          {[
                            { name: 'Add Label', icon: MapPin, onClick: () => { 
                              setIsAdvancedMenuOpen(false); 
                              onStartLabelSelect?.();
                              toast.info('INTERFACE READY: Click grid coordinates for new signature'); 
                            } },
                            { name: 'Traffic Map', icon: Activity, onClick: async () => {
                              if (!showTraffic) {
                                const canUse = await checkFeatureLimit('traffic_map', 10, 'Traffic Map');
                                if (!canUse) return;
                              }
                              setShowTraffic(!showTraffic);
                            }, active: showTraffic },
                            { name: 'Moment Map', icon: Zap, onClick: () => onToggleMomentMapLayer?.(), active: showMomentMapLayer },
                            { name: 'Street View', icon: Eye, onClick: () => { setShowStreetView(!showStreetView); setIsAdvancedMenuOpen(false); }, active: showStreetView },
                            { name: '3D Buildings', icon: Box, onClick: () => setShow3DBuildings(!show3DBuildings), active: show3DBuildings },
                            { name: 'Show Labels', icon: PenLine, onClick: () => setShowCustomLabels(!showCustomLabels), active: showCustomLabels },
                          ].map((item) => (
                            <button
                              key={item.name}
                              onClick={item.onClick}
                              className={cn(
                                "flex flex-col items-center justify-center gap-3 p-5 rounded-[2.5rem] transition-all border group",
                                item.active 
                                  ? "bg-blue-600 border-blue-400 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]" 
                                  : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:border-white/20"
                              )}
                            >
                              <item.icon className={cn("w-6 h-6 transition-transform group-hover:scale-110", item.active ? "text-white" : "text-blue-400")} />
                              <span className="text-[9px] font-black uppercase tracking-widest text-center leading-tight">{item.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </React.Fragment>
            )}
          </AnimatePresence>
        </React.Fragment>
      )}
      {/* Street View Overlay */}
      <AnimatePresence>
        {showStreetView && streetViewPos && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-4 md:inset-10 z-[5500] bg-black rounded-[3rem] overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.5)] border-4 border-white/10"
          >
            <div className="absolute top-6 right-6 z-[6000]">
              <button 
                onClick={() => setShowStreetView(false)}
                className="w-12 h-12 bg-white/20 backdrop-blur-md text-white rounded-2xl flex items-center justify-center hover:bg-white/30 transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="w-full h-full">
              <StreetViewPanorama
                options={{
                  position: streetViewPos,
                  visible: true,
                  disableDefaultUI: false,
                  enableCloseButton: false,
                  addressControl: true,
                  linksControl: true,
                  panControl: true,
                  zoomControl: true,
                  scrollwheel: true
                }}
              />
            </div>
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 bg-black/60 backdrop-blur-xl border border-white/20 rounded-2xl text-white text-[10px] font-black uppercase tracking-widest">
              360° Street Level View
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Map Container */}
      <div 
        className="h-full w-full transition-all duration-700 ease-in-out relative overflow-hidden"
        style={{ filter: getSimulatedFilter() }}
      >
        {mapSource === '3d' && (
          <div 
            ref={maplibreContainerRef} 
            className={cn(
              "absolute inset-0 z-10 maplibre-premium-container",
              maplibrePitch < 5 && "maplibre-top-view-perspective"
            )}
            style={{ width: '100%', height: '100%' }} 
          />
        )}
        
        {/* MapLibre Markers Handling Label Visibility & Backgrounds */}
        <style dangerouslySetInnerHTML={{ __html: `
          .maplibre-label-marker {
            display: flex;
            flex-direction: column;
            align-items: center;
            cursor: pointer;
            transition: transform 0.2s;
            pointer-events: auto !important;
          }
          .maplibre-label-marker:hover {
            transform: scale(1.1);
            z-index: 9999;
          }
          .maplibre-label-icon {
            font-size: 28px;
            filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));
          }
          .maplibre-label-text {
            color: white;
            font-size: 10px;
            font-weight: 900;
            text-transform: uppercase;
            text-align: center;
            letter-spacing: -0.02em;
            text-shadow: 0 2px 4px rgba(0,0,0,0.9);
            line-height: 1;
            margin-top: 2px;
          }
          .maplibre-label-subtext {
            color: rgba(255,255,255,0.8);
            font-size: 7px;
            font-weight: 700;
            text-transform: uppercase;
            text-shadow: 0 1px 2px rgba(0,0,0,0.9);
          }
        `}} />
        {isLoaded ? (
          <div className={cn(
            "w-full h-full",
            (mapType === 'satellite' || mapType === 'hybrid') && "map-premium-visuals"
          )}>
            <GoogleMap
              mapContainerStyle={{ width: '100%', height: '100%' }}
              center={center}
              zoom={zoom}
              onLoad={map => {
                setMapInstance(map);
                // Set initial corner view for premium feel
                if (mapType === 'satellite' || mapType === 'hybrid') {
                  map.setTilt(65);
                  map.setHeading(-15);
                }
              }}
              onZoomChanged={() => setMapZoom(mapInstance?.getZoom() || 12)}
              onTiltChanged={() => setMapTilt(mapInstance?.getTilt() || 0)}
              onHeadingChanged={() => setMapHeading(mapInstance?.getHeading() || 0)}
              mapTypeId={mapType === 'default' ? 'roadmap' : mapType as any}
              tilt={mapTilt}
              heading={mapHeading || 0}
              onDragStart={() => setIsFollowingUser(false)}
              onIdle={() => {
                if (mapInstance && !isFollowingUser && mapSource === 'google') {
                  const c = mapInstance.getCenter();
                  if (c) {
                    setCenter({ lat: c.lat(), lng: c.lng() });
                    setZoom(mapInstance.getZoom() || 4);
                  }
                }
              }}
              options={{
                disableDefaultUI: true,
                zoomControl: false,
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: false,
                gestureHandling: 'greedy',
                maxZoom: 32,
                minZoom: 2,
                isFractionalZoomEnabled: true,
                clickableIcons: false,
                backgroundColor: '#ffffff',
                styles: getFinalStyles()
              }}
            >
            {/* Layers */}
            {showTraffic && <TrafficLayer />}
            {showTransit && <TransitLayer />}
            {showBicycle && <BicyclingLayer />}

            <MapEvents 
              onDoubleClick={handleMapDoubleClick} 
              onClick={handleMapClick} 
              isDestinyMode={isDestinyMode}
              destinySetupStep={destinySetupStep}
              setDestinyTarget={setDestinyTarget}
              setDestinySetupStep={setDestinySetupStep}
              map={mapInstance}
            />

            {/* Help Radius Circle removed */}

            {/* Render Mission Points */}
            {isMissionMode && missionPoints.filter(p => p.status === 'active').map(p => (
              <OverlayView
                key={p.id}
                position={{ lat: p.lat, lng: p.lng }}
                mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
              >
                <div 
                  className="relative -translate-x-1/2 -translate-y-full mb-1 cursor-pointer group"
                  onClick={() => startNavDestiny({ lat: p.lat, lng: p.lng })}
                >
                  <motion.div
                    animate={{ 
                      scale: [1, 1.2, 1],
                      boxShadow: [
                        '0 0 10px rgba(0, 242, 255, 0.3)',
                        '0 0 25px rgba(0, 242, 255, 0.7)',
                        '0 0 10px rgba(0, 242, 255, 0.3)'
                      ]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-12 h-12 rounded-full border-2 border-cyan-400 bg-cyan-900/80 flex items-center justify-center relative z-10 group-hover:bg-cyan-400 transition-colors"
                  >
                    <span className="text-xl group-hover:scale-125 transition-transform">
                      {p.type === 'shop' ? '🏪' : p.type === 'checkpoint' ? '📍' : '💎'}
                    </span>
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                      <div className="w-5 h-5 bg-cyan-400 rounded-sm rotate-45 flex items-center justify-center shadow-[0_0_15px_#00f2ff] animate-pulse">
                        <Flag className="w-3 h-3 text-black -rotate-45" />
                      </div>
                    </div>
                    {/* Pulsing indicator */}
                    <div className="absolute inset-0 rounded-full border-4 border-cyan-400/20 animate-ping" />
                  </motion.div>
                </div>
              </OverlayView>
            ))}

            {/* Label Selection Range Circle */}
            {isLabelSelecting && userProfile?.location && (
              <Circle 
                center={{ lat: userProfile.location.lat, lng: userProfile.location.lng }} 
                radius={1000} 
                options={{ 
                  fillColor: '#3b82f6', 
                  fillOpacity: 0.1, 
                  strokeColor: '#3b82f6', 
                  strokeWeight: 1,
                  clickable: false
                }} 
              />
            )}

            {/* Render Labels - only visible when zoom is high enough */}
            {mapZoom >= 15 && showCustomLabels && navDestinyState !== 'active' && labels.filter(l => l.status !== 'deleted' && !hiddenLabels.includes(l.id!)).map(label => (
              <OverlayView
                key={label.id}
                position={label.location}
                mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
              >
                <div 
                  onClick={() => setSelectedLabel(label)}
                  className="relative flex items-center gap-1.5 cursor-pointer transition-all hover:scale-110 hover:z-[1000] -translate-x-1/2 -translate-y-[90%] group"
                >
                  <div className="flex flex-col items-center">
                    <span className="text-3xl drop-shadow-xl filter grayscale-[0.2] group-hover:grayscale-0 transition-all">{label.markerIcon || '📍'}</span>
                    <div className="mt-0.5 flex flex-col items-center">
                      <span className="text-[11px] font-black uppercase tracking-tighter whitespace-nowrap text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] leading-none text-center">
                        {label.name}
                      </span>
                      <span className="text-[8px] font-bold text-white/80 uppercase tracking-tighter drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)] leading-tight text-center">
                        {label.subCategory || label.category}
                      </span>
                    </div>
                  </div>
                </div>
              </OverlayView>
            ))}

            {/* Label Selection Popup */}
            {isLabelSelecting && selectedLabelPos && (
              <OverlayView
                position={selectedLabelPos}
                mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
              >
                <div className="relative -translate-x-1/2 -translate-y-full mb-2">
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white dark:bg-neutral-900 p-4 rounded-[2rem] shadow-2xl border-2 border-blue-500 min-w-[200px] flex flex-col items-center gap-3"
                  >
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-600">
                      <MapPin className="w-6 h-6" />
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-black text-neutral-900 dark:text-white uppercase tracking-widest text-center">Place Label Here?</p>
                      <p className="text-[8px] font-bold text-neutral-500 uppercase tracking-widest mt-1">Confirmed instantly</p>
                    </div>
                    <div className="flex gap-2 w-full mt-1" onMouseDown={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onLabelPosSelect?.(null);
                        }}
                        className="flex-1 py-3 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-xl text-[9px] font-black uppercase tracking-widest"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onConfirmLabelPos?.();
                        }}
                        className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-blue-200 active:scale-95 transition-transform"
                      >
                        Confirm
                      </button>
                    </div>
                  </motion.div>
                </div>
              </OverlayView>
            )}

            {/* Destiny Radius Circle */}
            {isDestinyMode && userProfile?.location && isValidLatLng(userProfile.location.lat, userProfile.location.lng) && (
              <Circle 
                center={{ lat: userProfile.location.lat, lng: userProfile.location.lng }} 
                radius={destinyDistance} 
                options={{ 
                  fillColor: '#f59e0b', 
                  fillOpacity: 0.05, 
                  strokeColor: '#f59e0b', 
                  strokeWeight: 2,
                  clickable: false
                }} 
              />
            )}
          {/* Zoom Control REMOVED as per user request */}
          {/* <ZoomControl position="bottomright" /> */}

            {/* Render Parent-Child Paths */}
            {userProfile?.parentMode?.enabled && Object.values(parentPaths).map(path => {
              if (!path || !path.id) return null;
              return (
                <React.Fragment key={`parent-group-${path.id}`}>
                  {path.points && path.points.length > 0 && (
                    <Polyline 
                      path={path.points.filter(p => p && isValidLatLng(p.lat, p.lng)).map(p => ({ lat: p.lat, lng: p.lng }))}
                      options={{ 
                        strokeColor: '#39FF14',
                        strokeWeight: 4, 
                        strokeOpacity: 0.8,
                      }}
                    />
                  )}
                  {path.stops.map((stop, idx) => stop && isValidLatLng(stop.lat, stop.lng) ? (
                    <Circle 
                      key={`${path.id}-stop-${idx}`}
                      center={{ lat: stop.lat, lng: stop.lng }}
                      radius={10}
                      options={{ strokeColor: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.5 }}
                    />
                  ) : null)}
                </React.Fragment>
              );
            })}

            {/* Render Child Destinies */}
            {userProfile?.parentMode?.enabled && Object.values(childDestinies).filter(canSeeDestiny).map(dest => {
              if (!dest || !dest.id) return null;
              const child = users.find(u => u.uid === dest.childUid);
              const currentPos = child?.location;
              
              return (
                <React.Fragment key={`child-destiny-group-${dest.id}`}>
                  {dest.geofenceRadius && isValidLatLng(dest.target.lat, dest.target.lng) && (
                    <Circle 
                      center={{ lat: dest.target.lat, lng: dest.target.lng }}
                      radius={dest.geofenceRadius}
                      options={{ 
                        strokeColor: '#39FF14', 
                        fillColor: '#39FF14', 
                        fillOpacity: 0.05,
                        strokeWeight: 1
                      }}
                    />
                  )}

                  {dest.roadPath && currentPos && isValidLatLng(currentPos.lat, currentPos.lng) && (
                    <Polyline 
                      path={[
                        { lat: currentPos.lat, lng: currentPos.lng },
                        ...dest.roadPath.filter(p => p && isValidLatLng(p.lat, p.lng)).map(p => ({ lat: p.lat, lng: p.lng }))
                      ]}
                      options={{ 
                        strokeColor: '#39FF14', 
                        strokeWeight: 8, 
                        strokeOpacity: 0.8,
                      }}
                    />
                  )}

                  {isValidLatLng(dest.target.lat, dest.target.lng) && (
                    <OverlayView
                      position={{ lat: dest.target.lat, lng: dest.target.lng }}
                      mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                    >
                      <div className="relative flex flex-col items-center -translate-x-1/2 -translate-y-full">
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-20">
                          <div className="w-6 h-6 bg-red-600 rounded-lg flex items-center justify-center text-white shadow-lg animate-pulse">
                            <Flag className="w-4 h-4" />
                          </div>
                        </div>
                        <div className="w-10 h-10 bg-white rounded-2xl shadow-2xl flex items-center justify-center border-2 border-[#39FF14] animate-bounce overflow-hidden">
                          <img src={child?.photoURL || ''} className="w-full h-full object-cover" />
                        </div>
                        <div className="mt-1 px-2 py-0.5 bg-[#39FF14] text-black text-[8px] font-black rounded-full uppercase tracking-widest whitespace-nowrap shadow-lg">
                          Destiny
                        </div>
                      </div>
                    </OverlayView>
                  )}
                </React.Fragment>
              );
            })}

            {/* Render My Destiny Route */}
            {userProfile?.childMode?.enabled && myDestinyConfig && userProfile.location && (
              <React.Fragment key="my-destiny-route">
                {myDestinyConfig.target && isValidLatLng(myDestinyConfig.target.lat, myDestinyConfig.target.lng) && (
                  <Circle 
                    center={{ lat: myDestinyConfig.target.lat, lng: myDestinyConfig.target.lng }}
                    radius={myDestinyConfig.geofenceRadius}
                    options={{ 
                      strokeColor: '#39FF14', 
                      fillColor: '#39FF14', 
                      fillOpacity: 0.05,
                      strokeWeight: 1
                    }}
                  />
                )}

                {myDestinyConfig.roadPath && isValidLatLng(userProfile.location.lat, userProfile.location.lng) ? (
                  <React.Fragment>
                    {/* Layer 1: Glass Outer Glow */}
                    <Polyline 
                      path={[
                        { lat: userProfile.location.lat, lng: userProfile.location.lng },
                        ...myDestinyConfig.roadPath.filter(p => p && isValidLatLng(p.lat, p.lng)).map(p => ({ lat: p.lat, lng: p.lng }))
                      ]}
                      options={{ 
                        strokeColor: mapType === 'satellite' || mapType === 'hybrid' ? '#39FF14' : '#00f2ff', 
                        strokeWeight: 14, 
                        strokeOpacity: 0.1,
                      }}
                    />
                    {/* Layer 2: Main Neon Route */}
                    <Polyline 
                      path={[
                        { lat: userProfile.location.lat, lng: userProfile.location.lng },
                        ...myDestinyConfig.roadPath.filter(p => p && isValidLatLng(p.lat, p.lng)).map(p => ({ lat: p.lat, lng: p.lng }))
                      ]}
                      options={{ 
                        strokeColor: mapType === 'satellite' || mapType === 'hybrid' ? '#39FF14' : '#00f2ff', 
                        strokeWeight: 6, 
                        strokeOpacity: 0.9,
                      }}
                    />
                  </React.Fragment>
                ) : userProfile.location && isValidLatLng(userProfile.location.lat, userProfile.location.lng) && myDestinyConfig.target && isValidLatLng(myDestinyConfig.target.lat, myDestinyConfig.target.lng) ? (
                  <Polyline 
                    path={[
                      { lat: userProfile.location.lat, lng: userProfile.location.lng },
                      { lat: myDestinyConfig.target.lat, lng: myDestinyConfig.target.lng }
                    ]}
                    options={{ 
                      strokeColor: '#39FF14', 
                      strokeWeight: 3, 
                      strokeOpacity: 0.4,
                    }}
                  />
                ) : null}

                {myDestinyConfig.target && isValidLatLng(myDestinyConfig.target.lat, myDestinyConfig.target.lng) && (
                  <OverlayView
                    position={{ lat: myDestinyConfig.target.lat, lng: myDestinyConfig.target.lng }}
                    mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                  >
                    <div className="relative flex flex-col items-center -translate-x-1/2 -translate-y-full">
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-20">
                        <div className="w-6 h-6 bg-red-600 rounded-lg flex items-center justify-center text-white shadow-lg animate-pulse">
                          <Flag className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="w-10 h-10 bg-white rounded-2xl shadow-2xl flex items-center justify-center border-2 border-[#39FF14] animate-bounce overflow-hidden">
                        <img src={userProfile.photoURL} className="w-full h-full object-cover" />
                      </div>
                      <div className="mt-1 px-2 py-0.5 bg-[#39FF14] text-black text-[8px] font-black rounded-full uppercase tracking-widest whitespace-nowrap shadow-lg">
                        My Destiny
                      </div>
                    </div>
                  </OverlayView>
                )}
              </React.Fragment>
            )}

            {/* Render Active Destinies (Public/Spectator) */}
            {allDestinies.filter(d => {
              if (!d) return false;
              if (d.uid === auth.currentUser?.uid) return true;
              if (d.visibility === 'custom' && d.allowedUsers?.includes(auth.currentUser?.uid || '')) return true;
              if (userProfile?.parentMode?.enabled && userProfile?.parentMode?.children?.includes(d.uid)) return true;
              return false;
            }).map((destiny, dIdx) => {
              const user = users.find(u => u.uid === destiny.uid);
              const currentPos = user?.location || destiny.startLocation;
              
              return (
                <React.Fragment key={`destiny-group-${destiny.id || dIdx}`}>
                  {destiny.targetLocation && isValidLatLng(destiny.targetLocation.lat, destiny.targetLocation.lng) && (
                    <OverlayView
                      position={{ lat: destiny.targetLocation.lat, lng: destiny.targetLocation.lng }}
                      mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                    >
                      <div className="relative flex flex-col items-center -translate-x-1/2 -translate-y-full">
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-20">
                          <div className="w-6 h-6 bg-red-600 rounded-lg flex items-center justify-center text-white shadow-lg animate-pulse">
                            <Flag className="w-4 h-4" />
                          </div>
                        </div>
                        <div className="w-10 h-10 bg-white rounded-2xl shadow-2xl flex items-center justify-center border-2 border-[#39FF14] animate-bounce overflow-hidden">
                          <img src={destiny.userPhoto} className="w-full h-full object-cover" />
                        </div>
                        <div className="mt-1 px-2 py-0.5 bg-[#39FF14] text-black text-[8px] font-black rounded-full uppercase tracking-widest whitespace-nowrap shadow-lg">
                          {destiny.username}'s Destiny
                        </div>
                      </div>
                    </OverlayView>
                  )}

                      {destiny.roadPath && currentPos && isValidLatLng(currentPos.lat, currentPos.lng) ? (
                    <React.Fragment>
                      {/* Layer 1: Glass Outer Glow */}
                      <Polyline
                        path={[
                          { lat: currentPos.lat, lng: currentPos.lng },
                          ...destiny.roadPath.filter(p => p && isValidLatLng(p.lat, p.lng)).map(p => ({ lat: p.lat, lng: p.lng }))
                        ]}
                        options={{
                          strokeColor: mapType === 'satellite' || mapType === 'hybrid' ? '#39FF14' : '#3b82f6',
                          strokeWeight: 14,
                          strokeOpacity: 0.1,
                        }}
                      />
                      {/* Layer 2: Main Neon Route */}
                      <Polyline
                        path={[
                          { lat: currentPos.lat, lng: currentPos.lng },
                          ...destiny.roadPath.filter(p => p && isValidLatLng(p.lat, p.lng)).map(p => ({ lat: p.lat, lng: p.lng }))
                        ]}
                        options={{
                          strokeColor: mapType === 'satellite' || mapType === 'hybrid' ? '#39FF14' : '#3b82f6',
                          strokeWeight: 6,
                          strokeOpacity: 0.8,
                        }}
                      />
                    </React.Fragment>
                  ) : (currentPos && isValidLatLng(currentPos.lat, currentPos.lng) && destiny.targetLocation && isValidLatLng(destiny.targetLocation.lat, destiny.targetLocation.lng)) ? (
                    <Polyline
                      path={[
                        { lat: currentPos.lat, lng: currentPos.lng },
                        { lat: destiny.targetLocation.lat, lng: destiny.targetLocation.lng }
                      ]}
                      options={{
                        strokeColor: '#3b82f6',
                        strokeWeight: 3,
                        strokeOpacity: 0.4,
                      }}
                    />
                  ) : null}
                </React.Fragment>
              );
            })}

            {/* Render My Navigation Destiny Route */}
            {navDestinyState === 'active' && navDestinyTarget && (
              <React.Fragment key="my-nav-destiny">
                {/* Visual Circle for safety radius */}
                {userProfile?.location && (
                  <Circle 
                    center={{ lat: userProfile.location.lat, lng: userProfile.location.lng }}
                    radius={navDestinyConfig.radius}
                    options={{
                      strokeColor: '#3b82f6',
                      fillColor: '#3b82f6',
                      fillOpacity: 0.05,
                      strokeWeight: 1,
                      clickable: false
                    }}
                  />
                )}

          {activeNavRoute.length > 1 && (
            <React.Fragment>
              {/* Layer 1: Futuristic Base Glow (Glass Surround) */}
              <Polyline 
                path={activeNavRoute}
                options={{
                  strokeColor: mapType === 'satellite' || mapType === 'hybrid' ? '#39FF14' : '#00f2ff',
                  geodesic: false,
                  strokeOpacity: 0.15,
                  strokeWeight: 24,
                  zIndex: 2,
                  clickable: false
                }}
              />
              
              {/* Layer 2: Core Path */}
              <Polyline 
                path={activeNavRoute}
                options={{
                  strokeColor: mapType === 'satellite' || mapType === 'hybrid' ? '#ffffff' : '#ffffff',
                  geodesic: false,
                  strokeOpacity: 1,
                  strokeWeight: 2,
                  zIndex: 4,
                  clickable: false
                }}
              />

              {/* Layer 3: Main Neon Glow Path (Blue for road, Green for satellite) */}
              <Polyline 
                path={activeNavRoute}
                options={{
                  strokeColor: mapType === 'satellite' || mapType === 'hybrid' ? '#39FF14' : '#00f2ff',
                  geodesic: false,
                  strokeOpacity: 0.9,
                  strokeWeight: 8,
                  zIndex: 3,
                  clickable: false
                }}
              />
            </React.Fragment>
          )}

          {/* Final Destination Marker Flag (High Precision Premium Style) */}
          <OverlayView
            position={navDestinyTarget}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
          >
            <div className="relative -translate-x-1/2 -translate-y-full mb-1 flex flex-col items-center">
              <motion.div 
                initial={{ scale: 0, y: -20 }}
                animate={{ scale: 1, y: 0 }}
                className="w-12 h-12 bg-red-500 rounded-2xl flex items-center justify-center text-white shadow-[0_10px_40px_rgba(239,68,68,0.6)] border-4 border-white relative z-10"
              >
                <Flag className="w-6 h-6 fill-white" />
              </motion.div>
              <div className="absolute -bottom-2 w-8 h-8 bg-red-500/20 rounded-full blur-md animate-ping" />
              <div className="w-1 h-4 bg-gradient-to-b from-white to-transparent" />
            </div>
          </OverlayView>
        </React.Fragment>
      )}

            {/* Render Users */}
            {filteredUsers
              .filter(u => u && u.uid && u.location)
              .map((user) => (
                <SmoothMarker 
                  key={`smooth-marker-${user.uid}`} 
                  user={user}
                  onClick={() => {}}
                  onProfileClick={onProfileClick}
                  onDirectChat={onDirectChat}
                  center={center}
                  onMomentClick={onMomentClick}
                  activeMoments={activeMoments}
                  userProfile={userProfile}
                  friends={friends}
                  showPathForUserId={showPathForUserId}
                  setShowPathForUserId={setShowPathForUserId}
                  setFilterMode={setFilterMode}
                  setSelectedUserIds={setSelectedUserIds}
                  zoomToUser={zoomToUser}
                  setIsRefiningLocation={setIsRefiningLocation}
                  isRefiningLocation={isRefiningLocation}
                  setTempRefinePos={setTempRefinePos}
                  isDestinyMode={isDestinyMode}
                  vibeFilter={vibeFilter}
                  activeDestiny={navDestinyState === 'active' && auth.currentUser?.uid === user.uid ? { status: 'active', roadPath: navDestinyRoute } : allDestinies.find(d => d.uid === user.uid && d.status === 'active')}
                  userHeading={userHeading}
                  isMissionMode={isMissionMode}
                  setStatusMenuData={setStatusMenuData}
                />
              ))}

            {/* Help Signals */}
            {helpSignals.map((signal, sIdx) => {
              if (!isValidLatLng(signal.lat, signal.lng)) return null;
              const distance = getDistanceNumber(center.lat, center.lng, signal.lat, signal.lng);
              if (distance > signal.radius / 1000) return null;

              return (
                <React.Fragment key={signal.id || `help-${sIdx}`}>
                  <Circle 
                    center={{ lat: signal.lat, lng: signal.lng }}
                    radius={signal.radius}
                    options={{ 
                      strokeColor: '#ef4444', 
                      fillColor: '#ef4444', 
                      fillOpacity: 0.1,
                      strokeWeight: 2
                    }}
                  />
                  <OverlayView
                    position={{ lat: signal.lat, lng: signal.lng }}
                    mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                  >
                    <div className="relative -translate-x-1/2 -translate-y-1/2">
                      <div className="w-12 h-12 bg-red-600 rounded-full border-4 border-white shadow-2xl flex items-center justify-center text-white animate-ping absolute inset-0 opacity-50"></div>
                      <div className="w-12 h-12 bg-red-600 rounded-full border-4 border-white shadow-2xl flex items-center justify-center text-white relative z-10">
                        <Zap className="w-6 h-6" />
                      </div>
                    </div>
                  </OverlayView>
                </React.Fragment>
              );
            })}
          </GoogleMap>
          </div>
        ) : (
          <div className="h-full w-full bg-neutral-100 flex flex-col items-center justify-center">
             <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
             <p className="mt-4 text-[10px] font-black text-blue-600 uppercase tracking-widest">Waking up Map...</p>
          </div>
        )}
      </div>

      {/* Map Vibe Indicator (Bottom Left) - Moved outside MapContainer to avoid Context errors */}
      {vibeFilter && userProfile?.mood && (
        <div className="absolute bottom-6 left-6 z-[1000] bg-white/90 backdrop-blur-xl p-3 rounded-2xl shadow-2xl border border-white/20 animate-bounce flex items-center gap-2">
          <span className="text-2xl">{userProfile.mood.emoji}</span>
          <span className="text-[10px] font-black text-neutral-900 uppercase tracking-widest">{userProfile.mood.text} Vibe</span>
        </div>
      )}

      <SpectateModal 
        isOpen={showSpectateModal}
        onClose={() => setShowSpectateModal(false)}
        users={users}
        friends={friends}
        selectedIds={destinySpectators}
        onToggle={async (id) => {
          const next = new Set(destinySpectators);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          setDestinySpectators(next);

          // If destiny is already active, sync to Firestore
          if (myDestinyConfig) {
            try {
              await updateDoc(doc(db, 'destinyConfigs', myDestinyConfig.id), {
                spectators: Array.from(next)
              });
            } catch (err) {
              handleFirestoreError(err, OperationType.UPDATE, `destinyConfigs/${myDestinyConfig.id}`);
            }
          }
        }}
      />

      {/* Filter Modal */}
      <AnimatePresence>
        {showFilterModal && (
          <motion.div 
            key="filter-modal-overlay" 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9500] flex items-center justify-center bg-[#020617]/40 backdrop-blur-md px-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 100 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 100 }}
              className="w-full max-w-lg bg-[#020617]/95 backdrop-blur-3xl rounded-t-[4rem] sm:rounded-[4rem] shadow-[0_-20px_100px_rgba(0,0,0,0.8)] border-t sm:border border-blue-500/30 overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="px-10 pb-8 pt-10 flex items-center justify-between sticky top-0 bg-[#020617]/90 backdrop-blur-md z-20 border-b border-white/5">
                <div>
                  <h3 className="text-3xl font-black tracking-tighter text-white uppercase italic">Grid Control</h3>
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mt-1 opacity-70">Interface Logic Filters</p>
                </div>
                <button 
                  onClick={() => setShowFilterModal(false)}
                  className="w-12 h-12 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-center text-white/40 hover:text-white transition-all transform hover:rotate-90 border border-white/5"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

                <div className="flex-1 overflow-y-auto px-10 py-8 custom-scrollbar space-y-8">
                  {/* Filter Tabs */}
                  <div className="flex gap-2 p-1.5 bg-white/5 rounded-[2.5rem] border border-white/10">
                    <button
                      onClick={() => setFilterMode('all')}
                      className={cn(
                        "flex-1 py-4 rounded-3xl text-[10px] font-black uppercase tracking-widest transition-all relative overflow-hidden",
                        filterMode === 'all' ? "text-white" : "text-white/30 hover:text-white/60"
                      )}
                    >
                      {filterMode === 'all' && <motion.div layoutId="filter-active" className="absolute inset-0 bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.4)]" />}
                      <span className="relative z-10">Global Net</span>
                    </button>
                    <button
                      onClick={() => setFilterMode('mates')}
                      className={cn(
                        "flex-1 py-4 rounded-3xl text-[10px] font-black uppercase tracking-widest transition-all relative overflow-hidden",
                        filterMode === 'mates' ? "text-white" : "text-white/30 hover:text-white/60"
                      )}
                    >
                      {filterMode === 'mates' && <motion.div layoutId="filter-active" className="absolute inset-0 bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.4)]" />}
                      <span className="relative z-10">Neural Mates</span>
                    </button>
                    <button
                      onClick={() => setFilterMode('custom')}
                      className={cn(
                        "flex-1 py-4 rounded-3xl text-[10px] font-black uppercase tracking-widest transition-all relative overflow-hidden",
                        filterMode === 'custom' ? "text-white" : "text-white/30 hover:text-white/60"
                      )}
                    >
                      {filterMode === 'custom' && <motion.div layoutId="filter-active" className="absolute inset-0 bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.4)]" />}
                      <span className="relative z-10">Encrypted</span>
                    </button>
                  </div>

                  {filterMode !== 'all' && (
                    <div className="space-y-6">
                      <div className="flex gap-3">
                        <div className="relative flex-1 group">
                          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-blue-400/40 w-5 h-5 group-focus-within:text-blue-400 transition-colors" />
                          <input 
                            type="text"
                            placeholder={filterMode === 'mates' ? "Scan Mates..." : filterMode === 'children' ? "Scan Lineage..." : "Scan Coordinate..."}
                            value={filterSearchQuery}
                            onChange={(e) => setFilterSearchQuery(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-[2rem] py-5 pl-14 pr-6 text-sm font-black text-white focus:bg-white/10 outline-none focus:ring-1 focus:ring-blue-500/50 transition-all uppercase tracking-widest"
                          />
                        </div>
                      </div>

                      <div className="max-h-80 overflow-y-auto space-y-3 pr-3 custom-scrollbar">
                        {(filterMode === 'mates' 
                          ? users.filter(u => friends.includes(u.uid))
                          : filterMode === 'children'
                            ? users.filter(u => userProfile?.parentMode?.children?.includes(u.uid))
                            : users
                        )
                          .filter(user => user.username && user.username.toLowerCase().includes(filterSearchQuery.toLowerCase()))
                          .map(user => (
                            <label 
                              key={user.uid}
                              className={cn(
                                "flex items-center justify-between p-5 rounded-[2rem] border transition-all cursor-pointer group",
                                selectedUserIds.has(user.uid) 
                                  ? "bg-blue-600/10 border-blue-500/40 shadow-[0_0_20px_rgba(37,99,235,0.1)]" 
                                  : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                              )}
                            >
                              <div className="flex items-center gap-4">
                                <UserAvatar src={user.photoURL} username={user.username} size="xs" />
                                <span className={cn("text-xs font-black tracking-tight uppercase italic transition-colors", selectedUserIds.has(user.uid) ? "text-white" : "text-white/60 group-hover:text-white")}>{user.username}</span>
                              </div>
                              <div className={cn(
                                "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                                selectedUserIds.has(user.uid) 
                                  ? "bg-blue-500 border-blue-400 shadow-[0_0_10px_rgba(37,99,235,0.5)]" 
                                  : "border-white/20"
                              )}>
                                {selectedUserIds.has(user.uid) && <Zap className="w-3 h-3 text-white fill-white" />}
                              </div>
                              <input 
                                type="checkbox"
                                checked={selectedUserIds.has(user.uid)}
                                onChange={(e) => {
                                  const next = new Set(selectedUserIds);
                                  if (e.target.checked) next.add(user.uid);
                                  else next.delete(user.uid);
                                  setSelectedUserIds(next);
                                }}
                                className="hidden"
                              />
                            </label>
                          ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-4">
                    <button
                      onClick={() => {
                        if ((filterMode === 'custom' || filterMode === 'children') && selectedUserIds.size === 0) {
                          toast.error("INTERFACE ERROR: Select at least one node");
                          return;
                        }
                        setShowFilterModal(false);
                        toast.success("Grid configuration updated");
                      }}
                      className="w-full py-6 bg-white text-[#020617] rounded-[2.5rem] font-black uppercase tracking-[0.4em] text-[11px] shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                      Engage Filters ({selectedUserIds.size})
                    </button>
                  </div>
                </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showNavDestinySetup && navDestinyTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-3xl overflow-hidden"
          >
            {/* Ambient Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse" />
              <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
            </div>

            <motion.div
              initial={{ scale: 0.95, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 30, opacity: 0 }}
              className="w-full h-full sm:h-auto sm:max-w-md bg-[#020617]/80 backdrop-blur-3xl sm:rounded-[4rem] border-y sm:border border-white/20 shadow-[0_50px_100px_rgba(0,0,0,0.8)] flex flex-col relative z-10 overflow-hidden"
            >
              {/* Top Banner Accent */}
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50" />

              {/* Header */}
              <div className="p-8 sm:p-10 flex justify-between items-center bg-white/5 border-b border-white/10">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-blue-600 rounded-3xl flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.4)] relative">
                    <div className="absolute inset-0 bg-white/20 rounded-3xl animate-pulse" />
                    <Flag className="w-7 h-7 text-white relative z-10" />
                  </div>
                  <div>
                    <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tighter leading-none uppercase italic">Confirm Destiny</h3>
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.25em] mt-2 opacity-80">Mission Protocol Alpha</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowNavDestinySetup(false)}
                  className="w-12 h-12 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-center text-white/50 hover:text-white transition-all transform hover:rotate-90"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 sm:p-10 space-y-12 custom-scrollbar pb-32">
                {/* Travel Mode Section */}
                <div>
                  <div className="flex items-center justify-between mb-6 px-1">
                    <p className="text-[11px] font-black text-white/40 uppercase tracking-[0.3em]">Transportation</p>
                    <div className="flex items-center gap-1.5 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
                      <Zap className="w-3 h-3 text-blue-400" />
                      <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Quantum Route</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { id: 'walking', icon: UserIcon, label: 'Walk' },
                      { id: 'bicycling', icon: Bike, label: 'Bike' },
                      { id: 'driving', icon: Car, label: 'Car' }
                    ].map(({ icon: Icon, ...m }) => (
                      <button
                        key={m.id}
                        onClick={() => setNavDestinyConfig(prev => ({ ...prev, mode: m.id as any }))}
                        className={cn(
                          "flex flex-col items-center gap-4 p-6 rounded-[2.5rem] border transition-all relative group overflow-hidden",
                          navDestinyConfig.mode === m.id 
                            ? "bg-blue-600 border-blue-400 text-white shadow-[0_15px_30px_rgba(37,99,235,0.4)]" 
                            : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:border-white/20"
                        )}
                      >
                        {navDestinyConfig.mode === m.id && (
                          <motion.div layoutId="mode-bg" className="absolute inset-0 bg-gradient-to-tr from-blue-600 to-blue-400 -z-10" />
                        )}
                        <Icon className={cn("w-7 h-7 transition-transform group-hover:scale-110", navDestinyConfig.mode === m.id ? "text-white" : "text-white/40")} />
                        <span className={cn("text-[9px] font-black uppercase tracking-[0.15em]", navDestinyConfig.mode === m.id ? "text-white" : "text-white/40")}>{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Privacy Visibility */}
                <div>
                  <p className="text-[11px] font-black text-white/40 uppercase tracking-[0.3em] mb-6 px-1">Network Visibility</p>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { id: 'all', icon: Globe, label: 'Public', color: 'indigo' },
                      { id: 'mates', icon: Users, label: 'Mates', color: 'blue' },
                      { id: 'private', icon: Lock, label: 'Ghost', color: 'neutral' }
                    ].map(({ icon: Icon, ...vis }) => (
                      <button
                        key={vis.id}
                        onClick={() => {
                          setNavDestinyConfig(prev => ({ ...prev, privacy: vis.id as any }));
                          if (vis.id === 'mates') {
                            toast.info("Select mates to share your journey with.");
                            setShowSpectateModal(true);
                          } else if (vis.id === 'private') {
                            toast.info("Ghost mode initialized: Path hidden.");
                          }
                        }}
                        className={cn(
                          "flex flex-col items-center gap-4 p-6 rounded-[2.5rem] border transition-all group relative overflow-hidden",
                          navDestinyConfig.privacy === vis.id 
                            ? "bg-indigo-600 border-indigo-400 text-white shadow-[0_15px_30px_rgba(79,70,229,0.3)]" 
                            : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                        )}
                      >
                        <div className="relative z-10 transition-transform group-hover:scale-110">
                          <Icon className={cn("w-7 h-7", navDestinyConfig.privacy === vis.id ? "text-white" : "text-white/40")} />
                          {vis.id === 'mates' && destinySpectators.size > 0 && (
                            <div className="absolute -top-2 -right-2 w-5 h-5 bg-blue-500 text-white text-[9px] rounded-full flex items-center justify-center font-black border-2 border-[#020617] shadow-lg">
                              {destinySpectators.size}
                            </div>
                          )}
                        </div>
                        <span className={cn("text-[9px] font-black uppercase tracking-[0.15em] relative z-10", navDestinyConfig.privacy === vis.id ? "text-white" : "text-white/40")}>{vis.label}</span>
                      </button>
                    ))}
                  </div>
                  {navDestinyConfig.privacy === 'mates' && (
                    <button 
                      onClick={() => setShowSpectateModal(true)}
                      className="mt-5 w-full py-4 glass-dark rounded-2xl text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] hover:text-indigo-300 transition-all border border-indigo-500/20"
                    >
                      {destinySpectators.size > 0 ? "Reconfigure Target Nodes" : "+ Decrypt Target Nodes"}
                    </button>
                  )}
                </div>

                {/* Safety Radius */}
                <div>
                  <div className="flex justify-between items-center mb-6 px-1">
                    <p className="text-[11px] font-black text-white/40 uppercase tracking-[0.3em]">Temporal Buffer</p>
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest opacity-50">Radius:</span>
                       <span className="text-lg font-black text-white tracking-tighter">{navDestinyConfig.radius}m</span>
                    </div>
                  </div>
                  <div className="relative h-14 flex items-center px-6 bg-white/5 rounded-[2rem] border border-white/10 group focus-within:border-blue-500/50 transition-all">
                    <input 
                      type="range"
                      min="10"
                      max="500"
                      step="10"
                      value={navDestinyConfig.radius}
                      onChange={(e) => setNavDestinyConfig(prev => ({ ...prev, radius: parseInt(e.target.value) }))}
                      className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Start Button Footer */}
              <div className="p-8 sm:p-10 pt-0 absolute bottom-0 inset-x-0 bg-gradient-to-t from-[#020617] via-[#020617] to-transparent">
                <button 
                  onClick={() => startNavDestiny(navDestinyTarget!)}
                  className="group relative w-full py-7 bg-blue-600 hover:bg-blue-500 text-white rounded-[3rem] font-black uppercase tracking-[0.4em] text-xs shadow-[0_20px_50px_rgba(37,99,235,0.5)] transition-all overflow-hidden active:scale-95 flex items-center justify-center gap-5"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400/0 via-white/30 to-blue-400/0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                  <Zap className="w-6 h-6 group-hover:scale-125 transition-transform text-white fill-white" />
                  INITIATE MISSION
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {navDestinyState === 'active' && navDestinyTarget && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-24 left-4 right-4 z-[5000] flex justify-center pointer-events-none"
          >
            <div className="bg-[#020617]/95 backdrop-blur-3xl rounded-[2.5rem] px-6 py-5 shadow-[0_20px_100px_rgba(0,0,0,0.8)] border border-blue-500/30 flex items-center gap-4 sm:gap-6 pointer-events-auto max-w-[95vw] sm:max-w-md w-fit relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-40 shadow-[0_0_10px_#3b82f6]" />
              
              <div className="flex items-center gap-3 sm:gap-4 border-r border-white/10 pr-4 sm:pr-6">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] animate-pulse relative overflow-hidden shrink-0 border border-blue-400/30">
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent" />
                  <Navigation2 className="w-6 h-6 fill-white" style={{ transform: `rotate(${navDestinyHeading}deg)` }} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-[11px] font-black text-white uppercase tracking-tighter leading-none truncate italic">Active Protocol</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest animate-pulse whitespace-nowrap">Neural Nav</p>
                    <div className="flex items-center gap-1 bg-blue-500/10 px-1.5 py-0.5 rounded-full border border-blue-500/20">
                      <Eye className="w-2.5 h-2.5 text-blue-400" />
                      <span className="text-[8px] font-black text-blue-400">{Array.from(destinySpectators).length}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="px-4 py-2 bg-blue-500/5 rounded-2xl border border-blue-500/20 shrink-0 shadow-inner">
                  <p className="text-[16px] sm:text-[18px] font-black text-blue-400 tracking-tighter italic">
                    {userProfile?.location ? (getDistanceNumber(userProfile.location.lat, userProfile.location.lng, navDestinyTarget.lat, navDestinyTarget.lng).toFixed(2)) : '0.00'} km
                  </p>
                  <p className="text-[7px] font-black text-white/30 uppercase tracking-[0.2em] leading-none mt-0.5">Range</p>
                </div>
                <button 
                  onClick={async () => {
                    if (!auth.currentUser || !userProfile?.location) return;
                    try {
                      const viewers = Array.from(destinySpectators);
                      await Promise.all(viewers.map(uid => 
                        addDoc(collection(db, 'notifications'), {
                          uid,
                          fromUid: auth.currentUser!.uid,
                          fromUsername: userProfile.username || 'Friend',
                          type: 'help_request',
                          text: `SOS: ${userProfile.username} needs help! Tap to view live location.`,
                          read: false,
                          data: {
                            lat: userProfile.location!.lat,
                            lng: userProfile.location!.lng,
                            type: 'destiny_help'
                          },
                          timestamp: serverTimestamp()
                        })
                      ));
                      toast.success("SOS sent to all viewers!", { icon: '🚨' });
                    } catch (err) {
                      toast.error("Failed to send help signal.");
                    }
                  }}
                  className="w-12 h-12 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)] hover:bg-red-500/20 transition-all pointer-events-auto group"
                >
                  <HelpCircle className="w-6 h-6 fill-red-500 text-[#020617] group-hover:scale-110 transition-transform" />
                </button>
                <button 
                  onClick={cancelNavDestiny}
                  className="w-12 h-12 bg-white/5 text-white/40 hover:bg-red-500/20 hover:text-red-400 rounded-2xl flex items-center justify-center transition-all group overflow-hidden border border-white/10 active:scale-95 pointer-events-auto"
                >
                  <X className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {navDestinyCompleted && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#020617]/95 backdrop-blur-3xl p-6"
          >
            <div className="max-w-md w-full text-center">
              <motion.div
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", damping: 12 }}
                className="w-32 h-32 bg-blue-600 rounded-[2.5rem] flex items-center justify-center text-white mx-auto mb-8 shadow-[0_20px_50px_rgba(37,99,235,0.4)] relative"
              >
                <div className="absolute inset-0 bg-blue-400/20 blur-2xl rounded-full animate-pulse" />
                <Flag className="w-16 h-16 fill-white relative z-10" />
              </motion.div>
              
              <h2 className="text-4xl font-black text-white tracking-tighter mb-2 uppercase italic">Destiny Reached</h2>
              <p className="text-blue-400 text-lg mb-10 font-black uppercase tracking-[0.2em] animate-pulse">Sync Reward Unlocked</p>
              
              <div className="mb-10">
                <div className="p-10 bg-white/5 backdrop-blur-2xl rounded-[3rem] border border-blue-500/30 shadow-inner relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent" />
                  <p className="text-[56px] font-black text-white leading-none tracking-tighter italic group-hover:scale-110 transition-transform">+15</p>
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mt-3 opacity-60">Neural XP Synchronized</p>
                </div>
              </div>
              
              <button
                onClick={() => setNavDestinyCompleted(false)}
                className="w-full py-6 bg-blue-600 text-white rounded-[2.5rem] font-black uppercase tracking-[0.3em] text-xs shadow-[0_20px_50px_rgba(37,99,235,0.3)] hover:scale-105 active:scale-95 transition-all border border-blue-400/30"
              >
                Integrate & Continue
              </button>
            </div>

            {/* Confetti effect simulated with many rotating dots or particles */}
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  x: Math.random() * window.innerWidth - window.innerWidth/2, 
                  y: window.innerHeight,
                  scale: Math.random() * 0.5 + 0.5,
                  rotate: 0,
                  opacity: 1
                }}
                animate={{ 
                  y: -100,
                  rotate: 360,
                  opacity: 0
                }}
                transition={{ 
                  duration: Math.random() * 2 + 3,
                  repeat: Infinity,
                  delay: Math.random() * 5
                }}
                className={cn(
                  "absolute w-4 h-4 rounded-lg pointer-events-none",
                  i % 3 === 0 ? "bg-yellow-400" : i % 3 === 1 ? "bg-pink-400" : "bg-cyan-400"
                )}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {missionCelebration && missionCelebration.show && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 backdrop-blur-3xl p-6"
          >
            <div className="max-w-md w-full text-center">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", damping: 15 }}
                className="relative mx-auto mb-8"
              >
                <div className="w-40 h-40 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto border-2 border-cyan-400/50 shadow-[0_0_50px_rgba(0,242,255,0.4)] animate-pulse">
                  <div className="w-32 h-32 bg-cyan-900/80 rounded-full flex items-center justify-center text-cyan-400 border-2 border-cyan-400">
                    {missionCelebration.badgeUnlocked ? <Crown className="w-16 h-16" /> : <Trophy className="w-16 h-16" />}
                  </div>
                </div>
                
                {missionCelebration.badgeUnlocked && (
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-6 py-2 bg-gradient-to-r from-yellow-400 to-amber-600 text-black text-xs font-black rounded-full shadow-[0_0_20px_rgba(251,191,36,0.8)] uppercase tracking-widest whitespace-nowrap"
                  >
                    {missionCelebration.badgeUnlocked} Badge Unlocked!
                  </motion.div>
                )}
              </motion.div>
              
              <h2 className="text-4xl font-black text-white tracking-tighter mb-2 uppercase">
                {missionCelebration.badgeUnlocked ? 'Evolution Complete!' : 'Target Neutralized'}
              </h2>
              <p className="text-cyan-400 text-lg mb-10 font-bold uppercase tracking-widest animate-pulse">+{missionCelebration.xp} MISSION XP EARNED</p>
              
              <div className="mb-10">
                <div className="p-10 bg-white/5 backdrop-blur-2xl rounded-[3rem] border border-cyan-500/30 shadow-inner group transition-all hover:border-cyan-400/50">
                  <p className="text-5xl font-black text-white tracking-tighter italic">{(userProfile?.xp || 0)}</p>
                  <p className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.3em] mt-3 opacity-60">Total Neural XP</p>
                </div>
              </div>
              
              <div className="flex flex-wrap justify-center gap-2 mb-10">
                {(userProfile?.badges || []).map(b => (
                  <span key={b} className="px-4 py-1.5 bg-cyan-900/40 text-cyan-400 text-[10px] font-black rounded-full border border-cyan-400/30 uppercase tracking-widest shadow-[0_0_15px_rgba(34,211,238,0.1)]">{b}</span>
                ))}
                {(userProfile?.badges || []).length === 0 && <span className="text-[10px] font-bold text-white/20 uppercase tracking-[0.3em]">No Nodes Detected</span>}
              </div>
              
              <button
                onClick={() => setMissionCelebration(null)}
                className="w-full py-6 bg-cyan-500 text-neutral-900 rounded-[2.5rem] font-black uppercase tracking-[0.3em] text-[11px] shadow-[0_20px_50px_rgba(6,182,212,0.4)] hover:scale-105 active:scale-95 transition-all border border-cyan-300/30"
              >
                Confirm System Integration
              </button>
            </div>

            {/* Neon Particles */}
            {[...Array(15)].map((_, i) => (
              <motion.div
                key={`p-${i}`}
                initial={{ 
                  x: Math.random() * window.innerWidth - window.innerWidth/2, 
                  y: window.innerHeight,
                  scale: Math.random() * 0.5 + 0.5,
                  opacity: 1
                }}
                animate={{ 
                  y: -100,
                  opacity: 0
                }}
                transition={{ 
                  duration: Math.random() * 2 + 2,
                  repeat: Infinity,
                  delay: Math.random() * 2
                }}
                className="absolute w-1 h-8 bg-cyan-400 rounded-full blur-[1px] pointer-events-none shadow-[0_0_10px_#00f2ff]"
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedLabel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9500] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
            onClick={() => setSelectedLabel(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-[#020617]/90 backdrop-blur-3xl rounded-[3rem] shadow-[0_30px_100px_rgba(0,0,0,0.8)] border border-blue-500/30 overflow-hidden"
            >
              {/* Image Slider - Optional Rendering */}
              {selectedLabel.photos && selectedLabel.photos.length > 0 && selectedLabel.photos[0] && (
                <div className="relative w-full h-72 bg-white/5 border-b border-white/10 overflow-hidden">
                  <img 
                    src={selectedLabel.photos[currentLabelPhotoIdx]} 
                    className="w-full h-full object-cover"
                    alt={selectedLabel.name}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-transparent" />
                  {selectedLabel.photos.length > 1 && (
                    <>
                      <button 
                        onClick={() => setCurrentLabelPhotoIdx(prev => (prev > 0 ? prev - 1 : selectedLabel.photos!.length - 1))}
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white hover:bg-blue-600/50 transition-all border border-white/10"
                      >
                        <ChevronLeft className="w-6 h-6" />
                      </button>
                      <button 
                        onClick={() => setCurrentLabelPhotoIdx(prev => (prev < selectedLabel.photos!.length - 1 ? prev + 1 : 0))}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white hover:bg-blue-600/50 transition-all border border-white/10"
                      >
                        <ChevronRight className="w-6 h-6" />
                      </button>
                      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-blue-600/20 backdrop-blur-md rounded-full border border-blue-500/30">
                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] italic">
                          {currentLabelPhotoIdx + 1} // {selectedLabel.photos.length}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="p-8 sm:p-10">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h3 className="text-3xl font-black text-white tracking-tighter leading-tight italic uppercase">{selectedLabel.name}</h3>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xl p-2 bg-white/5 rounded-xl border border-white/10">{selectedLabel.markerIcon || '📍'}</span>
                      <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] opacity-70 italic">{selectedLabel.subCategory || selectedLabel.category}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedLabel(null)}
                    className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white transition-all transform hover:rotate-90 border border-white/5"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between p-5 bg-white/5 rounded-3xl border border-white/10 shadow-inner">
                    <div className="flex items-center gap-4">
                      <div className="p-0.5 rounded-full border border-white/10">
                        <UserAvatar src={selectedLabel.creatorPhoto} username={selectedLabel.creatorName} size="xs" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-white uppercase tracking-widest italic">{selectedLabel.creatorName}</p>
                        <p className="text-[8px] font-bold text-white/20 uppercase tracking-[0.2em]">Deployment Contact</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest opacity-50">
                        {new Date(selectedLabel.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button 
                      onClick={() => {
                        setHiddenLabels(prev => [...prev, selectedLabel.id!]);
                        setSelectedLabel(null);
                        toast.success("Label encrypted & hidden.");
                      }}
                      className="flex-1 py-5 bg-white/5 text-white/40 rounded-3xl font-black uppercase tracking-[0.2em] text-[9px] flex items-center justify-center gap-2.5 border border-white/10 hover:bg-white/10 transition-all"
                    >
                      <EyeOff className="w-4 h-4" />
                      Hide Node
                    </button>
                    {auth.currentUser?.uid === selectedLabel.uid && (
                      <button 
                        onClick={() => handleDeleteLabel(selectedLabel.id!)}
                        className="flex-1 py-5 bg-red-500/10 text-red-500 rounded-3xl font-black uppercase tracking-[0.2em] text-[9px] flex items-center justify-center gap-2.5 border border-red-500/20 hover:bg-red-500/20 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                        Purge
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nearby Moments Horizontal Scroll */}
      <AnimatePresence>
        {showNearbyMoments && (
          <motion.div 
            initial={{ y: 200, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 200, opacity: 0 }}
            className="fixed bottom-24 left-0 right-0 z-[5000] px-4 pointer-events-none"
          >
            <div className="max-w-7xl mx-auto pointer-events-auto">
              <div className="bg-[#020617]/90 backdrop-blur-3xl rounded-[3rem] p-8 shadow-[0_30px_100px_rgba(0,0,0,0.6)] border border-blue-500/30">
                <div className="flex items-center justify-between mb-8 px-2">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-pink-600 rounded-2xl flex items-center justify-center text-white shadow-[0_0_20px_rgba(236,72,153,0.4)] border border-pink-400/30">
                      <Compass className="w-6 h-6 animate-[spin_4s_linear_infinite]" />
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-white uppercase tracking-tighter italic">Live Pulses</h4>
                      <p className="text-[10px] font-black text-pink-400 uppercase tracking-[0.3em] leading-none opacity-70">Nearby Neutral Networks</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowNearbyMoments(false)}
                    className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white transition-all transform hover:rotate-90 border border-white/5"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="flex gap-5 overflow-x-auto custom-scrollbar-none pb-4 -mx-2 px-2 scroll-smooth">
                  {moments.slice(0, 10).map((moment) => (
                    <motion.div 
                      key={`nearby-${moment.id}`}
                      whileHover={{ scale: 1.05, y: -8 }}
                      whileTap={{ scale: 0.95 }}
                      className="flex-shrink-0 w-36 aspect-[3/4] rounded-3xl overflow-hidden relative shadow-[0_15px_30px_rgba(0,0,0,0.4)] group cursor-pointer border border-white/10"
                      onClick={() => {
                        onMomentClick?.(moment.uid);
                        setShowNearbyMoments(false);
                      }}
                    >
                      <img 
                        src={moment.mediaUrl} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-transparent opacity-80" />
                      <div className="absolute bottom-4 left-4 flex items-center gap-2">
                        <div className="p-0.5 bg-[#020617] rounded-full border border-white/20">
                          <img src={moment.userPhoto} className="w-6 h-6 rounded-full" />
                        </div>
                        <span className="text-white text-[9px] font-black truncate w-24 uppercase tracking-tighter">{moment.username}</span>
                      </div>
                      <div className="absolute top-4 right-4 w-7 h-7 bg-pink-600/80 backdrop-blur-md rounded-xl flex items-center justify-center text-white border border-pink-400/30 opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100">
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </div>
                    </motion.div>
                  ))}
                  {moments.length === 0 && (
                    <div className="w-full py-20 flex flex-col items-center justify-center text-white/20">
                      <Radio className="w-16 h-16 mb-4 animate-pulse" />
                      <p className="text-[11px] font-black uppercase tracking-[0.4em]">No Frequency Detected</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
      </AnimatePresence>
        </React.Fragment>
      )}
      {/* Status Action Menu */}
      <AnimatePresence>
        {statusMenuData && (
          <React.Fragment>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setStatusMenuData(null)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9000]"
            />
            <OverlayView position={statusMenuData.pos} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
              <motion.div
                initial={{ scale: 0.8, opacity: 0, y: -20 }}
                animate={{ scale: 1, opacity: 1, y: -10 }}
                exit={{ scale: 0.8, opacity: 0, y: -20 }}
                className="bg-white dark:bg-neutral-900 rounded-[2rem] shadow-2xl p-2 min-w-[160px] border border-neutral-100 dark:border-neutral-800 z-[9001] -translate-x-1/2 -translate-y-full"
              >
                <div className="flex flex-col gap-1">
                  <button 
                    onClick={() => {
                      setStatusMenuData(null);
                      // Trigger edit via App.tsx
                      const event = new CustomEvent('edit_status', { detail: statusMenuData.text });
                      window.dispatchEvent(event);
                    }}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 dark:hover:bg-white/5 rounded-2xl text-neutral-600 dark:text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all font-black text-[10px] uppercase tracking-widest"
                  >
                    <PenLine className="w-4 h-4" /> Edit Status
                  </button>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(statusMenuData.text);
                      toast.success("Status copied to clipboard!");
                      setStatusMenuData(null);
                    }}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 dark:hover:bg-white/5 rounded-2xl text-neutral-600 dark:text-neutral-400 hover:text-pink-600 dark:hover:text-pink-400 transition-all font-black text-[10px] uppercase tracking-widest"
                  >
                    <Radio className="w-4 h-4" /> Copy Text
                  </button>
                  <div className="h-px bg-neutral-100 dark:bg-white/5 mx-2 my-1" />
                  <button 
                    onClick={async () => {
                      if (!auth.currentUser) return;
                      try {
                        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
                          status: null,
                          statusExpiresAt: null
                        });
                        toast.success("Status deleted");
                        setStatusMenuData(null);
                      } catch (err) {
                        toast.error("Failed to delete status");
                      }
                    }}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-2xl text-red-500 transition-all font-black text-[10px] uppercase tracking-widest"
                  >
                    <Trash2 className="w-4 h-4" /> Delete Signal
                  </button>
                </div>
              </motion.div>
            </OverlayView>
          </React.Fragment>
        )}
      </AnimatePresence>
    </div>
  );
});

MapVibe.displayName = "MapVibe";

export default MapVibe;

