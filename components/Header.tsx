import React from 'react';
import { LogOut } from 'lucide-react';

interface HeaderProps {
  onLogout: () => void;
  onOpenSettings?: () => void;
  sessionInfo?: string;
  onLock?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onLogout, sessionInfo }) => {
  return (
    <header className="w-full sticky top-0 z-40 bg-[#0a0c16]/70 backdrop-blur-xl pt-safe-top">
      <div className="max-w-md mx-auto px-4 py-2.5 flex items-center justify-between">
        <button
          onClick={onLogout}
          className="flex flex-col items-center text-rose-400 active:scale-95 transition"
          title="خروج"
          aria-label="خروج"
        >
          <span className="w-10 h-10 rounded-xl bg-rose-500/12 ring-1 ring-rose-500/20 flex items-center justify-center">
            <LogOut size={18} />
          </span>
          <span className="text-[10px] mt-0.5">خروج</span>
        </button>

        <div className="flex items-center gap-2.5">
          <div className="text-right">
            <div className="font-bold text-slate-100 text-base leading-tight">مدیر زندگی</div>
            {sessionInfo && (
              <span className="inline-flex items-center gap-1 mt-0.5 text-[11px] text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                {sessionInfo}
              </span>
            )}
          </div>
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-brand-900/40">
            م
          </div>
        </div>
      </div>
    </header>
  );
};
