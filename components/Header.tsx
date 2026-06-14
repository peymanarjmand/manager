import React from 'react';
import { LogoutIcon, LockIcon, SettingsIcon } from './Icons';

interface HeaderProps {
  onLogout: () => void;
  onOpenSettings?: () => void;
  sessionInfo?: string;
  onLock?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onLogout, onOpenSettings, sessionInfo, onLock }) => {
  return (
    <header className="w-full bg-slate-900/80 backdrop-blur sticky top-0 z-40 border-b border-slate-800 pt-safe-top">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5 text-slate-300">
          <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center text-white font-bold text-sm">م</div>
          <div className="font-bold text-slate-100">مدیر زندگی</div>
          {sessionInfo && (
            <span className="text-[11px] bg-slate-800 text-slate-400 rounded-full px-2 py-0.5 border border-slate-700">{sessionInfo}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onLock && (
            <button
              onClick={onLock}
              className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-md bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 transition"
              title="قفل"
            >
              <LockIcon />
              <span className="hidden sm:inline">قفل</span>
            </button>
          )}
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-md bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 transition"
              title="تنظیمات"
            >
              <SettingsIcon />
              <span className="hidden sm:inline">تنظیمات</span>
            </button>
          )}
          <button
            onClick={onLogout}
            className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-md bg-rose-600/90 text-white hover:bg-rose-600 border border-rose-500 transition"
            title="خروج"
          >
            <LogoutIcon />
            <span className="hidden sm:inline">خروج</span>
          </button>
        </div>
      </div>
    </header>
  );
};