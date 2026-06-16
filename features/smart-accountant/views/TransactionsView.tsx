import React, { useMemo, useState } from 'react';
import moment from 'jalali-moment';
import { Transaction } from '../types';
import { useAccountantStore } from '../store';
import { TRANSACTION_CATEGORIES } from '../constants';
import { JalaliDatePicker } from '../SmartAccountantShared';
import {
    TrendingDown, TrendingUp, Scale, ListChecks, Search, SlidersHorizontal, MoreVertical,
    Pencil, Trash2, Eye, X, RotateCcw, Paperclip,
    Utensils, Car, ReceiptText, Gamepad2, Shirt, HeartPulse, Briefcase, Gift, Users, Landmark, Tag, Wallet,
} from 'lucide-react';

type IconCmp = React.ComponentType<{ size?: number; className?: string }>;
const fa = (n: number) => (Number.isFinite(n) ? n : 0).toLocaleString('fa-IR');

// Category → glyph. Unknown / custom categories fall back to a neutral tag.
const CATEGORY_ICON: Record<string, IconCmp> = {
    'خوراک': Utensils, 'خوراک و خانه': Utensils,
    'حمل و نقل': Car,
    'قبوض': ReceiptText,
    'تفریح': Gamepad2,
    'پوشاک': Shirt,
    'سلامتی': HeartPulse,
    'حقوق': Wallet, 'درآمد شغلی': Briefcase, 'پروژه': Briefcase,
    'هدیه': Gift,
    'سود': TrendingUp,
    'دریافت از دیگران': Users,
    'اقساط': Landmark,
};
const categoryIcon = (cat?: string): IconCmp => (cat && CATEGORY_ICON[cat]) || Tag;

const dayKey = (iso: string) => { const m = moment(iso); return `${m.jYear()}-${m.jMonth()}-${m.jDate()}`; };
const dayLabel = (iso: string) => {
    const m = moment(iso).startOf('day');
    const today = moment().startOf('day');
    const dateStr = m.clone().locale('fa').format('jD jMMMM jYYYY');
    if (m.isSame(today, 'day')) return `امروز · ${dateStr}`;
    if (today.diff(m, 'days') === 1) return `دیروز · ${dateStr}`;
    return dateStr;
};

type RangePreset = 'all' | 'this_month' | 'last_month' | 'last_3m' | 'this_year' | 'custom';
const RANGE_LABELS: Record<RangePreset, string> = {
    all: 'همه', this_month: 'این ماه', last_month: 'ماه قبل', last_3m: '۳ ماه اخیر', this_year: 'امسال', custom: 'بازه دلخواه',
};

