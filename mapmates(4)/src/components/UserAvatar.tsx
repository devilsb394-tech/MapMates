import React from 'react';
import { cn } from '../lib/utils';

interface UserAvatarProps {
  src?: string;
  username?: string;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  online?: boolean;
  unreadCount?: number;
  onClick?: () => void;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ 
  src, 
  username = 'User', 
  className,
  size = 'md',
  online,
  unreadCount,
  onClick
}) => {
  const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random`;
  const displaySrc = src || fallbackUrl;

  const sizeClasses = {
    xs: 'w-8 h-8 rounded-lg',
    sm: 'w-10 h-10 rounded-xl',
    md: 'w-12 h-12 rounded-2xl',
    lg: 'w-14 h-14 rounded-2xl',
    xl: 'w-24 h-24 rounded-[2rem]'
  };

  return (
    <div 
      className={cn("relative shrink-0", className, onClick && "cursor-pointer active:scale-95 transition-transform")}
      onClick={onClick}
    >
      <img 
        src={displaySrc} 
        alt={username} 
        className={cn("object-cover", sizeClasses[size])}
        onError={(e) => {
          (e.target as HTMLImageElement).src = fallbackUrl;
        }}
      />
      {online !== undefined && (
        <div className={cn(
          "absolute border-2 border-white dark:border-neutral-900 rounded-full",
          size === 'xs' ? "w-2.5 h-2.5 -top-0.5 -right-0.5" : "w-4 h-4 -top-1 -right-1",
          online ? "bg-green-500" : "bg-neutral-300"
        )} />
      )}
      {unreadCount !== undefined && unreadCount > 0 && (
        <div className="absolute -bottom-1 -right-1 bg-red-600 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white dark:border-neutral-900 shadow-sm animate-in zoom-in">
          {unreadCount > 9 ? '9+' : unreadCount}
        </div>
      )}
    </div>
  );
};
