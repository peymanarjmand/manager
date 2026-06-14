import React from 'react';
import { Home, Wallet, Coins, ListChecks, Plus } from 'lucide-react';
import { View } from '../types';

interface NavItem { id: View; label: string; Icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>; }
const ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'خانه', Icon: Home },
  { id: 'smart-accountant', label: 'حسابدار', Icon: Wallet },
  { id: 'assets', label: 'دارایی', Icon: Coins },
  { id: 'daily-tasks', label: 'کارها', Icon: ListChecks },
];

interface Props {
  currentView: View;
  onNavigate: (view: View) => void;
}

/** Mobile bottom navigation with a glowing central quick-access FAB. */
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
        <it.Icon size={23} strokeWidth={active ? 2.4 : 1.9} />
        <span className="text-[10px] font-medium">{it.label}</span>
      </button>
    );
  };

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/5 bg-[#0c0e1a]/90 backdrop-blur-xl pb-safe-bottom"
      aria-label="ناوبری اصلی"
    >
      <div className="mx-auto flex max-w-2xl items-center px-3" style={{ height: 62 }}>
        {item(ITEMS[0])}
        {item(ITEMS[1])}
        <div className="flex w-16 shrink-0 justify-center">
          <button
            onClick={() => onNavigate('smart-accountant')}
            aria-label="افزودن سریع در حسابدار"
            className="-mt-8 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-white ring-4 ring-[#0c0e1a] transition active:scale-95"
            style={{ boxShadow: '0 8px 24px rgba(109,94,246,0.55)' }}
          >
            <Plus size={26} strokeWidth={2.5} />
          </button>
        </div>
        {item(ITEMS[2])}
        {item(ITEMS[3])}
      </div>
    </nav>
  );
};

export default BottomNav;
