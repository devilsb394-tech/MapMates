import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { toast } from 'sonner';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): string {
  const d = getDistanceNumber(lat1, lon1, lat2, lon2);
  
  if (d < 0.005) { // Less than 5 meters
    return "Right here";
  }
  if (d < 1) {
    return `${Math.round(d * 1000)}m away`;
  }
  return `${d.toFixed(1)}km away`;
}

export function getDistanceNumber(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

export function handleQuotaError(error: any, componentName: string) {
  if (error.code === 'resource-exhausted' || error.message?.includes('Quota exceeded')) {
    console.warn(`[${componentName}] Firestore quota exceeded. Real-time features paused.`);
    toast.error('Daily limit reached', {
      description: 'The app has reached its free tier limit for today. Real-time features will resume tomorrow.',
      duration: 10000
    });
    return true;
  }
  console.error(`[${componentName}] Firestore error:`, error);
  return false;
}
