/**
 * ChatInbox Component
 * Handles real-time messaging and conversation listing.
 */
import React, { useState, useEffect, useRef } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase/firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc, limit, setDoc, updateDoc, increment, startAfter, getDocs } from 'firebase/firestore';
import { Message, UserProfile, Conversation } from '../types';
import { X, Send, Phone, Video, MoreVertical, Smile, Check, CheckCheck, MessageSquare, ChevronLeft, Paperclip, Image as ImageIcon, FileText, Music, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { uploadFile } from '../supabase/supabase';
import { cn, handleQuotaError } from '../lib/utils';
import { UserAvatar } from './UserAvatar';

interface ChatInboxProps {
  selectedChatId: string | null;
  onSelectChat: (id: string | null) => void;
  onCall: (id: string) => void;
}

export default function ChatInbox({ selectedChatId, onSelectChat, onCall }: ChatInboxProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(selectedChatId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [targetUser, setTargetUser] = useState<UserProfile | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [remoteTyping, setRemoteTyping] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [lastVisibleConv, setLastVisibleConv] = useState<any>(null);
  const [hasMoreConvs, setHasMoreConvs] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inboxScrollRef = useRef<HTMLDivElement>(null);

  // Fetch conversations
  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', auth.currentUser.uid),
      orderBy('lastMessageTimestamp', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, async (snap) => {
      const convs = await Promise.all(snap.docs.map(async (d) => {
        const data = d.data() as Conversation;
        const targetId = data.participants.find(p => p !== auth.currentUser?.uid);
        let targetUserData;
        if (targetId) {
          const uSnap = await getDoc(doc(db, 'users', targetId));
          targetUserData = uSnap.data() as UserProfile;
        }
        return { id: d.id, ...data, targetUser: targetUserData };
      }));
      
      // Sort: Unread first, then by timestamp
      const sortedConvs = [...convs].sort((a, b) => {
        const aUnread = (a.unreadCount?.[auth.currentUser?.uid || ''] || 0) > 0;
        const bUnread = (b.unreadCount?.[auth.currentUser?.uid || ''] || 0) > 0;
        if (aUnread && !bUnread) return -1;
        if (!aUnread && bUnread) return 1;
        return new Date(b.lastMessageTimestamp).getTime() - new Date(a.lastMessageTimestamp).getTime();
      });

      setConversations(sortedConvs);
      setLastVisibleConv(snap.docs[snap.docs.length - 1]);
      setLoadingConversations(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'conversations');
      setLoadingConversations(false);
    });

    return () => unsubscribe();
  }, []);

  // Infinite scroll for conversations
  const loadMoreConversations = async () => {
    if (!auth.currentUser || !lastVisibleConv || !hasMoreConvs) return;

    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', auth.currentUser.uid),
      orderBy('lastMessageTimestamp', 'desc'),
      startAfter(lastVisibleConv),
      limit(20)
    );

    const snap = await getDocs(q);
    if (snap.empty) {
      setHasMoreConvs(false);
      return;
    }

    const newConvs = await Promise.all(snap.docs.map(async (d) => {
      const data = d.data() as Conversation;
      const targetId = data.participants.find(p => p !== auth.currentUser?.uid);
      let targetUserData;
      if (targetId) {
        const uSnap = await getDoc(doc(db, 'users', targetId));
        targetUserData = uSnap.data() as UserProfile;
      }
      return { id: d.id, ...data, targetUser: targetUserData };
    }));

    setConversations(prev => [...prev, ...newConvs]);
    setLastVisibleConv(snap.docs[snap.docs.length - 1]);
  };

  // Handle selectedChatId from props
  useEffect(() => {
    setActiveChat(selectedChatId);
    if (selectedChatId && auth.currentUser) {
      if (selectedChatId === auth.currentUser.uid) {
        toast.error("You cannot message yourself!");
        onSelectChat(null);
        return;
      }
      
      // Ensure conversation exists
      const convId = [auth.currentUser.uid, selectedChatId].sort().join('_');
      getDoc(doc(db, 'conversations', convId)).then(snap => {
        if (!snap.exists()) {
          setDoc(doc(db, 'conversations', convId), {
            participants: [auth.currentUser!.uid, selectedChatId],
            lastMessage: '',
            lastMessageTimestamp: new Date().toISOString(),
            lastMessageSenderId: '',
            unreadCount: { [auth.currentUser!.uid]: 0, [selectedChatId]: 0 }
          });
        }
      });
    }
  }, [selectedChatId]);

  // Fetch messages and target user info
  useEffect(() => {
    if (!activeChat || !auth.currentUser) return;

    // Fetch target user info
    getDoc(doc(db, 'users', activeChat)).then(snap => {
      if (snap.exists()) setTargetUser(snap.data() as UserProfile);
    });

    // Fetch messages
    const convId = [auth.currentUser.uid, activeChat].sort().join('_');
    const q = query(
      collection(db, 'conversations', convId, 'messages'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, async (snap) => {
      const msgs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(msgs.reverse());
      
      // Mark as read if conversation exists
      const convRef = doc(db, 'conversations', convId);
      const convSnap = await getDoc(convRef);
      if (convSnap.exists()) {
        await updateDoc(convRef, {
          [`unreadCount.${auth.currentUser!.uid}`]: 0
        });
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'messages');
    });

    // Listen for typing status
    const unsubTyping = onSnapshot(doc(db, 'conversations', convId), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Conversation;
        setRemoteTyping(!!data.typing?.[activeChat]);
      } else {
        setRemoteTyping(false);
      }
    }, (err) => {
      if (err.code !== 'resource-exhausted' && err.code !== 'permission-denied') {
        handleFirestoreError(err, OperationType.GET, 'conversations/typing');
      }
    });

    return () => {
      unsubscribe();
      unsubTyping();
    };
  }, [activeChat]);

  // Handle typing status updates
  useEffect(() => {
    if (!activeChat || !auth.currentUser) return;
    const convId = [auth.currentUser.uid, activeChat].sort().join('_');
    
    const updateTyping = async (typing: boolean) => {
      try {
        const convRef = doc(db, 'conversations', convId);
        const convSnap = await getDoc(convRef);
        if (convSnap.exists()) {
          await updateDoc(convRef, {
            [`typing.${auth.currentUser!.uid}`]: typing
          });
        }
      } catch (err: any) {
        if (err.code !== 'permission-denied') {
          handleFirestoreError(err, OperationType.UPDATE, 'conversations/typing');
        }
      }
    };

    if (newMessage.length > 0) {
      if (!isTyping) {
        setIsTyping(true);
        updateTyping(true);
      }
      
      const timeout = setTimeout(() => {
        setIsTyping(false);
        updateTyping(false);
      }, 3000);
      
      return () => clearTimeout(timeout);
    } else if (isTyping) {
      setIsTyping(false);
      updateTyping(false);
    }
  }, [newMessage, activeChat]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat || !auth.currentUser) return;

    const convId = [auth.currentUser.uid, activeChat].sort().join('_');
    const timestamp = new Date().toISOString();
    const msgData = {
      senderId: auth.currentUser.uid,
      receiverId: activeChat,
      text: newMessage,
      timestamp,
      read: false
    };

    setNewMessage('');
    
    try {
      const convRef = doc(db, 'conversations', convId);
      const convSnap = await getDoc(convRef);
      
      const updateData: any = {
        lastMessage: newMessage,
        lastMessageTimestamp: timestamp,
        lastMessageSenderId: auth.currentUser.uid,
        [`unreadCount.${activeChat}`]: increment(1)
      };

      if (!convSnap.exists()) {
        await setDoc(convRef, {
          participants: [auth.currentUser.uid, activeChat],
          ...updateData,
          unreadCount: { [auth.currentUser.uid]: 0, [activeChat]: 1 }
        });
      } else {
        await updateDoc(convRef, updateData);
      }

      await addDoc(collection(db, 'conversations', convId, 'messages'), msgData);

      // Create notification for receiver
      const currentUserSnap = await getDoc(doc(db, 'users', auth.currentUser.uid));
      const currentUserData = currentUserSnap.data() as UserProfile;
      
      await addDoc(collection(db, 'notifications'), {
        uid: activeChat,
        fromId: auth.currentUser.uid,
        fromName: currentUserData.username,
        fromPhoto: currentUserData.photoURL,
        type: 'message',
        text: `sent you a message: ${newMessage.substring(0, 30)}${newMessage.length > 30 ? '...' : ''}`,
        chatId: auth.currentUser.uid,
        read: false,
        timestamp
      });
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, 'messages');
      toast.error("Failed to send message");
    }
  };

  const handleCall = () => {
    toast.info("This feature is coming soon!");
  };

  return (
    <div className="flex h-full w-full bg-[#020617] overflow-hidden">
      {/* Conversations List */}
      <div className={cn(
        "w-full lg:w-96 bg-[#020617] border-r border-white/5 flex flex-col h-full overflow-hidden shrink-0",
        activeChat && "hidden lg:flex"
      )}>
        <div className="p-6 md:p-8 border-b border-white/5 flex items-center justify-between bg-[#020617]/50 backdrop-blur-xl">
          <div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-white uppercase italic leading-none">Inbox</h2>
            <p className="text-[10px] text-blue-400/60 font-black uppercase tracking-[0.2em] mt-1.5">Neural Channels</p>
          </div>
          <div className="w-12 h-12 bg-blue-600/10 rounded-2xl flex items-center justify-center border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
            <MessageSquare className="w-6 h-6 text-blue-400" />
          </div>
        </div>
        <div 
          className="flex-1 overflow-y-auto custom-scrollbar min-h-0 bg-transparent"
          ref={inboxScrollRef}
          onScroll={(e) => {
            const target = e.target as HTMLDivElement;
            if (target.scrollHeight - target.scrollTop === target.clientHeight) {
              loadMoreConversations();
            }
          }}
        >
          {loadingConversations ? (
            <div className="flex flex-col items-center justify-center p-20 gap-6 h-full">
              <div className="relative">
                <div className="w-12 h-12 border-2 border-blue-500/20 rounded-full animate-pulse" />
                <div className="absolute inset-0 border-2 border-t-blue-500 rounded-full animate-spin shadow-[0_0_15px_rgba(59,130,246,0.3)]" />
              </div>
              <p className="text-[9px] font-black text-blue-400 uppercase tracking-[0.4em] animate-pulse italic">Connecting to Neural Matrix...</p>
            </div>
          ) : conversations.length > 0 ? (
            conversations.map((conv) => {
              const isSelected = activeChat === conv.targetUser?.uid;
              const unread = conv.unreadCount?.[auth.currentUser?.uid || ''] || 0;
              return (
                <div
                  key={conv.id}
                  onClick={() => onSelectChat(conv.targetUser?.uid || null)}
                  className={cn(
                    "flex items-center gap-4 p-5 cursor-pointer transition-all duration-300 border-b border-white/[0.03] group relative overflow-hidden",
                    isSelected 
                      ? "bg-blue-600/10 border-r-4 border-blue-500 shadow-[inset_0_0_20px_rgba(59,130,246,0.1)]" 
                      : "hover:bg-white/[0.03]"
                  )}
                >
                  {isSelected && <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent pointer-events-none" />}
                  
                  <div className="relative z-10">
                    <UserAvatar 
                      src={conv.targetUser?.photoURL} 
                      username={conv.targetUser?.username} 
                      size="lg" 
                      online={conv.targetUser?.isOnline}
                      unreadCount={unread}
                      className={cn(
                        "border-2 transition-colors",
                        isSelected ? "border-blue-500" : "border-white/5 group-hover:border-white/20"
                      )}
                    />
                  </div>
                  <div className="flex-1 min-w-0 relative z-10">
                    <div className="flex justify-between items-center mb-1">
                      <p className={cn(
                        "font-black text-sm tracking-tight transition-colors truncate",
                        isSelected ? "text-blue-400" : "text-white"
                      )}>{conv.targetUser?.username}</p>
                      <span className="text-[9px] text-white/30 font-black uppercase tracking-widest">
                        {conv.lastMessageTimestamp ? format(new Date(conv.lastMessageTimestamp), 'h:mm a') : ''}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className={cn(
                        "text-[11px] truncate font-medium tracking-tight",
                        unread > 0 ? "text-white font-black" : "text-white/40"
                       )}>
                        {conv.lastMessageSenderId === auth.currentUser?.uid ? (
                          <span className="text-blue-500/60 mr-1">YOU:</span>
                        ) : ''}
                        {conv.lastMessage || 'Initialize dialogue'}
                      </p>
                      {unread > 0 && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center p-12 h-full min-h-[300px]">
               <div className="w-20 h-20 bg-blue-600/5 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-blue-500/10 shadow-[inner_0_0_15px_rgba(59,130,246,0.1)] group hover:scale-110 transition-all duration-700">
                <MessageSquare className="w-8 h-8 text-blue-500/20 group-hover:text-blue-500/60 transition-colors" />
               </div>
              <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase leading-none mb-3">0 Chats</h3>
              <p className="text-blue-400/40 font-black text-[9px] uppercase tracking-[0.3em] max-w-[180px] mx-auto leading-relaxed text-center">Neural directory empty. Initialize first contact on the sector map.</p>
            </div>
          )}
        </div>
      </div>

      {/* Chat Window */}
      <div className={cn(
        "flex-1 flex flex-col bg-[#020617] overflow-hidden h-full relative",
        !activeChat && "hidden lg:flex"
      )}>
        {/* Background Decorative Pattern */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(circle_at_2px_2px,rgba(255,255,255,0.1)_1px,transparent_0)] bg-[size:32px_32px]" />
        
        {activeChat && targetUser ? (
          <div className="flex flex-col h-full w-full overflow-hidden relative z-10">
            {/* Header */}
            <div className="h-20 md:h-24 bg-[#020617]/80 backdrop-blur-2xl border-b border-white/5 px-4 md:px-10 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => onSelectChat(null)}
                  className="lg:hidden w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-white/50"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <div className="relative">
                  <UserAvatar 
                    src={targetUser.photoURL} 
                    username={targetUser.username} 
                    size="md" 
                    online={targetUser.isOnline}
                    className="border-2 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                  />
                </div>
                <div>
                  <p className="font-black text-white tracking-tighter text-lg leading-none uppercase italic">{targetUser.username}</p>
                  {remoteTyping ? (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="flex gap-0.5">
                        <span className="w-1 h-1 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <span className="w-1 h-1 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <span className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" />
                      </span>
                      <p className="text-[9px] text-blue-400 font-black uppercase tracking-[0.2em] leading-none">Syncing Intel...</p>
                    </div>
                  ) : (
                    <p className={cn(
                      "text-[9px] font-black tracking-[0.2em] uppercase mt-1.5 leading-none",
                      targetUser.isOnline ? "text-green-500/80" : "text-white/20"
                    )}>
                      {targetUser.isOnline ? 'Active Pulse' : 'Offline Mode'}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleCall} 
                  className="w-11 h-11 bg-white/5 hover:bg-blue-600/20 text-white/30 hover:text-blue-400 rounded-2xl transition-all border border-white/5 hover:border-blue-500/30 flex items-center justify-center"
                >
                  <Phone className="w-5 h-5" />
                </button>
                <button 
                  onClick={handleCall} 
                  className="w-11 h-11 bg-white/5 hover:bg-blue-600/20 text-white/30 hover:text-blue-400 rounded-2xl transition-all border border-white/5 hover:border-blue-500/30 flex items-center justify-center"
                >
                  <Video className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-10 space-y-8 custom-scrollbar bg-transparent">
              {messages.map((msg, idx) => {
                const isMe = msg.senderId === auth.currentUser?.uid;
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, x: isMe ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn("flex flex-col w-full", isMe ? "items-end" : "items-start")}
                  >
                    <div className={cn(
                      "max-w-[85%] md:max-w-[70%] p-5 rounded-[2.5rem] shadow-2xl relative overflow-hidden group",
                      isMe 
                        ? "bg-blue-600/90 backdrop-blur-md text-white rounded-tr-none border border-white/20" 
                        : "bg-white/5 backdrop-blur-xl text-white rounded-tl-none border border-white/10"
                    )}>
                      {isMe && <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />}
                      
                      {msg.mediaUrl ? (
                        <div className="space-y-4">
                          {msg.mediaType === 'image' && (
                            <div className="relative rounded-3xl overflow-hidden border border-white/10">
                              <img src={msg.mediaUrl} alt="Shared" className="w-full max-h-[32rem] object-cover hover:scale-105 transition-transform duration-700 cursor-pointer" onClick={() => window.open(msg.mediaUrl, '_blank')} />
                            </div>
                          )}
                          {msg.mediaType === 'video' && (
                            <video src={msg.mediaUrl} controls className="rounded-3xl max-h-[32rem] w-full border border-white/10" />
                          )}
                          {msg.mediaType === 'audio' && (
                            <div className="p-4 bg-black/20 rounded-2xl border border-white/10">
                               <audio src={msg.mediaUrl} controls className="w-full h-10 invert brightness-100" />
                            </div>
                          )}
                          {msg.mediaType === 'file' && (
                            <a href={msg.mediaUrl} target="_blank" rel="noreferrer" className="flex items-center gap-4 p-5 bg-white/5 rounded-3xl hover:bg-white/10 transition-all border border-white/10 group/file">
                              <div className="w-12 h-12 bg-blue-600/20 rounded-2xl flex items-center justify-center text-blue-400 group-hover/file:scale-110 transition-transform">
                                <FileText className="w-6 h-6" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="text-xs font-black uppercase tracking-widest block truncate">Secure Data Packet</span>
                                <span className="text-[9px] text-white/40 uppercase tracking-[0.2em] mt-1 block">Download Protocol</span>
                              </div>
                            </a>
                          )}
                          {msg.text && !msg.text.includes('Sent a') && !msg.text.includes('📎') && (
                            <p className="text-sm font-medium leading-relaxed tracking-tight px-1">{msg.text}</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm font-medium leading-relaxed tracking-tight px-1">{msg.text}</p>
                      )}
                      
                      <div className={cn("flex items-center gap-2 mt-3 px-1", isMe ? "justify-end" : "justify-start opacity-40")}>
                        <span className={cn("text-[9px] font-black uppercase tracking-[0.1em]", isMe ? "text-white/60" : "text-white/40")}>
                          {format(new Date(msg.timestamp), 'h:mm a')}
                        </span>
                        {isMe && (
                          <div className={cn(
                            "flex items-center",
                            msg.read ? "text-blue-400 shadow-[0_0_8px_#3b82f6]" : "text-white/40"
                          )}>
                            {msg.read ? <CheckCheck className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              <div ref={scrollRef} />
            </div>

            {/* Footer Input */}
            <div className="p-4 md:p-8 bg-[#020617]/80 backdrop-blur-3xl border-t border-white/5 shrink-0">
              <form 
                onSubmit={handleSendMessage} 
                className="flex items-center gap-3 md:gap-5 max-w-5xl mx-auto"
              >
                <div className="flex items-center gap-2">
                  <button 
                    type="button" 
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.onchange = async (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (!file || !activeChat || !auth.currentUser) return;
                        const type = file.type.split('/')[0];
                        const mediaType = type === 'image' || type === 'video' || type === 'audio' ? type : 'file';
                        
                        toast.promise(async () => {
                          const path = `chat/${[auth.currentUser!.uid, activeChat].sort().join('_')}/${Date.now()}_${file.name}`;
                          const url = await uploadFile('moments', path, file);
                          if (!url) throw new Error("Upload failed");
                          const convId = [auth.currentUser!.uid, activeChat].sort().join('_');
                          const timestamp = new Date().toISOString();
                          const msgData = {
                            senderId: auth.currentUser!.uid,
                            receiverId: activeChat,
                            text: `Secure Transmission: ${mediaType}`,
                            mediaUrl: url,
                            mediaType: mediaType,
                            timestamp,
                            read: false
                          };
                          const convRef = doc(db, 'conversations', convId);
                          await updateDoc(convRef, {
                            lastMessage: `📎 ${mediaType}`,
                            lastMessageTimestamp: timestamp,
                            lastMessageSenderId: auth.currentUser!.uid,
                            [`unreadCount.${activeChat}`]: increment(1)
                          });
                          await addDoc(collection(db, 'conversations', convId, 'messages'), msgData);
                        }, {
                          loading: 'Encrypting and sending packet...',
                          success: 'Data transmitted.',
                          error: 'Transmission failed.'
                        });
                      };
                      input.click();
                    }}
                    className="w-12 h-12 bg-white/5 hover:bg-blue-600/20 text-white/30 hover:text-blue-400 rounded-2xl transition-all border border-white/5 hover:border-blue-500/30 flex items-center justify-center shrink-0"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>
                  <div className="relative group shrink-0">
                    <button 
                      type="button"
                      className="w-12 h-12 bg-white/5 hover:bg-blue-600/20 text-white/30 hover:text-blue-400 rounded-2xl transition-all border border-white/5 hover:border-blue-500/30 flex items-center justify-center"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    >
                      <Smile className="w-5 h-5" />
                    </button>
                    {showEmojiPicker && (
                      <div className="absolute bottom-full left-0 mb-4 p-3 bg-[#020617] backdrop-blur-2xl rounded-[1.5rem] shadow-2xl border border-white/10 grid grid-cols-5 gap-2 z-50 min-w-[200px]">
                        {['😊', '😂', '🥰', '😍', '🤩', '😎', '🤔', '🔥', '✨', '💯', '❤️', '📍', '🚀', '👀', '🎮'].map(emoji => (
                          <button 
                            key={emoji}
                            type="button"
                            onClick={() => {
                              setNewMessage(prev => prev + emoji);
                              setShowEmojiPicker(false);
                            }}
                            className="w-10 h-10 flex items-center justify-center hover:bg-blue-600/20 border border-transparent hover:border-blue-500/30 rounded-xl text-xl transition-all"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="Input Protocol Payload..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-[1.5rem] md:rounded-[2rem] py-4 px-6 md:px-8 focus:ring-2 focus:ring-blue-500/50 focus:bg-white/10 transition-all outline-none font-black text-sm text-white placeholder:text-white/10 truncate tracking-tight uppercase italic"
                  />
                  <div className="absolute inset-0 rounded-[2rem] bg-blue-500/5 blur-xl pointer-events-none -z-10" />
                </div>

                <button 
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="w-12 h-12 md:w-16 md:h-16 bg-blue-600 text-white rounded-2xl md:rounded-[1.5rem] hover:bg-blue-500 disabled:bg-white/5 disabled:text-white/10 transition-all shadow-[0_0_30px_rgba(37,99,235,0.4)] flex items-center justify-center group shrink-0 active:scale-95"
                >
                  <Send className="w-5 h-5 md:w-6 md:h-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 relative z-10">
            <div className="w-28 h-28 bg-white/5 rounded-[3rem] flex items-center justify-center mb-10 border border-white/5 shadow-2xl group animate-pulse">
              <MessageSquare className="w-12 h-12 text-blue-500 group-hover:scale-110 transition-transform shadow-[0_0_20px_#3b82f6]" />
            </div>
            <h3 className="text-3xl font-black tracking-tighter text-white mb-3 uppercase italic">System: Interface Idle</h3>
            <p className="text-blue-400/40 font-black text-[11px] uppercase tracking-[0.3em] max-w-xs mx-auto">Select a neural link from the communications array to initialize secure dialogue protocols.</p>
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-64 h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
          </div>
        )}
      </div>
    </div>
  );
}
