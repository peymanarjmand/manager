import React, { useState, useEffect, useMemo, ChangeEvent } from 'react';
import moment from 'jalali-moment';
import { AccountantData, Transaction, Asset, Person, LedgerEntry, InstallmentPlan, InstallmentPayment, Check, CheckStatus, DarfakExpense, MonthlyFund } from './types';
import { TRANSACTION_CATEGORIES } from './constants';
import { SummaryIcon, TransactionsIcon, AssetsIcon, PeopleIcon, InstallmentsIcon, ChecksIcon, BackIcon, PlusIcon, EditIcon, DeleteIcon, CloseIcon, DefaultImageIcon, UserCircleIcon, CheckCircleIcon, UncheckedCircleIcon, ArrowRightIcon, SearchIcon, WalletIcon, EyeIcon } from '../../components/Icons';
import { SI_RATES } from './constants';
import DarfakView from './DarfakView';
import { useAccountantStore } from './store';
import { TransactionVoucherModal } from './TransactionVoucherModal';
import { isImageRef, saveImageDataURL, getObjectURLByRef, deleteImageByRef } from '../../lib/idb-images';
import { supabase } from '../../lib/supabase';

 // CONFIG
 type AccountantTab = 'summary' | 'transactions' | 'people' | 'installments' | 'checks' | 'darfak' | 'social_insurance';
type ModalConfig = { isOpen: boolean; type?: 'transaction' | 'asset' | 'person' | 'ledger' | 'installmentPlan' | 'installmentPayment' | 'check'; payload?: any };

// HELPERS
const formatCurrency = (amount: number) => `${(amount || 0).toLocaleString('fa-IR')} تومان`;
const formatDate = (date: string) => moment(date).locale('fa').format('dddd، jD jMMMM jYYYY');

