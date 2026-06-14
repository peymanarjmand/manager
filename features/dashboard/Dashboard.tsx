import React, { useEffect, useMemo, useState } from 'react';
import moment from 'jalali-moment';
import {
  Car, Calculator, ClipboardCheck, HeartPulse, KeyRound, Coins, Phone, Settings as SettingsIcon,
  ArrowDownLeft, ArrowUpRight,
} from 'lucide-react';
import { DASHBOARD_ITEMS } from './constants';
import { DashboardItem, View } from '../../types';
import { DateTimeDisplay } from '../../components/DateTimeDisplay';
import { FocusTimer } from './components/FocusTimer';
import { SettingsModal } from '../settings/SettingsModal';
import { useDashboardStore } from './store';
import { useAccountantStore } from '../smart-accountant/store';
import { getNextUnpaidInstallment, computeTomanReceivablesPayables, computeMonthInstallmentTotals } from '../smart-accountant/calculations';
import { formatCurrency } from '../smart-accountant/SmartAccountantShared';
import { ProgressRing } from '../../components/ui/ProgressRing';
import { Sparkline } from '../../components/ui/Sparkline';

type IconCmp = React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
const MOD: Record<string, { Icon: IconCmp; chip: string; icon: string }> = {
  'my-car': { Icon: Car, chip: 'bg-brand-500/15', icon: 'text-brand-300' },
  'smart-accountant': { Icon: Calculator, chip: 'bg-emerald-500/15', icon: 'text-emerald-300' },
  'daily-tasks': { Icon: ClipboardCheck, chip: 'bg-rose-500/15', icon: 'text-rose-300' },
  'health-dashboard': { Icon: HeartPulse, chip: 'bg-pink-500/15', icon: 'text-pink-300' },
  'password-manager': { Icon: KeyRound, chip: 'bg-violet-500/15', icon: 'text-violet-300' },
  assets: { Icon: Coins, chip: 'bg-cyan-500/15', icon: 'text-cyan-300' },
  'phone-book': { Icon: Phone, chip: 'bg-amber-500/15', icon: 'text-amber-300' },
  settings: { Icon: SettingsIcon, chip: 'bg-slate-500/20', icon: 'text-slate-300' },
};

const fa = (n: number) => n.toLocaleString('fa-IR');

