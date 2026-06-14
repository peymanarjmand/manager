import React, { useEffect, useMemo, useState } from 'react';
import moment from 'jalali-moment';
import { Package, HardHat, Wrench, Truck, ShieldCheck, Tag, Search, Plus, Eye, Download, Pencil, Trash2 } from 'lucide-react';
import { useAccountantStore } from './store';
import { DarfakExpense } from './types';
import { ConfirmDialog } from './ConfirmDialog';
import { saveImageDataURL, getObjectURLByRef, isImageRef } from '../../lib/idb-images';
import { newId } from '../../lib/id';

export const DARFAK_CATEGORIES = ['مصالح', 'دستمزد', 'تاسیسات', 'کرایه', 'بیمه', 'سایر'];
type IconCmp = React.ComponentType<{ size?: number; className?: string }>;
const CAT_META: Record<string, { Icon: IconCmp; color: string; chip: string; bar: string }> = {
    'مصالح': { Icon: Package, color: 'text-amber-300', chip: 'bg-amber-500/15', bar: '#fbbf24' },
    'دستمزد': { Icon: HardHat, color: 'text-emerald-300', chip: 'bg-emerald-500/15', bar: '#34d399' },
    'تاسیسات': { Icon: Wrench, color: 'text-sky-300', chip: 'bg-sky-500/15', bar: '#38bdf8' },
    'کرایه': { Icon: Truck, color: 'text-violet-300', chip: 'bg-violet-500/15', bar: '#a78bfa' },
    'بیمه': { Icon: ShieldCheck, color: 'text-blue-300', chip: 'bg-blue-500/15', bar: '#60a5fa' },
    'سایر': { Icon: Tag, color: 'text-slate-300', chip: 'bg-slate-500/20', bar: '#94a3b8' },
};
const metaOf = (c: string) => CAT_META[c] || CAT_META['سایر'];
const catOf = (e: DarfakExpense): string => e.category || (e.tags && e.tags[0] ? e.tags[0].replace(/^#/, '') : 'سایر');
const fa = (n: number) => (n || 0).toLocaleString('fa-IR');

export default function DarfakView() {
    const darfak = useAccountantStore(s => s.darfak);
    const { loadDarfak, saveDarfak, deleteDarfak } = useAccountantStore.getState();
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<DarfakExpense | null>(null);
    const [search, setSearch] = useState('');
    const [catFilter, setCatFilter] = useState<string | null>(null);
    const [yearFilter, setYearFilter] = useState<number | null>(null);
    const [previewRef, setPreviewRef] = useState<string | null>(null);
    const [confirmState, setConfirmState] = useState<{ open: boolean; title?: string; message: string; confirmText?: string; cancelText?: string; tone?: 'warning' | 'danger' | 'success'; onConfirm: () => void } | null>(null);

    useEffect(() => { loadDarfak().catch(() => {}); }, []);

    const years = useMemo(() => Array.from(new Set(darfak.map(e => moment(e.date).jYear()))).sort((a, b) => b - a), [darfak]);

    const filtered = useMemo(() => {
        let list = [...darfak];
        if (search) { const q = search.toLowerCase(); list = list.filter(e => e.title.toLowerCase().includes(q) || (e.note || '').toLowerCase().includes(q)); }
        if (catFilter) list = list.filter(e => catOf(e) === catFilter);
        if (yearFilter) list = list.filter(e => moment(e.date).jYear() === yearFilter);
        return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [darfak, search, catFilter, yearFilter]);

    const total = useMemo(() => filtered.reduce((s, e) => s + (e.amount || 0), 0), [filtered]);
    const grandTotal = useMemo(() => darfak.reduce((s, e) => s + (e.amount || 0), 0), [darfak]);
    const breakdown = useMemo(() => {
        const m = new Map<string, { amount: number; count: number }>();
        filtered.forEach(e => { const c = catOf(e); const cur = m.get(c) || { amount: 0, count: 0 }; cur.amount += e.amount || 0; cur.count += 1; m.set(c, cur); });
        return DARFAK_CATEGORIES.map(c => ({ cat: c, ...(m.get(c) || { amount: 0, count: 0 }) })).filter(x => x.count > 0).sort((a, b) => b.amount - a.amount);
    }, [filtered]);
    const maxCat = Math.max(...breakdown.map(b => b.amount), 1);

    const openNew = () => { setEditing(null); setModalOpen(true); };
    const openEdit = (e: DarfakExpense) => { setEditing(e); setModalOpen(true); };
    const clearFilters = () => { setCatFilter(null); setYearFilter(null); setSearch(''); };
    const hasFilter = !!(catFilter || yearFilter || search);

    const exportCSV = () => {
        const header = ['عنوان', 'دسته', 'تاریخ', 'مبلغ (تومان)', 'یادداشت'];
        const rows = filtered.map(e => [e.title || '', catOf(e), moment(e.date).locale('fa').format('jYYYY/jMM/jDD'), String(e.amount || 0), (e.note || '').replace(/\s+/g, ' ')]);
        const csv = '﻿' + [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `darfak-report-${moment().format('jYYYY-jMM-jDD')}.csv`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                    <h3 className="text-lg font-bold text-slate-100">هزینه‌های ساخت‌وساز</h3>
                    <p className="text-xs text-slate-400 mt-0.5 nums-tabular">{fa(darfak.length)} ثبت • مجموع کل {fa(grandTotal)} تومان</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button onClick={exportCSV} className="flex items-center gap-1.5 bg-white/[0.05] hover:bg-white/10 text-slate-200 text-xs py-2 px-3 rounded-xl transition" title="خروجی گزارش (CSV)"><Download size={15} />گزارش</button>
                    <button onClick={openNew} className="flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium py-2 px-3.5 rounded-xl transition"><Plus size={16} />افزودن</button>
                </div>
            </div>

            <div className="rounded-2xl p-4 text-white shadow-lg shadow-brand-900/20" style={{ background: 'linear-gradient(135deg,#574bd3,#6d5ef6 60%,#7e6ff8)' }}>
                <div className="text-sm text-white/75">{hasFilter ? 'مجموع فیلترشده' : 'مجموع کل هزینه‌ها'}</div>
                <div className="text-[26px] font-medium nums-tabular mt-1">{fa(total)} <span className="text-sm text-white/75">تومان</span></div>
                <div className="text-xs text-white/70 mt-1 nums-tabular">{fa(filtered.length)} مورد</div>
            </div>

            {breakdown.length > 0 && (
                <div className="bg-white/[0.04] rounded-2xl p-4 ring-1 ring-white/[0.06] space-y-3">
                    <div className="text-slate-200 font-medium text-sm">تفکیک بر اساس دسته</div>
                    {breakdown.map(b => {
                        const m = metaOf(b.cat);
                        const pct = total > 0 ? (b.amount / total) * 100 : 0;
                        return (
                            <button key={b.cat} onClick={() => setCatFilter(catFilter === b.cat ? null : b.cat)} className={`w-full text-right transition ${catFilter === b.cat ? 'opacity-100' : 'opacity-90 hover:opacity-100'}`}>
                                <div className="flex items-center gap-2.5">
                                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${m.chip}`}><m.Icon size={16} className={m.color} /></span>
                                    <span className="text-sm text-slate-200 flex-1 text-right">{b.cat} <span className="text-[11px] text-slate-500 nums-tabular">({fa(b.count)})</span></span>
                                    <span className="text-xs text-slate-400 nums-tabular">{fa(Math.round(pct))}٪</span>
                                    <span className="text-sm font-medium text-slate-100 nums-tabular w-28 text-left">{fa(b.amount)}</span>
                                </div>
                                <div className="mt-1.5 h-1.5 rounded-full bg-white/10 overflow-hidden">
                                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(b.amount / maxCat) * 100}%`, background: m.bar }} />
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            <div className="space-y-2.5">
                <div className="relative">
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400"><Search size={16} /></span>
                    <input type="search" placeholder="جستجو در عنوان و یادداشت..." value={search} onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-white/[0.05] text-white rounded-xl py-2.5 pl-4 pr-10 focus:ring-2 focus:ring-brand-500 focus:outline-none transition placeholder-slate-500 text-sm" />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                    <button onClick={() => setCatFilter(null)} className={`shrink-0 px-3 py-1.5 rounded-xl text-xs transition ${!catFilter ? 'bg-brand-500 text-white' : 'bg-white/[0.05] text-slate-300 hover:bg-white/10'}`}>همه دسته‌ها</button>
                    {DARFAK_CATEGORIES.map(c => (
                        <button key={c} onClick={() => setCatFilter(catFilter === c ? null : c)} className={`shrink-0 px-3 py-1.5 rounded-xl text-xs transition ${catFilter === c ? 'bg-brand-500 text-white' : 'bg-white/[0.05] text-slate-300 hover:bg-white/10'}`}>{c}</button>
                    ))}
                </div>
                {years.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                        <button onClick={() => setYearFilter(null)} className={`shrink-0 px-3 py-1.5 rounded-xl text-xs transition ${!yearFilter ? 'bg-white/10 text-slate-100' : 'bg-white/[0.05] text-slate-400 hover:bg-white/10'}`}>همه سال‌ها</button>
                        {years.map(y => (
                            <button key={y} onClick={() => setYearFilter(yearFilter === y ? null : y)} className={`shrink-0 px-3 py-1.5 rounded-xl text-xs nums-tabular transition ${yearFilter === y ? 'bg-white/10 text-slate-100' : 'bg-white/[0.05] text-slate-400 hover:bg-white/10'}`}>{fa(y)}</button>
                        ))}
                    </div>
                )}
                {hasFilter && <button onClick={clearFilters} className="text-brand-300 text-xs">پاک کردن فیلترها</button>}
            </div>

            <div className="space-y-2.5">
                {filtered.map(e => {
                    const m = metaOf(catOf(e));
                    return (
                        <div key={e.id} className="bg-white/[0.04] rounded-2xl p-3.5 ring-1 ring-white/[0.06]">
                            <div className="flex items-start gap-3">
                                <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${m.chip}`}><m.Icon size={18} className={m.color} /></span>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="font-medium text-slate-100 truncate">{e.title}</p>
                                        <p className="font-medium text-brand-300 nums-tabular shrink-0">{fa(e.amount)} <span className="text-[10px] text-slate-400">ت</span></p>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-0.5">{moment(e.date).locale('fa').format('jD jMMMM jYYYY')} • {catOf(e)}</p>
                                    {e.note && <p className="text-slate-300 text-xs mt-1.5 whitespace-pre-line">{e.note}</p>}
                                    <div className="flex items-center gap-3 mt-2 text-xs">
                                        <button onClick={() => openEdit(e)} className="text-slate-400 hover:text-brand-300 inline-flex items-center gap-1"><Pencil size={13} />ویرایش</button>
                                        <button onClick={() => setConfirmState({ open: true, title: 'حذف هزینه درفک', message: `هزینه «${e.title || 'بدون عنوان'}» حذف می‌شود و قابل بازگشت نیست. مطمئن هستید؟`, confirmText: 'بله، حذف شود', cancelText: 'انصراف', tone: 'danger', onConfirm: () => deleteDarfak(e.id) })} className="text-rose-400 hover:text-rose-300 inline-flex items-center gap-1"><Trash2 size={13} />حذف</button>
                                        {e.attachment && <button onClick={() => setPreviewRef(e.attachment!)} className="text-slate-400 hover:text-brand-300 inline-flex items-center gap-1"><Eye size={13} />رسید</button>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
                {filtered.length === 0 && <div className="text-center py-10 text-slate-400 bg-white/[0.03] rounded-2xl">هیچ هزینه‌ای یافت نشد.</div>}
            </div>

            <DarfakModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onSave={(payload) => { saveDarfak(payload); setModalOpen(false); }} expense={editing} />
            <ReceiptPreview refOrUrl={previewRef} onClose={() => setPreviewRef(null)} />
            {confirmState && (
                <ConfirmDialog
                    open={!!confirmState.open}
                    title={confirmState.title || 'تایید عملیات'}
                    message={confirmState.message || ''}
                    confirmText={confirmState.confirmText || 'تایید'}
                    cancelText={confirmState.cancelText || 'لغو'}
                    tone={confirmState.tone || 'warning'}
                    onConfirm={() => { try { confirmState.onConfirm(); } finally { /* close handled by onClose */ } }}
                    onClose={() => setConfirmState(null)}
                />
            )}
        </div>
    );
}

const Select = ({ id, value, onChange, children }) => (
    <select
        id={id}
        value={value}
        onChange={onChange}
        className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3 focus:ring-2 focus:ring-brand-500 focus:outline-none transition"
    >
        {children}
    </select>
);

const JalaliDatePicker = ({ value, onChange, id, label }) => {
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
        if (day > daysInNewMonth) day = daysInNewMonth;
        const finalMoment = moment(`${year}/${month + 1}/${day}`, 'jYYYY/jM/jD');
        onChange(finalMoment.toISOString());
    };

    const currentJYear = moment().jYear();
    const years = useMemo(() => Array.from({ length: (currentJYear - 1390 + 1) }, (_, i) => 1390 + i), [currentJYear]);
    const months = useMemo(() => Array.from({ length: 12 }, (_, i) => moment().jMonth(i).locale('fa').format('jMMMM')), []);
    const daysInSelectedMonth = moment.jDaysInMonth(jYear, jMonth);
    const days = Array.from({ length: daysInSelectedMonth }, (_, i) => i + 1);

    return (
        <div>
            <label htmlFor={`${id}-year`} className="block text-sm text-slate-300 mb-1">{label}</label>
            <div className="grid grid-cols-3 gap-2">
                <Select id={`${id}-year`} value={jYear} onChange={(e) => handlePartChange('year', parseInt(e.target.value, 10))}>
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                </Select>
                <Select id={`${id}-month`} value={jMonth} onChange={(e) => handlePartChange('month', parseInt(e.target.value, 10))}>
                    {months.map((name, index) => <option key={name} value={index}>{name}</option>)}
                </Select>
                <Select id={`${id}-day`} value={jDay} onChange={(e) => handlePartChange('day', parseInt(e.target.value, 10))}>
                    {days.map(d => <option key={d} value={d}>{d}</option>)}
                </Select>
            </div>
        </div>
    );
};

const DarfakModal = ({ isOpen, onClose, onSave, expense }: { isOpen: boolean; onClose: () => void; onSave: (e: DarfakExpense) => void; expense: DarfakExpense | null; }) => {
    const makeBlank = (): DarfakExpense => ({ id: newId(), title: '', amount: 0, date: new Date().toISOString(), category: 'مصالح', tags: ['#مصالح'] } as DarfakExpense);
    const [form, setForm] = useState<DarfakExpense>(() => expense ? { ...expense, category: catOf(expense) } : makeBlank());
    const [attachmentURL, setAttachmentURL] = useState<string | null>(null);
    const [uploadPct, setUploadPct] = useState<number>(0);
    const [isUploading, setIsUploading] = useState<boolean>(false);

    React.useEffect(() => {
        if (expense) setForm({ ...expense, category: catOf(expense) });
        else setForm(makeBlank());
        (async () => {
            const ref = (expense && expense.attachment) || null;
            if (ref && isImageRef(ref)) {
                const url = await getObjectURLByRef(ref);
                setAttachmentURL(url);
            } else {
                setAttachmentURL(null);
            }
        })();
    }, [expense, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const category = form.category || 'مصالح';
        onSave({ ...form, amount: parseFloat(String(form.amount)) || 0, category, tags: [`#${category}`] });
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose} role="dialog" aria-modal="true">
            <div className="bg-slate-800 rounded-2xl w-full max-w-lg shadow-2xl ring-1 ring-white/10 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="flex justify-between items-center p-4 border-b border-white/10 sticky top-0 bg-slate-800 z-10">
                        <h3 className="text-xl font-bold text-slate-100">{expense ? 'ویرایش هزینه درفک' : 'افزودن هزینه درفک'}</h3>
                        <button type="button" onClick={onClose} className="text-slate-400 hover:text-white transition">بستن</button>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm text-slate-300 mb-1">عنوان</label>
                                <input className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3 focus:ring-2 focus:ring-brand-500 focus:outline-none" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-300 mb-1">مبلغ (تومان)</label>
                                <input type="number" className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3 focus:ring-2 focus:ring-brand-500 focus:outline-none" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: Number(e.target.value) }))} required />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <JalaliDatePicker label="تاریخ" id="darfakDate" value={form.date} onChange={(iso) => setForm(p => ({ ...p, date: iso }))} />
                            <div>
                                <label className="block text-sm text-slate-300 mb-1">دسته‌بندی</label>
                                <Select id="darfakCat" value={form.category || 'مصالح'} onChange={(e) => setForm(p => ({ ...p, category: e.target.value }))}>
                                    {DARFAK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </Select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm text-slate-300 mb-1">تصویر فاکتور (اختیاری)</label>
                            <div className="mt-1 flex items-center gap-3">
                                <div className="relative h-20 w-20 rounded-md bg-slate-700/50 overflow-hidden flex items-center justify-center">
                                    {attachmentURL ? <img src={attachmentURL} className="h-full w-full object-cover" /> : <span className="text-slate-500 text-xs">بدون تصویر</span>}
                                    {isUploading && (
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                            <div className="text-xs text-white">{Math.round(uploadPct)}%</div>
                                        </div>
                                    )}
                                </div>
                                <input type="file" accept="image/*" onChange={async (e) => {
                                    const f = e.target.files?.[0];
                                    if (!f) return;
                                    const reader = new FileReader();
                                    reader.onloadend = async () => {
                                        const dataUrl = String(reader.result);
                                        try {
                                            setIsUploading(true);
                                            setUploadPct(0);
                                            const ref = await saveImageDataURL(dataUrl, (uploaded, total) => {
                                                const pct = total > 0 ? (uploaded / total) * 100 : 100;
                                                setUploadPct(pct);
                                            });
                                            setForm(p => ({ ...p, attachment: ref }));
                                            const url = await getObjectURLByRef(ref);
                                            setAttachmentURL(url);
                                            setUploadPct(100);
                                        } catch (err) {
                                            console.error('Attachment upload failed', err);
                                        } finally {
                                            setTimeout(() => setIsUploading(false), 300);
                                        }
                                    };
                                    reader.readAsDataURL(f);
                                }} className="text-sm" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm text-slate-300 mb-1">یادداشت</label>
                            <textarea rows={3} className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3 focus:ring-2 focus:ring-brand-500 focus:outline-none" value={form.note || ''} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} />
                        </div>
                    </div>
                    <div className="px-6 py-4 bg-white/[0.04] border-t border-white/10 flex justify-end space-x-3 space-x-reverse sticky bottom-0 z-10">
                        <button type="button" onClick={onClose} className="py-2 px-4 border border-white/10 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-700 transition">لغو</button>
                        <button type="submit" disabled={isUploading} className={`py-2 px-4 rounded-md text-sm font-bold transition ${isUploading ? 'bg-slate-600 text-slate-300 cursor-not-allowed' : 'bg-brand-500 hover:bg-brand-600 text-white'}`}>
                            {isUploading ? 'در حال آپلود تصویر…' : 'ذخیره'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const ReceiptPreview = ({ refOrUrl, onClose }: { refOrUrl: string | null; onClose: () => void; }) => {
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
                setUrl(refOrUrl);
            }
        })();
        return () => { active = false; };
    }, [refOrUrl]);
    if (!refOrUrl) return null;

    const handleDownload = () => {
        if (!url) return;
        const a = document.createElement('a');
        a.href = url;
        a.download = 'receipt.jpg';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="relative max-w-3xl w-full" onClick={e => e.stopPropagation()}>
                <div className="bg-slate-900/90 rounded-2xl ring-1 ring-white/10 shadow-2xl p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-slate-100 font-bold text-lg">رسید هزینه</h3>
                        <button onClick={onClose} className="text-slate-400 hover:text-white">بستن</button>
                    </div>
                    <div className="rounded-xl bg-slate-100 text-slate-900 p-4 shadow-inner">
                        <div className="mb-3 flex items-center justify-between">
                            <div className="text-xs font-semibold tracking-widest text-slate-500">INVOICE</div>
                            <div className="h-4 w-24 bg-gradient-to-r from-brand-400 to-emerald-400 rounded-full opacity-70"></div>
                        </div>
                        <div className="rounded-lg border-2 border-dashed border-slate-300 bg-white overflow-hidden flex items-center justify-center min-h-[40vh]">
                            {url ? (
                                <img src={url} className="w-full h-auto max-h-[70vh] object-contain" />
                            ) : (
                                <div className="py-16 flex flex-col items-center gap-3">
                                    <div className="h-12 w-12 border-4 border-slate-300 border-t-brand-500 rounded-full animate-spin"></div>
                                    <div className="text-slate-500 text-sm">در حال بارگذاری تصویر…</div>
                                </div>
                            )}
                        </div>
                        <div className="mt-4 flex justify-end gap-3">
                            <button onClick={handleDownload} disabled={!url} className={`px-4 py-2 rounded-md text-sm font-medium ${url ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}>دانلود تصویر</button>
                            <button onClick={onClose} className="px-4 py-2 rounded-md text-sm font-medium border border-slate-400 text-slate-700 bg-white hover:bg-slate-100">بستن</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
