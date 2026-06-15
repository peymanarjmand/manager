import React, { ChangeEvent, useMemo, useState } from 'react';
import moment from 'jalali-moment';
import { Users, Search, TrendingUp, TrendingDown, Scale, HandCoins } from 'lucide-react';
import { AccountantData, Person, LedgerEntry } from '../types';
import { EditIcon, DeleteIcon, CheckCircleIcon, ArrowRightIcon, EyeIcon, CloseIcon, UserCircleIcon } from '../../../components/Icons';
import { useAccountantStore } from '../store';
import { FormInput, FormSelect, JalaliDatePicker, LEDGER_UNITS, getLedgerUnitConfig, formatCurrency, formatDate, formatLedgerAmount, ImageFromRef, ReceiptPreview } from '../SmartAccountantShared';
import { ConfirmDialog } from '../ConfirmDialog';
import { isImageRef, saveImageDataURL, getObjectURLByRef, deleteImageByRef } from '../../../lib/idb-images';
import { newId } from '../../../lib/id';

const fa = (n: number) => (Number.isFinite(n) ? n : 0).toLocaleString('fa-IR');
const shortFa = (n: number): string => {
    const v = n || 0;
    if (Math.abs(v) >= 1e6) return `${(v / 1e6).toLocaleString('fa-IR', { maximumFractionDigits: 1 })}م`;
    if (Math.abs(v) >= 1e3) return `${(v / 1e3).toLocaleString('fa-IR', { maximumFractionDigits: 0 })}هزار`;
    return v.toLocaleString('fa-IR');
};

// Net balance per unit (only non-settled). debt = +1 (they owe me / طلب),
// credit = -1 (I owe them / بدهی). Identical to the original computation.
const computeTotalsByUnit = (entries: LedgerEntry[]): Record<string, number> =>
    (entries || []).reduce((acc: Record<string, number>, entry) => {
        if (entry.isSettled) return acc;
        const unit = (entry as any).unit || 'toman';
        const sign = entry.type === 'debt' ? 1 : -1;
        acc[unit] = (acc[unit] || 0) + sign * entry.amount;
        return acc;
    }, {});

const formatUnitAbs = (value: number, cfg: { maxDecimals: number }) =>
    cfg.maxDecimals > 0
        ? Math.abs(value).toLocaleString('fa-IR', { maximumFractionDigits: cfg.maxDecimals })
        : Math.abs(value).toLocaleString('fa-IR');

