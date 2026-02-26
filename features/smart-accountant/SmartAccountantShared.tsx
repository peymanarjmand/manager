import React, { useState, useEffect, useMemo } from 'react';
import moment from 'jalali-moment';
import { LedgerEntry } from './types';
import { DefaultImageIcon, EyeIcon } from '../../components/Icons';
import { isImageRef, getObjectURLByRef } from '../../lib/idb-images';
import { supabase } from '../../lib/supabase';

export const formatCurrency = (amount: number) => `${(amount || 0).toLocaleString('fa-IR')} تومان`;

export const LEDGER_UNITS: { id: 'toman' | 'gold_mg' | 'btc' | 'usdt'; label: string; suffix: string; step: string; maxDecimals: number }[] = [
    { id: 'toman', label: 'تومان', suffix: 'تومان', step: '1', maxDecimals: 0 },
    { id: 'gold_mg', label: 'طلا (میلی‌گرم)', suffix: 'mg طلا', step: '1', maxDecimals: 0 },
    { id: 'btc', label: 'بیت‌کوین', suffix: 'BTC', step: '0.0000000001', maxDecimals: 10 },
    { id: 'usdt', label: 'تتر', suffix: 'USDT', step: '0.001', maxDecimals: 3 },
];

export const getLedgerUnitConfig = (unit: string | undefined) => {
    return LEDGER_UNITS.find(u => u.id === unit) || LEDGER_UNITS[0];
};

export const formatLedgerAmount = (entry: LedgerEntry) => {
    const cfg = getLedgerUnitConfig((entry as any).unit);
    const amount = Number(entry.amount) || 0;
    const value =
        cfg.maxDecimals > 0
            ? amount.toLocaleString('fa-IR', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: cfg.maxDecimals,
              })
            : amount.toLocaleString('fa-IR');
    return `${value} ${cfg.suffix}`;
};

export const formatDate = (date: string) => moment(date).locale('fa').format('dddd، jD jMMMM jYYYY');

export const FormInput = ({ label, id, value, onChange, type = 'text', required = false, ...props }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
        <input
            type={type}
            id={id}
            name={id}
            value={value || ''}
            onChange={onChange}
            required={required}
            className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3 focus:ring-2 focus:ring-sky-400 focus:outline-none transition"
            {...props}
        />
    </div>
);

export const FormSelect = ({ label, id, value, onChange, children, required = false }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
        <select
            id={id}
            name={id}
            value={value || ''}
            onChange={onChange}
            required={required}
            className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3 focus:ring-2 focus:ring-sky-400 focus:outline-none transition"
        >
            {children}
        </select>
    </div>
);

export const FormTextarea = ({ label, id, value, onChange, ...props }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
        <textarea id={id} name={id} value={value || ''} onChange={onChange} rows={3} className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3 focus:ring-2 focus:ring-sky-400 focus:outline-none transition" {...props} />
    </div>
);

export const FormImageUpload = ({ label, preview, onChange }) => (
     <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
        <div className="mt-1 flex items-center space-x-4 space-x-reverse">
            <span className="h-20 w-20 rounded-lg overflow-hidden bg-slate-700 flex items-center justify-center">
                {preview ? <img src={preview} alt="Preview" className="h-full w-full object-cover" /> : <DefaultImageIcon />}
            </span>
            <label htmlFor="file-upload" className="cursor-pointer bg-slate-700 text-slate-300 font-medium py-2 px-4 rounded-md hover:bg-slate-600 transition">
                <span>بارگذاری تصویر</span>
                <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={onChange} accept="image/*"/>
            </label>
        </div>
    </div>
);

export const InlineReceiptLink = ({ refId }: { refId: string }) => {
  const [url, setUrl] = React.useState<string | null>(null);
  useEffect(() => {
    let active = true;
    (async () => {
      const u = await getObjectURLByRef(refId);
      if (!active) return;
      setUrl(u);
    })();
    return () => { active = false; };
  }, [refId]);
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noreferrer" className="p-1.5 text-slate-400 hover:bg-slate-700 rounded-full hover:text-sky-400 transition" title="مشاهده رسید">
      <EyeIcon />
    </a>
  );
};

export const ImageFromRef = ({ srcOrRef, alt, className }: { srcOrRef?: string; alt?: string; className?: string }) => {
  const [url, setUrl] = React.useState<string | null>(null);
  React.useEffect(() => {
    let active = true;
    let toRevoke: string | null = null;
    (async () => {
      if (isImageRef(srcOrRef)) {
        const u = await getObjectURLByRef(srcOrRef);
        if (!active) return;
        setUrl(u);
        toRevoke = u;
      } else {
        setUrl(srcOrRef || null);
      }
    })();
    return () => {
      active = false;
      if (toRevoke) URL.revokeObjectURL(toRevoke);
    };
  }, [srcOrRef]);
  if (!url) return null;
  return <img src={url} alt={alt} className={className} />;
};

const Select = ({ id, value, onChange, children }) => (
    <select
        id={id}
        value={value}
        onChange={onChange}
        className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3 focus:ring-2 focus:ring-sky-400 focus:outline-none transition"
    >
        {children}
    </select>
);

