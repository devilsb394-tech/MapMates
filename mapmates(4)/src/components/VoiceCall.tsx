import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebase/firebase';
import { collection, addDoc, onSnapshot, query, where, doc, updateDoc, deleteDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, User, Music } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { UserProfile } from '../types';
import { UserAvatar } from './UserAvatar';

interface VoiceCallProps {
  targetId: string;
  isIncoming?: boolean;
  onEnd: () => void;
}

export default function VoiceCall({ targetId, isIncoming = false, onEnd }: VoiceCallProps) {
  const [status, setStatus] = useState<'calling' | 'ringing' | 'active' | 'ended'>('calling');
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [targetProfile, setTargetProfile] = useState<UserProfile | null>(null);
  const [duration, setDuration] = useState(0);
  
  const pc = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const remoteStream = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const ringtoneRef = useRef<HTMLAudioElement>(null);
  const callId = useRef<string | null>(null);

  const servers = {
    iceServers: [
      { urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] },
    ],
    iceCandidatePoolSize: 10,
  };

  useEffect(() => {
    const fetchProfile = async () => {
      const snap = await getDoc(doc(db, 'users', targetId));
      if (snap.exists()) setTargetProfile(snap.data() as UserProfile);
    };
    fetchProfile();

    // Initialize WebRTC
    pc.current = new RTCPeerConnection(servers);
    
    pc.current.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        remoteStream.current?.addTrack(track);
      });
      if (audioRef.current) {
        audioRef.current.srcObject = event.streams[0];
      }
    };

    const startLocalStream = async () => {
      try {
        localStream.current = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        localStream.current.getTracks().forEach((track) => {
          pc.current?.addTrack(track, localStream.current!);
        });
      } catch (err) {
        console.error('Error accessing microphone:', err);
      }
    };

    startLocalStream();

    if (!isIncoming) {
      initiateCall();
    } else {
      listenForOffer();
    }

    return () => {
      endCall();
    };
  }, []);

  useEffect(() => {
    let interval: any;
    if (status === 'active') {
      interval = setInterval(() => setDuration(d => d + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [status]);

  useEffect(() => {
    if (status === 'calling' || status === 'ringing') {
      ringtoneRef.current?.play().catch(err => console.warn('Ringtone failed to play:', err));
    } else {
      ringtoneRef.current?.pause();
      if (ringtoneRef.current) ringtoneRef.current.currentTime = 0;
    }
  }, [status]);

  const initiateCall = async () => {
    if (!auth.currentUser) return;
    setStatus('calling');
    
    // Create call document
    const callDoc = await addDoc(collection(db, 'calls'), {
      from: auth.currentUser.uid,
      to: targetId,
      status: 'ringing',
      timestamp: serverTimestamp(),
      type: 'offer'
    });
    callId.current = callDoc.id;

    // Create offer
    const offerDescription = await pc.current!.createOffer();
    await pc.current!.setLocalDescription(offerDescription);

    const offer = {
      sdp: offerDescription.sdp,
      type: offerDescription.type,
    };

    await updateDoc(doc(db, 'calls', callId.current), { offer });

    // Listen for answer
    onSnapshot(doc(db, 'calls', callId.current), (snapshot) => {
      const data = snapshot.data();
      if (!pc.current!.currentRemoteDescription && data?.answer) {
        const answerDescription = new RTCSessionDescription(data.answer);
        pc.current!.setRemoteDescription(answerDescription);
        setStatus('active');
      }
      if (data?.status === 'ended') {
        endCall();
      }
    }, (err) => {
      console.error('Call status listener error:', err);
    });

    // Handle ICE candidates
    pc.current!.onicecandidate = (event) => {
      event.candidate && addDoc(collection(db, 'calls', callId.current!, 'callerCandidates'), event.candidate.toJSON());
    };

    onSnapshot(collection(db, 'calls', callId.current, 'calleeCandidates'), (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          pc.current!.addIceCandidate(new RTCIceCandidate(data));
        }
      });
    }, (err) => {
      console.error('Callee candidates listener error:', err);
    });
  };

  const listenForOffer = async () => {
    // This is handled by the parent component to show the incoming call UI
    // Here we just wait for the user to click "Accept"
    setStatus('ringing');
  };

  const acceptCall = async () => {
    if (!callId.current) return;
    setStatus('active');

    const callDoc = doc(db, 'calls', callId.current);
    const callData = (await getDoc(callDoc)).data();

    const offerDescription = callData?.offer;
    await pc.current!.setRemoteDescription(new RTCSessionDescription(offerDescription));

    const answerDescription = await pc.current!.createAnswer();
    await pc.current!.setLocalDescription(answerDescription);

    const answer = {
      type: answerDescription.type,
      sdp: answerDescription.sdp,
    };

    await updateDoc(callDoc, { answer, status: 'active' });

    onSnapshot(collection(db, 'calls', callId.current, 'callerCandidates'), (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          pc.current!.addIceCandidate(new RTCIceCandidate(data));
        }
      });
    }, (err) => {
      console.error('Caller candidates listener error:', err);
    });

    pc.current!.onicecandidate = (event) => {
      event.candidate && addDoc(collection(db, 'calls', callId.current!, 'calleeCandidates'), event.candidate.toJSON());
    };
  };

  const endCall = async () => {
    if (callId.current) {
      await updateDoc(doc(db, 'calls', callId.current), { status: 'ended' });
    }
    localStream.current?.getTracks().forEach(track => track.stop());
    pc.current?.close();
    onEnd();
  };

  const toggleMute = () => {
    if (localStream.current) {
      localStream.current.getAudioTracks()[0].enabled = isMuted;
      setIsMuted(!isMuted);
    }
  };

  const formatDuration = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 z-[10000] bg-neutral-900/95 backdrop-blur-2xl flex flex-col items-center justify-center p-8 text-white"
    >
      <div className="flex-1 flex flex-col items-center justify-center gap-8">
        <div className="relative">
          <motion.div 
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 bg-blue-500/20 rounded-full blur-3xl"
          />
          {targetProfile?.photoURL ? (
            <UserAvatar 
              src={targetProfile.photoURL} 
              username={targetProfile.username} 
              size="xl" 
              className="w-32 h-32 lg:w-48 lg:h-48 rounded-[3rem] shadow-2xl relative z-10 border-4 border-white/10"
            />
          ) : (
            <div className="w-32 h-32 lg:w-48 lg:h-48 bg-neutral-800 rounded-[3rem] flex items-center justify-center relative z-10">
              <User className="w-16 h-16 text-neutral-600" />
            </div>
          )}
        </div>

        <div className="text-center space-y-2">
          <h2 className="text-3xl lg:text-4xl font-black tracking-tighter">{targetProfile?.username || 'User'}</h2>
          <p className="text-blue-400 font-bold uppercase tracking-widest text-xs">
            {status === 'calling' ? 'Calling...' : 
             status === 'ringing' ? 'Ringing...' : 
             status === 'active' ? formatDuration(duration) : 'Ending...'}
          </p>
        </div>
      </div>

      <div className="w-full max-w-md flex items-center justify-around gap-4 pb-12">
        <button 
          onClick={toggleMute}
          className={cn(
            "p-6 rounded-full transition-all duration-300",
            isMuted ? "bg-white text-neutral-900" : "bg-neutral-800 text-white hover:bg-neutral-700"
          )}
        >
          {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>

        {status === 'ringing' && isIncoming ? (
          <button 
            onClick={acceptCall}
            className="p-8 bg-green-500 text-white rounded-full hover:bg-green-600 transition-all duration-300 shadow-2xl shadow-green-500/20 animate-bounce"
          >
            <Phone className="w-8 h-8" />
          </button>
        ) : null}

        <button 
          onClick={endCall}
          className="p-8 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all duration-300 shadow-2xl shadow-red-500/20"
        >
          <PhoneOff className="w-8 h-8" />
        </button>

        <button 
          onClick={() => setIsSpeaker(!isSpeaker)}
          className={cn(
            "p-6 rounded-full transition-all duration-300",
            isSpeaker ? "bg-white text-neutral-900" : "bg-neutral-800 text-white hover:bg-neutral-700"
          )}
        >
          {isSpeaker ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
        </button>
      </div>

      <audio ref={audioRef} autoPlay playsInline className="hidden" />
      {/* Ringtone logic would go here */}
      <audio ref={ringtoneRef} loop className="hidden">
        <source src="https://assets.mixkit.co/sfx/preview/mixkit-outgoing-call-signal-ring-2144.mp3" type="audio/mpeg" />
      </audio>
    </motion.div>
  );
}