/** Small colored chip for a non-toman balance (gold/btc/usdt). */
const UnitChip = ({ unit, value }: { unit: string; value: number }) => {
    const cfg = getLedgerUnitConfig(unit);
    const receivable = value > 0;
    return (
        <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium ring-1 ${receivable ? 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/20' : 'bg-rose-500/10 text-rose-300 ring-rose-500/20'}`}>
            <span className="opacity-70">{receivable ? 'طلب' : 'بدهی'}</span>
            <span className="nums-tabular font-bold">{formatUnitAbs(value, cfg)}</span>
            <span className="opacity-70">{cfg.suffix}</span>
        </span>
    );
};

export const PeopleView = ({ data, onEditPerson, onDeletePerson, onEditLedger, onDeleteLedger, onSettle, currentPerson, setCurrentPerson, onViewLedger }: { data: AccountantData; onEditPerson: (person: Person) => void; onDeletePerson: (id: string) => void; onEditLedger: (entry: LedgerEntry) => void; onDeleteLedger: (personId: string, ledgerId: string) => void; onSettle: (personId: string, ledgerId: string) => void; currentPerson: Person | null; setCurrentPerson: (person: Person | null) => void; onViewLedger?: (entry: LedgerEntry) => void }) => {
    const { saveLedgerEntry } = useAccountantStore.getState();
    const peopleOrder = useAccountantStore(state => state.peopleOrder);
    const setPeopleOrder = useAccountantStore(state => state.setPeopleOrder);
    const [qType, setQType] = useState<'debt' | 'credit'>('debt');
    const [qUnit, setQUnit] = useState<'toman' | 'gold_mg' | 'btc' | 'usdt'>('toman');
    const [qAmount, setQAmount] = useState<string>('');
    const [qDesc, setQDesc] = useState<string>('');
    const [qDate, setQDate] = useState<string>(() => new Date().toISOString());
    const [showOnlyOpen, setShowOnlyOpen] = useState<boolean>(false);
    const [qReceiptRef, setQReceiptRef] = useState<string | undefined>(undefined);
    const [qReceiptURL, setQReceiptURL] = useState<string | null>(null);
    const [qUploading, setQUploading] = useState<boolean>(false);
    const [receiptPreviewRef, setReceiptPreviewRef] = useState<string | null>(null);
    const [confirmState, setConfirmState] = useState<{ open: boolean; title?: string; message: string; confirmText?: string; cancelText?: string; tone?: 'warning' | 'danger' | 'success'; onConfirm: () => void } | null>(null);
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [expandedLedgerId, setExpandedLedgerId] = useState<string | null>(null);
    // Overview-only UI state (presentation): search + balance filter.
    const [query, setQuery] = useState<string>('');
    const [filterMode, setFilterMode] = useState<'all' | 'receivable' | 'payable'>('all');

    const orderedPeople = useMemo(() => {
        const map = new Map(data.people.map(p => [p.id, p] as const));
        const ordered: Person[] = [];
        (peopleOrder || []).forEach(id => {
            const p = map.get(id);
            if (p) {
                ordered.push(p);
                map.delete(id);
            }
        });
        const remaining = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'fa'));
        return [...ordered, ...remaining];
    }, [data.people, peopleOrder]);

    // Aggregate, read-only summary across everyone (toman + per-unit). Drives the
    // overview hero; never mutates anything.
    const summary = useMemo(() => {
        let receivable = 0, payable = 0, owedToMe = 0, iOwe = 0, openEntries = 0;
        const perUnit: Record<string, number> = {};
        orderedPeople.forEach(p => {
            const entries = data.ledger[p.id] || [];
            openEntries += entries.filter(e => !e.isSettled).length;
            const totals = computeTotalsByUnit(entries);
            const toman = totals['toman'] || 0;
            if (toman > 0) { receivable += toman; owedToMe++; }
            else if (toman < 0) { payable += Math.abs(toman); iOwe++; }
            Object.entries(totals).forEach(([u, v]) => {
                if (u === 'toman') return;
                perUnit[u] = (perUnit[u] || 0) + v;
            });
        });
        return { receivable, payable, net: receivable - payable, owedToMe, iOwe, openEntries, perUnit };
    }, [orderedPeople, data.ledger]);

    const handlePersonDrop = (fromId: string | null, toId: string) => {
        if (!fromId || fromId === toId) return;
        const current = peopleOrder && peopleOrder.length ? [...peopleOrder] : orderedPeople.map(p => p.id);
        const fromIdx = current.indexOf(fromId);
        const toIdx = current.indexOf(toId);
        if (fromIdx === -1 || toIdx === -1) return;
        current.splice(toIdx, 0, current.splice(fromIdx, 1)[0]);
        setPeopleOrder(current);
    };

    const handleQuickAdd = () => {
        if (!currentPerson) return;
        const amountNum = parseFloat(String(qAmount));
        if (!amountNum || !qDesc) return;
        const cfg = getLedgerUnitConfig(qUnit);
        const safeAmount = Number(amountNum.toFixed(cfg.maxDecimals));
        const newEntry = {
            id: newId(),
            personId: currentPerson.id,
            type: qType,
            amount: safeAmount,
            unit: cfg.id,
            description: qDesc,
            date: qDate,
            isSettled: false,
            receiptImage: qReceiptRef,
        } as LedgerEntry;
        saveLedgerEntry(newEntry);
        setQAmount('');
        setQDesc('');
        setQType('debt');
        setQUnit('toman');
        setQDate(new Date().toISOString());
        setQReceiptRef(undefined);
        setQReceiptURL(null);
    };

    // ─── Per-person detail dashboard ─────────────────────────────────────────
    if (currentPerson) {
        const ledger = (data.ledger[currentPerson.id] || []).map(e => ({
            ...e,
            unit: (e as any).unit || 'toman',
        }));
        const totalsByUnit = computeTotalsByUnit(ledger);
        const balance = totalsByUnit['toman'] || 0;
        const unitEntries = (Object.entries(totalsByUnit) as [string, number][])
            .filter(([unit, value]) => unit !== 'toman' && Math.abs(value) > 0);

        const openCount = ledger.filter(l => !l.isSettled).length;
        const settledCount = ledger.length - openCount;
        const tomanGiven = ledger.filter(l => !l.isSettled && (l.unit || 'toman') === 'toman' && l.type === 'debt').reduce((s, l) => s + l.amount, 0);
        const tomanTaken = ledger.filter(l => !l.isSettled && (l.unit || 'toman') === 'toman' && l.type === 'credit').reduce((s, l) => s + l.amount, 0);

        const safeLedger = showOnlyOpen ? ledger.filter(l => !l.isSettled) : ledger;
        const balanceTone = balance > 0 ? 'text-emerald-400' : balance < 0 ? 'text-rose-400' : 'text-slate-300';

        return (
            <div className="space-y-5">
                {/* Hero */}
                <div className="rounded-3xl p-5 ring-1 ring-white/10 bg-white/[0.04] relative overflow-hidden">
                    <div className="absolute -top-16 -left-10 w-48 h-48 rounded-full bg-brand-500/10 blur-3xl pointer-events-none" />
                    <div className="flex items-center justify-between mb-4">
                        <button onClick={() => setCurrentPerson(null)} className="flex items-center gap-1.5 text-slate-300 hover:text-brand-300 transition-colors text-sm">
                            <ArrowRightIcon />
                            <span>بازگشت</span>
                        </button>
                        <div className="flex items-center gap-1.5">
                            <button onClick={() => onEditPerson(currentPerson)} className="p-2 rounded-xl bg-white/[0.05] text-slate-300 hover:text-brand-300 hover:bg-white/10 transition" title="ویرایش شخص"><EditIcon /></button>
                            <button onClick={() => onDeletePerson(currentPerson.id)} className="p-2 rounded-xl bg-white/[0.05] text-slate-300 hover:text-rose-400 hover:bg-white/10 transition" title="حذف شخص"><DeleteIcon /></button>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 relative">
                        <div className="w-16 h-16 rounded-2xl bg-slate-700 shrink-0 flex items-center justify-center overflow-hidden ring-1 ring-white/10">
                            {currentPerson.avatar ? <ImageFromRef srcOrRef={currentPerson.avatar} className="w-full h-full object-cover" alt={currentPerson.name} /> : <UserCircleIcon />}
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className="text-xl font-bold text-white truncate">{currentPerson.name}</h3>
                            <p className={`text-sm font-semibold ${balanceTone}`}>
                                {balance > 0 ? `${formatCurrency(balance)} به شما بدهکار است` : balance < 0 ? `شما ${formatCurrency(Math.abs(balance))} بدهکارید` : 'حساب تومانی تسویه است'}
                            </p>
                        </div>
                    </div>
                    {/* toman given/taken split */}
                    <div className="mt-4 grid grid-cols-2 gap-2.5">
                        <div className="bg-emerald-500/10 ring-1 ring-emerald-500/20 rounded-2xl p-3">
                            <div className="flex items-center gap-1.5 text-emerald-300/80 text-[11px]"><TrendingUp size={13} /> بهش دادم (طلب)</div>
                            <div className="text-emerald-300 font-bold mt-1 nums-tabular text-sm">{formatCurrency(tomanGiven)}</div>
                        </div>
                        <div className="bg-rose-500/10 ring-1 ring-rose-500/20 rounded-2xl p-3">
                            <div className="flex items-center gap-1.5 text-rose-300/80 text-[11px]"><TrendingDown size={13} /> ازش گرفتم (بدهی)</div>
                            <div className="text-rose-300 font-bold mt-1 nums-tabular text-sm">{formatCurrency(tomanTaken)}</div>
                        </div>
                    </div>
                    {unitEntries.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                            {unitEntries.map(([unit, value]) => <UnitChip key={unit} unit={unit} value={value} />)}
                        </div>
                    )}
                    <div className="mt-3 flex items-center gap-3 text-[11px] text-slate-400">
                        <span>{fa(openCount)} مورد باز</span>
                        <span className="w-1 h-1 rounded-full bg-slate-600" />
                        <span>{fa(settledCount)} مورد تسویه‌شده</span>
                    </div>
                </div>

                {/* Quick add */}
                <div className="bg-white/[0.04] rounded-2xl p-4 ring-1 ring-white/[0.06]">
                    <div className="flex items-center gap-2 mb-3">
                        <HandCoins size={16} className="text-brand-300" />
                        <h4 className="text-slate-200 font-medium text-sm">ثبت سریع</h4>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                        <div className="inline-flex rounded-xl bg-slate-900/50 p-1 ring-1 ring-white/10">
                            <button onClick={() => setQType('debt')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${qType === 'debt' ? 'bg-emerald-500 text-white' : 'text-slate-300 hover:text-white'}`}>بهش دادم</button>
                            <button onClick={() => setQType('credit')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${qType === 'credit' ? 'bg-rose-500 text-white' : 'text-slate-300 hover:text-white'}`}>ازش گرفتم</button>
                        </div>
                        <FormSelect
                            label=""
                            id="qUnit"
                            value={qUnit}
                            onChange={(e: ChangeEvent<HTMLSelectElement>) => setQUnit(e.target.value as any)}
                        >
                            {LEDGER_UNITS.map(u => (
                                <option key={u.id} value={u.id}>{u.label}</option>
                            ))}
                        </FormSelect>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                        <div className="md:col-span-1">
                            <FormInput
                                label="مبلغ"
                                id="qAmount"
                                type="number"
                                value={qAmount}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                    const cfg = getLedgerUnitConfig(qUnit);
                                    const raw = e.target.value;
                                    const parts = raw.split('.');
                                    if (parts[1] && parts[1].length > cfg.maxDecimals) {
                                        const trimmed = `${parts[0]}.${parts[1].slice(0, cfg.maxDecimals)}`;
                                        setQAmount(trimmed);
                                    } else {
                                        setQAmount(raw);
                                    }
                                }}
                                step={getLedgerUnitConfig(qUnit).step}
                                required
                            />
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
                                        <button type="button" onClick={() => setReceiptPreviewRef(qReceiptRef || null)} className="text-brand-300 text-xs hover:underline">نمایش</button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="text-left mt-3">
                        <button onClick={handleQuickAdd} className="py-2 px-5 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed transition" disabled={!qAmount || !qDesc || qUploading}>ثبت سریع</button>
                    </div>
                </div>

                {/* Ledger list */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-slate-200 font-medium text-sm">دفتر حساب</h4>
                        <label className="flex items-center gap-1.5 cursor-pointer select-none text-xs text-slate-400">
                            <input type="checkbox" checked={showOnlyOpen} onChange={(e) => setShowOnlyOpen(e.target.checked)} className="accent-brand-500" />
                            فقط موارد تسویه‌نشده
                        </label>
                    </div>
                    {safeLedger.length === 0 ? <p className="text-slate-500 text-center py-16 bg-white/[0.02] rounded-2xl ring-1 ring-white/[0.06]">موردی یافت نشد.</p> :
                    <div className="space-y-2.5">
                        {safeLedger.map(entry => {
                            const isDebt = entry.type === 'debt';
                            return (
                            <React.Fragment key={entry.id}>
                                <div
                                    className={`bg-white/[0.04] rounded-2xl p-3.5 ring-1 ring-white/[0.06] cursor-pointer hover:ring-white/15 hover:bg-white/[0.06] transition ${entry.isSettled ? 'opacity-55' : ''}`}
                                    onClick={() => {
                                        if (onViewLedger) onViewLedger(entry);
                                        else setExpandedLedgerId(prev => prev === entry.id ? null : entry.id);
                                    }}
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isDebt ? 'bg-emerald-500/12 text-emerald-300' : 'bg-rose-500/12 text-rose-300'}`}>
                                                {isDebt ? <TrendingUp size={17} /> : <TrendingDown size={17} />}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-bold text-slate-100 truncate text-sm">{entry.description || '—'}</p>
                                                <p className="text-xs text-slate-400 truncate">
                                                    {isDebt ? 'بهش دادم' : 'ازش گرفتم'} • {formatDate(entry.date)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            {entry.isSettled && <span className="text-[10px] text-emerald-300 bg-emerald-500/12 rounded-md px-1.5 py-0.5 whitespace-nowrap">تسویه</span>}
                                            <p className={`font-bold text-sm whitespace-nowrap nums-tabular ${isDebt ? 'text-emerald-400' : 'text-rose-400'}`}>{formatLedgerAmount(entry)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 mt-2.5 pt-2.5 border-t border-white/[0.06] justify-end">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setExpandedLedgerId(prev => prev === entry.id ? null : entry.id); }}
                                            className="px-2.5 py-1 rounded-lg text-[11px] bg-white/[0.05] text-slate-300 hover:bg-white/10 transition"
                                        >جزئیات</button>
                                        {entry.receiptImage && (
                                            <button onClick={(e) => { e.stopPropagation(); setReceiptPreviewRef(entry.receiptImage!); }} className="p-1.5 text-slate-400 hover:bg-white/10 rounded-lg hover:text-brand-300 transition" title="مشاهده رسید"><EyeIcon /></button>
                                        )}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setConfirmState({
                                                    open: true,
                                                    title: entry.isSettled ? 'لغو تسویه ردیف' : 'تسویه ردیف',
                                                    message: entry.isSettled
                                                        ? 'آیا از لغو تسویه این ردیف اطمینان دارید؟'
                                                        : 'آیا از تسویه این ردیف اطمینان دارید؟ در صورت فعال بودن فیلتر «فقط موارد تسویه‌نشده»، این ردیف از لیست پنهان می‌شود.',
                                                    confirmText: entry.isSettled ? 'بله، لغو تسویه شود' : 'بله، تسویه شود',
                                                    cancelText: 'انصراف',
                                                    tone: entry.isSettled ? 'warning' : 'success',
                                                    onConfirm: () => onSettle(currentPerson.id, entry.id),
                                                });
                                            }}
                                            className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-emerald-400 transition"
                                            title={entry.isSettled ? 'لغو تسویه' : 'تسویه'}
                                        >
                                            {entry.isSettled ? <CloseIcon /> : <CheckCircleIcon />}
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); onEditLedger({ ...entry, personId: currentPerson.id }); }} className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-brand-300 transition"><EditIcon /></button>
                                        <button onClick={(e) => { e.stopPropagation(); onDeleteLedger(currentPerson.id, entry.id); }} className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-rose-400 transition"><DeleteIcon /></button>
                                    </div>
                                </div>
                                {expandedLedgerId === entry.id && (
                                    <div className="bg-slate-900/50 rounded-2xl p-3.5 ring-1 ring-white/[0.06] -mt-1">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-sm">
                                            <div className="flex justify-between items-center"><span className="text-slate-500">نوع</span><span className={`${isDebt ? 'text-emerald-400' : 'text-rose-400'} font-medium`}>{isDebt ? 'بهش دادم' : 'ازش گرفتم'}</span></div>
                                            <div className="flex justify-between items-center"><span className="text-slate-500">وضعیت</span><span className={`${entry.isSettled ? 'text-emerald-400' : 'text-amber-400'} font-medium`}>{entry.isSettled ? 'تسویه شده' : 'تسویه نشده'}</span></div>
                                            <div className="flex justify-between items-center"><span className="text-slate-500">واحد</span><span className="text-slate-200">{getLedgerUnitConfig((entry as any).unit || 'toman').label}</span></div>
                                            <div className="flex justify-between items-center"><span className="text-slate-500">تاریخ</span><span className="text-slate-200">{moment(entry.date).locale('fa').format('dddd jD jMMMM jYYYY - HH:mm')}</span></div>
                                        </div>
                                        <div className="mt-3">
                                            <span className="text-slate-500 block mb-1">بابت</span>
                                            <p className="text-slate-200 bg-white/[0.04] p-2 rounded-md border border-white/10">{entry.description || 'بدون توضیحات'}</p>
                                        </div>
                                        {entry.receiptImage && (
                                            <div className="mt-3">
                                                <span className="text-slate-500 block mb-1">رسید</span>
                                                <ImageFromRef srcOrRef={entry.receiptImage} className="w-full h-auto object-cover max-h-48 bg-slate-950 rounded-md ring-1 ring-white/10" />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </React.Fragment>
                            );
                        })}
                    </div>
                    }
                </div>

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
                                if (receiptPreviewRef === qReceiptRef) {
                                    setQReceiptRef(undefined);
                                    setQReceiptURL(null);
                                    setReceiptPreviewRef(null);
                                    return;
                                }
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
                {confirmState && (
                    <ConfirmDialog
                        open={!!confirmState.open}
                        title={confirmState.title || 'تایید عملیات'}
                        message={confirmState.message || ''}
                        confirmText={confirmState.confirmText || 'تایید'}
                        cancelText={confirmState.cancelText || 'لغو'}
                        tone={confirmState.tone || 'warning'}
                        onConfirm={() => {
                            try {
                                confirmState.onConfirm();
                            } finally {
                            }
                        }}
                        onClose={() => setConfirmState(null)}
                    />
                )}
            </div>
        );
    }

    // ─── Overview dashboard ──────────────────────────────────────────────────
    if (data.people.length === 0) {
        return (
            <div className="text-center py-16 bg-white/[0.02] rounded-3xl ring-1 ring-white/[0.06]">
                <div className="w-14 h-14 rounded-2xl bg-brand-500/12 text-brand-300 flex items-center justify-center mx-auto mb-3"><Users size={26} /></div>
                <p className="text-slate-400">هنوز شخصی برای حساب و کتاب اضافه نشده است.</p>
                <p className="text-slate-500 text-sm mt-1">با دکمه‌ی «افزودن» بالای صفحه شروع کنید.</p>
            </div>
        );
    }

    const grossTotal = summary.receivable + summary.payable;
    const receivablePct = grossTotal > 0 ? (summary.receivable / grossTotal) * 100 : 0;
    const perUnitEntries = (Object.entries(summary.perUnit) as [string, number][]).filter(([, v]) => Math.abs(v) > 1e-9);

    const visiblePeople = orderedPeople.filter(person => {
        if (query.trim() && !person.name.toLowerCase().includes(query.trim().toLowerCase())) return false;
        if (filterMode === 'all') return true;
        const toman = (computeTotalsByUnit(data.ledger[person.id] || [])['toman']) || 0;
        return filterMode === 'receivable' ? toman > 0 : toman < 0;
    });

    return (
        <div className="space-y-5">
            {/* Aggregate hero */}
            <div className="rounded-3xl p-5 ring-1 ring-white/10 bg-white/[0.04] relative overflow-hidden">
                <div className="absolute -top-20 -left-12 w-56 h-56 rounded-full bg-brand-500/10 blur-3xl pointer-events-none" />
                <div className="flex items-center gap-2 mb-4 relative">
                    <div className="w-9 h-9 rounded-xl bg-brand-500/15 text-brand-300 flex items-center justify-center"><Scale size={18} /></div>
                    <div>
                        <h3 className="text-slate-100 font-bold text-sm">خلاصه‌ی حساب با دیگران</h3>
                        <p className="text-[11px] text-slate-400">{fa(data.people.length)} نفر · {fa(summary.openEntries)} مورد باز</p>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-2.5 relative">
                    <div className="bg-emerald-500/10 ring-1 ring-emerald-500/20 rounded-2xl p-3.5">
                        <div className="flex items-center gap-1.5 text-emerald-300/80 text-[11px]"><TrendingUp size={14} /> کل طلب من</div>
                        <div className="text-emerald-300 font-extrabold mt-1.5 nums-tabular">{formatCurrency(summary.receivable)}</div>
                        <div className="text-[10px] text-emerald-300/60 mt-0.5">{fa(summary.owedToMe)} نفر بدهکار</div>
                    </div>
                    <div className="bg-rose-500/10 ring-1 ring-rose-500/20 rounded-2xl p-3.5">
                        <div className="flex items-center gap-1.5 text-rose-300/80 text-[11px]"><TrendingDown size={14} /> کل بدهی من</div>
                        <div className="text-rose-300 font-extrabold mt-1.5 nums-tabular">{formatCurrency(summary.payable)}</div>
                        <div className="text-[10px] text-rose-300/60 mt-0.5">به {fa(summary.iOwe)} نفر</div>
                    </div>
                </div>
                {grossTotal > 0 && (
                    <div className="mt-3 h-2 rounded-full overflow-hidden bg-rose-500/30 flex relative" title={`طلب ${Math.round(receivablePct)}٪`}>
                        <div className="h-full bg-emerald-500" style={{ width: `${receivablePct}%`, transition: 'width .6s ease' }} />
                    </div>
                )}
                <div className="mt-3 flex items-center justify-between relative">
                    <span className="text-[11px] text-slate-400">خالص</span>
                    <span className={`text-sm font-bold nums-tabular ${summary.net > 0 ? 'text-emerald-400' : summary.net < 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                        {summary.net > 0 ? `${formatCurrency(summary.net)} طلبکارید` : summary.net < 0 ? `${formatCurrency(Math.abs(summary.net))} بدهکارید` : 'تسویه'}
                    </span>
                </div>
                {perUnitEntries.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2 relative">
                        {perUnitEntries.map(([unit, value]) => <UnitChip key={unit} unit={unit} value={value} />)}
                    </div>
                )}
            </div>

            {/* Search + filter */}
            <div className="space-y-2.5">
                <div className="relative">
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"><Search size={16} /></span>
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="جستجوی شخص..."
                        className="w-full bg-white/[0.04] ring-1 ring-white/10 focus:ring-2 focus:ring-brand-500 rounded-xl py-2.5 pr-10 pl-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition"
                    />
                </div>
                <div className="flex items-center gap-2">
                    {([['all', 'همه'], ['receivable', 'طلبکارم'], ['payable', 'بدهکارم']] as const).map(([mode, label]) => (
                        <button
                            key={mode}
                            onClick={() => setFilterMode(mode)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${filterMode === mode ? 'text-white' : 'bg-white/[0.05] text-slate-300 hover:bg-white/10'}`}
                            style={filterMode === mode ? { background: 'linear-gradient(135deg,#6d5ef6,#8b7cff)' } : undefined}
                        >{label}</button>
                    ))}
                </div>
            </div>

            {/* People grid */}
            {visiblePeople.length === 0 ? (
                <p className="text-slate-500 text-center py-12 bg-white/[0.02] rounded-2xl ring-1 ring-white/[0.06]">شخصی با این فیلتر یافت نشد.</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {visiblePeople.map(person => {
                        const entries = (data.ledger[person.id] || []).map(e => ({ ...e, unit: (e as any).unit || 'toman' }));
                        const totalsByUnit = computeTotalsByUnit(entries);
                        const tomanBalance = totalsByUnit['toman'] || 0;
                        const openCount = entries.filter(e => !e.isSettled).length;
                        const unitChips = (Object.entries(totalsByUnit) as [string, number][]).filter(([unit, value]) => unit !== 'toman' && Math.abs(value) > 0);
                        const tone = tomanBalance > 0 ? 'text-emerald-400' : tomanBalance < 0 ? 'text-rose-400' : 'text-slate-400';
                        return (
                            <div
                                key={person.id}
                                draggable
                                onDragStart={(e) => { e.dataTransfer.setData('text/plain', person.id); setDraggingId(person.id); }}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => { e.preventDefault(); const fromId = e.dataTransfer.getData('text/plain') || draggingId; handlePersonDrop(fromId, person.id); setDraggingId(null); }}
                                onDragEnd={() => setDraggingId(null)}
                                className={`bg-white/[0.04] rounded-2xl p-4 ring-1 ring-white/[0.06] cursor-pointer transition-all hover:ring-brand-400/50 hover:-translate-y-0.5 ${draggingId === person.id ? 'opacity-50' : ''}`}
                                onClick={() => setCurrentPerson(person)}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-12 h-12 bg-slate-700 rounded-2xl shrink-0 flex items-center justify-center overflow-hidden ring-1 ring-white/10">
                                            {person.avatar ? <ImageFromRef srcOrRef={person.avatar} className="w-full h-full object-cover" alt={person.name} /> : <UserCircleIcon />}
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="font-bold text-slate-100 truncate">{person.name}</h4>
                                            <p className={`text-sm font-semibold ${tone}`}>
                                                {tomanBalance > 0 ? `طلب: ${formatCurrency(tomanBalance)}` : tomanBalance < 0 ? `بدهی: ${formatCurrency(Math.abs(tomanBalance))}` : 'تسویه (تومان)'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-center gap-1 text-slate-400 shrink-0">
                                        <button onClick={(e) => { e.stopPropagation(); onEditPerson(person); }} className="p-1.5 hover:bg-white/10 rounded-lg hover:text-brand-300 transition"><EditIcon /></button>
                                        <button onClick={(e) => { e.stopPropagation(); onDeletePerson(person.id); }} className="p-1.5 hover:bg-white/10 rounded-lg hover:text-rose-400 transition"><DeleteIcon /></button>
                                    </div>
                                </div>
                                {(unitChips.length > 0 || openCount > 0) && (
                                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                                        {openCount > 0 && <span className="text-[10px] text-slate-400 bg-white/[0.05] rounded-md px-1.5 py-0.5">{fa(openCount)} مورد باز</span>}
                                        {unitChips.map(([unit, value]) => <UnitChip key={unit} unit={unit} value={value} />)}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Recent transactions */}
            <div>
                <h3 className="text-sm font-bold text-slate-200 mb-3">تراکنش‌های اخیر با دیگران</h3>
                {(() => {
                    const recent = Object.values(data.ledger || {})
                        .flat()
                        .map(e => ({ ...e, unit: (e as any).unit || 'toman' }))
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .slice(0, 30);
                    if (recent.length === 0) {
                        return <p className="text-slate-500 text-sm bg-white/[0.02] rounded-2xl ring-1 ring-white/[0.06] p-4">هنوز تراکنشی ثبت نشده است.</p>;
                    }
                    return (
                        <div className="space-y-2.5">
                            {recent.map(entry => {
                                const person = data.people.find(p => p.id === entry.personId);
                                const isDebt = entry.type === 'debt';
                                return (
                                    <div
                                        key={entry.id}
                                        className="bg-white/[0.04] rounded-2xl p-3.5 ring-1 ring-white/[0.06] flex items-center justify-between gap-3 cursor-pointer hover:ring-white/15 hover:bg-white/[0.06] transition"
                                        onClick={() => onViewLedger && onViewLedger(entry)}
                                    >
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isDebt ? 'bg-emerald-500/12 text-emerald-300' : 'bg-rose-500/12 text-rose-300'}`}>
                                                {isDebt ? <TrendingUp size={17} /> : <TrendingDown size={17} />}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-bold text-slate-100 truncate text-sm">{entry.description || '—'}</p>
                                                <p className="text-xs text-slate-400 truncate">{person?.name || 'نامشخص'} • {formatDate(entry.date)}</p>
                                            </div>
                                        </div>
                                        <p className={`font-bold text-sm whitespace-nowrap nums-tabular ${isDebt ? 'text-emerald-400' : 'text-rose-400'}`}>{formatLedgerAmount(entry)}</p>
                                    </div>
                                );
                            })}
                        </div>
                    );
                })()}
            </div>
        </div>
    );
};
