import React, { useEffect, useMemo, useState } from 'react';
import moment from 'jalali-moment';
import { ArrowRightIcon, EyeIcon } from '../../components/Icons';
import { useAccountantStore } from './store';
import { ConfirmDialog } from './ConfirmDialog';
import { isImageRef, saveImageDataURL, getObjectURLByRef } from '../../lib/idb-images';
import { formatCurrency, JalaliDatePicker, ReceiptPreview } from './SmartAccountantShared';

export const SocialInsuranceView = () => {
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
                    <p className="text-2xl font-extrabold text-sky-400">{yearsMonthsDays.years} سال، {yearsMonthsDays.months} ماه، {yearsMonthsDays.days} روز</p>
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
                                                    {rec.receiptRef && (
                                                        <button
                                                            onClick={() => setPreviewRef(rec.receiptRef!)}
                                                            className="hover:text-sky-400"
                                                            title="مشاهده فیش"
                                                        >
                                                            <EyeIcon />
                                                        </button>
                                                    )}
                                                    {!rec.isSettled && (
                                                        <button
                                                            onClick={() => {
                                                                setEditing(rec);
                                                                setModalOpen(true);
                                                            }}
                                                            className="hover:text-sky-400 text-xs"
                                                        >
                                                            ویرایش
                                                        </button>
                                                    )}
                                                    {!rec.isSettled && (
                                                        <button
                                                            onClick={() =>
                                                                setConfirmState({
                                                                    open: true,
                                                                    title: 'حذف رکورد بیمه',
                                                                    message: 'این رکورد پرداخت بیمه به طور کامل حذف می‌شود و قابل بازگشت نیست. مطمئن هستید؟',
                                                                    confirmText: 'بله، حذف شود',
                                                                    cancelText: 'انصراف',
                                                                    tone: 'danger',
                                                                    onConfirm: () => deleteSocialInsurance(rec.id),
                                                                })
                                                            }
                                                            className="hover:text-rose-400 text-xs"
                                                        >
                                                            حذف
                                                        </button>
                                                    )}
                                                    {!rec.isSettled ? (
                                                        <button
                                                            onClick={() =>
                                                                setConfirmState({
                                                                    open: true,
                                                                    title: 'تسویه نهایی',
                                                                    message: 'تسویه این ماه غیرقابل بازگشت است. تایید می‌کنید؟',
                                                                    confirmText: '✓✓ تسویه نهایی',
                                                                    tone: 'success',
                                                                    onConfirm: () => settleSocialInsurance(rec.id),
                                                                })
                                                            }
                                                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs"
                                                            title="تسویه (غیرقابل بازگشت)"
                                                        >
                                                            ✓✓ تسویه
                                                        </button>
                                                    ) : (
                                                        <span
                                                            className="px-2 py-1 bg-emerald-700 text-white rounded-md text-xs"
                                                            title="تسویه شده"
                                                        >
                                                            ✓✓ تسویه‌شده
                                                        </span>
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
            <ConfirmDialog open={!!confirmState?.open} title={confirmState?.title || 'تایید عملیات'} message={confirmState?.message || ''} confirmText={confirmState?.confirmText || 'تایید'} cancelText={confirmState?.cancelText || 'لغو'} tone={confirmState?.tone || 'warning'} onConfirm={() => { try { confirmState?.onConfirm?.(); } finally { } }} onClose={() => setConfirmState(null)} />
        </div>
    );
};

const SocialInsuranceModal = ({ isOpen, onClose, onSave, payment }: { isOpen: boolean; onClose: () => void; onSave: (p: any) => void; payment: any | null; }) => {
    const [form, setForm] = useState<any>(() => payment || ({ id: Date.now().toString(), year: moment().jYear(), month: moment().jMonth() + 1, daysCovered: moment.jDaysInMonth(moment().jYear(), moment().jMonth()), amount: 0, payDate: new Date().toISOString() }));
    const [receiptURL, setReceiptURL] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const monthNames = useMemo(() => Array.from({ length: 12 }, (_, i) => moment().jMonth(i).locale('fa').format('jMMMM')), []);

    const computeDaysCovered = (year: number, month: number) => {
        if (month >= 1 && month <= 6) return 31;
        if (month >= 7 && month <= 11) return 30;
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
        const autoDays = computeDaysCovered(form.year, form.month);
        setForm((p: any) => (p.daysCovered === autoDays ? p : { ...p, daysCovered: autoDays }));
    }, [form.year, form.month]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
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
