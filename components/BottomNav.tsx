import React from 'react';
import { View } from '../types';

const PATHS: Record<string, string[]> = {
  home: ['M3 11.5 12 4l9 7.5', 'M5.5 10.5V20h13v-9.5'],
  wallet: ['M3 8.5A2.5 2.5 0 0 1 5.5 6H18a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5.5A2.5 2.5 0 0 1 3 16.5z', 'M16.5 12.5h.01'],
  coin: ['M12 7.5c3.9 0 7 1.3 7 3s-3.1 3-7 3-7-1.3-7-3 3.1-3 7-3z', 'M5 10.5v3.5c0 1.7 3.1 3 7 3s7-1.3 7-3v-3.5'],
  check: ['M8.5 5H17a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2', 'm8.5 12 2 2 4-4'],
  plus: ['M12 5v14', 'M5 12h14'],
};

const NavIcon = ({ name, className }: { name: string; className?: string }): React.ReactNode => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className={className || 'w-[22px] h-[22px]'} aria-hidden="true">
    {PATHS[name].map((d, i) => <path key={i} d={d} />)}
  </svg>
);

interface NavItem { id: View; label: string; icon: string; }
const ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'خانه', icon: 'home' },
  { id: 'smart-accountant', label: 'حسابدار', icon: 'wallet' },
  { id: 'assets', label: 'دارایی', icon: 'coin' },
  { id: 'daily-tasks', label: 'کارها', icon: 'check' },
];

interface Props {
  currentView: View;
  onNavigate: (view: View) => void;
}

/**
 * Persistent bottom navigation for mobile, with a central quick-access FAB to the
 * Smart Accountant. Respects the device safe area.
 */
export const BottomNav = ({ currentView, onNavigate }: Props): React.ReactNode => {
  const item = (it: NavItem) => {
    const active = currentView === it.id;
    return (
      <button
        key={it.id}
        onClick={() => onNavigate(it.id)}
        aria-current={active ? 'page' : undefined}
        aria-label={it.label}
        className={`flex flex-1 flex-col items-center justify-center gap-1 py-1 transition-colors ${active ? 'text-brand-400' : 'text-slate-500 hover:text-slate-300'}`}
      >
        <NavIcon name={it.icon} />
        <span className="text-[10px] font-medium">{it.label}</span>
      </button>
    );
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 bg-slate-900/95 backdrop-blur pb-safe-bottom" aria-label="ناوبری اصلی">
      <div className="mx-auto flex max-w-2xl items-center px-2" style={{ height: 60 }}>
        {item(ITEMS[0])}
        {item(ITEMS[1])}
        <div className="flex w-16 shrink-0 justify-center">
          <button
            onClick={() => onNavigate('smart-accountant')}
            aria-label="افزودن سریع در حسابدار"
            className="-mt-7 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-lg shadow-brand-500/30 ring-4 ring-slate-900 transition active:scale-95"
          >
            <NavIcon name="plus" className="w-7 h-7" />
          </button>
        </div>
        {item(ITEMS[2])}
        {item(ITEMS[3])}
      </div>
    </nav>
  );
};

export default BottomNav;