export const TransactionsView = ({ transactions, onEdit, onDelete, onView }: { transactions: Transaction[]; onEdit: (t: Transaction) => void; onDelete: (id: string) => void; onView?: (t: Transaction) => void }) => {
    const customCategories = useAccountantStore(s => s.customCategories);

    const [q, setQ] = useState('');
    const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [rangePreset, setRangePreset] = useState<RangePreset>('this_month');
    const [customFrom, setCustomFrom] = useState<string>('');
    const [customTo, setCustomTo] = useState<string>('');
    const [amountMin, setAmountMin] = useState<string>('');
    const [amountMax, setAmountMax] = useState<string>('');
    const [sortMode, setSortMode] = useState<'newest' | 'oldest'>('newest');
    const [showFilters, setShowFilters] = useState(false);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

    // All categories that should ever be selectable: defaults + the user's persisted
    // custom categories + anything already used by a transaction. This is what makes
    // a custom category stay in the filter forever (it lives in the store, synced).
    const allCategories = useMemo(() => {
        const set = new Set<string>();
        [...TRANSACTION_CATEGORIES.expense, ...TRANSACTION_CATEGORIES.income].forEach(c => set.add(c));
        [...(customCategories?.expense || []), ...(customCategories?.income || [])].forEach(c => set.add(c));
        transactions.forEach(t => { if (t.category) set.add(t.category); });
        return Array.from(set);
    }, [customCategories, transactions]);

    const range = useMemo(() => {
        const now = moment();
        switch (rangePreset) {
            case 'all': return { from: null as moment.Moment | null, to: null as moment.Moment | null };
            case 'this_month': return { from: now.clone().startOf('jMonth'), to: now.clone().endOf('jMonth') };
            case 'last_month': { const m = now.clone().subtract(1, 'jMonth'); return { from: m.clone().startOf('jMonth'), to: m.clone().endOf('jMonth') }; }
            case 'last_3m': return { from: now.clone().subtract(2, 'jMonth').startOf('jMonth'), to: now.clone().endOf('jMonth') };
            case 'this_year': return { from: now.clone().startOf('jYear'), to: now.clone().endOf('jYear') };
            case 'custom': return { from: customFrom ? moment(customFrom).startOf('day') : null, to: customTo ? moment(customTo).endOf('day') : null };
        }
    }, [rangePreset, customFrom, customTo]);

    const rangeLabel = rangePreset === 'custom'
        ? (range.from || range.to
            ? `${range.from ? range.from.clone().locale('fa').format('jD jMMM jYY') : '…'} تا ${range.to ? range.to.clone().locale('fa').format('jD jMMM jYY') : '…'}`
            : 'بازه دلخواه')
        : RANGE_LABELS[rangePreset];

    const filtered = useMemo(() => {
        const qq = q.trim().toLowerCase();
        const min = amountMin !== '' ? Number(amountMin) : null;
        const max = amountMax !== '' ? Number(amountMax) : null;
        return transactions.filter(t => {
            if (typeFilter !== 'all' && t.type !== typeFilter) return false;
            if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
            if (range.from && moment(t.date).isBefore(range.from)) return false;
            if (range.to && moment(t.date).isAfter(range.to)) return false;
            if (min != null && (t.amount || 0) < min) return false;
            if (max != null && (t.amount || 0) > max) return false;
            if (qq && !`${t.description || ''} ${t.category || ''} ${t.amount}`.toLowerCase().includes(qq)) return false;
            return true;
        });
    }, [transactions, typeFilter, categoryFilter, range, amountMin, amountMax, q]);

    const kpis = useMemo(() => {
        let income = 0, expense = 0;
        filtered.forEach(t => { if (t.type === 'income') income += (t.amount || 0); else expense += (t.amount || 0); });
        return { income, expense, net: income - expense, count: filtered.length };
    }, [filtered]);

    const groups = useMemo(() => {
        const sorted = [...filtered].sort((a, b) => {
            const da = new Date(a.date).getTime(), db = new Date(b.date).getTime();
            return sortMode === 'oldest' ? da - db : db - da;
        });
        const map = new Map<string, Transaction[]>();
        sorted.forEach(t => { const k = dayKey(t.date); if (!map.has(k)) map.set(k, []); map.get(k)!.push(t); });
        return Array.from(map.entries()).map(([key, items]) => ({ key, label: dayLabel(items[0].date), items }));
    }, [filtered, sortMode]);

    const activeCount = (typeFilter !== 'all' ? 1 : 0) + (rangePreset !== 'this_month' ? 1 : 0) + (amountMin !== '' || amountMax !== '' ? 1 : 0) + (sortMode !== 'newest' ? 1 : 0);
    const resetFilters = () => {
        setTypeFilter('all'); setCategoryFilter('all'); setRangePreset('this_month');
        setCustomFrom(''); setCustomTo(''); setAmountMin(''); setAmountMax(''); setSortMode('newest'); setQ('');
    };

    const KpiCard = ({ title, value, unit, color, chip, Icon }: { title: string; value: number; unit: string; color: string; chip: string; Icon: IconCmp }) => (
        <div className="bg-white/[0.04] rounded-2xl p-3 ring-1 ring-white/[0.06]">
            <div className="text-slate-400 text-[11px] leading-tight">{title}</div>
            <div className={`mt-1.5 font-extrabold nums-tabular ${color} text-[15px] leading-tight`}>{fa(value)}</div>
            <div className="flex items-center justify-between mt-1.5">
                <span className={`text-[10px] ${color} opacity-70`}>{unit}</span>
                <span className={`w-7 h-7 rounded-full flex items-center justify-center ${chip} ${color}`}><Icon size={15} /></span>
            </div>
        </div>
    );

    return (
        <div className="space-y-5">
            {/* KPI cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                <KpiCard title="کل هزینه‌ها" value={kpis.expense} unit="تومان" color="text-rose-400" chip="bg-rose-500/12" Icon={TrendingDown} />
                <KpiCard title="کل درآمدها" value={kpis.income} unit="تومان" color="text-emerald-400" chip="bg-emerald-500/12" Icon={TrendingUp} />
                <KpiCard title="تراز خالص" value={kpis.net} unit="تومان" color={kpis.net < 0 ? 'text-rose-400' : 'text-sky-400'} chip={kpis.net < 0 ? 'bg-rose-500/12' : 'bg-sky-500/12'} Icon={Scale} />
                <KpiCard title="تعداد تراکنش‌ها" value={kpis.count} unit="تراکنش" color="text-brand-300" chip="bg-brand-500/15" Icon={ListChecks} />
            </div>

            {/* Filter bar */}
            <div className="space-y-2.5">
                <div className="relative">
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"><Search size={16} /></span>
                    <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="جستجو در تراکنش‌ها..."
                        className="w-full bg-white/[0.04] ring-1 ring-white/10 focus:ring-2 focus:ring-brand-500 rounded-xl py-2.5 pr-10 pl-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="flex-1 min-w-0 bg-white/[0.04] ring-1 ring-white/10 focus:ring-2 focus:ring-brand-500 rounded-xl py-2.5 px-3 text-sm text-slate-200 outline-none transition cursor-pointer"
                    >
                        <option value="all">همه دسته‌بندی‌ها</option>
                        {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <button
                        onClick={() => setShowFilters(v => !v)}
                        className={`shrink-0 flex items-center gap-1.5 rounded-xl py-2.5 px-3.5 text-sm font-medium transition ring-1 ${showFilters || activeCount ? 'bg-brand-500/15 text-brand-200 ring-brand-500/30' : 'bg-white/[0.04] text-slate-300 ring-white/10 hover:bg-white/10'}`}
                    >
                        <SlidersHorizontal size={15} />
                        فیلترها
                        {activeCount > 0 && <span className="bg-brand-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center nums-tabular">{fa(activeCount)}</span>}
                    </button>
                </div>

                {/* Range summary chip (always visible so the period behind the KPIs is clear) */}
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <span className="bg-white/[0.05] rounded-lg px-2 py-1">بازه: {rangeLabel}</span>
                    {(activeCount > 0 || categoryFilter !== 'all' || q) && (
                        <button onClick={resetFilters} className="flex items-center gap-1 text-slate-400 hover:text-rose-300 transition"><RotateCcw size={12} /> پاک‌کردن</button>
                    )}
                </div>

                {/* Advanced filter panel */}
                {showFilters && (
                    <div className="bg-white/[0.03] rounded-2xl p-4 ring-1 ring-white/[0.06] space-y-4">
                        <div>
                            <div className="text-[11px] text-slate-400 mb-1.5">نوع</div>
                            <div className="inline-flex rounded-xl bg-slate-900/50 p-1 ring-1 ring-white/10">
                                {([['all', 'همه'], ['income', 'درآمد'], ['expense', 'هزینه']] as const).map(([v, l]) => (
                                    <button key={v} onClick={() => setTypeFilter(v)} className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${typeFilter === v ? (v === 'income' ? 'bg-emerald-500 text-white' : v === 'expense' ? 'bg-rose-500 text-white' : 'bg-brand-500 text-white') : 'text-slate-300 hover:text-white'}`}>{l}</button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <div className="text-[11px] text-slate-400 mb-1.5">بازه‌ی زمانی</div>
                            <div className="flex flex-wrap gap-1.5">
                                {(Object.keys(RANGE_LABELS) as RangePreset[]).map(p => (
                                    <button key={p} onClick={() => setRangePreset(p)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${rangePreset === p ? 'text-white' : 'bg-white/[0.05] text-slate-300 hover:bg-white/10'}`} style={rangePreset === p ? { background: 'linear-gradient(135deg,#6d5ef6,#8b7cff)' } : undefined}>{RANGE_LABELS[p]}</button>
                                ))}
                            </div>
                            {rangePreset === 'custom' && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                                    <JalaliDatePicker label="از تاریخ" id="rangeFrom" value={customFrom || new Date().toISOString()} onChange={setCustomFrom} />
                                    <JalaliDatePicker label="تا تاریخ" id="rangeTo" value={customTo || new Date().toISOString()} onChange={setCustomTo} />
                                </div>
                            )}
                        </div>
                        <div>
                            <div className="text-[11px] text-slate-400 mb-1.5">محدوده‌ی مبلغ (تومان)</div>
                            <div className="grid grid-cols-2 gap-2.5">
                                <input type="number" inputMode="numeric" placeholder="از" value={amountMin} onChange={(e) => setAmountMin(e.target.value)} className="bg-white/[0.04] ring-1 ring-white/10 focus:ring-2 focus:ring-brand-500 rounded-xl py-2 px-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none nums-tabular" />
                                <input type="number" inputMode="numeric" placeholder="تا" value={amountMax} onChange={(e) => setAmountMax(e.target.value)} className="bg-white/[0.04] ring-1 ring-white/10 focus:ring-2 focus:ring-brand-500 rounded-xl py-2 px-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none nums-tabular" />
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-[11px] text-slate-400 mb-1.5">ترتیب</div>
                                <div className="inline-flex rounded-xl bg-slate-900/50 p-1 ring-1 ring-white/10">
                                    {([['newest', 'جدیدترین'], ['oldest', 'قدیمی‌ترین']] as const).map(([v, l]) => (
                                        <button key={v} onClick={() => setSortMode(v)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${sortMode === v ? 'bg-brand-500 text-white' : 'text-slate-300 hover:text-white'}`}>{l}</button>
                                    ))}
                                </div>
                            </div>
                            <button onClick={resetFilters} className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-rose-300 bg-white/[0.05] hover:bg-white/10 rounded-xl px-3 py-2 transition mt-5"><RotateCcw size={14} /> پاک‌کردن همه</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Grouped list */}
            {groups.length === 0 ? (
                <div className="text-center py-16 bg-white/[0.02] rounded-3xl ring-1 ring-white/[0.06]">
                    <div className="w-14 h-14 rounded-2xl bg-brand-500/12 text-brand-300 flex items-center justify-center mx-auto mb-3"><ListChecks size={26} /></div>
                    <p className="text-slate-400">تراکنشی با این فیلترها یافت نشد.</p>
                    {(activeCount > 0 || categoryFilter !== 'all' || q) && <button onClick={resetFilters} className="text-brand-300 text-sm mt-2 hover:underline">پاک‌کردن فیلترها</button>}
                </div>
            ) : (
                <div className="space-y-5">
                    {groups.map(group => (
                        <div key={group.key}>
                            <div className="flex items-center justify-between mb-2.5 px-1">
                                <h3 className="text-sm font-bold text-slate-300">{group.label}</h3>
                                <span className="text-[11px] text-slate-400 bg-white/[0.05] rounded-full px-2 py-0.5 nums-tabular">{fa(group.items.length)}</span>
                            </div>
                            <div className="space-y-2.5">
                                {group.items.map(t => {
                                    const isIncome = t.type === 'income';
                                    const Icon = categoryIcon(t.category);
                                    return (
                                        <div
                                            key={t.id}
                                            className="relative bg-white/[0.04] rounded-2xl p-3.5 ring-1 ring-white/[0.06] flex items-center justify-between gap-3 cursor-pointer hover:ring-white/15 hover:bg-white/[0.06] transition"
                                            onClick={() => onView && onView(t)}
                                        >
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isIncome ? 'bg-emerald-500/12 text-emerald-300' : 'bg-rose-500/12 text-rose-300'}`}>
                                                    <Icon size={18} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-slate-100 truncate text-sm">{t.description || '—'}</p>
                                                    <p className="text-xs text-slate-400 truncate flex items-center gap-1">
                                                        <Icon size={11} className="opacity-70 shrink-0" />
                                                        <span className="truncate">{t.category || 'بدون دسته‌بندی'}</span>
                                                        {t.receiptImage && <Paperclip size={10} className="opacity-60 shrink-0" />}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <div className="text-left">
                                                    <p className={`font-bold text-sm nums-tabular whitespace-nowrap ${isIncome ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                        {isIncome ? '+ ' : '− '}{fa(t.amount || 0)}
                                                    </p>
                                                    <p className="text-[10px] text-slate-500 text-left nums-tabular">{moment(t.date).locale('fa').format('HH:mm')}</p>
                                                </div>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setOpenMenuId(prev => prev === t.id ? null : t.id); }}
                                                    className="p-1.5 -me-1 text-slate-500 hover:text-slate-200 hover:bg-white/10 rounded-lg transition"
                                                    aria-label="منو"
                                                ><MoreVertical size={16} /></button>
                                            </div>

                                            {openMenuId === t.id && (
                                                <>
                                                    <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); }} />
                                                    <div className="absolute left-2 top-12 z-50 w-36 bg-slate-800 ring-1 ring-white/10 rounded-xl shadow-2xl overflow-hidden py-1" onClick={(e) => e.stopPropagation()}>
                                                        {onView && (
                                                            <button onClick={() => { onView(t); setOpenMenuId(null); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-200 hover:bg-white/10 transition"><Eye size={15} className="text-slate-400" /> مشاهده</button>
                                                        )}
                                                        <button onClick={() => { onEdit(t); setOpenMenuId(null); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-200 hover:bg-white/10 transition"><Pencil size={15} className="text-slate-400" /> ویرایش</button>
                                                        <button onClick={() => { onDelete(t.id); setOpenMenuId(null); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-rose-300 hover:bg-rose-500/10 transition"><Trash2 size={15} /> حذف</button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