// Reusable Form Components
const FormInput = ({ label, id, value, onChange, type = 'text', required = false, ...props }) => (
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
const FormSelect = ({ label, id, value, onChange, children, required = false }) => (
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
const FormTextarea = ({ label, id, value, onChange, ...props }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
        <textarea id={id} name={id} value={value || ''} onChange={onChange} rows={3} className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3 focus:ring-2 focus:ring-sky-400 focus:outline-none transition" {...props} />
    </div>
);
const FormImageUpload = ({ label, preview, onChange }) => (
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

// Helper to render images that may be base64 or IndexedDB refs
const InlineReceiptLink = ({ refId }: { refId: string }) => {
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

// Helper to render images that may be base64 or IndexedDB refs
const ImageFromRef = ({ srcOrRef, alt, className }: { srcOrRef?: string; alt?: string; className?: string }) => {
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

// Custom Jalali Date Picker
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

const JalaliDatePicker = ({ value, onChange, id, label }) => {
    const m = useMemo(() => moment(value), [value]);
    const isValidDate = m.isValid();

    const [jYear, setJYear] = useState(() => isValidDate ? m.jYear() : moment().jYear());
    const [jMonth, setJMonth] = useState(() => isValidDate ? m.jMonth() : moment().jMonth()); // 0-indexed
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

// Reusable Confirm Dialog (styled)
const ConfirmDialog = ({ open, title = 'تایید عملیات', message, confirmText = 'تایید', cancelText = 'لغو', tone = 'warning', onConfirm, onClose }: { open: boolean; title?: string; message: string; confirmText?: string; cancelText?: string; tone?: 'warning' | 'danger' | 'success'; onConfirm: () => void; onClose: () => void; }) => {
    if (!open) return null;
    const confirmClasses = tone === 'danger' ? 'bg-rose-600 hover:bg-rose-500' : tone === 'success' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-amber-600 hover:bg-amber-500';
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" onClick={onClose}>
            <div className="absolute inset-0 bg-black/70" />
            <div className="relative w-full max-w-md bg-slate-800 rounded-2xl ring-1 ring-slate-700 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
                    <h3 className="text-slate-100 font-bold text-lg">{title}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white"><CloseIcon /></button>
                </div>
                <div className="p-5 text-slate-200 leading-7">{message}</div>
                <div className="px-5 py-4 bg-slate-800/60 border-t border-slate-700 flex items-center justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 rounded-md border border-slate-600 text-slate-300 hover:bg-slate-700 text-sm">{cancelText}</button>
                    <button onClick={() => { onConfirm(); onClose(); }} className={`px-4 py-2 rounded-md text-white text-sm font-bold ${confirmClasses}`}>{confirmText}</button>
                </div>
            </div>
        </div>
    );
};

const SocialInsuranceView = () => {
    const { socialInsurance } = useAccountantStore();
    const { saveSocialInsurance, deleteSocialInsurance, settleSocialInsurance, settleSocialInsuranceMonth } = useAccountantStore.getState();
    const [previewRef, setPreviewRef] = useState<string | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<any | null>(null);
    const [selectedYear, setSelectedYear] = useState<number | null>(null);
    const [yearQuery, setYearQuery] = useState<string>("");
    const [confirmState, setConfirmState] = useState<{ open: boolean; title?: string; message: string; confirmText?: string; cancelText?: string; tone?: 'warning' | 'danger' | 'success'; onConfirm: () => void } | null>(null);

    useEffect(() => {
        const handler = () => { setEditing(null); setModalOpen(true); };
        window.addEventListener('open-social-insurance-modal', handler);
        return () => window.removeEventListener('open-social-insurance-modal', handler);
    }, []);

    const totalThisYear = useMemo(() => {
        const jy = moment().jYear();
        return socialInsurance.filter(p => p.year === jy).reduce((s, p) => s + (p.amount || 0), 0);
    }, [socialInsurance]);

    const totalDays = useMemo(() => socialInsurance.reduce((s, p) => s + (p.daysCovered || 0), 0), [socialInsurance]);
    const yearsMonthsDays = useMemo(() => {
        const years = Math.floor(totalDays / 365);
        const rem = totalDays % 365;
        const months = Math.floor(rem / 30);
        const days = rem % 30;
        return { years, months, days };
    }, [totalDays]);

    const years = useMemo(() => {
        const set = new Set<number>();
        socialInsurance.forEach(p => set.add(p.year));
        return Array.from(set).sort((a,b) => b - a);
    }, [socialInsurance]);

    const filteredYears = useMemo(() => {
        const q = (yearQuery || '').trim();
        if (!q) return years;
        return years.filter(y => String(y).includes(q));
    }, [years, yearQuery]);

    const monthNames = useMemo(() => Array.from({ length: 12 }, (_, i) => moment().jMonth(i).locale('fa').format('jMMMM')), []);

    const openNewFor = (year: number, month: number) => {
        const defaultObj = { id: Date.now().toString(), year, month, daysCovered: 0, amount: 0, payDate: new Date().toISOString() };
        setEditing(defaultObj);
        setModalOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-800/50 rounded-xl p-4 ring-1 ring-slate-700">
                    <h3 className="text-slate-300 text-sm">مجموع پرداختی سال جاری</h3>
                    <p className="text-2xl font-extrabold text-emerald-400">{totalThisYear.toLocaleString('fa-IR')} تومان</p>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4 ring-1 ring-slate-700">
                    <h3 className="text-slate-300 text-sm">کل سابقه محاسبه‌شده</h3>
                    <p className="text-2xl font-extrabولد text-sky-400">{yearsMonthsDays.years} سال، {yearsMonthsDays.months} ماه، {yearsMonthsDays.days} روز</p>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4 ring-1 ring-slate-700">
                    <h3 className="text-slate-300 text-sm">مجموع روزهای سال جاری</h3>
                    <p className="text-2xl font-extrabold text-amber-400">{socialInsurance.filter(p => p.year === moment().jYear()).reduce((s, p) => s + (p.daysCovered || 0), 0)} روز</p>
                </div>
            </div>

            {selectedYear == null ? (
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <input
                            type="search"
                            value={yearQuery}
                            onChange={(e) => setYearQuery((e.target as HTMLInputElement).value)}
                            placeholder="جستجوی سال..."
                            className="w-full sm:w-64 bg-slate-700/50 text-white rounded-md py-2 px-3 focus:ring-2 focus:ring-sky-400 focus:outline-none"
                        />
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-1">
                        {filteredYears.map(y => (
                            <button key={y} onClick={() => setSelectedYear(y)} className="min-w-[96px] bg-slate-800/60 hover:bg-slate-800 rounded-xl p-4 ring-1 ring-slate-700 text-center transition">
                                <div className="text-2xl font-extrabold text-slate-100">{y}</div>
                                <div className="text-xs text-slate-400 mt-1">مشاهده سوابق</div>
                            </button>
                        ))}
                        {filteredYears.length === 0 && (
                            <div className="text-center py-10 text-slate-400 bg-slate-800/20 rounded-lg w-full">هیچ سالی مطابق جستجو یافت نشد.</div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <button onClick={() => setSelectedYear(null)} className="flex items-center gap-2 text-slate-300 hover:text-sky-400 transition-colors">
                            <ArrowRightIcon /> بازگشت به سال‌ها
                        </button>
                        <h3 className="text-xl font-bold text-white">سوابق سال {selectedYear}</h3>
                    </div>
                    {(() => {
                        const recs = socialInsurance.filter(p => p.year === selectedYear);
                        const yAmount = recs.reduce((s, p) => s + (p.amount || 0), 0);
                        const yDays = recs.reduce((s, p) => s + (p.daysCovered || 0), 0);
                        return (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="bg-slate-800/60 rounded-xl p-3 ring-1 ring-slate-700">
                                    <div className="text-slate-300 text-xs">مجموع پرداختی سال</div>
                                    <div className="text-emerald-400 font-extrabold">{formatCurrency(yAmount)}</div>
                                </div>
                                <div className="bg-slate-800/60 rounded-xl p-3 ring-1 ring-slate-700">
                                    <div className="text-slate-300 text-xs">مجموع روزهای سال</div>
                                    <div className="text-amber-400 font-extrabold">{yDays} روز</div>
                                </div>
                            </div>
                        );
                    })()}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
                            const rec = socialInsurance.find(p => p.year === selectedYear && p.month === m);
                            const salary = rec?.registeredSalary || 0;
                            const payPercent = salary > 0 ? Math.round((rec.amount / salary) * 100) : 0;
                            return (
                                <div key={m} className={`rounded-xl p-4 ring-1 ${rec ? 'ring-emerald-700 bg-emerald-900/10' : 'ring-slate-700 bg-slate-800/50'}`}>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="text-slate-100 font-bold">{monthNames[m-1]}</div>
                                            {rec ? (
                                                <>
                                                    <div className="text-sky-300 font-extrabold mt-1">{rec.amount.toLocaleString('fa-IR')} تومان</div>
                                                    <div className="text-xs text-slate-400 mt-1">روزهای پوشش: {rec.daysCovered}</div>
                                                    <div className="text-xs text-slate-500">تاریخ پرداخت: {moment(rec.payDate).locale('fa').format('jD jMMMM jYYYY')}</div>
                                                    {typeof rec.registeredSalary === 'number' && rec.registeredSalary > 0 && (
                                                        <div className="text-xs text-slate-400">حقوق ثبت‌شده: {rec.registeredSalary.toLocaleString('fa-IR')} تومان</div>
                                                    )}
                                                    {salary > 0 && (
                                                        <div className="mt-2 text-[11px] text-slate-300 bg-slate-800/60 rounded p-2 ring-1 ring-slate-700 w-fit">
                                                            درصد نسبت به حقوق ثبت‌شده: <span className="font-bold">{payPercent}%</span>
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <div className="text-xs text-slate-400 mt-1">پرداختی ثبت نشده</div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 text-slate-400">
                                            {rec ? (
                                                <>
                                                    {rec.receiptRef && <button onClick={() => setPreviewRef(rec.receiptRef!)} className="hover:text-sky-400" title="مشاهده فیش"><EyeIcon/></button>}
                                                    {!rec.isSettled && <button onClick={() => { setEditing(rec); setModalOpen(true); }} className="hover:text-sky-400 text-xs">ویرایش</button>}
                                                    {!rec.isSettled && <button onClick={() => deleteSocialInsurance(rec.id)} className="hover:text-rose-400 text-xs">حذف</button>}
                                                    {!rec.isSettled ? (
                                                        <button onClick={() => setConfirmState({ open: true, title: 'تسویه نهایی', message: 'تسویه این ماه غیرقابل بازگشت است. تایید می‌کنید؟', confirmText: '✓✓ تسویه نهایی', tone: 'success', onConfirm: () => settleSocialInsurance(rec.id) })} className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs" title="تسویه (غیرقابل بازگشت)">✓✓ تسویه</button>
                                                    ) : (
                                                        <span className="px-2 py-1 bg-emerald-700 text-white rounded-md text-xs" title="تسویه شده">✓✓ تسویه‌شده</span>
                                                    )}
                                                </>
                                            ) : (
                                                <>
                                                    <button onClick={() => openNewFor(selectedYear, m)} className="px-2 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-md text-xs">ثبت</button>
                                                    <button onClick={() => setConfirmState({ open: true, title: 'تسویه بدون ثبت پرداخت', message: 'این ماه را بدون ثبت پرداخت تسویه می‌کنید. این اقدام غیرقابل بازگشت است. تایید می‌کنید؟', confirmText: '✓✓ تسویه', tone: 'success', onConfirm: () => settleSocialInsuranceMonth(selectedYear, m) })} className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs" title="تسویه بدون ثبت">✓✓ تسویه</button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <SocialInsuranceModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onSave={(payload) => { saveSocialInsurance(payload); setModalOpen(false); }} payment={editing} />
            <ReceiptPreview refOrUrl={previewRef} onClose={() => setPreviewRef(null)} />
            <ConfirmDialog open={!!confirmState?.open} title={confirmState?.title || 'تایید عملیات'} message={confirmState?.message || ''} confirmText={confirmState?.confirmText || 'تایید'} cancelText={confirmState?.cancelText || 'لغو'} tone={confirmState?.tone || 'warning'} onConfirm={() => { try { confirmState?.onConfirm?.(); } finally { /* handled in dialog */ } }} onClose={() => setConfirmState(null)} />
        </div>
    );
};

const ReceiptPreview = ({ refOrUrl, onClose, title, downloadLabel = 'دانلود', onDelete }: { refOrUrl: string | null; onClose: () => void; title?: string; downloadLabel?: string; onDelete?: () => void; }) => {
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
                // try public URL from supabase path
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

const SocialInsuranceModal = ({ isOpen, onClose, onSave, payment }: { isOpen: boolean; onClose: () => void; onSave: (p: any) => void; payment: any | null; }) => {
    const [form, setForm] = useState<any>(() => payment || ({ id: Date.now().toString(), year: moment().jYear(), month: moment().jMonth() + 1, daysCovered: moment.jDaysInMonth(moment().jYear(), moment().jMonth()), amount: 0, payDate: new Date().toISOString() }));
    const [receiptURL, setReceiptURL] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const monthNames = useMemo(() => Array.from({ length: 12 }, (_, i) => moment().jMonth(i).locale('fa').format('jMMMM')), []);

    const computeDaysCovered = (year: number, month: number) => {
        // Robust jalaali month lengths with leap-year handling for Esfand
        if (month >= 1 && month <= 6) return 31;
        if (month >= 7 && month <= 11) return 30;
        // month === 12 → Esfand
        // Use jalali-moment's leap check
        // @ts-ignore
        const isLeap = (moment as any).jIsLeapYear ? (moment as any).jIsLeapYear(year) : moment.jDaysInMonth(year, 11) === 30;
        return isLeap ? 30 : 29;
    };

    useEffect(() => {
        if (payment) {
            setForm(payment);
        } else {
            setForm({ id: Date.now().toString(), year: moment().jYear(), month: moment().jMonth() + 1, daysCovered: moment.jDaysInMonth(moment().jYear(), moment().jMonth()), amount: 0, payDate: new Date().toISOString() });
        }
        (async () => {
            if (payment?.receiptRef && isImageRef(payment.receiptRef)) {
                const url = await getObjectURLByRef(payment.receiptRef);
                setReceiptURL(url);
            } else {
                setReceiptURL(null);
            }
        })();
    }, [payment, isOpen]);

    useEffect(() => {
        // Auto-update daysCovered when year/month changes (user can edit afterwards)
        const autoDays = computeDaysCovered(form.year, form.month);
        setForm((p: any) => (p.daysCovered === autoDays ? p : { ...p, daysCovered: autoDays }));
    }, [form.year, form.month]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // smart validation: prevent duplicate year/month
        const existing = useAccountantStore.getState().socialInsurance;
        const duplicate = existing.find(x => x.year === form.year && x.month === form.month && x.id !== form.id);
        if (duplicate) {
            alert('برای این سال/ماه قبلا پرداخت ثبت شده است.');
            return;
        }
        const maxDays = computeDaysCovered(form.year, form.month);
        const days = Math.max(0, Math.min(Number(form.daysCovered) || 0, maxDays));
        onSave({ ...form, amount: Number(form.amount) || 0, daysCovered: days });
    };

    const maxDaysForCurrent = computeDaysCovered(form.year, form.month);
    const isLeapEsfand = form.month === 12 && maxDaysForCurrent === 30;

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose} role="dialog" aria-modal="true">
            <div className="bg-slate-800 rounded-xl w-full max-w-lg shadow-2xl ring-1 ring-slate-700 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="flex justify-between items-center p-4 border-b border-slate-700 sticky top-0 bg-slate-800 z-10">
                        <h3 className="text-xl font-bold text-slate-100">{payment ? 'ویرایش پرداخت بیمه' : 'ثبت پرداخت بیمه'}</h3>
                        <button type="button" onClick={onClose} className="text-slate-400 hover:text-white transition">بستن</button>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm text-slate-300 mb-1">سال</label>
                                <input type="number" className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3 focus:ring-2 focus:ring-sky-400 focus:outline-none" value={form.year} onChange={e => setForm(p => ({...p, year: Number((e.target as HTMLInputElement).value)}))} required />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-300 mb-1">ماه</label>
                                <select className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3 focus:ring-2 focus:ring-sky-400 focus:outline-none" value={form.month} onChange={e => setForm(p => ({...p, month: Number((e.target as HTMLSelectElement).value)}))}>
                                    {monthNames.map((name, idx) => <option key={idx+1} value={idx+1}>{name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm text-slate-300 mb-1">حقوق ثبت‌شده (اختیاری)</label>
                            <input type="number" className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3 focus:ring-2 focus:ring-sky-400 focus:outline-none" value={form.registeredSalary || ''} onChange={e => setForm(p => ({...p, registeredSalary: Number((e.target as HTMLInputElement).value) || 0 }))} placeholder="مثلا 15,000,000" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm text-slate-300 mb-1">روزهای پوشش (قابل ویرایش)</label>
                                <input type="number" min={0} max={maxDaysForCurrent} className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3 focus:ring-2 focus:ring-sky-400 focus:outline-none" value={form.daysCovered} onChange={e => setForm(p => ({...p, daysCovered: Number((e.target as HTMLInputElement).value)}))} />
                                <div className="mt-1 text-xs text-slate-400 flex items-center gap-2">
                                    <span>حداکثر این ماه: {maxDaysForCurrent} روز</span>
                                    {isLeapEsfand && <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30">سال کبیسه</span>}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm text-slate-300 mb-1">مبلغ (تومان)</label>
                                <input type="number" className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3 focus:ring-2 focus:ring-sky-400 focus:outline-none" value={form.amount} onChange={e => setForm(p => ({...p, amount: Number((e.target as HTMLInputElement).value)}))} required />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <JalaliDatePicker label="تاریخ پرداخت" id="siPayDate" value={form.payDate} onChange={(iso) => setForm(p => ({ ...p, payDate: iso }))} />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-300 mb-1">یادداشت (اختیاری)</label>
                                <input className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3 focus:ring-2 focus:ring-sky-400 focus:outline-none" value={form.note || ''} onChange={e => setForm(p => ({...p, note: (e.target as HTMLInputElement).value}))} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm text-slate-300 mb-1">تصویر فاکتور (اختیاری)</label>
                            <div className="mt-1 flex items-center gap-3">
                                <div className="relative h-20 w-20 rounded-md bg-slate-700/50 overflow-hidden flex items-center justify-center">
                                    {receiptURL ? <img src={receiptURL} className="h-full w-full object-cover"/> : <span className="text-slate-500 text-xs">بدون تصویر</span>}
                                    {isUploading && (
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                            <div className="h-4 w-4 border-2 border-slate-300 border-t-sky-500 rounded-full animate-spin"></div>
                                        </div>
                                    )}
                                </div>
                                <input type="file" accept="image/*" onChange={async (e) => {
                                    const f = e.target.files?.[0];
                                    if (!f) return;
                                    const reader = new FileReader();
                                    reader.onloadend = async () => {
                                        try {
                                            setIsUploading(true);
                                            const dataUrl = String(reader.result);
                                            const ref = await saveImageDataURL(dataUrl);
                                            setForm(p => ({ ...p, receiptRef: ref }));
                                            const url = await getObjectURLByRef(ref);
                                            setReceiptURL(url);
                                        } catch (err) {
                                            console.error('Receipt upload failed', err);
                                        } finally {
                                            setIsUploading(false);
                                        }
                                    };
                                    reader.readAsDataURL(f);
                                }} className="text-sm"/>
                            </div>
                            {receiptURL && (
                                <div className="mt-2 text-right">
                                    <a href={receiptURL} target="_blank" rel="noreferrer" className="text-sky-400 text-sm">دانلود فیش</a>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="px-6 py-4 bg-slate-800/50 border-t border-slate-700 flex justify-end space-x-3 space-x-reverse sticky bottom-0 z-10">
                        <button type="button" onClick={onClose} className="py-2 px-4 border border-slate-600 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-700 transition">لغو</button>
                        <button type="submit" disabled={isUploading} className={`py-2 px-4 rounded-md text-sm font-bold transition ${isUploading ? 'bg-slate-600 text-slate-300 cursor-not-allowed' : 'bg-sky-500 hover:bg-sky-600 text-white'}`}>ذخیره</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Form Modal Component
const AccountantFormModal = ({ isOpen, onClose, onSave, type, payload }: {isOpen: boolean, onClose: () => void, onSave: (type:string, data:any)=>void, type?:string, payload?:any}) => {
    if (!isOpen) return null;

    const { customCategories, addCustomCategory } = useAccountantStore();
    const [formData, setFormData] = useState(payload || {});
    const [imagePreview, setImagePreview] = useState(payload?.receiptImage || payload?.avatar || null);
    const [isUploading, setIsUploading] = useState(false);
    const [isCustomCategoryMode, setIsCustomCategoryMode] = useState(false);

    useEffect(() => {
        setIsCustomCategoryMode(false);
        const isoNow = new Date().toISOString();
        let defaultData: any = {};
        if (payload) {
             const newPayload = {...payload};
             if ((type === 'transaction' || type === 'ledger' || type === 'installmentPayment' || type === 'check') && !moment(newPayload.date || newPayload.dueDate).isValid()) {
                if(type === 'installmentPayment' || type === 'check') newPayload.dueDate = isoNow;
                else newPayload.date = isoNow;
             }
             if (type === 'asset' && !moment(newPayload.purchaseDate).isValid()) {
                 newPayload.purchaseDate = isoNow;
             }
             setFormData(newPayload);
        } else {
             switch(type) {
                case 'transaction': defaultData = {date: isoNow, type: 'expense', category: TRANSACTION_CATEGORIES.expense[0]}; break;
                // assets moved to dedicated module
                case 'person': defaultData = {}; break;
                case 'ledger': defaultData = {date: isoNow, type: 'debt'}; break;
                case 'installmentPlan': defaultData = {firstPaymentDate: isoNow}; break;
                case 'check': defaultData = {dueDate: isoNow, type: 'issued', status: 'pending'}; break;
             }
             setFormData(defaultData);
        }
        // Resolve existing payload image (if any) to preview, supporting IDB refs
        (async () => {
            const p = payload?.receiptImage || payload?.avatar || null;
            if (isImageRef(p)) {
                const url = await getObjectURLByRef(p);
                setImagePreview(url);
            } else {
                setImagePreview(p || null);
            }
        })();
    }, [isOpen, type, payload]);


    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const newState = { ...prev, [name]: value };
            if (name === 'type' && (type === 'transaction')) {
                const newType = value as 'income' | 'expense';
                const defaults = TRANSACTION_CATEGORIES[newType] || [];
                // Reset category to default if switching type, unless we want to keep it if it exists in new type?
                // Usually categories are disjoint. Safe to reset.
                newState.category = defaults[0];
            }
            return newState;
        });
    };
    
    const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            setIsUploading(true);
            reader.onloadend = async () => {
                const base64String = reader.result as string;
                try {
                    const ref = await saveImageDataURL(base64String);
                    if(type === 'person') setFormData(prev => ({...prev, avatar: ref}));
                    else setFormData(prev => ({...prev, receiptImage: ref}));
                    const url = await getObjectURLByRef(ref);
                    setImagePreview(url);
                } catch (err) {
                    console.error('Failed to save image to IDB', err);
                    setImagePreview(base64String);
                } finally {
                    setIsUploading(false);
                }
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // If transaction and custom category, save it to store
        if (type === 'transaction') {
            const cat = formData.category;
            const tType = formData.type as 'income' | 'expense';
            // If it's not in default list, treat as custom and add it
            if (cat && !TRANSACTION_CATEGORIES[tType].includes(cat)) {
                addCustomCategory(tType, cat);
            }
        }
        onSave(type, formData);
    };

    const getTitle = () => {
        const action = payload?.id ? "ویرایش" : "افزودن";
        switch (type) {
            case 'transaction': return `${action} تراکنش`;
            // assets moved out
            case 'person': return `${action} شخص`;
            case 'ledger': return `${action} حساب`;
            case 'installmentPlan': return `${action} قسط`;
            case 'installmentPayment': return `ویرایش پرداخت قسط`;
            case 'check': return `${action} چک`;
            default: return "فرم";
        }
    }
    
    const renderTransactionFields = () => {
        const tType = (formData.type || 'expense') as 'income' | 'expense';
        const defaultCats = TRANSACTION_CATEGORIES[tType] || [];
        const customCats = customCategories[tType] || [];
        const allCats = [...defaultCats, ...customCats];
        const uniqueCats = Array.from(new Set(allCats));

        return (
            <>
                <FormSelect label="نوع" id="type" value={formData.type} onChange={handleChange} required>
                    <option value="expense">هزینه</option>
                    <option value="income">درآمد</option>
                </FormSelect>

                 <div className="relative">
                     {!isCustomCategoryMode ? (
                        <div className="flex gap-2 items-end">
                            <div className="flex-1">
                                <FormSelect label="دسته بندی" id="category" value={formData.category} onChange={handleChange} required>
                                    {uniqueCats.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </FormSelect>
                            </div>
                            <button 
                                type="button" 
                                onClick={() => { setIsCustomCategoryMode(true); setFormData(p => ({...p, category: ''})); }}
                                className="mb-[1px] p-2.5 bg-slate-700 hover:bg-slate-600 rounded-md text-slate-300 hover:text-white transition"
                                title="افزودن دسته‌بندی جدید"
                            >
                                <PlusIcon />
                            </button>
                        </div>
                     ) : (
                        <div className="flex gap-2 items-end">
                            <div className="flex-1">
                                <FormInput 
                                    label="دسته بندی جدید" 
                                    id="category" 
                                    value={formData.category} 
                                    onChange={handleChange} 
                                    placeholder="نام دسته بندی..." 
                                    required 
                                    autoFocus
                                />
                            </div>
                             <button 
                                type="button" 
                                onClick={() => { setIsCustomCategoryMode(false); setFormData(p => ({...p, category: uniqueCats[0]})); }}
                                className="mb-[1px] p-2.5 bg-slate-700 hover:bg-slate-600 rounded-md text-slate-300 hover:text-white transition"
                                title="بازگشت به لیست"
                            >
                                <CloseIcon />
                            </button>
                        </div>
                     )}
                </div>

                <FormInput label="مبلغ" id="amount" type="number" value={formData.amount} onChange={handleChange} required />
                <FormInput label="توضیحات" id="description" value={formData.description} onChange={handleChange} required />
                <JalaliDatePicker label="تاریخ" id="date" value={formData.date} onChange={(isoDate) => setFormData(p => ({...p, date: isoDate}))} />
                <FormImageUpload label="رسید" preview={imagePreview} onChange={handleImageChange} />
            </>
        );
    };
    const renderAssetFields = () => (
        <>
            <FormInput label="نام دارایی" id="name" value={formData.name} onChange={handleChange} required />
            <FormInput label="ارزش فعلی (تومان)" id="currentValue" type="number" value={formData.currentValue} onChange={handleChange} required />
            <FormInput label="مقدار" id="quantity" type="number" value={formData.quantity} onChange={handleChange} placeholder="مثلا: 2 سکه یا 0.1 بیت‌کوین" required />
            <JalaliDatePicker label="تاریخ خرید" id="purchaseDate" value={formData.purchaseDate} onChange={(isoDate) => setFormData(p => ({...p, purchaseDate: isoDate}))} />
            <FormTextarea label="یادداشت" id="notes" value={formData.notes} onChange={handleChange} />
        </>
    );
    const renderPersonFields = () => (
        <>
            <FormInput label="نام شخص" id="name" value={formData.name} onChange={handleChange} required />
            <FormImageUpload label="آواتار" preview={imagePreview} onChange={handleImageChange} />
        </>
    );
    const renderLedgerFields = () => (
         <>
            <FormSelect label="نوع" id="type" value={formData.type} onChange={handleChange} required>
                <option value="debt">طلب (او به من بدهکار است)</option>
                <option value="credit">بدهی (من به او بدهکارم)</option>
            </FormSelect>
            <FormInput label="مبلغ" id="amount" type="number" value={formData.amount} onChange={handleChange} required />
            <FormInput label="توضیحات" id="description" value={formData.description} onChange={handleChange} required />
            <JalaliDatePicker label="تاریخ" id="date" value={formData.date} onChange={(isoDate) => setFormData(p => ({...p, date: isoDate}))} />
            <FormImageUpload label="رسید (اختیاری)" preview={imagePreview} onChange={handleImageChange} />
        </>
    );
    const renderInstallmentPlanFields = () => (
        <>
            <FormInput label="عنوان" id="title" value={formData.title} onChange={handleChange} placeholder="مثلا خرید گوشی" required />
            <FormInput label="مبلغ کل وام/خرید" id="loanAmount" type="number" value={formData.loanAmount} onChange={handleChange} placeholder="مبلغ دریافت شده" />
            <FormInput label="مبلغ هر قسط" id="paymentAmount" type="number" value={formData.paymentAmount} onChange={handleChange} required={!formData.id} />
            <FormInput label="تعداد اقساط" id="installmentsCount" type="number" value={formData.installmentsCount} onChange={handleChange} min="1" required={!formData.id} />
            <JalaliDatePicker label="تاریخ اولین پرداخت" id="firstPaymentDate" value={formData.firstPaymentDate} onChange={(isoDate) => setFormData(p => ({...p, firstPaymentDate: isoDate}))} />
        </>
    );
    const renderInstallmentPaymentFields = () => (
        <>
             <FormInput label="مبلغ قسط" id="amount" type="number" value={formData.amount} onChange={handleChange} required />
             <FormInput label="جریمه (تومان)" id="penalty" type="number" value={formData.penalty} onChange={handleChange} placeholder="اختیاری" />
             <JalaliDatePicker label="تاریخ سررسید" id="dueDate" value={formData.dueDate} onChange={(isoDate) => setFormData(p => ({...p, dueDate: isoDate}))} />
        </>
    );
     const renderCheckFields = () => (
        <>
            <FormSelect label="نوع چک" id="type" value={formData.type} onChange={handleChange} required>
                <option value="issued">صادره</option>
                <option value="received">دریافتی</option>
            </FormSelect>
             <FormInput label="مبلغ" id="amount" type="number" value={formData.amount} onChange={handleChange} required />
            <JalaliDatePicker label="تاریخ سررسید" id="dueDate" value={formData.dueDate} onChange={(isoDate) => setFormData(p => ({...p, dueDate: isoDate}))} />

            {formData.type === 'issued' ? (
                <>
                    <FormInput label="در وجه" id="payeeName" value={formData.payeeName} onChange={handleChange} required />
                    <FormInput label="کد ملی گیرنده (اختیاری)" id="payeeNationalId" value={formData.payeeNationalId} onChange={handleChange} />
                </>
            ) : (
                 <>
                    <FormInput label="صادر کننده" id="drawerName" value={formData.drawerName} onChange={handleChange} required />
                    <FormInput label="کد ملی صادر کننده (اختیاری)" id="drawerNationalId" value={formData.drawerNationalId} onChange={handleChange} />
                </>
            )}

            <FormInput label="بابت" id="subject" value={formData.subject} onChange={handleChange} required />
            <FormInput label="شناسه صیادی (۱۶ رقم)" id="sayyadId" value={formData.sayyadId} onChange={handleChange} maxLength="16" required />
            <FormTextarea label="توضیحات (اختیاری)" id="description" value={formData.description} onChange={handleChange} />
        </>
    );
    
    return (
      <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose} role="dialog" aria-modal="true">
          <div className="bg-slate-800 rounded-xl w-full max-w-lg shadow-2xl ring-1 ring-slate-700 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <form onSubmit={handleSubmit} name="accountantForm">
                  <div className="flex justify-between items-center p-4 border-b border-slate-700 sticky top-0 bg-slate-800 z-10">
                      <h3 className="text-xl font-bold text-slate-100">{getTitle()}</h3>
                      <button type="button" onClick={onClose} className="text-slate-400 hover:text-white transition">
                          <CloseIcon />
                      </button>
                  </div>
                  <div className="p-6 space-y-4">
                      {type === 'transaction' && renderTransactionFields()}
                      {type === 'asset' && renderAssetFields()}
                      {type === 'person' && renderPersonFields()}
                      {type === 'ledger' && renderLedgerFields()}
                      {type === 'installmentPlan' && renderInstallmentPlanFields()}
                      {type === 'installmentPayment' && renderInstallmentPaymentFields()}
                      {type === 'check' && renderCheckFields()}
                  </div>
                  <div className="px-6 py-4 bg-slate-800/50 border-t border-slate-700 flex justify-end space-x-3 space-x-reverse sticky bottom-0 z-10">
                      <button type="button" onClick={onClose} className="py-2 px-4 border border-slate-600 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-700 transition">لغو</button>
                      <button type="submit" disabled={isUploading} className={`py-2 px-4 rounded-md text-sm font-bold transition ${isUploading ? 'bg-slate-600 text-slate-300 cursor-not-allowed' : 'bg-sky-500 hover:bg-sky-600 text-white'}`}>ذخیره</button>
                  </div>
              </form>
          </div>
      </div>
    );
};

// Main Component
export const SmartAccountant = ({ onNavigateBack }: { onNavigateBack: () => void; }): React.ReactNode => {
    const [activeTab, setActiveTab] = useState<AccountantTab>('summary');
    const [modal, setModal] = useState<ModalConfig>({ isOpen: false });
    const [viewTransaction, setViewTransaction] = useState<Transaction | null>(null);
    const [currentPerson, setCurrentPerson] = useState<Person | null>(null);
    const [currentInstallment, setCurrentInstallment] = useState<InstallmentPlan | null>(null);

    const data = useAccountantStore();
    const actions = useAccountantStore.getState();

    useEffect(() => {
        const { loadInstallments, loadTransactions, loadAssets, loadPeopleAndLedger, loadChecks, loadSocialInsurance } = useAccountantStore.getState();
        Promise.all([
            loadTransactions(),
            loadAssets(),
            loadPeopleAndLedger(),
            loadChecks(),
            loadSocialInsurance(),
            loadInstallments(),
            (useAccountantStore.getState() as any).loadFunds?.(),
        ]).catch(() => {});
    }, []);

    useEffect(() => {
        if(activeTab !== 'people') setCurrentPerson(null);
        if(activeTab !== 'installments') setCurrentInstallment(null);
    }, [activeTab]);
    
    useEffect(() => {
        if (currentInstallment) {
            const updatedPlan = data.installments.find(p => p.id === currentInstallment.id);
            if (updatedPlan && JSON.stringify(updatedPlan) !== JSON.stringify(currentInstallment)) {
                setCurrentInstallment(updatedPlan);
            } else if (!updatedPlan) {
                setCurrentInstallment(null);
            }
        }
    }, [data.installments, currentInstallment]);


    const openModal = (type: ModalConfig['type'], payload = null) => setModal({ isOpen: true, type, payload });
    const closeModal = () => setModal({ isOpen: false });

    const handleSave = (itemType: string, itemData: any) => {
        const id = itemData.id || Date.now().toString();
    
        switch (itemType) {
            case 'transaction':
                actions.saveTransaction({ ...itemData, id, amount: parseFloat(itemData.amount) || 0 });
                break;
            // assets moved out
            case 'person':
                actions.savePerson({ ...itemData, id });
                break;
            case 'ledger':
                actions.saveLedgerEntry({ ...itemData, id, amount: parseFloat(itemData.amount) || 0 });
                break;
            case 'installmentPlan': {
                const { title, loanAmount, paymentAmount, installmentsCount, firstPaymentDate, id: planId } = itemData;
                if (planId) { 
                    actions.updateInstallmentPlan({ id: planId, title, loanAmount: parseFloat(loanAmount) || 0 });
                } else { 
                    const newPlanId = Date.now().toString();
                    const payments: InstallmentPayment[] = Array.from({ length: parseInt(installmentsCount, 10) || 0 }, (_, i) => ({
                        id: `${newPlanId}-${i}`,
                        dueDate: moment(firstPaymentDate).add(i, 'jMonth').toISOString(),
                        amount: parseFloat(paymentAmount) || 0,
                        isPaid: false,
                    }));
                    const newPlan: InstallmentPlan = { id: newPlanId, title, payments, loanAmount: parseFloat(loanAmount) || 0 };
                    actions.saveInstallmentPlan(newPlan);
                }
                break;
            }
            case 'installmentPayment': {
                const { planId, id: paymentId, amount, dueDate, penalty } = itemData;
                actions.updateInstallmentPayment(planId, { id: paymentId, amount: parseFloat(amount) || 0, dueDate, penalty: parseFloat(penalty) || 0 });
                break;
            }
            case 'check': {
                actions.saveCheck({ 
                    ...itemData, 
                    id, 
                    amount: parseFloat(itemData.amount) || 0,
                    status: itemData.status || 'pending'
                });
                break;
            }
        }
        closeModal();
    };

    const handleDelete = (itemType: string, id: string, personId?: string) => {
        if (!window.confirm("آیا از حذف این مورد اطمینان دارید؟")) return;
        switch (itemType) {
            case 'transaction':
                actions.deleteTransaction(id);
                break;
            // assets moved out
            case 'person':
                actions.deletePerson(id);
                break;
            case 'ledger':
                if (personId) actions.deleteLedgerEntry(personId, id);
                break;
            case 'installmentPlan':
                actions.deleteInstallmentPlan(id);
                setCurrentInstallment(null);
                break;
            case 'check':
                actions.deleteCheck(id);
                break;
        }
    };
    
    const handleSettle = (personId: string, ledgerId: string) => {
       actions.toggleSettle(personId, ledgerId);
    }
    
    const handleTogglePaidStatus = (planId: string, paymentId: string) => {
       actions.togglePaidStatus(planId, paymentId);
    }

     const handleUpdateCheckStatus = (checkId: string, status: CheckStatus) => {
       actions.updateCheckStatus(checkId, status);
    }

    const handleAddButtonClick = () => {
        let modalType: ModalConfig['type'] = undefined;
        let payload: any = null;

        switch (activeTab) {
            case 'summary':
            case 'transactions':
                modalType = 'transaction';
                break;
            case 'people':
                if (currentPerson) {
                    modalType = 'ledger';
                    payload = { personId: currentPerson.id };
                } else {
                    modalType = 'person';
                }
                break;
            case 'installments':
                 if (!currentInstallment) modalType = 'installmentPlan';
                break;
            case 'checks':
                modalType = 'check';
                break;
            case 'social_insurance':
                // open inline modal in SocialInsuranceView via event
                const evt = new CustomEvent('open-social-insurance-modal');
                window.dispatchEvent(evt);
                break;
        }
        if (modalType) {
            openModal(modalType, payload);
        }
    };

    const isAddButtonDisabled = (activeTab === 'installments' && !!currentInstallment);

    return (
        <div className="container mx-auto px-4 py-8 sm:py-12">
            <AccountantFormModal isOpen={modal.isOpen} onClose={closeModal} onSave={handleSave} type={modal.type} payload={modal.payload} />
            <TransactionVoucherModal transaction={viewTransaction} onClose={() => setViewTransaction(null)} />
            
            <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={onNavigateBack} className="flex items-center space-x-2 space-x-reverse bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2 px-4 rounded-lg transition" title="بازگشت به داشبورد">
                        <BackIcon />
                    </button>
                    <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">حسابدار هوشمند</h2>
                </div>
                 <button onClick={handleAddButtonClick} className="w-full sm:w-auto flex items-center justify-center space-x-2 space-x-reverse bg-sky-500 hover:bg-sky-600 text-white font-bold py-2 px-5 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isAddButtonDisabled}
                  >
                    <PlusIcon />
                    <span>{currentPerson ? "افزودن حساب جدید" : (activeTab === 'installments' && !currentInstallment) ? "افزودن قسط جدید" : "افزودن"}</span>
                </button>
            </div>

            {/* Tabs (draggable) */}
            <div className="mb-6">
                <div className="border-b border-slate-700">
                    <nav className="-mb-px flex space-x-4 space-x-reverse overflow-x-auto" aria-label="Tabs">
                        {(() => {
                            const store = useAccountantStore.getState();
                            const { tabsOrder, setTabsOrder } = store;
                            const all = [
                                { id: 'summary', title: 'خلاصه', icon: <SummaryIcon /> },
                                { id: 'transactions', title: 'تراکنش‌ها', icon: <TransactionsIcon /> },
                                { id: 'people', title: 'حساب با دیگران', icon: <PeopleIcon /> },
                                { id: 'installments', title: 'اقساط', icon: <InstallmentsIcon /> },
                                { id: 'checks', title: 'چک‌ها', icon: <ChecksIcon /> },
                                { id: 'social_insurance', title: 'تامین اجتماعی', icon: <WalletIcon /> },
                                { id: 'darfak', title: 'درفک (ساخت‌وساز)', icon: <TransactionsIcon /> },
                            ] as { id: AccountantTab; title: string; icon: React.ReactNode }[];
                            const idToTab = new Map(all.map(t => [t.id, t] as const));
                            const ordered = tabsOrder?.length ? tabsOrder.map(id => idToTab.get(id)).filter(Boolean) as typeof all : all;
                            const handleDrop = (e: React.DragEvent<HTMLButtonElement>, toId: AccountantTab) => {
                                e.preventDefault();
                                const fromId = e.dataTransfer.getData('text/plain') as AccountantTab;
                                if (!fromId || fromId === toId) return;
                                const current = ordered.map(t => t.id);
                                const fromIdx = current.indexOf(fromId);
                                const toIdx = current.indexOf(toId);
                                if (fromIdx === -1 || toIdx === -1) return;
                                const next = [...current];
                                next.splice(toIdx, 0, next.splice(fromIdx, 1)[0]);
                                setTabsOrder(next as AccountantTab[]);
                            };
                            return ordered.map(tab => (
                                <button
                                    key={tab.id}
                                    draggable
                                    onDragStart={(e) => { e.dataTransfer.setData('text/plain', tab.id); }}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => handleDrop(e, tab.id)}
                                    onClick={() => setActiveTab(tab.id as AccountantTab)}
                                    className={`${activeTab === tab.id ? 'border-sky-400 text-sky-400' : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-500'} whitespace-nowrap flex items-center py-3 px-1 border-b-2 font-medium text-sm transition-colors focus:outline-none`}
                                    aria-current={activeTab === tab.id ? 'page' : undefined}
                                    title="برای جابجایی بکشید و رها کنید"
                                >
                                    <span className="ml-2">{tab.icon}</span>
                                    {tab.title}
                                </button>
                            ));
                        })()}
                    </nav>
                </div>
            </div>

            {/* Content */}
            <div className="animate-fade-in">
                {activeTab === 'summary' && <SummaryView data={data} />}
                {activeTab === 'transactions' && <TransactionsView transactions={data.transactions} onEdit={(t) => openModal('transaction', t)} onDelete={(id) => handleDelete('transaction', id)} onView={setViewTransaction} />}
                {activeTab === 'checks' && <ChecksView checks={data.checks} onEdit={(c) => openModal('check', c)} onDelete={(id) => handleDelete('check', id)} onStatusChange={handleUpdateCheckStatus} />}
                {activeTab === 'installments' && <InstallmentsView installments={data.installments} currentInstallment={currentInstallment} setCurrentInstallment={setCurrentInstallment} onEditPlan={(plan) => openModal('installmentPlan', plan)} onDeletePlan={(id) => handleDelete('installmentPlan', id)} onEditPayment={(p) => openModal('installmentPayment', p)} onTogglePaidStatus={handleTogglePaidStatus} />}
                {activeTab === 'people' && <PeopleView data={data} onEditPerson={(p) => openModal('person', p)} onDeletePerson={(id) => handleDelete('person', id)} onEditLedger={(l) => openModal('ledger', l)} onDeleteLedger={(personId, ledgerId) => handleDelete('ledger', ledgerId, personId)} onSettle={handleSettle} currentPerson={currentPerson} setCurrentPerson={setCurrentPerson} />}
                {activeTab === 'social_insurance' && <SocialInsuranceView />}
                {activeTab === 'darfak' && <DarfakView />}
            </div>
        </div>
    );
};


// VIEW COMPONENTS

const SummaryView = ({ data }: { data: AccountantData }) => {
    // Selected month cursor (Jalali). We store ISO of the start of month for stability.
    const [selectedMonthISO, setSelectedMonthISO] = useState<string>(() => moment().startOf('jMonth').toISOString());

    const startOfSelected = useMemo(() => moment(selectedMonthISO).startOf('jMonth'), [selectedMonthISO]);
    const endOfSelected = useMemo(() => moment(selectedMonthISO).endOf('jMonth'), [selectedMonthISO]);
    const selectedMonthLabel = useMemo(() => startOfSelected.clone().locale('fa').format('jMMMM jYYYY'), [startOfSelected]);
    const canGoNextMonth = useMemo(() => startOfSelected.isBefore(moment().startOf('jMonth')), [startOfSelected]);

    const totalAssets = useMemo(() => data.assets.reduce((sum, asset) => sum + (asset.currentValue * (asset.quantity || 1)), 0), [data.assets]);
    
    const incomeOfMonth = useMemo(() => data.transactions
        .filter(t => t.type === 'income' && moment(t.date).isBetween(startOfSelected, endOfSelected, undefined, '[]'))
        .reduce((sum, t) => sum + t.amount, 0), [data.transactions, selectedMonthISO]);

    const expensesOfMonth = useMemo(() => data.transactions
        .filter(t => t.type === 'expense' && moment(t.date).isBetween(startOfSelected, endOfSelected, undefined, '[]'))
        .reduce((sum, t) => sum + t.amount, 0), [data.transactions, selectedMonthISO]);
    
    // Aggregate receivables/payables per person, then split into totals.
    // This avoids showing both sides simultaneously when the net with a person is zero or one-sided.
    const { totalDebt, totalCredit } = useMemo(() => {
        let receivables = 0; // طلب از دیگران
        let payables = 0;    // بدهی به دیگران
        Object.values(data.ledger).forEach((personEntries: any[]) => {
            const netForPerson = (personEntries || []).reduce((acc, entry) => {
                if (entry.isSettled) return acc;
                if (entry.type === 'debt') return acc + entry.amount;   // آنها به من بدهکارند
                return acc - entry.amount;                               // من به آنها بدهکارم
            }, 0);
            if (netForPerson > 0) receivables += netForPerson;
            else if (netForPerson < 0) payables += Math.abs(netForPerson);
        });
        return { totalDebt: receivables, totalCredit: payables };
    }, [data.ledger]);

    const monthlyInstallments = useMemo(() => {
        const jjYear = startOfSelected.jYear();
        const jjMonth = startOfSelected.jMonth() + 1;
        const allPaymentsThisMonth = data.installments.flatMap(plan => plan.payments)
            .filter(payment => {
                const d = moment(payment.dueDate);
                return d.jYear() === jjYear && (d.jMonth() + 1) === jjMonth;
            });

        const paidAmount = allPaymentsThisMonth
            .filter(p => p.isPaid)
            .reduce((sum, p) => sum + p.amount + (p.penalty || 0), 0);

        const totalAmount = allPaymentsThisMonth.reduce((sum, p) => sum + p.amount + (p.penalty || 0), 0);

        const unpaidAmount = totalAmount - paidAmount;
        
        const progress = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;

        return {
            totalAmount,
            paidAmount,
            unpaidAmount,
            progress,
            hasInstallments: allPaymentsThisMonth.length > 0
        };
    }, [data.installments, selectedMonthISO]);

    // Installments preview: previous and next months (totals based on dueDate)
    const computeInstallmentMonth = (m: any) => {
        const jy = m.jYear();
        const jm = m.jMonth() + 1;
        const s = m.clone().startOf('jMonth');
        const all = data.installments.flatMap(pl => pl.payments).filter(p => {
            const d = moment(p.dueDate);
            return d.jYear() === jy && (d.jMonth() + 1) === jm;
        });
        const total = all.reduce((sum, p) => sum + p.amount + (p.penalty || 0), 0);
        const paid = all.filter(p => p.isPaid).reduce((sum, p) => sum + p.amount + (p.penalty || 0), 0);
        const unpaid = total - paid;
        return { total, paid, unpaid, label: m.clone().locale('fa').format('jMMM jYY'), iso: s.toISOString() };
    };
    const prevInstallments = useMemo(() => computeInstallmentMonth(startOfSelected.clone().subtract(1, 'jMonth')), [selectedMonthISO, data.installments]);
    const nextInstallments = useMemo(() => {
        return Array.from({ length: 6 }).map((_, i) => computeInstallmentMonth(startOfSelected.clone().add(i + 1, 'jMonth')));
    }, [selectedMonthISO, data.installments]);
    
    const monthlyIssuedChecks = useMemo(() => {
        const startOfMonth = startOfSelected;
        const endOfMonth = endOfSelected;

        return data.checks
            .filter(c => c.type === 'issued' && c.status === 'pending' && moment(c.dueDate).isBetween(startOfMonth, endOfMonth, undefined, '[]'))
            .reduce((sum, c) => sum + c.amount, 0);
    }, [data.checks, selectedMonthISO]);

    const netWorth = totalAssets + totalDebt - totalCredit;
    
    const StatCard = ({ title, value, colorClass }) => (
        <div className="bg-slate-800/50 rounded-xl p-6 ring-1 ring-slate-700">
            <h3 className="text-slate-400 text-md">{title}</h3>
            <p className={`text-3xl font-bold mt-2 ${colorClass}`}>{formatCurrency(value)}</p>
        </div>
    );

    // Last 12 months quick selector (including current)
    const monthsHistory = useMemo(() => {
        const base = moment().startOf('jMonth');
        return Array.from({ length: 12 }).map((_, i) => base.clone().subtract(i, 'jMonth'));
    }, []);

    // Monthly fund state (opening amount setup)
    const jYear = startOfSelected.jYear();
    const jMonth = startOfSelected.jMonth() + 1; // 1-12
    const currentFund: MonthlyFund | undefined = useMemo(() => (data.funds || []).find((f: any) => f.year === jYear && f.month === jMonth), [data.funds, jYear, jMonth]);
    const [isEditingFund, setIsEditingFund] = useState<boolean>(false);
    const [fundInput, setFundInput] = useState<string>(() => String(currentFund?.openingAmount ?? ''));
    useEffect(() => { setFundInput(String(currentFund?.openingAmount ?? '')); }, [currentFund?.openingAmount, jYear, jMonth]);

    const saveFund = () => {
        const opening = Number(String(fundInput).replace(/,/g, '')) || 0;
        const id = `${jYear}-${String(jMonth).padStart(2,'0')}`;
        const payload: MonthlyFund = { id, year: jYear, month: jMonth, openingAmount: opening };
        const { saveMonthlyFund } = useAccountantStore.getState() as any;
        saveMonthlyFund(payload);
        setIsEditingFund(false);
    };

    // Cashflow components for selected month
    const incomeTx = useMemo(() => data.transactions
        .filter(t => t.type === 'income' && moment(t.date).isBetween(startOfSelected, endOfSelected, undefined, '[]'))
        .reduce((sum, t) => sum + t.amount, 0), [data.transactions, selectedMonthISO]);
    const expenseTx = useMemo(() => data.transactions
        .filter(t => t.type === 'expense' && moment(t.date).isBetween(startOfSelected, endOfSelected, undefined, '[]'))
        .reduce((sum, t) => sum + t.amount, 0), [data.transactions, selectedMonthISO]);

    const ledgerEntries = useMemo(() => Object.values(data.ledger || {}).flat().filter(e => moment(e.date).isBetween(startOfSelected, endOfSelected, undefined, '[]')), [data.ledger, selectedMonthISO]);
    const ledgerInflow = useMemo(() => ledgerEntries.filter(e => e.type === 'credit' && !e.isSettled).reduce((s, e) => s + e.amount, 0) + ledgerEntries.filter(e => e.type === 'credit' && e.isSettled).reduce((s,e)=>s+e.amount,0), [ledgerEntries]);
    const ledgerOutflow = useMemo(() => ledgerEntries.filter(e => e.type === 'debt' && !e.isSettled).reduce((s, e) => s + e.amount, 0) + ledgerEntries.filter(e => e.type === 'debt' && e.isSettled).reduce((s,e)=>s+e.amount,0), [ledgerEntries]);

    const installmentOut = useMemo(() => (data.installments || []).flatMap(p => p.payments)
        .filter(p => p.isPaid && p.paidDate && moment(p.paidDate).isBetween(startOfSelected, endOfSelected, undefined, '[]'))
        .reduce((sum, p) => sum + p.amount + (p.penalty || 0), 0), [data.installments, selectedMonthISO]);

    const checksCashed = useMemo(() => (data.checks || []).filter(c => c.status === 'cashed' && c.cashedDate && moment(c.cashedDate).isBetween(startOfSelected, endOfSelected, undefined, '[]')), [data.checks, selectedMonthISO]);
    const checksIn = useMemo(() => checksCashed.filter(c => c.type === 'received').reduce((s, c) => s + c.amount, 0), [checksCashed]);
    const checksOut = useMemo(() => checksCashed.filter(c => c.type === 'issued').reduce((s, c) => s + c.amount, 0), [checksCashed]);

    const socialOut = useMemo(() => (data as any).socialInsurance?.filter((p: any) => p.payDate && moment(p.payDate).isBetween(startOfSelected, endOfSelected, undefined, '[]')).reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0) || 0, [data.socialInsurance, selectedMonthISO]);
    const darfakOut = useMemo(() => (useAccountantStore.getState().darfak || []).filter((e: any) => e.date && moment(e.date).isBetween(startOfSelected, endOfSelected, undefined, '[]')).reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0), [selectedMonthISO]);

    const inflowTotal = useMemo(() => incomeTx + ledgerInflow + checksIn, [incomeTx, ledgerInflow, checksIn]);
    const outflowTotal = useMemo(() => expenseTx + ledgerOutflow + installmentOut + checksOut + socialOut + darfakOut, [expenseTx, ledgerOutflow, installmentOut, checksOut, socialOut, darfakOut]);
    const openingAmount = Number(currentFund?.openingAmount || 0);
    const monthEndBalance = useMemo(() => openingAmount + inflowTotal - outflowTotal, [openingAmount, inflowTotal, outflowTotal]);

    return (
        <div className="space-y-6">
            {/* Month navigation */}
            <div className="flex items-center justify-between bg-slate-900/40 p-3 md:p-4 rounded-lg ring-1 ring-slate-800">
                <div className="flex items-center gap-2">
                    <button
                        className="px-3 py-1.5 rounded-md bg-slate-700 text-slate-100 hover:bg-slate-600"
                        onClick={() => setSelectedMonthISO(startOfSelected.clone().subtract(1, 'jMonth').toISOString())}
                    >ماه قبل</button>
                    <button
                        className="px-3 py-1.5 rounded-md border border-slate-600 text-slate-200 hover:bg-slate-700"
                        onClick={() => setSelectedMonthISO(moment().startOf('jMonth').toISOString())}
                    >ماه جاری</button>
                </div>
                <div className="text-slate-200 font-bold">{selectedMonthLabel}</div>
                <button
                    className={`px-3 py-1.5 rounded-md ${canGoNextMonth ? 'bg-slate-700 text-slate-100 hover:bg-slate-600' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                    onClick={() => canGoNextMonth && setSelectedMonthISO(startOfSelected.clone().add(1, 'jMonth').toISOString())}
                    disabled={!canGoNextMonth}
                >ماه بعد</button>
            </div>

            {/* Quick 12-month chips */}
            <div className="flex flex-wrap gap-2">
                {monthsHistory.map(m => {
                    const isActive = m.isSame(startOfSelected, 'jMonth');
                    const iso = m.toISOString();
                    return (
                        <button
                            key={iso}
                            onClick={() => setSelectedMonthISO(iso)}
                            className={`px-3 py-1 rounded-full text-xs border ${isActive ? 'bg-sky-600 text-white border-sky-500' : 'bg-slate-700/50 text-slate-200 border-slate-600 hover:bg-slate-700'}`}
                            title={m.locale('fa').format('jMMMM jYYYY')}
                        >{m.locale('fa').format('jMMM jYY')}</button>
                    );
                })}
            </div>

            {/* Monthly Fund */}
            <div className="bg-slate-800/50 rounded-xl p-4 md:p-5 ring-1 ring-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="text-slate-300 text-sm">صندوق نقدی {selectedMonthLabel}</div>
                    <button className="px-3 py-1.5 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-100 text-xs" onClick={() => setIsEditingFund(v => !v)}>{isEditingFund ? 'انصراف' : (currentFund ? 'ویرایش موجودی اولیه' : 'تنظیم موجودی اولیه')}</button>
                </div>
                {isEditingFund ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">موجودی ابتدای ماه (تومان)</label>
                            <input type="number" className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3" value={fundInput} onChange={(e)=>setFundInput((e.target as HTMLInputElement).value)} />
                        </div>
                        <div className="md:col-span-2 flex items-center gap-2">
                            <button className="px-4 py-2 rounded-md bg-sky-600 hover:bg-sky-500 text-white text-sm font-bold" onClick={saveFund}>ذخیره</button>
                            {currentFund && <div className="text-slate-400 text-xs">مقدار فعلی: {formatCurrency(currentFund.openingAmount)}</div>}
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                        <div className="bg-slate-900/40 rounded-lg p-3 ring-1 ring-slate-700">ابتدای ماه: <span className="font-bold text-slate-100">{formatCurrency(openingAmount)}</span></div>
                        <div className="bg-slate-900/40 rounded-lg p-3 ring-1 ring-slate-700">ورودی‌ها: <span className="font-bold text-emerald-400">{formatCurrency(inflowTotal)}</span></div>
                        <div className="bg-slate-900/40 rounded-lg p-3 ring-1 ring-slate-700">خروجی‌ها: <span className="font-bold text-rose-400">{formatCurrency(outflowTotal)}</span></div>
                        <div className="bg-slate-900/60 rounded-lg p-3 ring-1 ring-slate-700">مانده ماه: <span className="font-extrabold text-sky-400">{formatCurrency(monthEndBalance)}</span></div>
                    </div>
                )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="ارزش خالص دارایی‌ها" value={netWorth} colorClass="text-sky-400" />
                <StatCard title={`درآمد ${selectedMonthLabel}`} value={incomeOfMonth} colorClass="text-emerald-400" />
                <StatCard title={`هزینه ${selectedMonthLabel}`} value={expensesOfMonth} colorClass="text-rose-400" />
            </div>

            {monthlyInstallments.hasInstallments && (
                <div className="bg-slate-800/50 rounded-xl p-6 ring-1 ring-slate-700 space-y-4">
                    <h3 className="text-slate-300 text-lg font-semibold">
                        خلاصه اقساط {selectedMonthLabel}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                        <div className="bg-slate-900/40 rounded-lg p-3 ring-1 ring-slate-700 flex items-center justify-between"><span className="text-slate-300">کل اقساط این ماه</span><span className="font-bold text-slate-100">{formatCurrency(monthlyInstallments.totalAmount)}</span></div>
                        <div className="bg-slate-900/40 rounded-lg p-3 ring-1 ring-slate-700 flex items-center justify-between"><span className="text-slate-300">پرداخت شده</span><span className="font-bold text-emerald-400">{formatCurrency(monthlyInstallments.paidAmount)}</span></div>
                        <div className="bg-slate-900/40 rounded-lg p-3 ring-1 ring-slate-700 flex items-center justify-between"><span className="text-slate-300">مانده</span><span className="font-bold text-rose-400">{formatCurrency(monthlyInstallments.unpaidAmount)}</span></div>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-3 md:h-4 overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${monthlyInstallments.progress}%` }}></div>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                        <div className="text-slate-400 text-sm">ماه قبل: <button className="px-2 py-1 rounded-md bg-slate-700/60 hover:bg-slate-600 text-slate-200 text-xs" onClick={() => setSelectedMonthISO(prevInstallments.iso)} title="مشاهده ماه قبل">{prevInstallments.label} • {formatCurrency(prevInstallments.total)}</button></div>
                        <div className="flex flex-wrap gap-2 items-center">
                            <span className="text-slate-400 text-sm">ماه‌های آینده:</span>
                            {nextInstallments.map((m) => (
                                <button key={m.iso} className="px-2 py-1 rounded-md bg-slate-700/60 hover:bg-slate-600 text-slate-200 text-xs" onClick={() => setSelectedMonthISO(m.iso)} title={`اقساط ${m.label}`}>{m.label} • {formatCurrency(m.total)}</button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <StatCard title="مجموع طلب شما از دیگران" value={totalDebt} colorClass="text-emerald-400" />
                 <StatCard title="مجموع بدهی شما به دیگران" value={totalCredit} colorClass="text-rose-400" />
                 <StatCard title={`چک‌های صادره ${selectedMonthLabel}`} value={monthlyIssuedChecks} colorClass="text-amber-400" />
             </div>
        </div>
    )
};

const TransactionsView = ({ transactions, onEdit, onDelete, onView }) => {
    const [selectedDate, setSelectedDate] = useState(() => moment());
    const [filterCategory, setFilterCategory] = useState('all');

    const changeMonth = (amount: number) => {
        setSelectedDate(prev => prev.clone().add(amount, 'jMonth'));
    };

    const currentMonthLabel = useMemo(() => selectedDate.clone().locale('fa').format('jMMMM jYYYY'), [selectedDate]);

    const allCategories = useMemo(() => {
        const cats = new Set<string>(transactions.map(t => t.category));
        return Array.from(cats);
    }, [transactions]);

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const tDate = moment(t.date);
            const matchesMonth = tDate.jYear() === selectedDate.jYear() && tDate.jMonth() === selectedDate.jMonth();
            const matchesCategory = filterCategory === 'all' || t.category === filterCategory;
            return matchesMonth && matchesCategory;
        });
    }, [transactions, selectedDate, filterCategory]);

    const income = filteredTransactions.filter(t => t.type === 'income');
    const expenses = filteredTransactions.filter(t => t.type === 'expense');
    
    // Icons for month nav
    const ChevronRight = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" /></svg>;
    const ChevronLeft = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" /></svg>;

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-800/40 p-3 rounded-xl ring-1 ring-slate-700/50">
                <div className="flex items-center bg-slate-800 rounded-lg p-1 ring-1 ring-slate-700 shadow-sm">
                    <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-700 rounded-md text-slate-400 hover:text-white transition" title="ماه قبل">
                        <ChevronRight />
                    </button>
                    <span className="w-36 text-center font-bold text-slate-200 text-sm select-none">{currentMonthLabel}</span>
                    <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-700 rounded-md text-slate-400 hover:text-white transition" title="ماه بعد">
                        <ChevronLeft />
                    </button>
                </div>

                <div className="w-full sm:w-48 relative">
                    <select
                        value={filterCategory}
                        onChange={e => setFilterCategory(e.target.value)}
                        className="w-full appearance-none bg-slate-800 text-slate-300 text-sm rounded-lg border-none ring-1 ring-slate-700 focus:ring-2 focus:ring-sky-500 p-2.5 pr-8 cursor-pointer"
                    >
                        <option value="all">همه دسته‌بندی‌ها</option>
                        {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                       <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                </div>
            </div>

            <div>
                <h3 className="text-xl sm:text-2xl font-bold mb-4 text-emerald-400 flex items-center gap-2">
                    <span>درآمدها</span>
                    <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-full border border-emerald-500/20">{income.length}</span>
                </h3>
                {income.length > 0 ? (
                    <TransactionList transactions={income} onEdit={onEdit} onDelete={onDelete} onView={onView} />
                ) : <p className="text-slate-500 text-center py-8 bg-slate-800/20 rounded-lg text-sm">درآمدی برای {filterCategory !== 'all' ? 'این دسته‌بندی در' : ''} این ماه ثبت نشده است.</p>}
            </div>
             <div>
                <h3 className="text-xl sm:text-2xl font-bold mb-4 text-rose-400 flex items-center gap-2">
                    <span>هزینه‌ها</span>
                    <span className="text-xs bg-rose-500/10 text-rose-400 px-2 py-1 rounded-full border border-rose-500/20">{expenses.length}</span>
                </h3>
                {expenses.length > 0 ? (
                    <TransactionList transactions={expenses} onEdit={onEdit} onDelete={onDelete} onView={onView} />
                ) : <p className="text-slate-500 text-center py-8 bg-slate-800/20 rounded-lg text-sm">هزینه‌ای برای {filterCategory !== 'all' ? 'این دسته‌بندی در' : ''} این ماه ثبت نشده است.</p>}
            </div>
        </div>
    );
};

const TransactionList = ({ transactions, onEdit, onDelete, onView }) => (
    <div className="space-y-3">
        {transactions.map(t => (
            <div 
                key={t.id} 
                className="bg-slate-800/50 rounded-lg p-3 sm:p-4 flex items-center justify-between ring-1 ring-slate-700/50 cursor-pointer hover:bg-slate-800 hover:ring-slate-600 transition group"
                onClick={() => onView && onView(t)}
            >
                <div className="flex items-center space-x-3 sm:space-x-4 space-x-reverse flex-1 min-w-0">
                    {t.receiptImage && (
                        <ImageFromRef srcOrRef={t.receiptImage} className="h-12 w-12 rounded-md object-cover hidden sm:block" />
                    )}
                    <div className="min-w-0">
                        <p className="font-bold text-slate-100 truncate group-hover:text-sky-300 transition-colors">{t.description}</p>
                        <p className="text-sm text-slate-400 truncate">{t.category} • {formatDate(t.date)}</p>
                    </div>
                </div>
                <div className="flex items-center space-x-2 sm:space-x-3 space-x-reverse">
                    <p className={`font-bold text-sm sm:text-base ${t.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCurrency(t.amount)}</p>
                     <div className="flex items-center space-x-1 space-x-reverse text-slate-400">
                       <button onClick={(e) => { e.stopPropagation(); onEdit(t); }} className="p-1.5 hover:bg-slate-700 rounded-full hover:text-sky-400 transition" aria-label="ویرایش"><EditIcon/></button>
                       <button onClick={(e) => { e.stopPropagation(); onDelete(t.id); }} className="p-1.5 hover:bg-slate-700 rounded-full hover:text-rose-400 transition" aria-label="حذف"><DeleteIcon/></button>
                    </div>
                </div>
            </div>
        ))}
    </div>
);

const AssetsView = ({ assets, onEdit, onDelete }) => {
    if (assets.length === 0) {
        return <p className="text-slate-500 text-center py-16 bg-slate-800/20 rounded-lg">هنوز دارایی ثبت نشده است.</p>
    }
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {assets.map(asset => (
                <div key={asset.id} className="bg-slate-800/50 rounded-xl p-4 ring-1 ring-slate-700 flex flex-col space-y-3">
                    <div className="flex justify-between items-start">
                        <div>
                            <h4 className="font-bold text-slate-100 text-lg">{asset.name}</h4>
                            <p className="text-sm text-slate-400">مقدار: {asset.quantity}</p>
                        </div>
                         <div className="flex items-center space-x-1 space-x-reverse text-slate-400">
                           <button onClick={() => onEdit(asset)} className="p-1.5 hover:bg-slate-700 rounded-full hover:text-sky-400 transition" aria-label="ویرایش"><EditIcon/></button>
                           <button onClick={() => onDelete(asset.id)} className="p-1.5 hover:bg-slate-700 rounded-full hover:text-rose-400 transition" aria-label="حذف"><DeleteIcon/></button>
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-sky-400">{formatCurrency(asset.currentValue * asset.quantity)}</p>
                    <p className="text-xs text-slate-500 pt-2 border-t border-slate-700/50">تاریخ خرید: {formatDate(asset.purchaseDate)}</p>
                    {asset.notes && <p className="text-sm text-slate-300">{asset.notes}</p>}
                </div>
            ))}
        </div>
    );
};

const PeopleView = ({ data, onEditPerson, onDeletePerson, onEditLedger, onDeleteLedger, onSettle, currentPerson, setCurrentPerson }) => {
    // Quick add ledger state (must be top-level to honor React rules of hooks)
    const { saveLedgerEntry } = useAccountantStore.getState();
    const [qType, setQType] = useState<'debt' | 'credit'>('debt');
    const [qAmount, setQAmount] = useState<string>('');
    const [qDesc, setQDesc] = useState<string>('');
    const [qDate, setQDate] = useState<string>(() => new Date().toISOString());
    const [showOnlyOpen, setShowOnlyOpen] = useState<boolean>(true);
    const [qReceiptRef, setQReceiptRef] = useState<string | undefined>(undefined);
    const [qReceiptURL, setQReceiptURL] = useState<string | null>(null);
    const [qUploading, setQUploading] = useState<boolean>(false);
    const [receiptPreviewRef, setReceiptPreviewRef] = useState<string | null>(null);

    const handleQuickAdd = () => {
        if (!currentPerson) return;
        const amountNum = parseFloat(String(qAmount));
        if (!amountNum || !qDesc) return;
        const newEntry = {
            id: Date.now().toString(),
            personId: currentPerson.id,
            type: qType,
            amount: amountNum,
            description: qDesc,
            date: qDate,
            isSettled: false,
            receiptImage: qReceiptRef,
        } as LedgerEntry;
        saveLedgerEntry(newEntry);
        setQAmount('');
        setQDesc('');
        setQType('debt');
        setQDate(new Date().toISOString());
        setQReceiptRef(undefined);
        setQReceiptURL(null);
    };

    if (currentPerson) {
        const ledger = data.ledger[currentPerson.id] || [];
        const { balance } = ledger.reduce((acc, entry) => {
            if (!entry.isSettled) {
                if (entry.type === 'debt') acc.balance += entry.amount; // They owe me
                else acc.balance -= entry.amount; // I owe them
            }
            return acc;
        }, { balance: 0 });

        const safeLedger = showOnlyOpen ? ledger.filter(l => !l.isSettled) : ledger;

        return (
            <div>
                 <div className="flex justify-between items-center mb-6 p-4 bg-slate-800 rounded-lg">
                    <button onClick={() => setCurrentPerson(null)} className="flex items-center gap-2 text-slate-300 hover:text-sky-400 transition-colors">
                        <ArrowRightIcon />
                        <span>بازگشت به لیست</span>
                    </button>
                    <div className="text-left">
                        <h3 className="text-xl font-bold text-white">{currentPerson.name}</h3>
                        <p className={`font-semibold ${balance > 0 ? 'text-emerald-400' : balance < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                            {balance > 0 ? `به شما ${formatCurrency(balance)} بدهکار است.` : balance < 0 ? `شما ${formatCurrency(Math.abs(balance))} بدهکارید.` : 'حساب شما تسویه است.'}
                        </p>
                    </div>
                </div>

                {/* Quick add bar */}
                <div className="mb-5 p-4 bg-slate-900/50 rounded-lg ring-1 ring-slate-700">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                        <button onClick={() => setQType('debt')} className={`px-3 py-1 rounded-full text-xs border ${qType==='debt' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-slate-700/50 text-slate-200 border-slate-600'}`}>طلب (او به من)</button>
                        <button onClick={() => setQType('credit')} className={`px-3 py-1 rounded-full text-xs border ${qType==='credit' ? 'bg-rose-500 text-white border-rose-500' : 'bg-slate-700/50 text-slate-200 border-slate-600'}`}>بدهی (من به او)</button>
                        <div className="ml-auto flex items-center gap-2 text-xs text-slate-400">
                            <label className="flex items-center gap-1 cursor-pointer select-none">
                                <input type="checkbox" checked={showOnlyOpen} onChange={(e) => setShowOnlyOpen(e.target.checked)} />
                                فقط موارد تسویه‌نشده
                            </label>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                        <div className="md:col-span-1">
                            <FormInput label="مبلغ" id="qAmount" type="number" value={qAmount} onChange={(e) => setQAmount((e.target as HTMLInputElement).value)} required />
                        </div>
                        <div className="md:col-span-2">
                            <FormInput label="توضیحات" id="qDesc" value={qDesc} onChange={(e) => setQDesc((e.target as HTMLInputElement).value)} required />
                        </div>
                        <div className="md:col-span-2">
                            <JalaliDatePicker label="تاریخ" id="qDate" value={qDate} onChange={(iso) => setQDate(iso)} />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-sm font-medium text-slate-300 mb-1">رسید</label>
                            <div className="flex items-center gap-2">
                                <label htmlFor="q-ledger-receipt-upload" className={`cursor-pointer px-3 py-2 rounded-md text-sm ${qUploading ? 'bg-slate-600 text-slate-300' : 'bg-slate-700 text-slate-200 hover:bg-slate-600'}`}>
                                    {qUploading ? 'در حال آپلود...' : 'بارگذاری'}
                                </label>
                                <input id="q-ledger-receipt-upload" type="file" accept="image/*" className="sr-only" onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (!f) return;
                                    const reader = new FileReader();
                                    setQUploading(true);
                                    reader.onloadend = async () => {
                                        try {
                                            const dataUrl = reader.result as string;
                                            const ref = await saveImageDataURL(dataUrl);
                                            setQReceiptRef(ref);
                                            const url = await getObjectURLByRef(ref);
                                            setQReceiptURL(url);
                                        } catch (err) {
                                            console.error('Quick ledger receipt upload failed', err);
                                        } finally {
                                            setQUploading(false);
                                        }
                                    };
                                    reader.readAsDataURL(f);
                                }} />
                                {qReceiptURL && (
                                    <>
                                        <img src={qReceiptURL} alt="رسید" className="h-10 w-10 rounded-md object-cover hidden sm:block" />
                                        <button type="button" onClick={() => setReceiptPreviewRef(qReceiptRef || null)} className="text-sky-400 text-xs hover:underline">نمایش</button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="text-left mt-3">
                        <button onClick={handleQuickAdd} className="py-2 px-4 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed" disabled={!qAmount || !qDesc || qUploading}>ثبت سریع</button>
                    </div>
                </div>
                {safeLedger.length === 0 ? <p className="text-slate-500 text-center py-16 bg-slate-800/20 rounded-lg">موردی یافت نشد.</p> :
                <div className="space-y-3">
                    {safeLedger.map(entry => (
                        <div key={entry.id} className={`bg-slate-800/50 rounded-lg p-3 sm:p-4 flex items-center justify-between ring-1 ring-slate-700/50 ${entry.isSettled ? 'opacity-50' : ''}`}>
                            <div className="flex items-center space-x-3 sm:space-x-4 space-x-reverse flex-1 min-w-0">
                                <div className="min-w-0">
                                    <p className="font-bold text-slate-100 truncate">{entry.description}</p>
                                    <p className="text-sm text-slate-400 truncate">{formatDate(entry.date)}</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2 sm:space-x-3 space-x-reverse">
                                <p className={`font-bold text-sm sm:text-base ${entry.type === 'debt' ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCurrency(entry.amount)}</p>
                                {entry.receiptImage && (
                                    <button onClick={() => setReceiptPreviewRef(entry.receiptImage!)} className="p-1.5 text-slate-400 hover:bg-slate-700 rounded-full hover:text-sky-400 transition" title="مشاهده رسید">
                                        <EyeIcon />
                                    </button>
                                )}
                                <button onClick={() => onSettle(currentPerson.id, entry.id)} className="p-1.5 hover:bg-slate-700 rounded-full" title={entry.isSettled ? 'لغو تسویه' : 'تسویه'}>
                                   {entry.isSettled ? <CloseIcon /> : <CheckCircleIcon />}
                                </button>
                                <div className="flex items-center space-x-1 space-x-reverse text-slate-400">
                                   <button onClick={() => onEditLedger({...entry, personId: currentPerson.id})} className="p-1.5 hover:bg-slate-700 rounded-full hover:text-sky-400 transition"><EditIcon/></button>
                                   <button onClick={() => onDeleteLedger(currentPerson.id, entry.id)} className="p-1.5 hover:bg-slate-700 rounded-full hover:text-rose-400 transition"><DeleteIcon/></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                }
                {receiptPreviewRef && (
                    <ReceiptPreview
                        refOrUrl={receiptPreviewRef}
                        title="رسید هزینه"
                        downloadLabel="دانلود تصویر"
                        onDelete={async () => {
                            try {
                                if (isImageRef(receiptPreviewRef || '')) {
                                    await deleteImageByRef(receiptPreviewRef!);
                                }
                                // اگر پیش‌نمایش متعلق به ثبت سریع بود
                                if (receiptPreviewRef === qReceiptRef) {
                                    setQReceiptRef(undefined);
                                    setQReceiptURL(null);
                                    setReceiptPreviewRef(null);
                                    return;
                                }
                                // در غیراینصورت تلاش برای پاک کردن رسید ردیف انتخابی از DB
                                const entry = (data.ledger[currentPerson!.id] || []).find(e => e.receiptImage === receiptPreviewRef);
                                if (entry) {
                                    useAccountantStore.getState().saveLedgerEntry({ ...entry, receiptImage: undefined });
                                }
                            } finally {
                                setReceiptPreviewRef(null);
                            }
                        }}
                        onClose={() => setReceiptPreviewRef(null)}
                    />
                )}
            </div>
        )
    }

    if (data.people.length === 0) {
        return <p className="text-slate-500 text-center py-16 bg-slate-800/20 rounded-lg">هنوز شخصی برای حساب و کتاب اضافه نشده است.</p>;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {data.people.map(person => {
                const ledger = data.ledger[person.id] || [];
                const balance = ledger.reduce((sum, entry) => {
                    if (entry.isSettled) return sum;
                    return sum + (entry.type === 'debt' ? entry.amount : -entry.amount);
                }, 0);
                return (
                    <div key={person.id} className="bg-slate-800/50 rounded-xl p-4 ring-1 ring-slate-700 cursor-pointer transition-all hover:ring-sky-400 hover:-translate-y-1" onClick={() => setCurrentPerson(person)}>
                        <div className="flex justify-between items-start">
                             <div className="flex items-center space-x-4 space-x-reverse">
                                <div className="w-16 h-16 bg-slate-700 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden">
                                    {person.avatar ? (
                                      <ImageFromRef srcOrRef={person.avatar} className="w-full h-full object-cover" alt={person.name} />
                                    ) : <UserCircleIcon />}
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-100 text-lg">{person.name}</h4>
                                     <p className={`text-sm font-semibold ${balance > 0 ? 'text-emerald-400' : balance < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                                        {balance > 0 ? `طلب: ${formatCurrency(balance)}` : balance < 0 ? `بدهی: ${formatCurrency(Math.abs(balance))}` : 'تسویه'}
                                    </p>
                                </div>
                            </div>
                             <div className="flex flex-col items-center space-y-1 text-slate-400">
                               <button onClick={(e) => { e.stopPropagation(); onEditPerson(person);}} className="p-1.5 hover:bg-slate-700 rounded-full hover:text-sky-400 transition"><EditIcon/></button>
                               <button onClick={(e) => { e.stopPropagation(); onDeletePerson(person.id);}} className="p-1.5 hover:bg-slate-700 rounded-full hover:text-rose-400 transition"><DeleteIcon/></button>
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    );
};

const ChecksView = ({ checks, onEdit, onDelete, onStatusChange }) => {
    const [viewType, setViewType] = useState<'issued' | 'received'>('issued');

    const sortedChecks = useMemo(() => {
        return [...checks].sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    }, [checks]);

    const issuedChecks = sortedChecks.filter(c => c.type === 'issued');
    const receivedChecks = sortedChecks.filter(c => c.type === 'received');
    const checksToDisplay = viewType === 'issued' ? issuedChecks : receivedChecks;
    
    return (
        <div className="space-y-6">
            <div className="flex justify-center mb-6 border-b border-slate-700">
                <button 
                    onClick={() => setViewType('issued')} 
                    className={`py-3 px-6 font-medium text-sm transition-colors focus:outline-none ${viewType === 'issued' ? 'border-b-2 border-sky-400 text-sky-400' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    چک‌های صادره
                </button>
                 <button 
                    onClick={() => setViewType('received')} 
                    className={`py-3 px-6 font-medium text-sm transition-colors focus:outline-none ${viewType === 'received' ? 'border-b-2 border-sky-400 text-sky-400' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    چک‌های دریافتی
                </button>
            </div>

            {checksToDisplay.length > 0 ? (
                <div className="space-y-4">
                    {checksToDisplay.map(check => (
                        <CheckCard check={check} onEdit={onEdit} onDelete={onDelete} onStatusChange={onStatusChange} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 px-6 bg-slate-800/40 rounded-xl ring-1 ring-slate-700">
                    <div className="text-5xl text-slate-600 mb-4"><ChecksIcon /></div>
                    <h3 className="text-xl font-semibold text-slate-200">
                        {viewType === 'issued' ? 'هنوز چک صادره‌ای ثبت نشده' : 'هنوز چک دریافتی ثبت نشده'}
                    </h3>
                    <p className="text-slate-400 mt-2">برای شروع، روی دکمه "افزودن" کلیک کنید.</p>
                </div>
            )}
        </div>
    );
};

const CheckCard = ({ check, onEdit, onDelete, onStatusChange }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = React.useRef(null);

    const statusInfo = {
        pending: { text: "در انتظار", color: "text-amber-400", bg: "bg-amber-500/10", ring: "ring-amber-500/30" },
        cashed: { text: "پاس شده", color: "text-emerald-400", bg: "bg-emerald-500/10", ring: "ring-emerald-500/30" },
        bounced: { text: "برگشت خورده", color: "text-rose-400", bg: "bg-rose-500/10", ring: "ring-rose-500/30" },
    };

    const handleStatusChange = (newStatus: CheckStatus) => {
        onStatusChange(check.id, newStatus);
        setIsMenuOpen(false);
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [menuRef]);

    return (
        <div className={`bg-slate-800/60 rounded-xl p-4 ring-1 ring-slate-700 transition-shadow hover:shadow-lg hover:shadow-slate-900/50 ${check.status !== 'pending' ? 'opacity-70' : ''}`}>
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
                <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                        <p className="font-bold text-slate-100 text-lg">{check.subject}</p>
                        <p className={`font-bold text-xl ${check.type === 'issued' ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {formatCurrency(check.amount)}
                        </p>
                    </div>
                    <p className="text-sm text-slate-400">
                        {check.type === 'issued' ? `در وجه: ${check.payeeName}` : `صادر کننده: ${check.drawerName}`}
                    </p>
                     <p className="text-sm text-slate-500 font-mono mt-1">شناسه صیادی: {check.sayyadId}</p>
                </div>
                <div className="flex sm:flex-col items-end justify-between gap-2">
                    <p className="font-semibold text-slate-300">{formatDate(check.dueDate)}</p>
                    <div className="flex items-center gap-2">
                         <div className="relative" ref={menuRef}>
                            <button onClick={() => setIsMenuOpen(prev => !prev)} className={`px-3 py-1 text-xs font-medium rounded-full ${statusInfo[check.status].bg} ${statusInfo[check.status].color} ring-1 ${statusInfo[check.status].ring}`}>
                                {statusInfo[check.status].text}
                            </button>
                            {isMenuOpen && (
                                <div className="absolute left-0 mt-2 w-32 bg-slate-700 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-20">
                                    <div className="py-1">
                                        {(Object.keys(statusInfo) as CheckStatus[]).map(s => (
                                            <a key={s} href="#" onClick={(e) => { e.preventDefault(); handleStatusChange(s); }} className="block px-4 py-2 text-sm text-slate-200 hover:bg-slate-600">
                                                {statusInfo[s].text}
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <button onClick={() => onEdit(check)} className="p-1.5 text-slate-400 hover:bg-slate-700 rounded-full hover:text-sky-400 transition" aria-label="ویرایش"><EditIcon/></button>
                        <button onClick={() => onDelete(check.id)} className="p-1.5 text-slate-400 hover:bg-slate-700 rounded-full hover:text-rose-400 transition" aria-label="حذف"><DeleteIcon/></button>
                    </div>
                </div>
            </div>
            {check.description && <p className="text-sm text-slate-400 pt-2 mt-2 border-t border-slate-700/50">{check.description}</p>}
        </div>
    );
}

const calculateAPR = (loanAmount: number, payments: InstallmentPayment[]): number | null => {
    if (!loanAmount || loanAmount <= 0 || payments.length === 0) {
        return null;
    }

    const totalPaymentsValue = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalInterest = totalPaymentsValue - loanAmount;

    if (totalInterest <= 0) {
        return 0; // No interest means 0% rate.
    }
    
    const numberOfPayments = payments.length;
    // Loan term in years, assuming monthly payments as per plan creation logic.
    const loanTermInYears = numberOfPayments / 12;

    if (loanTermInYears <= 0) {
        return null; // Avoid division by zero for termless loans with interest.
    }

    // Simple annual interest rate calculation: Rate = Interest / (Principal * Term)
    const annualRate = totalInterest / (loanAmount * loanTermInYears);

    return annualRate * 100;
};

const PlanStats = ({ plan }: { plan: InstallmentPlan }) => {
    if (!plan.loanAmount || plan.loanAmount <= 0) return null;

    const apr = calculateAPR(plan.loanAmount, plan.payments);
    const totalPaymentsValue = plan.payments.reduce((sum, p) => sum + p.amount, 0);
    const totalInterest = totalPaymentsValue - plan.loanAmount;
    const totalPenalty = plan.payments.reduce((sum, p) => sum + (p.penalty || 0), 0);

    return (
        <div className="mt-6 mb-4 p-4 bg-slate-900/50 rounded-lg ring-1 ring-slate-700">
            <h4 className="text-lg font-semibold mb-3 text-slate-200">آمار وام</h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <p className="text-slate-400">مبلغ کل وام:</p>
                <p className="text-slate-100 font-medium text-left">{formatCurrency(plan.loanAmount)}</p>
                
                <p className="text-slate-400">مجموع کل اقساط:</p>
                <p className="text-slate-100 font-medium text-left">{formatCurrency(totalPaymentsValue)}</p>

                <p className="text-slate-400">سود کل:</p>
                <p className="text-slate-100 font-medium text-left">{formatCurrency(totalInterest > 0 ? totalInterest : 0)}</p>
                
                {totalPenalty > 0 && (
                    <>
                        <p className="text-slate-400">مجموع جرائم ثبت شده:</p>
                        <p className="text-rose-400 font-medium text-left">{formatCurrency(totalPenalty)}</p>
                    </>
                )}

                <p className="text-slate-400">نرخ سود سالانه (APR):</p>
                <p className="text-sky-400 font-bold text-left">{apr !== null ? `${apr.toFixed(2)} %` : 'N/A'}</p>
            </div>
        </div>
    );
};


const InstallmentsView = ({ installments, currentInstallment, setCurrentInstallment, onEditPlan, onDeletePlan, onEditPayment, onTogglePaidStatus }) => {
    const [showPaymentsList, setShowPaymentsList] = useState(false);

    // Access sorting preferences and actions
    const { installmentsSortMode, installmentsCustomOrder } = useAccountantStore();
    const { setInstallmentsSortMode, setInstallmentsCustomOrder } = useAccountantStore.getState();

    // Compute helper metrics for sorting modes
    const today = useMemo(() => new Date(), []);
    const [instMonthISO, setInstMonthISO] = useState<string>(() => moment().startOf('jMonth').toISOString());
    const startOfMonth = useMemo(() => moment(instMonthISO).startOf('jMonth'), [instMonthISO]);
    const endOfMonth = useMemo(() => moment(instMonthISO).endOf('jMonth'), [instMonthISO]);
    const monthLabel = useMemo(() => startOfMonth.clone().locale('fa').format('jMMMM jYYYY'), [startOfMonth]);

    const getPlanNearestDueDate = (plan: InstallmentPlan): Date | null => {
        const upcoming = plan.payments
            .filter(p => !p.isPaid)
            .map(p => new Date(p.dueDate))
            .sort((a, b) => a.getTime() - b.getTime());
        return upcoming[0] || null;
    };

    const getPlanFirstDueDate = (plan: InstallmentPlan): Date | null => {
        const first = [...plan.payments]
            .map(p => new Date(p.dueDate))
            .sort((a, b) => a.getTime() - b.getTime())[0];
        return first || null;
    };

    const instJYear = useMemo(() => startOfMonth.jYear(), [startOfMonth]);
    const instJMonth = useMemo(() => startOfMonth.jMonth() + 1, [startOfMonth]);
    const isCurrentInstMonth = useMemo(() => {
        const now = moment();
        return now.jYear() === instJYear && (now.jMonth() + 1) === instJMonth;
    }, [instJYear, instJMonth]);
    const isInInstMonth = (iso: string) => {
        const d = moment(iso);
        return d.jYear() === instJYear && (d.jMonth() + 1) === instJMonth;
    };
    const getPlanThisMonthAmount = (plan: InstallmentPlan): number => {
        return plan.payments
            .filter(p => isInInstMonth(p.dueDate))
            .reduce((sum, p) => sum + (p.amount || 0) + (p.penalty || 0), 0);
    };

    const applySorting = (list: InstallmentPlan[]): InstallmentPlan[] => {
        if (installmentsSortMode === 'custom') {
            const orderMap = new Map(installmentsCustomOrder.map((id, idx) => [id, idx] as const));
            return [...list].sort((a, b) => (orderMap.get(a.id) ?? 1e9) - (orderMap.get(b.id) ?? 1e9));
        }
        if (installmentsSortMode === 'nearest') {
            return [...list].sort((a, b) => {
                const aDue = getPlanNearestDueDate(a);
                const bDue = getPlanNearestDueDate(b);
                if (!aDue && !bDue) return 0;
                if (!aDue) return 1;
                if (!bDue) return -1;
                const cmp = aDue.getTime() - bDue.getTime();
                if (cmp !== 0) return cmp;
                // tie-breaker: earliest first installment
                const aFirst = getPlanFirstDueDate(a) || today;
                const bFirst = getPlanFirstDueDate(b) || today;
                return aFirst.getTime() - bFirst.getTime();
            });
        }
        if (installmentsSortMode === 'highest_month') {
            return [...list].sort((a, b) => {
                const aAmt = getPlanThisMonthAmount(a);
                const bAmt = getPlanThisMonthAmount(b);
                if (bAmt !== aAmt) return bAmt - aAmt; // desc
                // tie-breaker: nearest due date
                const aDue = getPlanNearestDueDate(a) || new Date(8640000000000000);
                const bDue = getPlanNearestDueDate(b) || new Date(8640000000000000);
                return aDue.getTime() - bDue.getTime();
            });
        }
        if (installmentsSortMode === 'earliest_loan') {
            return [...list].sort((a, b) => {
                const aFirst = getPlanFirstDueDate(a) || today;
                const bFirst = getPlanFirstDueDate(b) || today;
                return aFirst.getTime() - bFirst.getTime();
            });
        }
        return list;
    };

    // Keep hooks before any early returns to avoid hook order mismatches
    const sortedInstallments = useMemo(() => applySorting(installments), [installments, installmentsSortMode, installmentsCustomOrder]);
    const activePlans = sortedInstallments.filter(plan => plan.payments.some(p => !p.isPaid));
    const completedPlans = sortedInstallments.filter(plan => plan.payments.length > 0 && plan.payments.every(p => p.isPaid));

    if (currentInstallment) {
        const isCompleted = currentInstallment.payments.length > 0 && currentInstallment.payments.every(p => p.isPaid);

        // Active Installment Plan Detail View
        if (!isCompleted) {
            const paidCount = currentInstallment.payments.filter(p => p.isPaid).length;
            const totalCount = currentInstallment.payments.length;
            const remainingAmount = currentInstallment.payments.filter(p => !p.isPaid).reduce((sum, p) => sum + p.amount + (p.penalty || 0), 0);
            
            return (
                <div>
                    <div className="flex justify-between items-center mb-6 p-4 bg-slate-800 rounded-lg">
                        <button onClick={() => setCurrentInstallment(null)} className="flex items-center gap-2 text-slate-300 hover:text-sky-400 transition-colors">
                            <ArrowRightIcon />
                            <span>بازگشت به لیست اقساط</span>
                        </button>
                        <div className="text-left">
                            <h3 className="text-xl font-bold text-white">{currentInstallment.title}</h3>
                            <p className="text-slate-400">پرداخت شده: {paidCount} از {totalCount} - مانده: {formatCurrency(remainingAmount)}</p>
                        </div>
                    </div>
                    <PlanStats plan={currentInstallment} />
                    {currentInstallment.payments.length === 0 ? <p className="text-slate-500 text-center py-16 bg-slate-800/20 rounded-lg">پرداختی برای این قسط وجود ندارد.</p> :
                    <div className="space-y-3">
                        {currentInstallment.payments.map((payment, index) => (
                            <div key={payment.id} className={`bg-slate-800/50 rounded-lg p-3 sm:p-4 flex items-center justify-between ring-1 ring-slate-700/50 ${payment.isPaid ? 'opacity-60' : ''}`}>
                                <div className="flex items-center space-x-3 sm:space-x-4 space-x-reverse flex-1 min-w-0">
                                    <button onClick={() => onTogglePaidStatus(currentInstallment.id, payment.id)} className="p-1.5 hover:bg-slate-700 rounded-full" title={payment.isPaid ? 'علامت به عنوان پرداخت نشده' : 'علامت به عنوان پرداخت شده'}>
                                       {payment.isPaid ? <CheckCircleIcon /> : <UncheckedCircleIcon />}
                                    </button>
                                    <div className="min-w-0">
                                        <p className="font-bold text-slate-100 truncate">قسط شماره {index + 1}</p>
                                        <p className="text-sm text-slate-400 truncate">{formatDate(payment.dueDate)}</p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2 sm:space-x-3 space-x-reverse">
                                    <div className="text-left">
                                        <p className={`font-bold text-sm sm:text-base ${payment.isPaid ? 'text-slate-500 line-through' : 'text-sky-300'}`}>{formatCurrency(payment.amount)}</p>
                                        {payment.penalty > 0 && (
                                            <p className={`text-xs ${payment.isPaid ? 'text-slate-600 line-through' : 'text-rose-400'}`}>
                                                + {formatCurrency(payment.penalty)} جریمه
                                            </p>
                                        )}
                                    </div>
                                    {!payment.isPaid && (
                                         <div className="flex items-center space-x-1 space-x-reverse text-slate-400">
                                           <button onClick={() => onEditPayment({...payment, planId: currentInstallment.id})} className="p-1.5 hover:bg-slate-700 rounded-full hover:text-sky-400 transition"><EditIcon/></button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    }
                </div>
            );
        }
        
        // Completed Installment Plan Detail View
        if (isCompleted) {
            const loanAmount = currentInstallment.loanAmount || 0;
            const totalPaidPrincipal = currentInstallment.payments.reduce((sum, p) => sum + p.amount, 0);
            const stats = {
                loanAmount,
                totalPaidPrincipal,
                totalInterest: totalPaidPrincipal - loanAmount,
                totalPenalty: currentInstallment.payments.reduce((sum, p) => sum + (p.penalty || 0), 0),
                startDate: currentInstallment.payments[0]?.dueDate,
                endDate: [...currentInstallment.payments]
                    .filter(p => p.paidDate)
                    .sort((a,b) => new Date(b.paidDate).getTime() - new Date(a.paidDate).getTime())[0]?.paidDate,
                paymentCount: currentInstallment.payments.length,
            };

            return (
                <div>
                     <div className="flex justify-between items-center mb-6 p-4 bg-slate-800 rounded-lg">
                         <button onClick={() => setCurrentInstallment(null)} className="flex items-center gap-2 text-slate-300 hover:text-sky-400 transition-colors">
                            <ArrowRightIcon />
                            <span>بازگشت به لیست اقساط</span>
                        </button>
                        <div className="text-left">
                            <h3 className="text-xl font-bold text-white">{currentInstallment.title}</h3>
                            <p className="text-emerald-400 font-semibold">این طرح تکمیل شده است</p>
                        </div>
                    </div>

                    <div className="p-6 bg-slate-900/50 rounded-lg ring-1 ring-slate-700">
                        <h4 className="text-lg font-semibold mb-4 text-slate-200">خلاصه طرح</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                            <div className="flex justify-between border-b border-slate-800 py-2"><span className="text-slate-400">مبلغ کل وام:</span><span className="text-slate-100 font-medium">{formatCurrency(stats.loanAmount)}</span></div>
                            <div className="flex justify-between border-b border-slate-800 py-2"><span className="text-slate-400">تعداد اقساط:</span><span className="text-slate-100 font-medium">{stats.paymentCount}</span></div>
                            <div className="flex justify-between border-b border-slate-800 py-2"><span className="text-slate-400">مجموع پرداختی (اصل):</span><span className="text-slate-100 font-medium">{formatCurrency(stats.totalPaidPrincipal)}</span></div>
                            <div className="flex justify-between border-b border-slate-800 py-2"><span className="text-slate-400">مجموع سود:</span><span className="text-slate-100 font-medium">{formatCurrency(stats.totalInterest > 0 ? stats.totalInterest : 0)}</span></div>
                            <div className="flex justify-between border-b border-slate-800 py-2"><span className="text-slate-400">مجموع جرائم:</span><span className="text-rose-400 font-medium">{formatCurrency(stats.totalPenalty)}</span></div>
                            <div className="flex justify-between border-b border-slate-800 py-2"><span className="text-slate-400">تاریخ شروع:</span><span className="text-slate-100 font-medium">{stats.startDate ? formatDate(stats.startDate) : 'N/A'}</span></div>
                            <div className="flex justify-between border-b border-slate-800 py-2 sm:col-span-2"><span className="text-slate-400">تاریخ تسویه کامل:</span><span className="text-slate-100 font-medium">{stats.endDate ? formatDate(stats.endDate) : 'N/A'}</span></div>
                        </div>
                    </div>

                    <div className="text-center my-6">
                        <button onClick={() => setShowPaymentsList(s => !s)} className="py-2 px-5 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-md text-sm transition duration-300">
                            {showPaymentsList ? 'پنهان کردن ریز پرداخت‌ها' : 'نمایش ریز پرداخت‌ها'}
                        </button>
                    </div>
                    
                    {showPaymentsList && (
                        <div className="space-y-3 animate-fade-in">
                            {currentInstallment.payments.map((payment, index) => (
                                 <div key={payment.id} className="bg-slate-800/50 rounded-lg p-3 sm:p-4 flex items-center justify-between ring-1 ring-slate-700/50 opacity-80">
                                    <div className="flex items-center space-x-3 sm:space-x-4 space-x-reverse flex-1 min-w-0">
                                        <CheckCircleIcon />
                                        <div className="min-w-0">
                                            <p className="font-bold text-slate-100 truncate">قسط شماره {index + 1}</p>
                                            <p className="text-sm text-slate-400 truncate">تاریخ پرداخت: {payment.paidDate ? formatDate(payment.paidDate) : formatDate(payment.dueDate)}</p>
                                        </div>
                                    </div>
                                    <div className="text-left">
                                        <p className="font-bold text-sm sm:text-base text-slate-300">{formatCurrency(payment.amount)}</p>
                                        {payment.penalty > 0 && <p className="text-xs text-rose-500">+ {formatCurrency(payment.penalty)} جریمه</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            );
        }
    }
    if (installments.length === 0) {
        return <p className="text-slate-500 text-center py-16 bg-slate-800/20 rounded-lg">هنوز برنامه قسطی ثبت نشده است.</p>;
    }
    
    const PlanCard: React.FC<{ plan: any; isCompleted?: boolean }> = ({ plan, isCompleted = false }) => {
        const paidCount = plan.payments.filter(p => p.isPaid).length;
        const totalCount = plan.payments.length;
        const remainingAmount = plan.payments.filter(p => !p.isPaid).reduce((sum, p) => sum + p.amount + (p.penalty || 0), 0);
        const nextPayment = plan.payments.find(p => !p.isPaid);
        const lastPaymentDate = isCompleted ? plan.payments.map(p => p.paidDate).filter(Boolean).sort((a,b) => new Date(b).getTime() - new Date(a).getTime())[0] : null;

        return (
            <div
                className={`bg-slate-800/50 rounded-xl p-4 ring-1 ring-slate-700 transition-all flex flex-col cursor-pointer ${isCompleted ? 'hover:ring-emerald-800' : 'hover:ring-sky-400 hover:-translate-y-1'}`}
                onClick={() => setCurrentInstallment(plan)}
            >
                <div className="flex justify-between items-start mb-3">
                    <h4 className="font-bold text-slate-100 text-lg truncate" title={plan.title}>{plan.title}</h4>
                     <div className="flex items-center space-x-1 space-x-reverse text-slate-400">
                       <button onClick={(e) => { e.stopPropagation(); onEditPlan(plan);}} className="p-1.5 hover:bg-slate-700 rounded-full hover:text-sky-400 transition" aria-label="ویرایش"><EditIcon/></button>
                       <button onClick={(e) => { e.stopPropagation(); onDeletePlan(plan.id);}} className="p-1.5 hover:bg-slate-700 rounded-full hover:text-rose-400 transition" aria-label="حذف"><DeleteIcon/></button>
                    </div>
                </div>
                
                {isCompleted ? (
                    <div className="flex-grow flex flex-col items-center justify-center text-center my-4">
                        <CheckCircleIcon className="h-10 w-10 text-emerald-400 mb-2" />
                        <p className="font-bold text-emerald-400">تکمیل شده</p>
                        {lastPaymentDate && <p className="text-xs text-slate-500 mt-1">در تاریخ {formatDate(lastPaymentDate)}</p>}
                    </div>
                ) : (
                    <>
                        {(() => {
                            const monthPays = plan.payments.filter(p => isInInstMonth(p.dueDate));
                            const monthAmount = monthPays.reduce((s, p) => s + (p.amount || 0) + (p.penalty || 0), 0);
                            const monthPaid = monthPays.length > 0 ? monthPays.every(p => p.isPaid) : false;
                            const earliestMonthDue = monthPays.length > 0 ? monthPays.map(p => p.dueDate).sort((a,b) => new Date(a).getTime() - new Date(b).getTime())[0] : null;
                            const daysUntil = earliestMonthDue ? Math.ceil((new Date(earliestMonthDue).getTime() - new Date().getTime()) / (1000*60*60*24)) : null;
                            return (
                                <div className="mb-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className={`text-2xl font-extrabold ${monthPaid ? 'text-emerald-400' : 'text-sky-400'}`}>
                                                {monthPays.length > 0 ? formatCurrency(monthAmount) : 'بدون قسط این ماه'}
                                            </p>
                                            {monthPays.length > 0 && <p className="text-xs text-slate-400 mt-0.5">قسط این ماه</p>}
                                        </div>
                                        {monthPays.length > 0 && (
                                            <div className="flex items-center gap-2">
                                                {typeof daysUntil === 'number' && (
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-700/50 text-slate-300 ring-1 ring-slate-600">
                                                        {daysUntil > 0 ? `${daysUntil} روز تا سررسید` : daysUntil === 0 ? 'امروز سررسید' : `${Math.abs(daysUntil)} روز گذشته`}
                                                    </span>
                                                )}
                                                <span className={`px-2 py-0.5 rounded-full text-xs ring-1 ${monthPaid ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/30' : 'bg-rose-500/10 text-rose-400 ring-rose-500/30'}`}>
                                                    {monthPaid ? 'پرداخت شده' : 'پرداخت نشده'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-2 flex items-center justify-between text-sm">
                                        <div className="text-slate-400">
                                            <span>مانده وام: </span>
                                            <span className="text-slate-200 font-bold">{formatCurrency(remainingAmount)}</span>
                                        </div>
                                        {earliestMonthDue && <div className="text-xs text-slate-500">سررسید: {formatDate(earliestMonthDue)}</div>}
                                    </div>
                                </div>
                            );
                        })()}
                        <div className="mt-auto pt-3 border-t border-slate-700/50 text-xs text-slate-400">
                           <div className="flex justify-between items-center mb-1">
                               <span>پیشرفت</span>
                               <span>{paidCount} / {totalCount}</span>
                           </div>
                           <div className="w-full bg-slate-700 rounded-full h-1.5">
                               <div className="bg-emerald-500 h-1.5 rounded-full" style={{width: `${totalCount > 0 ? (paidCount/totalCount)*100 : 0}%`}}></div>
                           </div>
                           {nextPayment && <p className="mt-2 text-center">پرداخت بعدی: {formatDate(nextPayment.dueDate)}</p>}
                        </div>
                    </>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-12">
            <div>
                {/* Sorting Controls */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                    <button onClick={() => setInstallmentsSortMode('nearest')} className={`px-3 py-1 rounded-full text-xs border ${installmentsSortMode==='nearest' ? 'bg-sky-500 text-white border-sky-500' : 'bg-slate-700/50 text-slate-200 border-slate-600'}`}>نزدیک‌ترین اقساط</button>
                    <button onClick={() => setInstallmentsSortMode('highest_month')} className={`px-3 py-1 rounded-full text-xs border ${installmentsSortMode==='highest_month' ? 'bg-sky-500 text-white border-sky-500' : 'bg-slate-700/50 text-slate-200 border-slate-600'}`}>بیشترین مبلغ ماه</button>
                    <button onClick={() => setInstallmentsSortMode('earliest_loan')} className={`px-3 py-1 rounded-full text-xs border ${installmentsSortMode==='earliest_loan' ? 'bg-sky-500 text-white border-sky-500' : 'bg-slate-700/50 text-slate-200 border-slate-600'}`}>زودترین وام</button>
                    <button onClick={() => setInstallmentsSortMode('custom')} className={`px-3 py-1 rounded-full text-xs border ${installmentsSortMode==='custom' ? 'bg-sky-500 text-white border-sky-500' : 'bg-slate-700/50 text-slate-200 border-slate-600'}`}>شخصی‌سازی</button>
                    {installmentsSortMode === 'custom' && <span className="text-xs text-slate-400">برای تغییر ترتیب کارت‌ها را بکشید و رها کنید</span>}
                </div>

                {/* Month navigation for installments */}
                <div className="mb-3 flex items-center justify-between bg-slate-900/40 p-3 rounded-lg ring-1 ring-slate-800">
                    <button className="px-3 py-1.5 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-100 text-xs" onClick={() => setInstMonthISO(startOfMonth.clone().subtract(1, 'jMonth').toISOString())}>ماه قبل</button>
                    <div className="text-slate-200 font-bold text-sm">{monthLabel}</div>
                    <button className="px-3 py-1.5 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-100 text-xs" onClick={() => setInstMonthISO(startOfMonth.clone().add(1, 'jMonth').toISOString())}>ماه بعد</button>
                </div>

                {/* Monthly paid/total/remaining summaries */}
                {(() => {
                    const inThisMonth = (p) => isInInstMonth(p.dueDate);
                    // IMPORTANT: include ALL plans (active + completed) so that
                    // months prior to completion still reflect their payments
                    const monthlyPayments = installments.flatMap(p => p.payments).filter(inThisMonth);
                    const monthAll = monthlyPayments.reduce((sum, p) => sum + (p.amount || 0) + (p.penalty || 0), 0);
                    const monthPaid = monthlyPayments.filter(p => p.isPaid).reduce((sum, p) => sum + (p.amount || 0) + (p.penalty || 0), 0);
                    const monthRemaining = Math.max(0, monthAll - monthPaid);
                    const progress = monthAll > 0 ? (monthPaid / monthAll) * 100 : 0;
                    return (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
                            <div className="bg-slate-800/50 rounded-xl p-3 ring-1 ring-slate-700">
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-300 text-sm">کل اقساط این ماه</span>
                                    <span className="text-slate-100 font-extrabold">{formatCurrency(monthAll)}</span>
                                </div>
                            </div>
                            <div className="bg-slate-800/50 rounded-xl p-3 ring-1 ring-slate-700">
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-300 text-sm">کل پرداختی این ماه</span>
                                    <span className="text-emerald-400 font-extrabold">{formatCurrency(monthPaid)}</span>
                                </div>
                            </div>
                            <div className="bg-slate-800/50 rounded-xl p-3 ring-1 ring-slate-700">
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-300 text-sm">مانده پرداخت این ماه</span>
                                    <span className="text-rose-400 font-extrabold">{formatCurrency(monthRemaining)}</span>
                                </div>
                            </div>
                            <div className="md:col-span-3">
                                <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                                    <div className="bg-emerald-500 h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                                </div>
                                <div className="mt-1 text-xs text-slate-400 text-center">
                                    <span>پیشرفت پرداخت ماه منتخب: </span>
                                    <span className="text-slate-200 font-semibold">{progress.toFixed(0)}%</span>
                                </div>
                            </div>
                        </div>
                    );
                })()}
                {isCurrentInstMonth ? (
                    <>
                        <h3 className="text-2xl font-bold mb-4 text-slate-200">اقساط فعال</h3>
                        {activePlans.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {activePlans.map((plan, idx) => (
                                    <div key={plan.id}
                                         draggable={installmentsSortMode==='custom'}
                                         onDragStart={(e) => { if (installmentsSortMode==='custom') e.dataTransfer.setData('text/plain', String(idx)); }}
                                         onDragOver={(e) => { if (installmentsSortMode==='custom') e.preventDefault(); }}
                                         onDrop={(e) => {
                                             if (installmentsSortMode!=='custom') return;
                                             e.preventDefault();
                                             const fromIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
                                             if (isNaN(fromIdx)) return;
                                             const currentOrder = [...installmentsCustomOrder];
                                             const activeIds = activePlans.map(p => p.id);
                                             const indices = currentOrder.filter(id => activeIds.includes(id));
                                             const fromId = activePlans[fromIdx]?.id;
                                             const toId = plan.id;
                                             if (!fromId || !toId) return;
                                             const working = [...indices];
                                             const fi = working.indexOf(fromId);
                                             const ti = working.indexOf(toId);
                                             if (fi === -1 || ti === -1) return;
                                             working.splice(ti, 0, working.splice(fi, 1)[0]);
                                             // Rebuild full order keeping non-active ids in their relative order
                                             const nonActive = currentOrder.filter(id => !activeIds.includes(id));
                                             const newOrder: string[] = [];
                                             const activeSet = new Set(activeIds);
                                             for (const id of currentOrder) {
                                                 if (activeSet.has(id)) continue;
                                                 newOrder.push(id);
                                             }
                                             // Insert active area in place of first active appearance
                                             const firstActiveIndex = currentOrder.findIndex(id => activeSet.has(id));
                                             const before = currentOrder.slice(0, firstActiveIndex).filter(id => !activeSet.has(id));
                                             const after = currentOrder.slice(firstActiveIndex).filter(id => !activeIds.includes(id));
                                             const reconstructed = [...before, ...working, ...after];
                                             setInstallmentsCustomOrder(reconstructed);
                                         }}>
                                        <PlanCard plan={plan} />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10 px-6 bg-slate-800/40 rounded-xl ring-1 ring-slate-700">
                                <CheckCircleIcon className="h-14 w-14 text-emerald-400 mx-auto mb-4" />
                                <h3 className="text-xl font-semibold text-slate-200">شما هیچ قسط فعالی ندارید!</h3>
                                <p className="text-slate-400 mt-2">تمام اقساط شما پرداخت شده‌اند یا قسطی ثبت نکرده‌اید.</p>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="bg-slate-800/40 rounded-xl ring-1 ring-slate-700">
                        <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
                            <h3 className="text-slate-200 font-bold">لیست اقساط {monthLabel}</h3>
                        </div>
                        <div className="divide-y divide-slate-700">
                            {(() => {
                                const jy = instJYear; const jm = instJMonth;
                                const rows = installments.flatMap(plan => plan.payments.map((p, idx) => ({ plan, p, idx })))
                                    .filter(r => { const d = moment(r.p.dueDate); return d.jYear() === jy && (d.jMonth() + 1) === jm; })
                                    .sort((a,b) => new Date(a.p.dueDate).getTime() - new Date(b.p.dueDate).getTime());
                                if (rows.length === 0) return <div className="p-4 text-slate-500">در این ماه قسطی وجود ندارد.</div>;
                                return rows.map((r) => (
                                    <div key={`${r.plan.id}-${r.p.id}`} className="p-3 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] ring-1 ${r.p.isPaid ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/30' : 'bg-rose-500/10 text-rose-400 ring-rose-500/30'}`}>{r.p.isPaid ? 'پرداخت شده' : 'پرداخت نشده'}</span>
                                            <div>
                                                <div className="text-slate-100 font-bold text-sm">{r.plan.title}</div>
                                                <div className="text-xs text-slate-400">تاریخ سررسید: {formatDate(r.p.dueDate)}</div>
                                            </div>
                                        </div>
                                        <div className="text-slate-100 font-extrabold">{formatCurrency((r.p.amount || 0) + (r.p.penalty || 0))}</div>
                                    </div>
                                ));
                            })()}
                        </div>
                    </div>
                )}
            </div>
            
            {completedPlans.length > 0 && (
                 <div>
                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                            <div className="w-full border-t border-slate-700" />
                        </div>
                        <div className="relative flex justify-center">
                            <span className="bg-slate-900 px-3 text-lg font-medium text-slate-400">
                                تاریخچه
                            </span>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {completedPlans
                            .sort((a, b) => {
                                const dateA = a.payments.map(p => p.paidDate).filter(Boolean).sort((d1, d2) => new Date(d2).getTime() - new Date(d1).getTime())[0];
                                const dateB = b.payments.map(p => p.paidDate).filter(Boolean).sort((d1, d2) => new Date(d2).getTime() - new Date(d1).getTime())[0];
                                if (!dateA) return 1;
                                if (!dateB) return -1;
                                return new Date(dateB).getTime() - new Date(dateA).getTime();
                            })
                            .map(plan => <PlanCard key={plan.id} plan={plan} isCompleted={true} />)
                        }
                    </div>
                </div>
            )}
        </div>
    );
}