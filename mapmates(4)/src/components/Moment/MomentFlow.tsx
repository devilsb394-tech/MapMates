import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { UserProfile } from '../../types';
import MomentCamera from './MomentCamera';
import MomentEditor from './MomentEditor';
import MomentPosting from './MomentPosting';

interface MomentFlowProps {
  userProfile: UserProfile | null;
  onClose: () => void;
  onSuccess: () => void;
  onOptimisticMoment?: (moment: any) => void;
}

export type MomentStep = 'camera' | 'editor' | 'posting';

export default function MomentFlow({ userProfile, onClose, onSuccess, onOptimisticMoment }: MomentFlowProps) {
  const [step, setStep] = useState<MomentStep>('camera');
  const [mediaData, setMediaData] = useState<string | null>(null);
  const [editedMedia, setEditedMedia] = useState<string | null>(null);
  const [layers, setLayers] = useState<any[]>([]);
  const [filters, setFilters] = useState<any>({ activeFilter: 'normal', blur: 0 });

  const handleCapture = (data: string) => {
    setMediaData(data);
    setStep('editor');
  };

  const handleEdited = (data: string, finalLayers: any[], finalFilters: any) => {
    setEditedMedia(data);
    setLayers(finalLayers);
    setFilters(finalFilters);
    setStep('posting');
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="fixed inset-0 z-[2000] bg-black overflow-hidden"
      >
        {step === 'camera' && (
          <MomentCamera 
            onCapture={handleCapture} 
            onClose={onClose} 
          />
        )}
        
        {step === 'editor' && mediaData && (
          <MomentEditor 
            media={mediaData} 
            onNext={handleEdited}
            onBack={() => setStep('camera')}
            userProfile={userProfile}
          />
        )}

        {step === 'posting' && editedMedia && (
          <MomentPosting 
            media={editedMedia}
            layers={layers}
            filters={filters}
            onComplete={onSuccess}
            onBack={() => setStep('editor')}
            onOptimisticMoment={onOptimisticMoment}
            userProfile={userProfile}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
