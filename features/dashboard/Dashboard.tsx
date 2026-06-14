import React, { useEffect, useMemo, useState } from 'react';
import moment from 'jalali-moment';
import { DASHBOARD_ITEMS } from './constants';
import { DashboardItem, View } from '../../types';
import { DateTimeDisplay } from '../../components/DateTimeDisplay';
import { FocusTimer } from './components/FocusTimer';
import { SettingsModal } from '../settings/SettingsModal';
import { useDashboardStore } from './store';
import { useAccountantStore } from '../smart-accountant/store';
import { getNextUnpaidInstallment, computeTomanReceivablesPayables } from '../smart-accountant/calculations';
import { formatCurrency } from '../smart-accountant/SmartAccountantShared';

export const Dashboard = ({ onNavigate }: { onNavigate: (view: View) => void }): React.ReactNode => {
  const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);
  const itemsOrder = useDashboardStore((state) => state.itemsOrder);

  // Finance summary for the home hero (selector subscriptions — only these slices).
  const installments = useAccountantStore((s) => s.installments);
  const ledger = useAccountantStore((s) => s.ledger);

  useEffect(() => {
    const st = useAccountantStore.getState();
    st.loadInstallments?.();
    st.loadPeopleAndLedger?.();
  }, []);

  const nextInst = useMemo(() => getNextUnpaidInstallment(installments), [installments]);
  const { totalDebt, totalCredit } = useMemo(() => computeTomanReceivablesPayables(ledger), [ledger]);
  const dueLabel = useMemo(
    () => (nextInst ? moment(nextInst.dueDate).locale('fa').format('jD jMMMM') : ''),
    [nextInst],
  );

  // Preserve the user's saved module order; unordered items follow.
  const orderedItems: DashboardItem[] = useMemo(() => {
    const map = new Map(DASHBOARD_ITEMS.map((i) => [i.id, i] as const));
    const ordered: DashboardItem[] = [];
    (itemsOrder || []).forEach((id) => {
      const it = map.get(id);
      if (it) {
        ordered.push(it);
        map.delete(id);
      }
    });
    return [...ordered, ...DASHBOARD_ITEMS.filter((i) => map.has(i.id))];
  }, [itemsOrder]);

  const openItem = (item: DashboardItem) => {
    if (item.id === 'settings') setSettingsModalOpen(true);
    else onNavigate(item.id as View);
  };

  return (
    <div className="px-4 pt-4 pb-2 max-w-2xl mx-auto animate-fade-in">
      <SettingsModal isOpen={isSettingsModalOpen} onClose={() => setSettingsModalOpen(false)} />

      {/* Finance hero — next installment */}
      <button
        onClick={() => onNavigate('smart-accountant')}
        className="block w-full text-right rounded-3xl bg-brand-500 p-5 text-white shadow-lg shadow-brand-500/20 transition active:scale-[0.99]"
      >
        <div className="text-sm text-white/80">قسط بعدی</div>
        {nextInst ? (
          <>
            <div className="mt-1 text-[26px] font-medium leading-tight nums-tabular">
              {formatCurrency(nextInst.amount + nextInst.penalty)}
            </div>
            <div className="mt-1 text-xs text-white/80">
              {nextInst.planTitle} · سررسید {dueLabel}
            </div>
          </>
        ) : (
          <div className="mt-1 text-lg font-medium">قسط پرداخت‌نشده‌ای نداری</div>
        )}
      </button>

      {/* طلب / بدهی */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-slate-800/60 ring-1 ring-slate-700 p-3">
          <div className="text-xs text-slate-400">طلب از دیگران</div>
          <div className="mt-1 text-lg font-medium text-emerald-400 nums-tabular">{formatCurrency(totalDebt)}</div>
        </div>
        <div className="rounded-2xl bg-slate-800/60 ring-1 ring-slate-700 p-3">
          <div className="text-xs text-slate-400">بدهی به دیگران</div>
          <div className="mt-1 text-lg font-medium text-rose-400 nums-tabular">{formatCurrency(totalCredit)}</div>
        </div>
      </div>

      {/* Modules */}
      <h2 className="mt-6 mb-3 text-lg font-medium text-slate-100">ابزارها</h2>
      <div className="grid grid-cols-2 gap-3">
        {orderedItems.map((item) => (
          <button
            key={item.id}
            onClick={() => openItem(item)}
            className="text-right bg-slate-800/50 hover:bg-slate-800 ring-1 ring-slate-700 rounded-2xl p-4 transition active:scale-[0.98]"
          >
            <div className="w-11 h-11 rounded-xl bg-slate-700/40 flex items-center justify-center mb-3">{item.icon}</div>
            <div className="text-sm font-medium text-slate-100">{item.title}</div>
          </button>
        ))}
      </div>

      {/* Focus timer + clock (kept, demoted below the essentials) */}
      <div className="mt-6 grid grid-cols-1 gap-4">
        <DateTimeDisplay />
        <FocusTimer onOpenSettings={() => setSettingsModalOpen(true)} />
      </div>
    </div>
  );
};