export const JalaliDatePicker = ({ value, onChange, id, label }) => {
    const m = useMemo(() => moment(value), [value]);
    const isValidDate = m.isValid();

    const [jYear, setJYear] = useState(() => isValidDate ? m.jYear() : moment().jYear());
    const [jMonth, setJMonth] = useState(() => isValidDate ? m.jMonth() : moment().jMonth());
    const [jDay, setJDay] = useState(() => isValidDate ? m.jDate() : moment().jDate());

    useEffect(() => {
        const newMoment = moment(value);
        if (newMoment.isValid()) {
            if (newMoment.jYear() !== jYear) setJYear(newMoment.jYear());
            if (newMoment.jMonth() !== jMonth) setJMonth(newMoment.jMonth());
            if (newMoment.jDate() !== jDay) setJDay(newMoment.jDate());
        }
    }, [value]);

    const handlePartChange = (part, newValue) => {
        let year = jYear;
        let month = jMonth;
        let day = jDay;

        if (part === 'year') year = newValue;
        if (part === 'month') month = newValue;
        if (part === 'day') day = newValue;
        
        const daysInNewMonth = moment.jDaysInMonth(year, month);
        if (day > daysInNewMonth) {
            day = daysInNewMonth;
        }
        
        const finalMoment = moment(`${year}/${month + 1}/${day}`, 'jYYYY/jM/jD');
        onChange(finalMoment.toISOString());
    };
    
    const currentJYear = moment().jYear();
    const years = Array.from({ length: 20 }, (_, i) => currentJYear - 10 + i);
    const months = useMemo(() => Array.from({ length: 12 }, (_, i) => moment().jMonth(i).locale('fa').format('jMMMM')), []);
    const daysInSelectedMonth = moment.jDaysInMonth(jYear, jMonth);
    const days = Array.from({ length: daysInSelectedMonth }, (_, i) => i + 1);

    return (
        <div>
            <label htmlFor={`${id}-year`} className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
            <div className="grid grid-cols-3 gap-2">
                <Select id={`${id}-day`} value={jDay} onChange={(e) => handlePartChange('day', parseInt(e.target.value, 10))}>
                    {days.map(d => <option key={d} value={d}>{d}</option>)}
                </Select>
                <Select id={`${id}-month`} value={jMonth} onChange={(e) => handlePartChange('month', parseInt(e.target.value, 10))}>
                    {months.map((name, index) => <option key={name} value={index}>{name}</option>)}
                </Select>
                <Select id={`${id}-year`} value={jYear} onChange={(e) => handlePartChange('year', parseInt(e.target.value, 10))}>
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                </Select>
            </div>
        </div>
    );
};

export const ReceiptPreview = ({ refOrUrl, onClose, title, downloadLabel = 'دانلود', onDelete }: { refOrUrl: string | null; onClose: () => void; title?: string; downloadLabel?: string; onDelete?: () => void; }) => {
    const [url, setUrl] = useState<string | null>(null);
    useEffect(() => {
        let active = true;
        (async () => {
            if (!refOrUrl) { setUrl(null); return; }
            if (isImageRef(refOrUrl)) {
                const u = await getObjectURLByRef(refOrUrl);
                if (!active) return;
                setUrl(u);
            } else {
                const { data } = supabase.storage.from('receipts').getPublicUrl(refOrUrl);
                setUrl(data?.publicUrl || refOrUrl);
            }
        })();
        return () => { active = false; };
    }, [refOrUrl]);
    if (!refOrUrl) return null;
    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="relative max-w-3xl w-full" onClick={e => e.stopPropagation()}>
                <div className="bg-slate-900/90 rounded-2xl ring-1 ring-slate-700 shadow-2xl p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-slate-100 font-bold text-lg">{title || 'پیش‌نمایش تصویر'}</h3>
                        <button onClick={onClose} className="text-slate-400 hover:text-white">بستن</button>
                    </div>
                    <div className="rounded-xl bg-slate-100 text-slate-900 p-4 shadow-inner">
                        {url ? (
                            <img src={url} className="w-full h-auto max-h-[70vh] object-contain"/>
                        ) : (
                            <div className="py-16 flex flex-col items-center gap-3">
                                <div className="h-12 w-12 border-4 border-slate-300 border-top-sky-500 rounded-full animate-spin"></div>
                                <div className="text-slate-500 text-sm">در حال بارگذاری تصویر…</div>
                            </div>
                        )}
                    </div>
                    <div className="mt-4 flex justify-end gap-3">
                        {onDelete && (
                            <button onClick={onDelete} className="px-4 py-2 rounded-md text-sm font-bold bg-rose-600 text-white hover:bg-rose-500">حذف تصویر</button>
                        )}
                        {url && <a href={url} target="_blank" rel="noreferrer" className="px-4 py-2 rounded-md text-sm font-medium bg-slate-800 text-white hover:bg-slate-700">{downloadLabel}</a>}
                        <button onClick={onClose} className="px-4 py-2 rounded-md text-sm font-medium border border-slate-400 text-slate-700 bg-white hover:bg-slate-100">بستن</button>
                    </div>
                </div>
            </div>
        </div>
    );
};
