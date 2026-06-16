import React, { useEffect, useState } from 'react';
import { ShieldCheck, Wrench, Wallet } from 'lucide-react';
import type { VehicleInsurance, VehicleMaintenanceRecord, VehicleExpense } from '../types';
import { formatJalali, formatToman, formatNum } from '../vehicle-status';
import { Sheet, DocumentLink } from './ui';

export type DetailState =
  | { kind: 'insurance'; insurance: VehicleInsurance }
  | { kind: 'maintenance'; maintenance: VehicleMaintenanceRecord }
  | { kind: 'expense'; expense: VehicleExpense };

const Row: React.FC<{ label: string; value?: string; className?: string }> = ({ label, value, className = '' }) => (
  <div className={`rounded-xl bg-white/[0.03] ring-1 ring-white/[0.06] px-3 py-2.5 ${className}`}>
    <p className="text-[11px] text-slate-400">{label}</p>
    <p className="text-sm text-slate-100 font-semibold mt-1 break-words leading-6 nums-tabular" dir="auto">
      {value || '—'}
    </p>
  </div>
);

const Block: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="rounded-xl bg-white/[0.03] ring-1 ring-white/[0.06] px-3 py-2.5">
    <p className="text-[11px] text-slate-400 mb-1">{label}</p>
    {children}
  </div>
);

const HEAD: Record<DetailState['kind'], { title: string; icon: React.ReactNode }> = {
  insurance: { title: 'جزئیات بیمه‌نامه', icon: <ShieldCheck size={20} /> },
  maintenance: { title: 'جزئیات سرویس', icon: <Wrench size={20} /> },
  expense: { title: 'جزئیات هزینه', icon: <Wallet size={20} /> },
};

const Content: React.FC<{ data: DetailState }> = ({ data }) => {
  if (data.kind === 'insurance') {
    const i = data.insurance;
    return (
      <div className="space-y-2.5">
        <div className="grid grid-cols-2 gap-2.5">
          <Row label="نوع بیمه" value={i.type === 'third_party' ? 'شخص ثالث' : 'بدنه'} />
          <Row label="شرکت بیمه" value={i.company} />
          <Row label="شماره بیمه‌نامه" value={i.policyNumber} className="col-span-2" />
          <Row label="تاریخ شروع" value={formatJalali(i.startDate)} />
          <Row label="تاریخ پایان" value={formatJalali(i.endDate)} />
          <Row label="درصد تخفیف" value={i.discountPercent != null ? `${i.discountPercent}٪` : undefined} />
          <Row label="حق بیمه" value={i.premiumAmount != null ? formatToman(i.premiumAmount) : undefined} />
        </div>
        {i.coverageDescription && (
          <Block label="پوشش‌ها">
            <p className="text-sm text-slate-200 leading-7">{i.coverageDescription}</p>
          </Block>
        )}
        {i.documentRef && (
          <Block label="فایل بیمه‌نامه">
            <DocumentLink documentRef={i.documentRef} label="مشاهده بیمه‌نامه" />
          </Block>
        )}
      </div>
    );
  }

  if (data.kind === 'maintenance') {
    const m = data.maintenance;
    return (
      <div className="space-y-2.5">
        <div className="grid grid-cols-2 gap-2.5">
          <Row label="تاریخ سرویس" value={formatJalali(m.serviceDate)} />
          <Row label="مبلغ سرویس" value={m.cost != null ? formatToman(m.cost) : undefined} />
          <Row label="کیلومتر فعلی" value={m.odometerKm != null ? formatNum(m.odometerKm) : undefined} />
          <Row label="کیلومتر سرویس بعدی" value={m.nextOdometerKm != null ? formatNum(m.nextOdometerKm) : undefined} />
          <Row label="تاریخ سرویس بعدی" value={m.nextServiceDate ? formatJalali(m.nextServiceDate) : undefined} className="col-span-2" />
        </div>
        <Block label="موارد انجام‌شده">
          <p className="text-sm text-slate-200 leading-7">
            {m.items?.length ? m.items.join('، ') : m.itemsDescription || '—'}
          </p>
        </Block>
        {m.notes && (
          <Block label="یادداشت">
            <p className="text-sm text-slate-200 leading-7">{m.notes}</p>
          </Block>
        )}
        {m.invoiceRef && (
          <Block label="فاکتور سرویس">
            <DocumentLink documentRef={m.invoiceRef} label="مشاهده فاکتور" />
          </Block>
        )}
      </div>
    );
  }

  const x = data.expense;
  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2.5">
        <Row label="بابت" value={x.category} />
        <Row label="مبلغ" value={formatToman(x.amount)} />
        <Row label="تاریخ" value={formatJalali(x.date)} />
        <Row label="مرتبط با سرویس" value={x.maintenanceId ? 'بله' : 'خیر'} />
      </div>
      {x.description && (
        <Block label="توضیحات">
          <p className="text-sm text-slate-200 leading-7">{x.description}</p>
        </Block>
      )}
      {x.attachmentRef && (
        <Block label="رسید هزینه">
          <DocumentLink documentRef={x.attachmentRef} label="مشاهده رسید" />
        </Block>
      )}
    </div>
  );
};

/** Read-only detail bottom-sheet for an insurance / maintenance / expense record. */
export const DetailSheet: React.FC<{ state: DetailState | null; onClose: () => void }> = ({
  state,
  onClose,
}) => {
  // Retain the last record so content stays visible during the exit animation.
  const [retained, setRetained] = useState<DetailState | null>(state);
  useEffect(() => {
    if (state) setRetained(state);
  }, [state]);

  const data = state || retained;
  const head = data ? HEAD[data.kind] : null;

  return (
    <Sheet open={!!state} onClose={onClose} title={head?.title} icon={head?.icon}>
      {data && <Content data={data} />}
    </Sheet>
  );
};
