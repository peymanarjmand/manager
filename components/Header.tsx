import React, { useState, useEffect } from 'react';
import { BellIcon, LogoutIcon, ClockIcon } from './Icons';

export const Header = ({ onLogout }: { onLogout: () => void; }): React.ReactNode => {
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    const timerId = setInterval(() => {
        setElapsedTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timerId);
  }, []);

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  return (
    <header className="p-4 sm:p-6 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-sky-400">
          مدیر زندگی
        </h1>
        <div className="flex items-center space-x-4 text-slate-300">
            {/* Session Timer */}
            <div className="flex items-center space-x-2" title="زمان استفاده از برنامه">
                <ClockIcon className="h-5 w-5" />
                <span className="font-mono text-sm tracking-wider">{formatTime(elapsedTime)}</span>
            </div>

            {/* Separator */}
            <div className="w-px h-6 bg-slate-600"></div>

            {/* Notifications */}
            <div className="hover:text-sky-400 transition-colors cursor-pointer" title="اعلانات">
                <BellIcon />
            </div>

            {/* Logout */}
            <button onClick={onLogout} className="hover:text-rose-400 transition-colors" title="خروج">
                <LogoutIcon />
            </button>
        </div>
      </div>
    </header>
  );
};