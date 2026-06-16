import React, { useMemo } from 'react';
import { ShieldCheck, ShieldAlert, Shield, Wrench, Wallet } from 'lucide-react';
import type { VehicleInsurance, VehicleMaintenanceRecord, VehicleExpense } from '../types';
import type { DetailsTab } from '../shared';
import {
  computeInsuranceStatus,
  computeServiceStatus,
  lastExpenseOf,
  formatNum,
  formatToman,
  formatJalali,
  type StatusTone,
} from '../vehicle-status';

const TONE: Record<StatusTone, { chip: string; value: string }> = {
  emerald: { chip: 'bg-emerald-500/15 text-emerald-300', value: 'text-emerald-300' },
  amber: { chip: 'bg-amber-500/15 text-amber-300', value: 'text-amber-300' },
  rose: { chip: 'bg-rose-500/15 text-rose-300', value: 'text-rose-300' },
  brand: { chip: 'bg-brand-500/15 text-brand-300', value: 'text-brand-200' },
  slate: { chip: 'bg-white/[0.06] text-slate-300', value: 'text-slate-200' },
};

const Tile: React.FC<{
  icon: React.ReactNode;
  tone: StatusTone;
  value: string;
  caption: string;
  onClick?: () => void;
}> = ({ icon, tone, value, caption, onClick }) => {
  const t = TONE[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-right rounded-2xl p-3 bg-white/[0.04] ring-1 ring-white/[0.06] hover:bg-white/[0.07] transition flex flex-col gap-2.5 min-w-0"
    >
      <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${t.chip}`}>{icon}</span>
      <span className="min-w-0">
        <span className={`block text-sm font-bold truncate nums-tabular ${t.value}`}>{value}</span>
        <span className="block text-[11px] text-slate-400 truncate mt-0.5">{caption}</span>
      </span>
    </button>
  );
};

interface Props {
  insurances: VehicleInsurance[];
  maintenances: VehicleMaintenanceRecord[];
  expenses: VehicleExpense[];
  onNavigate: (tab: DetailsTab) => void;
}

/** Three smart KPI tiles: active insurance · service count · last expense. */
export const StatTiles: React.FC<Props> = ({ insurances, maintenances, expenses, onNavigate }) => {
  const ins = useMemo(() => computeInsuranceStatus(insurances), [insurances]);
  const svc = useMemo(() => computeServiceStatus(maintenances), [maintenances]);
  const last = useMemo(() => lastExpenseOf(expenses), [expenses]);

  const insIcon =
    ins.state === 'expired' ? <ShieldAlert size={18} /> : ins.state === 'none' ? <Shield size={18} /> : <ShieldCheck size={18} />;

  const svcTone: StatusTone = svc.overdue ? 'amber' : svc.count > 0 ? 'brand' : 'slate';
  const svcCaption = svc.overdue
    ? 'سرویس بعدی عقب‌افتاده'
    : svc.dueSoon && svc.nextDate
      ? `یادآوری ${formatJalali(svc.nextDate)}`
      : 'ثبت‌شده';

  return (
    <div className="grid grid-cols-3 gap-2.5">
      <Tile
        icon={insIcon}
        tone={ins.tone}
        value={ins.label}
        caption={ins.endDate ? formatJalali(ins.endDate) : 'ثبت نشده'}
        onClick={() => onNavigate('insurance')}
      />
      <Tile
        icon={<Wrench size={18} />}
        tone={svcTone}
        value={`${formatNum(svc.count)} سرویس`}
        caption={svcCaption}
        onClick={() => onNavigate('maintenance')}
      />
      <Tile
        icon={<Wallet size={18} />}
        tone="amber"
        value={last ? formatToman(last.amount) : '—'}
        caption={last ? 'آخرین هزینه' : 'بدون هزینه'}
        onClick={() => onNavigate('expenses')}
      />
    </div>
  );
};
