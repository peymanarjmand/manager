import React, { useEffect, useMemo, useState } from 'react';
import moment from 'jalali-moment';
import { useAccountantStore } from './store';
import { DarfakExpense } from './types';
import { PlusIcon, SearchIcon, EyeIcon } from '../../components/Icons';
import { saveImageDataURL, getObjectURLByRef, isImageRef } from '../../lib/idb-images';

export default function DarfakView() {
    const { darfak } = useAccountantStore();
    const { loadDarfak, saveDarfak, deleteDarfak } = useAccountantStore.getState();
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<DarfakExpense | null>(null);
    const [search, setSearch] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [previewRef, setPreviewRef] = useState<string | null>(null);

    const allTags = useMemo(() => {
        const s = new Set<string>();
        darfak.forEach(e => (e.tags || []).forEach(t => s.add(t)));
        return Array.from(s).sort();
    }, [darfak]);

    const filtered = useMemo(() => {
        let list = [...darfak];
        if (search) {
            const q = search.toLowerCase();
            list = list.filter(e => e.title.toLowerCase().includes(q) || (e.note || '').toLowerCase().includes(q));
        }
        if (tags.length > 0) list = list.filter(e => tags.every(t => e.tags?.includes(t)));
        return list;
    }, [darfak, search, tags]);

    const total = useMemo(() => filtered.reduce((s, e) => s + (e.amount || 0), 0), [filtered]);

    const openNew = () => { setEditing(null); setModalOpen(true); };
    const openEdit = (e: DarfakExpense) => { setEditing(e); setModalOpen(true); };

    useEffect(() => { loadDarfak().catch(() => {}); }, []);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between gap-3">
                <div className="relative md:w-1/2">
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none"><SearchIcon /></span>
                    <input type="search" placeholder="جستجو هزینه..." value={search} onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-slate-800/60 text-white rounded-md py-2.5 pl-4 pr-10 focus:ring-2 focus:ring-sky-400 focus:outline-none transition placeholder-slate-500" />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {["#مصالح", "#دستمزد", ...allTags.filter(t => t !== '#مصالح' && t !== '#دستمزد')].map(tag => (
                        <button key={tag} onClick={() => setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
                            className={`px-3 py-1 rounded-full text-xs border ${tags.includes(tag) ? 'bg-sky-500 text-white border-sky-500' : 'bg-slate-700/50 text-slate-200 border-slate-600'}`}>{tag}</button>
                    ))}
                    {tags.length > 0 && <button onClick={() => setTags([])} className="text-slate-400 text-sm">پاک کردن فیلتر</button>}
                    <button onClick={openNew} className="ml-auto bg-sky-600 hover:bg-sky-500 text-white rounded-md px-3 py-2 text-sm flex items-center gap-1"><PlusIcon />افزودن</button>
                </div>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-4 ring-1 ring-slate-700">
                <h3 className="text-slate-300 text-sm mb-1">مجموع هزینه‌های فیلتر شده</h3>
                <p className="text-2xl font-extrabold text-sky-400">{total.toLocaleString('fa-IR')} تومان</p>
            </div>

            <div className="space-y-3">
                {filtered.map(e => (
                    <div key={e.id} className="bg-slate-800/50 rounded-lg p-3 sm:p-4 flex items-center justify-between ring-1 ring-slate-700/50">
                        <div className="min-w-0">
                            <p className="font-bold text-slate-100 truncate">{e.title}</p>
                            <p className="text-sm text-slate-400 truncate">{moment(e.date).locale('fa').format('jD jMMMM jYYYY')} • {(e.tags||[]).join(' ')}</p>
                            {e.note && <p className="text-slate-300 text-sm mt-1">{e.note}</p>}
                        </div>
                        <div className="text-left">
                            <p className="font-bold text-sky-300 text-lg">{e.amount.toLocaleString('fa-IR')} تومان</p>
                            <div className="flex gap-2 mt-2">
                                <button onClick={() => openEdit(e)} className="text-slate-400 hover:text-sky-400 text-sm">ویرایش</button>
                                <button onClick={() => deleteDarfak(e.id)} className="text-rose-400 hover:text-rose-300 text-sm">حذف</button>
                                {e.attachment && <button onClick={() => setPreviewRef(e.attachment!)} className="text-slate-400 hover:text-sky-400 text-sm inline-flex items-center gap-1"><EyeIcon/> مشاهده رسید</button>}
                            </div>
                        </div>
                    </div>
                ))}
                {filtered.length === 0 && (
                    <div className="text-center py-10 text-slate-400 bg-slate-800/20 rounded-lg">هیچ هزینه‌ای یافت نشد.</div>
                )}
            </div>

            <DarfakModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onSave={(payload) => { saveDarfak(payload); setModalOpen(false); }} expense={editing} />
            <ReceiptPreview refOrUrl={previewRef} onClose={() => setPreviewRef(null)} />
        </div>
    );
}

