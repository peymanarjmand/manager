import React, { useMemo, useState } from 'react';
import moment from 'jalali-moment';
import { useDarfakStore, DarfakExpense } from './store';
import { BackIcon, PlusIcon, SearchIcon, TagIcon } from '../../components/Icons';

export const Darfak = ({ onNavigateBack }: { onNavigateBack: () => void; }): React.ReactNode => {
    const { expenses, saveExpense, deleteExpense } = useDarfakStore();
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<DarfakExpense | null>(null);
    const [search, setSearch] = useState('');
    const [activeTags, setActiveTags] = useState<string[]>([]);

    const allTags = useMemo(() => {
        const s = new Set<string>();
        expenses.forEach(e => (e.tags || []).forEach(t => s.add(t)));
        return Array.from(s).sort();
    }, [expenses]);

    const filtered = useMemo(() => {
        let list = [...expenses];
        if (search) {
            const q = search.toLowerCase();
            list = list.filter(e => e.title.toLowerCase().includes(q) || (e.note || '').toLowerCase().includes(q));
        }
        if (activeTags.length > 0) {
            list = list.filter(e => activeTags.every(t => e.tags?.includes(t)));
        }
        return list;
    }, [expenses, search, activeTags]);

    const totals = useMemo(() => {
        const total = expenses.reduce((s, e) => s + (e.amount || 0), 0);
        const byTag: Record<string, number> = {};
        expenses.forEach(e => (e.tags || []).forEach(t => { byTag[t] = (byTag[t] || 0) + (e.amount || 0); }));
        return { total, byTag };
    }, [expenses]);

    const openNew = () => { setEditing(null); setModalOpen(true); };
    const openEdit = (e: DarfakExpense) => { setEditing(e); setModalOpen(true); };

    return (
        <div className="container mx-auto px-4 py-8 sm:py-12">
            <header className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={onNavigateBack} className="flex items-center space-x-2 space-x-reverse bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2 px-4 rounded-lg transition" title="بازگشت به داشبورد">
                        <BackIcon />
                    </button>
                    <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">درفک (هزینه‌های ساخت)</h2>
                </div>
                <button onClick={openNew} className="w-full sm:w-auto flex items-center justify-center space-x-2 space-x-reverse bg-sky-500 hover:bg-sky-600 text-white font-bold py-2 px-5 rounded-lg transition">
                    <PlusIcon />
                    <span>افزودن</span>
                </button>
            </header>

            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <div className="bg-slate-800/60 rounded-xl p-4 ring-1 ring-slate-700">
                    <h3 className="text-slate-300 font-semibold mb-2">مجموع هزینه تا امروز</h3>
                    <p className="text-3xl font-extrabold text-sky-400">{totals.total.toLocaleString('fa-IR')} تومان</p>
                </div>
                <div className="lg:col-span-2 bg-slate-800/60 rounded-xl p-4 ring-1 ring-slate-700">
                    <h3 className="text-slate-300 font-semibold mb-2">جمع بر اساس تگ</h3>
                    <div className="flex flex-wrap gap-2">
                        {Object.entries(totals.byTag).length === 0 && <p className="text-slate-500">هنوز تگی ثبت نشده.</p>}
                        {Object.entries(totals.byTag).map(([tag, amount]) => (
                            <div key={tag} className="px-3 py-1 rounded-full bg-slate-700/60 text-slate-200 text-sm">
                                <span className="ml-1 text-sky-300">{tag}</span>
                                <span>{Number(amount).toLocaleString('fa-IR')} تومان</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="relative">
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none"><SearchIcon /></span>
                    <input type="search" placeholder="جستجو هزینه..." value={search} onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-slate-800/60 text-white rounded-md py-2.5 pl-4 pr-10 focus:ring-2 focus:ring-sky-400 focus:outline-none transition placeholder-slate-500" />
                </div>
                <div className="md:col-span-2 flex flex-wrap gap-2 items-center">
                    <TagIcon />
                    {['#مصالح', '#دستمزد', ...allTags.filter(t => t !== '#مصالح' && t !== '#دستمزد')].map(tag => (
                        <button key={tag} onClick={() => setActiveTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
                            className={`px-3 py-1 rounded-full text-sm border ${activeTags.includes(tag) ? 'bg-sky-500 text-white border-sky-500' : 'bg-slate-700/50 text-slate-200 border-slate-600'}`}>{tag}</button>
                    ))}
                    {activeTags.length > 0 && <button onClick={() => setActiveTags([])} className="text-slate-400 text-sm">پاک کردن فیلتر</button>}
                </div>
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
                                <button onClick={() => deleteExpense(e.id)} className="text-rose-400 hover:text-rose-300 text-sm">حذف</button>
                            </div>
                        </div>
                    </div>
                ))}
                {filtered.length === 0 && (
                    <div className="text-center py-10 text-slate-400 bg-slate-800/20 rounded-lg">هیچ هزینه‌ای یافت نشد.</div>
                )}
            </div>

            <ExpenseModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onSave={(payload) => { saveExpense(payload); setModalOpen(false); }} expense={editing} />
        </div>
    );
};

const ExpenseModal = ({ isOpen, onClose, onSave, expense }: { isOpen: boolean; onClose: () => void; onSave: (e: DarfakExpense) => void; expense: DarfakExpense | null; }) => {
    const [form, setForm] = useState<DarfakExpense>(() => expense || ({ id: Date.now().toString(), title: '', amount: 0, date: new Date().toISOString(), tags: ['#مصالح'] } as DarfakExpense));

    React.useEffect(() => {
        if (expense) setForm(expense);
        else setForm({ id: Date.now().toString(), title: '', amount: 0, date: new Date().toISOString(), tags: ['#مصالح'] } as DarfakExpense);
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
                        <h3 className="text-xl font-bold text-slate-100">{expense ? 'ویرایش هزینه' : 'افزودن هزینه'}</h3>
                        <button type="button" onClick={onClose} className="text-slate-400 hover:text-white transition">بستن</button>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm text-slate-300 mb-1">عنوان</label>
                            <input className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3 focus:ring-2 focus:ring-sky-400 focus:outline-none" value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} required/>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm text-slate-300 mb-1">مبلغ (تومان)</label>
                                <input type="number" className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3 focus:ring-2 focus:ring-sky-400 focus:outline-none" value={form.amount} onChange={e => setForm(p => ({...p, amount: Number(e.target.value)}))} required/>
                            </div>
                            <div>
                                <label className="block text-sm text-slate-300 mb-1">تاریخ</label>
                                <input type="date" className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3 focus:ring-2 focus:ring-sky-400 focus:outline-none"
                                    value={moment(form.date).format('YYYY-MM-DD')}
                                    onChange={e => setForm(p => ({...p, date: moment(e.target.value, 'YYYY-MM-DD').toISOString()}))} required/>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm text-slate-300 mb-1">تگ‌ها (با # شروع شود)</label>
                            <input className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3 focus:ring-2 focus:ring-sky-400 focus:outline-none"
                                value={(form.tags || []).join(' ')} onChange={e => handleTagInput(e.target.value)} placeholder="#مصالح #دستمزد #حمل" />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-300 mb-1">یادداشت</label>
                            <textarea rows={3} className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3 focus:ring-2 focus:ring-sky-400 focus:outline-none" value={form.note || ''} onChange={e => setForm(p => ({...p, note: e.target.value}))} />
                        </div>
                    </div>
                    <div className="px-6 py-4 bg-slate-800/50 border-t border-slate-700 flex justify-end space-x-3 space-x-reverse sticky bottom-0 z-10">
                        <button type="button" onClick={onClose} className="py-2 px-4 border border-slate-600 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-700 transition">لغو</button>
                        <button type="submit" className="py-2 px-4 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-md text-sm transition">ذخیره</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