export const Dashboard = ({ onNavigate }: { onNavigate: (view: View) => void }): React.ReactNode => {
  const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);
  const itemsOrder = useDashboardStore((state) => state.itemsOrder);

  const installments = useAccountantStore((s) => s.installments);
  const ledger = useAccountantStore((s) => s.ledger);

  useEffect(() => {
    const st = useAccountantStore.getState();
    st.loadInstallments?.();
    st.loadPeopleAndLedger?.();
  }, []);

  const nextInst = useMemo(() => getNextUnpaidInstallment(installments), [installments]);
  const { totalDebt, totalCredit } = useMemo(() => computeTomanReceivablesPayables(ledger), [ledger]);
  const monthInst = useMemo(() => {
    const now = moment();
    return computeMonthInstallmentTotals(installments, now.jYear(), now.jMonth() + 1);
  }, [installments]);
  const dueLabel = useMemo(() => (nextInst ? moment(nextInst.dueDate).locale('fa').format('jD jMMMM') : ''), [nextInst]);

  const orderedItems: DashboardItem[] = useMemo(() => {
    const map = new Map(DASHBOARD_ITEMS.map((i) => [i.id, i] as const));
    const ordered: DashboardItem[] = [];
    (itemsOrder || []).forEach((id) => {
      const it = map.get(id);
      if (it) { ordered.push(it); map.delete(id); }
    });
    return [...ordered, ...DASHBOARD_ITEMS.filter((i) => map.has(i.id))];
  }, [itemsOrder]);

  const openItem = (item: DashboardItem) => {
    if (item.id === 'settings') setSettingsModalOpen(true);
    else onNavigate(item.id as View);
  };

  return (
    <div className="px-4 pt-4 pb-2 max-w-md mx-auto animate-fade-in">
      <SettingsModal isOpen={isSettingsModalOpen} onClose={() => setSettingsModalOpen(false)} />

      {/* Finance hero — next installment + this month's installment progress */}
      <button
        onClick={() => onNavigate('smart-accountant')}
        className="block w-full text-right rounded-3xl p-5 text-white relative overflow-hidden shadow-xl shadow-brand-900/30 transition active:scale-[0.99]"
        style={{ background: 'linear-gradient(135deg, #574bd3 0%, #6d5ef6 55%, #7e6ff8 100%)' }}
      >
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="text-sm text-white/75">قسط بعدی</div>
            {nextInst ? (
              <>
                <div className="mt-1.5 text-[24px] font-medium leading-tight nums-tabular">
                  {formatCurrency(nextInst.amount + nextInst.penalty)}
                </div>
                <div className="mt-1.5 text-xs text-white/75">{nextInst.planTitle} • سررسید {dueLabel}</div>
              </>
            ) : (
              <div className="mt-2 text-lg font-medium">قسط پرداخت‌نشده‌ای نداری</div>
            )}
          </div>
          <ProgressRing value={monthInst.progress} size={92} stroke={7} progressClassName="stroke-white" trackClassName="stroke-white/25">
            <div className="text-[18px] font-medium nums-tabular">{fa(Math.round(monthInst.progress))}٪</div>
            <div className="text-[10px] text-white/70">این ماه</div>
          </ProgressRing>
        </div>
        {monthInst.hasInstallments && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-[11px] text-white/85 mb-1.5">
              <span>مانده این ماه: <span className="font-medium nums-tabular">{formatCurrency(monthInst.unpaidAmount)}</span></span>
              <span className="nums-tabular text-white/70">از {formatCurrency(monthInst.totalAmount)}</span>
            </div>
            <div className="h-2 rounded-full bg-white/20 overflow-hidden">
              <div className="h-full rounded-full bg-white transition-all" style={{ width: `${Math.min(100, monthInst.progress)}%` }} />
            </div>
          </div>
        )}
      </button>

      {/* طلب / بدهی with sparklines */}
      <div className="grid grid-cols-2 gap-3 mt-3">
        <div className="rounded-2xl bg-white/[0.04] ring-1 ring-white/[0.06] p-3.5 overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">طلب از دیگران</span>
            <span className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center"><ArrowDownLeft size={16} className="text-emerald-400" /></span>
          </div>
          <div className="mt-2 text-[15px] font-medium text-emerald-400 nums-tabular">{formatCurrency(totalDebt)}</div>
          <div className="text-emerald-500/45 mt-1 -mb-1"><Sparkline data={[9, 12, 10, 15, 12, 17, 14]} height={26} /></div>
        </div>
        <div className="rounded-2xl bg-white/[0.04] ring-1 ring-white/[0.06] p-3.5 overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">بدهی به دیگران</span>
            <span className="w-8 h-8 rounded-lg bg-rose-500/15 flex items-center justify-center"><ArrowUpRight size={16} className="text-rose-400" /></span>
          </div>
          <div className="mt-2 text-[15px] font-medium text-rose-400 nums-tabular">{formatCurrency(totalCredit)}</div>
          <div className="text-rose-500/45 mt-1 -mb-1"><Sparkline data={[12, 10, 13, 9, 14, 11, 13]} height={26} /></div>
        </div>
      </div>

      {/* Modules */}
      <h2 className="mt-7 mb-3 text-base font-medium text-slate-200">ابزارها</h2>
      <div className="grid grid-cols-4 gap-x-3 gap-y-4">
        {orderedItems.map((item) => {
          const m = MOD[item.id] || MOD.settings;
          return (
            <button key={item.id} onClick={() => openItem(item)} className="flex flex-col items-center gap-2 transition active:scale-95">
              <span className={`w-[52px] h-[52px] rounded-2xl flex items-center justify-center ${m.chip}`}>
                <m.Icon size={23} className={m.icon} strokeWidth={1.9} />
              </span>
              <span className="text-[11px] text-slate-300 text-center leading-tight">{item.title}</span>
            </button>
          );
        })}
      </div>

      {/* Clock + focus timer (kept, demoted) */}
      <div className="mt-7 grid grid-cols-1 gap-4">
        <DateTimeDisplay />
        <FocusTimer onOpenSettings={() => setSettingsModalOpen(true)} />
      </div>
    </div>
  );
};
