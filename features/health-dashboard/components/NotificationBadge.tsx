import React, { useState, useEffect } from 'react';
import { BellIcon } from '../../../components/Icons';

interface NotificationBadgeProps {
  count: number;
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({ count }) => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (count > 0) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [count]);

  return (
    <div className="relative">
      <button className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors relative">
        <BellIcon />
        {count > 0 && (
          <span className={`absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center text-xs font-bold ${
            isAnimating ? 'animate-bounce' : ''
          }`}>
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>
    </div>
  );
};