// Reusable small Select for Jalali picker (aligned with transactions form)
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
    const [form, setForm] = useState<DarfakExpense>(() => expense || ({ id: Date.now().toString(), title: '', amount: 0, date: new Date().toISOString(), tags: ['#مصالح'] } as DarfakExpense));
    const [attachmentURL, setAttachmentURL] = useState<string | null>(null);
    const [uploadPct, setUploadPct] = useState<number>(0);
    const [isUploading, setIsUploading] = useState<boolean>(false);

    React.useEffect(() => {
        if (expense) setForm(expense);
        else setForm({ id: Date.now().toString(), title: '', amount: 0, date: new Date().toISOString(), tags: ['#مصالح'] } as DarfakExpense);
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
        onSave({ ...form, amount: parseFloat(String(form.amount)) || 0 });
    };

    const handleTagInput = (raw: string) => {
        const parts = raw.split(/[\s,]+/).map(p => p.trim()).filter(Boolean);
        const normalized = parts.map(t => t.startsWith('#') ? t : `#${t}`);
        setForm(p => ({ ...p, tags: Array.from(new Set(normalized)) }));
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose} role="dialog" aria-modal="true">
            <div className="bg-slate-800 rounded-xl w-full max-w-lg shadow-2xl ring-1 ring-slate-700 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="flex justify-between items-center p-4 border-b border-slate-700 sticky top-0 bg-slate-800 z-10">
                        <h3 className="text-xl font-bold text-slate-100">{expense ? 'ویرایش هزینه درفک' : 'افزودن هزینه درفک'}</h3>
                        <button type="button" onClick={onClose} className="text-slate-400 hover:text-white transition">بستن</button>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm text-slate-300 mb-1">عنوان</label>
                                <input className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3 focus:ring-2 focus:ring-sky-400 focus:outline-none" value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} required/>
                            </div>
                            <div>
                                <label className="block text-sm text-slate-300 mb-1">مبلغ (تومان)</label>
                                <input type="number" className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3 focus:ring-2 focus:ring-sky-400 focus:outline-none" value={form.amount} onChange={e => setForm(p => ({...p, amount: Number(e.target.value)}))} required/>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <JalaliDatePicker label="تاریخ" id="darfakDate" value={form.date} onChange={(iso) => setForm(p => ({ ...p, date: iso }))} />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-300 mb-1">تگ‌ها</label>
                                <input className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3 focus:ring-2 focus:ring-sky-400 focus:outline-none"
                                    value={(form.tags || []).join(' ')} onChange={e => handleTagInput(e.target.value)} placeholder="#مصالح #دستمزد" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm text-slate-300 mb-1">تصویر فاکتور (اختیاری)</label>
                            <div className="mt-1 flex items-center gap-3">
                                <div className="relative h-20 w-20 rounded-md bg-slate-700/50 overflow-hidden flex items-center justify-center">
                                    {attachmentURL ? <img src={attachmentURL} className="h-full w-full object-cover"/> : <span className="text-slate-500 text-xs">بدون تصویر</span>}
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
                                }} className="text-sm"/>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm text-slate-300 mb-1">یادداشت</label>
                            <textarea rows={3} className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3 focus:ring-2 focus:ring-sky-400 focus:outline-none" value={form.note || ''} onChange={e => setForm(p => ({...p, note: e.target.value}))} />
                        </div>
                    </div>
                    <div className="px-6 py-4 bg-slate-800/50 border-t border-slate-700 flex justify-end space-x-3 space-x-reverse sticky bottom-0 z-10">
                        <button type="button" onClick={onClose} className="py-2 px-4 border border-slate-600 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-700 transition">لغو</button>
                        <button type="submit" disabled={isUploading} className={`py-2 px-4 rounded-md text-sm font-bold transition ${isUploading ? 'bg-slate-600 text-slate-300 cursor-not-allowed' : 'bg-sky-500 hover:bg-sky-600 text-white'}`}>
                            {isUploading ? 'در حال آپلود تصویر…' : 'ذخیره'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

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
                <div className="bg-slate-900/90 rounded-2xl ring-1 ring-slate-700 shadow-2xl p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-slate-100 font-bold text-lg">رسید هزینه</h3>
                        <button onClick={onClose} className="text-slate-400 hover:text-white">بستن</button>
                    </div>
                    <div className="rounded-xl bg-slate-100 text-slate-900 p-4 shadow-inner">
                        <div className="mb-3 flex items-center justify-between">
                            <div className="text-xs font-semibold tracking-widest text-slate-500">INVOICE</div>
                            <div className="h-4 w-24 bg-gradient-to-r from-sky-400 to-emerald-400 rounded-full opacity-70"></div>
                        </div>
                        <div className="rounded-lg border-2 border-dashed border-slate-300 bg-white overflow-hidden flex items-center justify-center min-h-[40vh]">
                            {url ? (
                                <img src={url} className="w-full h-auto max-h-[70vh] object-contain"/>
                            ) : (
                                <div className="py-16 flex flex-col items-center gap-3">
                                    <div className="h-12 w-12 border-4 border-slate-300 border-t-sky-500 rounded-full animate-spin"></div>
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
}


