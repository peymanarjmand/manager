import React, { useEffect, useMemo, useState } from 'react';
import moment from 'jalali-moment';
import JalaliDatePicker from './components/JalaliDatePicker';
import MiniChart from './components/MiniChart';
import { useAssetsStore } from './store';
import { GoldAsset, GoldSubtype } from './types';
import { BackIcon, PlusIcon, EditIcon, DeleteIcon, EyeIcon, AssetsIcon, WalletIcon } from '../../components/Icons';
import { saveImageDataURL, getObjectURLByRef, isImageRef } from '../../lib/idb-images';

const LinkFromRef = ({ refId, label, onOpen }: { refId?: string; label: string; onOpen: (refId: string) => void }) => {
    const [has, setHas] = useState<boolean>(false);
    useEffect(() => { setHas(!!refId && isImageRef(String(refId))); }, [refId]);
    if (!has || !refId) return null;
    return <button type="button" className="inline-flex items-center gap-1 text-sky-400 text-xs hover:text-sky-300" onClick={(e) => { e.stopPropagation(); onOpen(refId); }} title="نمایش تصویر"><EyeIcon/> {label}</button>;
};

// Approximate grams of 18k gold per 1 token (XAUT/PAXG)
const TOKEN_TO_GRAMS_18K = 41.4713;

export function OwnerGoldDashboard({ ownerId, onBack }: { ownerId: string; onBack: () => void; }): React.ReactNode {
    const { gold, owners, loadOwners, loadGoldByOwner, saveGold, deleteGold, transferGold, getTransfersForGold } = useAssetsStore() as any;
    const [isModalOpen, setModalOpen] = useState(false);
    const [subtype, setSubtype] = useState<GoldSubtype>('physical');
    const [form, setForm] = useState<any>({});
    const [preview1, setPreview1] = useState<string | null>(null);
    const [preview2, setPreview2] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [view, setView] = useState<'overview' | GoldSubtype>('overview');
    const [filterFrom, setFilterFrom] = useState<string | undefined>(undefined);
    const [filterTo, setFilterTo] = useState<string | undefined>(undefined);
    const [minAmount, setMinAmount] = useState<number | undefined>(undefined);
    const [maxAmount, setMaxAmount] = useState<number | undefined>(undefined);
    const [symbol, setSymbol] = useState<string | undefined>(undefined);
    const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
    const [imageModal, setImageModal] = useState<{open: boolean; url: string | null; fileName?: string}>({ open: false, url: null });
    const [saleTarget, setSaleTarget] = useState<any | null>(null);
    const [salePrice, setSalePrice] = useState<string>('');
    const [transferTarget, setTransferTarget] = useState<any | null>(null);
    const [transferTo, setTransferTo] = useState<string>('');
    const [transferReason, setTransferReason] = useState<'gift' | 'debt'>('gift');
    const [transferHistory, setTransferHistory] = useState<any[]>([]);
    const [detailTarget, setDetailTarget] = useState<any | null>(null);
    const [detailTransfers, setDetailTransfers] = useState<any[]>([]);
    const [txType, setTxType] = useState<'buy' | 'sell'>('buy');

    useEffect(() => { (async () => { await (loadOwners?.()); await loadGoldByOwner(ownerId); })(); }, [ownerId]);

    const j = (iso: string) => moment(iso).locale('fa').format('jD jMMMM jYYYY');

    const itemsAll = gold.filter((g: any) => g.ownerId === ownerId);
    const summarize = (arr: any[]) => {
        const count = arr.length;
        const totalPaid = arr.reduce((s, a) => s + (a.totalPaidToman || 0), 0);
        const last = arr.length ? arr.map(a => a.purchaseDate).sort((a,b) => new Date(b).getTime() - new Date(a).getTime())[0] : undefined;
        const invoices = arr.reduce((s, a) => s + (a.subtype === 'physical' ? ((a.invoiceRef1 ? 1 : 0) + (a.invoiceRef2 ? 1 : 0)) : (a.invoiceRef ? 1 : 0)), 0);
        return { count, totalPaid, last, invoices };
    };
    const summarizePhysical = (arr: any[]) => {
        const s = summarize(arr);
        const totalGrams = arr.reduce((g, a) => g + ((Number(a.grams) || 0) + (Number(a.soot) || 0) / 1000), 0);
        const avgPrice = arr.length ? Math.round(arr.reduce((sum, a) => sum + (Number(a.pricePerGram) || 0), 0) / arr.length) : 0;
        return { ...s, totalGrams, avgPrice };
    };
    const summarizeToken = (arr: any[]) => {
        const s = summarize(arr);
        const totalAmount = arr.reduce((t, a) => t + (Number(a.tokenAmount) || 0), 0);
        const avgPriceToman = arr.length ? Math.round(arr.reduce((sum, a) => sum + (Number(a.priceToman) || 0), 0) / arr.length) : 0;
        return { ...s, totalAmount, avgPriceToman };
    };
    const summarizeDigi = (arr: any[]) => {
        const s = summarize(arr);
        const totalMg = arr.reduce((m, a) => m + (Number(a.amountMg) || 0), 0);
        const avgPricePerMg = arr.length ? Math.round(arr.reduce((sum, a) => sum + (Number(a.pricePerMg) || 0), 0) / arr.length) : 0;
        return { ...s, totalMg, avgPricePerMg };
    };
    const phys = itemsAll.filter(i => i.subtype === 'physical') as any[];
    const tok = itemsAll.filter(i => i.subtype === 'token') as any[];
    const dgi = itemsAll.filter(i => i.subtype === 'digikala') as any[];
    const totals = useMemo(() => ({ totalPaid: itemsAll.reduce((s, a: any) => s + (a.totalPaidToman || 0), 0) }), [itemsAll]);

    // Aggregate token holdings for asset view (XAUT/PAXG and totals)
    const tokenSums = useMemo(() => {
        const sumAmt = (arr: any[]) => arr.reduce((n, a) => n + (Number((a as any).tokenAmount) || 0) * ((((a as any).txType || 'buy') === 'buy') ? 1 : -1), 0);
        const xautArr = tok.filter(t => (t as any).tokenSymbol === 'xaut');
        const paxgArr = tok.filter(t => (t as any).tokenSymbol === 'paxg');
        const amtXaut = sumAmt(xautArr);
        const amtPaxg = sumAmt(paxgArr);
        const totalAmt = amtXaut + amtPaxg;
        const gramsXaut = amtXaut * TOKEN_TO_GRAMS_18K;
        const gramsPaxg = amtPaxg * TOKEN_TO_GRAMS_18K;
        const gramsTotal = gramsXaut + gramsPaxg;
        // by custody location
        const amtNobitex = sumAmt(tok.filter(t => (t as any).custodyLocation === 'nobitex'));
        const amtBitpin = sumAmt(tok.filter(t => (t as any).custodyLocation === 'bitpin'));
        const gramsNobitex = amtNobitex * TOKEN_TO_GRAMS_18K;
        const gramsBitpin = amtBitpin * TOKEN_TO_GRAMS_18K;
        return { amtXaut, amtPaxg, totalAmt, gramsXaut, gramsPaxg, gramsTotal, amtNobitex, amtBitpin, gramsNobitex, gramsBitpin };
    }, [tok]);

    const openNew = (s: GoldSubtype, tx?: 'buy' | 'sell') => {
        setSubtype(s);
        setTxType(tx || 'buy');
        setForm({ id: undefined, ownerId, subtype: s, txType: tx || 'buy', purchaseDate: new Date().toISOString() });
        setPreview1(null); setPreview2(null); setError(null);
        setModalOpen(true);
    };

    const openEdit = async (item: any) => {
        setSubtype(item.subtype);
        setTxType(item.txType || 'buy');
        const draft: any = { ...item };
        if (item.subtype === 'token') {
            if (item.invoiceRef) {
                draft.invoicePreview = await getObjectURLByRef(item.invoiceRef);
            }
        }
        if (item.subtype === 'digikala') {
            if (item.invoiceRef) {
                draft.dgInvoicePreview = await getObjectURLByRef(item.invoiceRef);
            }
        }
        if (item.subtype === 'physical') {
            setPreview1(item.invoiceRef1 ? await getObjectURLByRef(item.invoiceRef1) : null);
            setPreview2(item.invoiceRef2 ? await getObjectURLByRef(item.invoiceRef2) : null);
        } else {
            setPreview1(null); setPreview2(null);
        }
        setForm(draft);
        setError(null);
        setModalOpen(true);
    };

    const openImage = async (refId: string) => {
        const url = await getObjectURLByRef(refId);
        setImageModal({ open: true, url, fileName: `invoice-${refId}.jpg` });
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            await deleteGold(deleteTarget.id, ownerId);
            setDeleteTarget(null);
        } catch (e: any) {
            setError(e?.message || 'حذف با خطا مواجه شد');
        }
    };

    const openSale = (item: any) => {
        setSaleTarget(item);
        setSalePrice('');
    };

    const confirmSale = async () => {
        if (!saleTarget) return;
        const n = Number(salePrice);
        if (!isFinite(n) || n <= 0) {
            setError('مبلغ فروش را به‌درستی وارد کنید');
            return;
        }
        try {
            await saveGold({ ...(saleTarget as any), saleTotalToman: n, soldAt: new Date().toISOString() } as any);
            setSaleTarget(null);
            setSalePrice('');
        } catch (e: any) {
            setError(e?.message || 'ثبت فروش با خطا مواجه شد');
        }
    };

    const handleChooseImage = async (idx: 1 | 2, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async () => {
            const dataUrl = String(reader.result || '');
            const ref = await saveImageDataURL(dataUrl);
            const url = await getObjectURLByRef(ref);
            if (idx === 1) { setForm((f: any) => ({ ...f, invoiceRef1: ref })); setPreview1(url); }
            else { setForm((f: any) => ({ ...f, invoiceRef2: ref })); setPreview2(url); }
        };
        reader.readAsDataURL(file);
    };

    const autoCompute = (draft: any) => {
        if (subtype === 'physical') {
            const wage = draft.pricePerGram && draft.grams ? Math.round((draft.pricePerGram * draft.grams) * 0.07) : 0; // 7% wage heuristic
            return { ...draft, wageToman: wage };
        }
        if (subtype === 'token') {
            // Derive equivalent grams from token amount using fixed rule
            const tokenAmountNum = Number(draft.tokenAmount || 0);
            const gramsDerived = isFinite(tokenAmountNum) ? tokenAmountNum * TOKEN_TO_GRAMS_18K : undefined;
            return { ...draft, gramsDerived };
        }
        if (subtype === 'digikala') {
            const percent = draft.feeManualToman && draft.totalPaidToman ? Math.round((draft.feeManualToman / draft.totalPaidToman) * 10000) / 100 : undefined;
            return { ...draft, feePercent: percent };
        }
        return draft;
    };

    const onSave = async () => {
        try {
            const id = form.id || Date.now().toString();
            let draft: any = { ...form, id };
            if (draft.subtype === 'token') {
                // gramsDerived handled by autoCompute via tokenAmount
                const numericFields2 = ['priceTokenToman'];
                for (const k of numericFields2) {
                    if (draft[k] !== undefined && draft[k] !== null && draft[k] !== '') {
                        const v = typeof draft[k] === 'string' ? draft[k].replace(/,/g,'') : draft[k];
                        const n = Number(v);
                        draft[k] = isNaN(n) ? undefined : n;
                    }
                }
                // Auto derive fee if not provided: fee = totalPaid - (tokenAmount * priceTokenToman)
                if ((draft.feeToman == null || isNaN(Number(draft.feeToman))) && draft.tokenAmount && draft.priceTokenToman) {
                    const calc = Number(draft.tokenAmount) * Number(draft.priceTokenToman);
                    const fee = Math.max(0, Math.round(Number(draft.totalPaidToman || 0) - calc));
                    draft.feeToman = fee;
                }
            }
            // Coerce numeric-like strings to numbers while preserving fractional typing
            if (draft.subtype === 'token') {
                const numericFields = ['tokenAmount','priceUsd','usdRateToman','pricePerGramToday','totalPaidToman','feeToman'];
                for (const k of numericFields) {
                    if (draft[k] !== undefined && draft[k] !== null && draft[k] !== '') {
                        const v = typeof draft[k] === 'string' ? draft[k].replace(/,/g,'') : draft[k];
                        const n = Number(v);
                        draft[k] = isNaN(n) ? undefined : n;
                    }
                }
            }
            const payload: GoldAsset = autoCompute(draft);
            await saveGold(payload);
            setModalOpen(false);
        } catch (e: any) {
            setError(e?.message || 'خطا در ذخیره');
        }
    };

    const openDetails = async (item: any) => {
        setDetailTarget(item);
        try {
            const list = await (getTransfersForGold?.(item.id));
            setDetailTransfers(list || []);
        } catch {
            setDetailTransfers([]);
        }
    };

    const toTotalGrams = (it: any) => (Number(it.grams || 0) + (Number(it.soot || 0) / 1000));

    const items = itemsAll; // alias for below rendering
    const filteredItems = useMemo(() => {
        let list = itemsAll.filter(it => it.subtype === view);
        if (filterFrom) list = list.filter(it => new Date(it.purchaseDate).getTime() >= new Date(filterFrom).getTime());
        if (filterTo) list = list.filter(it => new Date(it.purchaseDate).getTime() <= new Date(filterTo).getTime());
        if (minAmount != null) list = list.filter((it: any) => (it.totalPaidToman || 0) >= minAmount);
        if (maxAmount != null) list = list.filter((it: any) => (it.totalPaidToman || 0) <= maxAmount);
        if (view === 'token' && symbol) list = list.filter((it: any) => (it.tokenSymbol || '').toLowerCase() === symbol.toLowerCase());
        return list;
    }, [itemsAll, view, filterFrom, filterTo, minAmount, maxAmount, symbol]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <button onClick={onBack} className="text-slate-300 hover:text-white"><BackIcon/></button>
                <div className="text-2xl font-extrabold">طلا</div>
                <div />
            </div>

            {/* Overview summary and entry points */}
            {view === 'overview' ? (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-slate-800/50 rounded-xl p-4 ring-1 ring-slate-700">
                            <div className="text-slate-300 text-sm">مجموع پرداختی</div>
                            <div className="text-2xl font-extrabold text-emerald-400">{(totals.totalPaid || 0).toLocaleString('fa-IR')} تومان</div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {(() => { const s = summarizePhysical(phys); const state = s.count ? 'فعال' : 'خالی'; return (
                            <button onClick={() => setView('physical')} className="text-right rounded-xl p-5 ring-1 ring-sky-700/60 hover:ring-sky-400 transition bg-gradient-to-br from-sky-900/20 to-slate-800/40">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="bg-sky-700/40 p-3 rounded-full inline-block"><AssetsIcon/></div>
                                    <span className={`px-2 py-0.5 rounded-full text-xs ${s.count ? 'bg-emerald-600/40 text-emerald-200 ring-1 ring-emerald-500/40' : 'bg-slate-700 text-slate-300 ring-1 ring-slate-600'}`}>{state}</span>
                                </div>
                                <div className="text-xl font-bold text-slate-100">طلای فیزیکی</div>
                                <div className="text-slate-400 text-sm mt-1">{s.count} رکورد • مجموع {s.totalPaid.toLocaleString('fa-IR')} تومان</div>
                                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-300">
                                    <div className="bg-slate-800/60 rounded-lg p-2 ring-1 ring-slate-700">کل گرم: <span className="font-bold">{s.totalGrams}</span></div>
                                    <div className="bg-slate-800/60 rounded-lg p-2 ring-1 ring-slate-700">میانگین هر گرم: <span className="font-bold">{s.avgPrice.toLocaleString('fa-IR')}</span></div>
                                </div>
                                <div className="text-slate-500 text-xs mt-2">آخرین خرید: {s.last ? j(s.last) : '—'}</div>
                            </button>
                        ); })()}
                        {(() => { const s = summarizeToken(tok); const state = s.count ? 'فعال' : 'خالی'; const xaut = tok.filter(t => (t as any).tokenSymbol==='xaut'); const paxg = tok.filter(t => (t as any).tokenSymbol==='paxg'); const sumAmt = (arr:any[]) => arr.reduce((n,a)=> n + (Number((a as any).tokenAmount)||0)*(((a as any).txType||'buy')==='buy'? 1 : -1),0); const amtXaut = sumAmt(xaut); const amtPaxg = sumAmt(paxg); const gramsXaut = amtXaut * TOKEN_TO_GRAMS_18K; const gramsPaxg = amtPaxg * TOKEN_TO_GRAMS_18K; return (
                            <button onClick={() => setView('token')} className="text-right rounded-xl p-5 ring-1 ring-emerald-700/60 hover:ring-emerald-400 transition bg-gradient-to-br from-emerald-900/20 to-slate-800/40">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="bg-emerald-700/40 p-3 rounded-full inline-block"><WalletIcon/></div>
                                    <span className={`px-2 py-0.5 rounded-full text-xs ${s.count ? 'bg-emerald-600/40 text-emerald-200 ring-1 ring-emerald-500/40' : 'bg-slate-700 text-slate-300 ring-1 ring-slate-600'}`}>{state}</span>
                                </div>
                                <div className="text-xl font-bold text-slate-100">توکن طلا</div>
                                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-300">
                                    <div className="bg-slate-800/60 rounded-lg p-2 ring-1 ring-slate-700">XAUT: <span className="font-bold">{amtXaut}</span> توکن • <span className="font-bold">{gramsXaut.toFixed(3)}</span> گرم</div>
                                    <div className="bg-slate-800/60 rounded-lg p-2 ring-1 ring-slate-700">PAXG: <span className="font-bold">{amtPaxg}</span> توکن • <span className="font-bold">{gramsPaxg.toFixed(3)}</span> گرم</div>
                                    <div className="bg-slate-800/60 rounded-lg p-2 ring-1 ring-slate-700 col-span-2">جمع: <span className="font-bold">{(amtXaut+amtPaxg)}</span> توکن • <span className="font-bold">{(gramsXaut+gramsPaxg).toFixed(3)}</span> گرم</div>
                                </div>
                                <div className="text-slate-500 text-xs mt-2">آخرین تراکنش: {s.last ? j(s.last) : '—'}</div>
                            </button>
                        ); })()}
                        {(() => { const s = summarizeDigi(dgi); const state = s.count ? 'فعال' : 'خالی'; return (
                            <button onClick={() => setView('digikala')} className="text-right rounded-xl p-5 ring-1 ring-amber-700/60 hover:ring-amber-400 transition bg-gradient-to-br from-amber-900/20 to-slate-800/40">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="bg-amber-700/40 p-3 rounded-full inline-block"><AssetsIcon/></div>
                                    <span className={`px-2 py-0.5 rounded-full text-xs ${s.count ? 'bg-emerald-600/40 text-emerald-200 ring-1 ring-emerald-500/40' : 'bg-slate-700 text-slate-300 ring-1 ring-slate-600'}`}>{state}</span>
                                </div>
                                <div className="text-xl font-bold text-slate-100">طلای دیجی‌کالا</div>
                                <div className="text-slate-400 text-sm mt-1">{s.count} رکورد • مجموع {s.totalPaid.toLocaleString('fa-IR')} تومان</div>
                                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-300">
                                    <div className="bg-slate-800/60 rounded-lg p-2 ring-1 ring-slate-700">کل میلی‌گرم: <span className="font-bold">{s.totalMg}</span></div>
                                    <div className="bg-slate-800/60 rounded-lg p-2 ring-1 ring-slate-700">میانگین هر mg: <span className="font-bold">{s.avgPricePerMg.toLocaleString('fa-IR')}</span></div>
                                </div>
                                <div className="text-slate-500 text-xs mt-2">آخرین خرید: {s.last ? j(s.last) : '—'}</div>
                            </button>
                        ); })()}
                    </div>
                </>
            ) : (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="text-lg font-bold text-slate-100">{view === 'physical' ? 'طلای فیزیکی' : view === 'token' ? 'توکن طلا' : 'طلای دیجی‌کالا'}</div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setView('overview')} className="px-3 py-2 rounded-md border border-slate-600 text-slate-300 hover:bg-slate-700 text-sm">بازگشت</button>
                            {view === 'token' || view === 'digikala' ? (
                                <div className="flex items-center gap-2">
                                    <button onClick={() => openNew(view, 'buy')} className="px-3 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-sm">خرید</button>
                                    <button onClick={() => openNew(view, 'sell')} className="px-3 py-2 rounded-md bg-rose-600 hover:bg-rose-500 text-white text-sm">فروش</button>
                                </div>
                            ) : (
                                <button onClick={() => openNew(view)} className="px-3 py-2 rounded-md bg-sky-600 hover:bg-sky-500 text-white text-sm flex items-center gap-2"><PlusIcon/> افزودن</button>
                            )}
                        </div>
                    </div>
                    {/* Filters */}
                    <div className="bg-slate-800/50 rounded-xl p-4 ring-1 ring-slate-700">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                            <JalaliDatePicker id="from" label="از تاریخ" value={filterFrom || new Date(0).toISOString()} onChange={(iso) => setFilterFrom(iso)} />
                            <JalaliDatePicker id="to" label="تا تاریخ" value={filterTo || new Date().toISOString()} onChange={(iso) => setFilterTo(iso)} />
                            {view === 'token' ? (
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">نماد</label>
                                    <select value={symbol || ''} onChange={(e) => setSymbol((e.target as HTMLSelectElement).value || undefined)} className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3">
                                        <option value="">همه</option>
                                        <option value="xaut">XAUT</option>
                                        <option value="paxg">PAXG</option>
                                    </select>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">مبلغ از</label>
                                    <input type="number" value={minAmount ?? ''} onChange={(e) => setMinAmount(((e.target as HTMLInputElement).value || '') === '' ? undefined : Number((e.target as HTMLInputElement).value))} className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3" />
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">مبلغ تا</label>
                                <input type="number" value={maxAmount ?? ''} onChange={(e) => setMaxAmount(((e.target as HTMLInputElement).value || '') === '' ? undefined : Number((e.target as HTMLInputElement).value))} className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3" />
                            </div>
                        </div>
                    </div>
                    {/* Token assets summary (replaces payment trend chart for token view) or charts for others */}
                    {view === 'token' ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-slate-800/50 rounded-xl p-4 ring-1 ring-slate-700">
                                <div className="text-slate-300 text-sm">XAUT</div>
                                <div className="text-2xl font-extrabold text-emerald-400">{Number(tokenSums.amtXaut).toFixed(6)}</div>
                                <div className="text-xs text-slate-400 mt-1">گرم معادل: {tokenSums.gramsXaut.toFixed(3)}</div>
                            </div>
                            <div className="bg-slate-800/50 rounded-xl p-4 ring-1 ring-slate-700">
                                <div className="text-slate-300 text-sm">PAXG</div>
                                <div className="text-2xl font-extrabold text-emerald-400">{Number(tokenSums.amtPaxg).toFixed(6)}</div>
                                <div className="text-xs text-slate-400 mt-1">گرم معادل: {tokenSums.gramsPaxg.toFixed(3)}</div>
                            </div>
                            <div className="bg-slate-800/50 rounded-xl p-4 ring-1 ring-slate-700">
                                <div className="text-slate-300 text-sm">جمع دارایی</div>
                                <div className="text-2xl font-extrabold text-sky-400">{Number(tokenSums.totalAmt).toFixed(6)} توکن</div>
                                <div className="text-xs text-slate-400 mt-1">جمع گرم معادل: {tokenSums.gramsTotal.toFixed(3)}</div>
                                <div className="text-xs text-slate-400 mt-3 space-y-1">
                                    <div>در نوبیتکس: <span className="font-bold">{Number(tokenSums.amtNobitex).toFixed(6)}</span> توکن • <span className="font-bold">{tokenSums.gramsNobitex.toFixed(3)}</span> گرم</div>
                                    <div>در بیت پین: <span className="font-bold">{Number(tokenSums.amtBitpin).toFixed(6)}</span> توکن • <span className="font-bold">{tokenSums.gramsBitpin.toFixed(3)}</span> گرم</div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-slate-800/50 rounded-xl p-4 ring-1 ring-slate-700">
                                <div className="text-slate-300 text-sm mb-2">روند پرداختی</div>
                                <MiniChart data={filteredItems.map((it, i) => ({ x: i, y: (it as any).totalPaidToman || 0 }))} />
                            </div>
                            <div className="bg-slate-800/50 rounded-xl p-4 ring-1 ring-slate-700">
                                <div className="text-slate-300 text-sm mb-2">روند مقدار</div>
                                <MiniChart data={filteredItems.map((it, i) => ({ x: i, y: view === 'physical' ? ((it as any).grams || 0) : ((it as any).amountMg || 0) }))} stroke="#22c55e" fill="rgba(34,197,94,0.15)" />
                            </div>
                        </div>
                    )}
                    {/* filtered list */}
                    <div className={view === 'token' ? "space-y-2" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"}>
                        {filteredItems.map(it => (
                    <div key={it.id} className={it.subtype === 'token' ? "flex items-center justify-between rounded-lg p-3 ring-1 ring-slate-700 bg-slate-800/30 hover:bg-slate-800/50 transition" : "bg-slate-800/50 rounded-xl p-4 ring-1 ring-slate-700 space-y-3 hover:ring-sky-600 transition"}>
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="text-slate-100 font-bold">{it.subtype === 'physical' ? ((it as any).title || 'طلای فیزیکی') : it.subtype === 'token' ? ((it as any).tokenSymbol?.toUpperCase() || '—') : 'طلای دیجی‌کالا'}</div>
                                <div className="text-xs text-slate-400">تاریخ خرید: {j(it.purchaseDate)}</div>
                            </div>
                            <div className="flex items-center gap-2 text-slate-400">
                                        <button className="hover:text-sky-400" title="ویرایش" onClick={(e) => { e.stopPropagation(); openEdit(it); }}><EditIcon/></button>
                                        <button className="hover:text-rose-400" title="حذف" onClick={(e) => { e.stopPropagation(); setDeleteTarget(it); }}><DeleteIcon/></button>
                            </div>
                        </div>
                                {it.subtype === 'physical' && (
                            <div className="text-sm text-slate-300 space-y-1">
                                <div>مقدار: {(it as any).grams || 0} گرم{(it as any).soot ? ` و ${(it as any).soot} سوت` : ''} (جمع: {((Number((it as any).grams) || 0) + (Number((it as any).soot) || 0)/1000).toFixed(3)} گرم)</div>
                                <div>قیمت هر گرم: {((it as any).pricePerGram || 0).toLocaleString('fa-IR')} تومان</div>
                                <div>اجرت: {((it as any).wageToman || 0).toLocaleString('fa-IR')} تومان</div>
                                <div className="flex items-center gap-3">
                                    <LinkFromRef refId={(it as any).invoiceRef1} label="فاکتور 1" onOpen={openImage} />
                                    <LinkFromRef refId={(it as any).invoiceRef2} label="فاکتور 2" onOpen={openImage} />
                                </div>
                                {(it as any).lastTransfer && (
                                    <div className="mt-2 p-2 rounded-lg bg-slate-800/60 ring-1 ring-slate-700 text-xs">
                                        انتقال: از {(it as any).lastTransfer.fromOwnerName || '—'} به {(it as any).lastTransfer.toOwnerName || '—'} • { (it as any).lastTransfer.reason === 'gift' ? 'هدیه' : 'بدهی' } • {j((it as any).lastTransfer.date)}
                                    </div>
                                )}
                                <div className="pt-2 flex items-center gap-2">
                                    {!((it as any).soldAt) && (
                                        <button className="px-3 py-1.5 rounded-md bg-amber-600 hover:bg-amber-500 text-white text-xs" onClick={(e) => { e.stopPropagation(); openSale(it); }}>
                                            فروش این فاکتور
                                        </button>
                                    )}
                                    <button className="px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs" onClick={(e) => { e.stopPropagation(); setTransferTarget(it); setTransferTo(''); setTransferReason('gift'); (async()=>{ const list = await (getTransfersForGold?.(it.id)); setTransferHistory(list||[]); })(); }}>
                                        انتقال به کاربر
                                    </button>
                                    <button className="px-3 py-1.5 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs" onClick={(e) => { e.stopPropagation(); openDetails(it); }}>جزئیات</button>
                                </div>
                                {(it as any).soldAt && (
                                    <div className="mt-2 p-2 rounded-lg bg-slate-800/60 ring-1 ring-slate-700 text-xs text-slate-300 space-y-1">
                                        <div>تاریخ فروش: {j((it as any).soldAt)}</div>
                                        <div>مبلغ فروش: {(((it as any).saleTotalToman || 0)).toLocaleString('fa-IR')} تومان</div>
                                        <div>سود/زیان: {((((it as any).saleTotalToman || 0) - ((it as any).totalPaidToman || 0))).toLocaleString('fa-IR')} تومان</div>
                                    </div>
                                )}
                            </div>
                        )}
                        {it.subtype === 'token' && (
                            <>
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-3">
                                        <span className={`px-2 py-0.5 rounded-full text-xs ${((it as any).txType||'buy')==='buy' ? 'bg-emerald-700/40 text-emerald-200 ring-1 ring-emerald-600/40' : 'bg-rose-700/40 text-rose-200 ring-1 ring-rose-600/40'}`}>{((it as any).txType||'buy')==='buy' ? 'خرید' : 'فروش'}</span>
                                        <span className="text-slate-300">{(it as any).tokenSymbol?.toUpperCase() || '—'}</span>
                                        <span className="text-slate-400">{j(it.purchaseDate)}</span>
                                    </div>
                                    <div className="text-xs text-slate-400">{(it as any).custodyLocation === 'nobitex' ? 'نوبیتکس' : (it as any).custodyLocation === 'bitpin' ? 'بیت پین' : '—'}</div>
                                </div>
                                <div className="text-slate-200 font-bold">{(it as any).tokenAmount}</div>
                                <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                                    <div>گرم معادل: {((it as any).gramsDerived != null ? Number((it as any).gramsDerived) : ((Number((it as any).tokenAmount)||0) * TOKEN_TO_GRAMS_18K)).toFixed(4)}</div>
                                    <div>مبلغ: {((it as any).totalPaidToman || 0).toLocaleString('fa-IR')} تومان</div>
                                    {(it as any).priceTokenToman != null && <div>قیمت هر توکن: {Number((it as any).priceTokenToman).toLocaleString('fa-IR')} تومان</div>}
                                    <div>
                                        {(() => { const fee = Number((it as any).feeToman || 0); const total = Number((it as any).totalPaidToman || 0); const pct = total ? Math.round((fee / total) * 10000) / 100 : 0; return (
                                            <span>کارمزد: {fee.toLocaleString('fa-IR')} تومان {total ? <span className="text-slate-500">({pct}%)</span> : null}</span>
                                        ); })()}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-slate-400">
                                    <button className="hover:text-sky-400" title="ویرایش" onClick={(e) => { e.stopPropagation(); openEdit(it); }}><EditIcon/></button>
                                    <button className="hover:text-rose-400" title="حذف" onClick={(e) => { e.stopPropagation(); setDeleteTarget(it); }}><DeleteIcon/></button>
                                    <button className="px-2 py-1 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs" onClick={(e)=>{ e.stopPropagation(); setDetailTarget({ ...it }); }}>
                                        جزئیات
                                    </button>
                                </div>
                            </>
                        )}
                        {it.subtype === 'digikala' && (
                            <div className="text-sm text-slate-300 space-y-1">
                                <div>مقدار: {(it as any).amountMg} میلی‌گرم</div>
                                <div>قیمت هر میلی‌گرم: {(it as any).pricePerMg?.toLocaleString('fa-IR')} تومان</div>
                                <div>کارمزد: {((it as any).feeManualToman || 0).toLocaleString('fa-IR')} تومان ({(it as any).feePercent ?? '—'}%)</div>
                                        <LinkFromRef refId={(it as any).invoiceRef} label="رسید" onOpen={openImage} />
                            </div>
                        )}
                        <div className="text-sky-400 font-extrabold">مجموع پرداختی: {((it as any).totalPaidToman || 0).toLocaleString('fa-IR')} تومان</div>
                    </div>
                        ))}
                    </div>
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" onClick={() => setModalOpen(false)}>
                    <div className="absolute inset-0 bg-black/70" />
                    <div className="relative w-full max-w-2xl bg-slate-800 rounded-2xl ring-1 ring-slate-700 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
                            <h3 className="text-slate-100 font-bold text-lg">{subtype === 'physical' ? 'افزودن طلای فیزیکی' : subtype === 'token' ? `ثبت تراکنش توکن طلا (${(form.txType||txType)==='sell' ? 'فروش' : 'خرید'})` : 'افزودن طلای دیجی‌کالا'}</h3>
                            <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white">×</button>
                        </div>
                        <div className="p-5 space-y-4">
                            <JalaliDatePicker id="gold-purchase" value={form.purchaseDate || new Date().toISOString()} onChange={(iso) => setForm((f: any) => ({ ...f, purchaseDate: iso }))} label={subtype === 'token' || subtype === 'digikala' ? 'تاریخ تراکنش' : 'تاریخ خرید'} />
                            {subtype === 'physical' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-slate-300 mb-1">عنوان (مثلاً انگشتر، گردنبند)</label>
                                        <input type="text" value={String(form.title || '')} onChange={e => setForm((f: any) => ({ ...f, title: (e.target as HTMLInputElement).value }))} className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3 focus:ring-2 focus:ring-sky-400" placeholder="عنوان دلخواه" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">مقدار (گرم)</label>
                                        <input type="number" value={String(form.grams ?? '')} onChange={e => setForm((f: any) => ({ ...f, grams: Number((e.target as HTMLInputElement).value) }))} className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3 focus:ring-2 focus:ring-sky-400" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">سوت</label>
                                        <input type="number" value={String(form.soot ?? '')} onChange={e => setForm((f: any) => ({ ...f, soot: Number((e.target as HTMLInputElement).value) }))} className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3 focus:ring-2 focus:ring-sky-400" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">قیمت هر گرم (تومان)</label>
                                        <input type="number" value={String(form.pricePerGram ?? '')} onChange={e => setForm((f: any) => ({ ...f, pricePerGram: Number((e.target as HTMLInputElement).value) }))} className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3 focus:ring-2 focus:ring-sky-400" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">مجموع پرداختی (تومان)</label>
                                        <input type="number" value={String(form.totalPaidToman ?? 0)} onChange={e => setForm((f: any) => ({ ...f, totalPaidToman: Number((e.target as HTMLInputElement).value) }))} className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3 focus:ring-2 focus:ring-sky-400" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-slate-300">فاکتور 1</label>
                                        <div className="flex items-center gap-3">
                                            <button className="px-3 py-2 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm" onClick={() => document.getElementById('gold-invoice-1')?.click()}>انتخاب تصویر</button>
                                            {form.invoiceRef1 && <button className="px-3 py-2 rounded-md bg-slate-700 hover:bg-slate-600 text-rose-300 text-sm" onClick={() => { setForm((f:any)=>({...f, invoiceRef1: undefined})); setPreview1(null); }}>حذف تصویر</button>}
                                            {preview1 && <img src={preview1} alt="invoice1" className="h-16 rounded ring-1 ring-slate-700" />}
                                        </div>
                                        <input id="gold-invoice-1" type="file" accept="image/*" onChange={e => handleChooseImage(1, e)} className="hidden" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-slate-300">فاکتور 2</label>
                                        <div className="flex items-center gap-3">
                                            <button className="px-3 py-2 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm" onClick={() => document.getElementById('gold-invoice-2')?.click()}>انتخاب تصویر</button>
                                            {form.invoiceRef2 && <button className="px-3 py-2 rounded-md bg-slate-700 hover:bg-slate-600 text-rose-300 text-sm" onClick={() => { setForm((f:any)=>({...f, invoiceRef2: undefined})); setPreview2(null); }}>حذف تصویر</button>}
                                            {preview2 && <img src={preview2} alt="invoice2" className="h-16 rounded ring-1 ring-slate-700" />}
                                        </div>
                                        <input id="gold-invoice-2" type="file" accept="image/*" onChange={e => handleChooseImage(2, e)} className="hidden" />
                                    </div>
                                </div>
                            )}
                            {subtype === 'token' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">نماد</label>
                                        <select value={form.tokenSymbol || 'xaut'} onChange={e => setForm((f: any) => ({ ...f, tokenSymbol: (e.target as HTMLSelectElement).value }))} className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3">
                                            <option value="xaut">XAUT</option>
                                            <option value="paxg">PAXG</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">مقدار</label>
                                        <input type="number" step="any" inputMode="decimal" value={String(form.tokenAmount ?? '')} onChange={e => setForm((f: any) => ({ ...f, tokenAmount: (e.target as HTMLInputElement).value }))} className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">قیمت هر توکن (تومان)</label>
                                        <input type="number" step="any" inputMode="decimal" value={String(form.priceTokenToman ?? '')} onChange={e => setForm((f: any) => ({ ...f, priceTokenToman: (e.target as HTMLInputElement).value }))} className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3" />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">مجموع پرداختی (تومان)</label>
                                        <input type="number" step="any" inputMode="decimal" value={String(form.totalPaidToman ?? 0)} onChange={e => setForm((f: any) => ({ ...f, totalPaidToman: (e.target as HTMLInputElement).value }))} className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">کارمزد (تومان)</label>
                                        <input type="number" step="any" inputMode="decimal" value={String(form.feeToman ?? 0)} onChange={e => setForm((f: any) => ({ ...f, feeToman: (e.target as HTMLInputElement).value }))} className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3" />
                                    <div className="text-[11px] text-slate-400 mt-1">گرم معادل = مقدار × 41.4713</div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">محل نگهداری</label>
                                        <select value={form.custodyLocation || 'nobitex'} onChange={e => setForm((f: any) => ({ ...f, custodyLocation: (e.target as HTMLSelectElement).value }))} className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3">
                                            <option value="nobitex">نوبیتکس</option>
                                            <option value="bitpin">بیت پین</option>
                                        </select>
                                    </div>
                                    
                                </div>
                            )}
                            {subtype === 'digikala' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">مقدار (میلی‌گرم)</label>
                                        <input type="number" value={String(form.amountMg ?? '')} onChange={e => setForm((f: any) => ({ ...f, amountMg: Number((e.target as HTMLInputElement).value) }))} className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">قیمت هر میلی‌گرم</label>
                                        <input type="number" value={String(form.pricePerMg ?? '')} onChange={e => setForm((f: any) => ({ ...f, pricePerMg: Number((e.target as HTMLInputElement).value) }))} className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">مجموع پرداختی (تومان)</label>
                                        <input type="number" value={String(form.totalPaidToman ?? 0)} onChange={e => setForm((f: any) => ({ ...f, totalPaidToman: Number((e.target as HTMLInputElement).value) }))} className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">کارمزد (تومان)</label>
                                        <input type="number" value={String(form.feeManualToman ?? 0)} onChange={e => setForm((f: any) => ({ ...f, feeManualToman: Number((e.target as HTMLInputElement).value) }))} className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-slate-300 mb-1">فاکتور/رسید</label>
                                        <div className="flex items-center gap-3">
                                            <button className="px-3 py-2 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm" onClick={() => document.getElementById('gold-dg-invoice')?.click()}>انتخاب تصویر</button>
                                            {form.invoiceRef && <button className="px-3 py-2 rounded-md bg-slate-700 hover:bg-slate-600 text-rose-300 text-sm" onClick={() => setForm((f:any)=> ({...f, invoiceRef: undefined, dgInvoicePreview: undefined}))}>حذف تصویر</button>}
                                            {form.dgInvoicePreview && <img src={form.dgInvoicePreview} className="h-16 rounded ring-1 ring-slate-700" />}
                                        </div>
                                        <input id="gold-dg-invoice" type="file" accept="image/*" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = async () => { const ref = await saveImageDataURL(String(reader.result || '')); const url = await getObjectURLByRef(ref); setForm((f: any) => ({ ...f, invoiceRef: ref, dgInvoicePreview: url })); }; reader.readAsDataURL(file); }} className="hidden" />
                                    </div>
                                </div>
                            )}
                            {error && <div className="text-rose-400 text-sm">{error}</div>}
                        </div>
                        <div className="px-5 py-4 bg-slate-800/60 border-t border-slate-700 flex items-center justify-end gap-2">
                            <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-md border border-slate-600 text-slate-300 hover:bg-slate-700 text-sm">لغو</button>
                            <button onClick={onSave} className="px-4 py-2 rounded-md bg-sky-600 hover:bg-sky-500 text-white text-sm font-bold">ذخیره</button>
                        </div>
                    </div>
                </div>
            )}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" onClick={() => setDeleteTarget(null)}>
                    <div className="absolute inset-0 bg-black/70" />
                    <div className="relative w-full max-w-md bg-slate-800 rounded-2xl ring-1 ring-slate-700 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="px-5 py-4 border-b border-slate-700">
                            <h3 className="text-slate-100 font-bold text-lg">حذف رکورد</h3>
                        </div>
                        <div className="p-5 space-y-4 text-slate-200">
                            آیا از حذف این رکورد مطمئن هستید؟ این کار قابل بازگشت نیست.
                        </div>
                        <div className="px-5 py-4 bg-slate-800/60 border-t border-slate-700 flex items-center justify-end gap-2">
                            <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 rounded-md border border-slate-600 text-slate-300 hover:bg-slate-700 text-sm">انصراف</button>
                            <button onClick={confirmDelete} className="px-4 py-2 rounded-md bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold">حذف</button>
                        </div>
                    </div>
                </div>
            )}
            {imageModal.open && imageModal.url && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" onClick={() => setImageModal({ open: false, url: null })}>
                    <div className="absolute inset-0 bg-black/80" />
                    <div className="relative w-full max-w-3xl bg-slate-900 rounded-2xl ring-1 ring-slate-700 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="px-5 py-3 border-b border-slate-700 flex items-center justify-between">
                            <div className="text-slate-200 font-bold">پیش‌نمایش تصویر</div>
                            <div className="flex items-center gap-2">
                                <a href={imageModal.url} download={imageModal.fileName || 'invoice.jpg'} className="px-3 py-1.5 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-100 text-sm">دانلود</a>
                                <button onClick={() => setImageModal({ open: false, url: null })} className="px-3 py-1.5 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-100 text-sm">بستن</button>
                            </div>
                        </div>
                        <div className="p-4">
                            <img src={imageModal.url} className="w-full h-auto rounded-lg" />
                        </div>
                    </div>
                </div>
            )}
            {detailTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" onClick={() => setDetailTarget(null)}>
                    <div className="absolute inset-0 bg-black/80" />
                    <div className="relative w-full max-w-4xl bg-slate-900 rounded-2xl ring-1 ring-slate-700 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                            <div className="text-xl font-bold text-slate-100">{detailTarget.subtype === 'physical' ? 'جزئیات طلای فیزیکی' : detailTarget.subtype === 'token' ? `جزئیات ${String(detailTarget.tokenSymbol || '').toUpperCase()}` : 'جزئیات طلای دیجی‌کالا'}</div>
                            <button onClick={() => setDetailTarget(null)} className="px-3 py-1.5 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-100 text-sm">بستن</button>
                        </div>
                        <div className="p-6 space-y-6">
                            {detailTarget.subtype === 'physical' && (() => {
                                const grams = Number(detailTarget.grams || 0);
                                const soot = Number(detailTarget.soot || 0);
                                const totalGrams = grams + (soot / 1000);
                                const totalPaid = Number(detailTarget.totalPaidToman || 0);
                                const pricePerGram = Number(detailTarget.pricePerGram || 0);
                                const wage = Number(detailTarget.wageToman || 0);
                                const wagePercent = totalPaid ? Math.round((wage / totalPaid) * 10000) / 100 : 0;
                                const sold = !!detailTarget.soldAt;
                                const saleAmount = Number(detailTarget.saleTotalToman || 0);
                                const salePerGram = sold && totalGrams ? Math.round(saleAmount / totalGrams) : undefined;
                                const profit = sold ? (saleAmount - totalPaid) : undefined;
                                const profitPercent = sold && totalPaid ? Math.round(((saleAmount - totalPaid) / totalPaid) * 10000) / 100 : undefined;
                                return (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <div className="text-slate-300 text-sm">عنوان</div>
                                            <div className="text-lg font-bold">{detailTarget.title || '—'}</div>
                                            <div className="grid grid-cols-2 gap-3 text-sm text-slate-300 mt-2">
                                                <div className="bg-slate-800/60 p-3 rounded-lg ring-1 ring-slate-700">وزن: <span className="font-bold">{grams} گرم</span></div>
                                                <div className="bg-slate-800/60 p-3 rounded-lg ring-1 ring-slate-700">سوت: <span className="font-bold">{soot}</span></div>
                                                <div className="bg-slate-800/60 p-3 rounded-lg ring-1 ring-slate-700">جمع گرم: <span className="font-bold">{totalGrams.toFixed(3)}</span></div>
                                                <div className="bg-slate-800/60 p-3 rounded-lg ring-1 ring-slate-700">قیمت هر گرم (خرید): <span className="font-bold">{pricePerGram.toLocaleString('fa-IR')}</span></div>
                                                <div className="bg-slate-800/60 p-3 rounded-lg ring-1 ring-slate-700">اجرت: <span className="font-bold">{wage.toLocaleString('fa-IR')}</span> <span className="text-xs">({wagePercent}% از کل)</span></div>
                                                <div className="bg-slate-800/60 p-3 rounded-lg ring-1 ring-slate-700">تاریخ خرید: <span className="font-bold">{j(detailTarget.purchaseDate)}</span></div>
                                                <div className="bg-slate-800/60 p-3 rounded-lg ring-1 ring-slate-700">مجموع پرداختی: <span className="font-bold">{totalPaid.toLocaleString('fa-IR')}</span> تومان</div>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="text-slate-300 text-sm">تصاویر فاکتور</div>
                                            <div className="flex items-center gap-3">
                                                <button className="px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-sky-300 text-sm disabled:opacity-50" disabled={!detailTarget.invoiceRef1} onClick={() => openImage(detailTarget.invoiceRef1)}>مشاهده فاکتور 1</button>
                                                <button className="px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-sky-300 text-sm disabled:opacity-50" disabled={!detailTarget.invoiceRef2} onClick={() => openImage(detailTarget.invoiceRef2)}>مشاهده فاکتور 2</button>
                                            </div>
                                            {sold && (
                                                <div className="mt-4 space-y-2">
                                                    <div className="text-slate-300 text-sm">اطلاعات فروش</div>
                                                    <div className="grid grid-cols-2 gap-3 text-sm text-slate-300">
                                                        <div className="bg-slate-800/60 p-3 rounded-lg ring-1 ring-slate-700">تاریخ فروش: <span className="font-bold">{j(detailTarget.soldAt)}</span></div>
                                                        <div className="bg-slate-800/60 p-3 rounded-lg ring-1 ring-slate-700">مبلغ فروش: <span className="font-bold">{saleAmount.toLocaleString('fa-IR')}</span></div>
                                                        <div className="bg-slate-800/60 p-3 rounded-lg ring-1 ring-slate-700">قیمت هر گرم در فروش: <span className="font-bold">{(salePerGram || 0).toLocaleString('fa-IR')}</span></div>
                                                        <div className="bg-slate-800/60 p-3 rounded-lg ring-1 ring-slate-700">سود/زیان: <span className="font-bold">{(profit || 0).toLocaleString('fa-IR')}</span> <span className="text-xs">{profitPercent != null ? `(${profitPercent}%)` : ''}</span></div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="md:col-span-2">
                                            <div className="text-slate-300 text-sm mb-2">تاریخچه انتقال</div>
                                            {detailTransfers.length ? (
                                                <div className="space-y-2 text-xs text-slate-300">
                                                    {detailTransfers.map((t:any) => (
                                                        <div key={t.id} className="flex items-center justify-between bg-slate-800/50 p-2 rounded-lg ring-1 ring-slate-700">
                                                            <div>از {t.fromOwnerName || '—'} به {t.toOwnerName || '—'} • {t.reason==='gift'?'هدیه':'بدهی'}</div>
                                                            <div className="text-slate-500">{j(t.date)}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-slate-500 text-sm">هیچ انتقالی ثبت نشده است.</div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}

                            {detailTarget.subtype === 'token' && (() => {
                                const symbol = (detailTarget.tokenSymbol || '').toUpperCase();
                                const txTypeLabel = (detailTarget.txType || 'buy') === 'buy' ? 'خرید' : 'فروش';
                                const amount = Number(detailTarget.tokenAmount || 0);
                                const grams = (detailTarget.gramsDerived != null ? Number(detailTarget.gramsDerived) : (amount * TOKEN_TO_GRAMS_18K));
                                const pricePerToken = detailTarget.priceTokenToman != null ? Number(detailTarget.priceTokenToman) : undefined;
                                const totalPaid = Number(detailTarget.totalPaidToman || 0);
                                const fee = Number(detailTarget.feeToman || 0);
                                const feePercent = totalPaid ? Math.round((fee / totalPaid) * 10000) / 100 : 0;
                                const custody = detailTarget.custodyLocation === 'nobitex' ? 'نوبیتکس' : detailTarget.custodyLocation === 'bitpin' ? 'بیت پین' : '—';
                                const usdPrice = detailTarget.priceUsd != null ? Number(detailTarget.priceUsd) : undefined;
                                const usdRate = detailTarget.usdRateToman != null ? Number(detailTarget.usdRateToman) : undefined;
                                const pricePerGramToday = detailTarget.pricePerGramToday != null ? Number(detailTarget.pricePerGramToday) : undefined;
                                return (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <div className="text-slate-300 text-sm">نوع تراکنش</div>
                                                <div className="font-bold text-slate-100">{txTypeLabel}</div>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="text-slate-300 text-sm">نماد</div>
                                                <div className="font-bold text-slate-100">{symbol || '—'}</div>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="text-slate-300 text-sm">محل انجام</div>
                                                <div className="font-bold text-slate-100">{custody}</div>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="text-slate-300 text-sm">تاریخ</div>
                                                <div className="font-bold text-slate-100">{j(detailTarget.purchaseDate)}</div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-300">
                                            <div className="bg-slate-800/60 p-3 rounded-lg ring-1 ring-slate-700">مقدار: <span className="font-bold">{amount}</span> توکن</div>
                                            <div className="bg-slate-800/60 p-3 rounded-lg ring-1 ring-slate-700">گرم معادل: <span className="font-bold">{grams.toFixed(4)}</span></div>
                                            <div className="bg-slate-800/60 p-3 rounded-lg ring-1 ring-slate-700">قیمت هر توکن: <span className="font-bold">{pricePerToken != null ? pricePerToken.toLocaleString('fa-IR') : '—'}</span> <span className="text-xs">تومان</span></div>
                                            <div className="bg-slate-800/60 p-3 rounded-lg ring-1 ring-slate-700">مجموع پرداختی: <span className="font-bold">{totalPaid.toLocaleString('fa-IR')}</span> <span className="text-xs">تومان</span></div>
                                            <div className="bg-slate-800/60 p-3 rounded-lg ring-1 ring-slate-700">کارمزد: <span className="font-bold">{fee.toLocaleString('fa-IR')}</span> <span className="text-xs">تومان</span> <span className="text-xs text-slate-400">({feePercent}%)</span></div>
                                            {usdPrice != null && <div className="bg-slate-800/60 p-3 rounded-lg ring-1 ring-slate-700">قیمت دلار هنگام معامله: <span className="font-bold">{usdPrice}</span></div>}
                                            {usdRate != null && <div className="bg-slate-800/60 p-3 rounded-lg ring-1 ring-slate-700">نرخ دلار (تومان): <span className="font-bold">{usdRate.toLocaleString('fa-IR')}</span></div>}
                                            {pricePerGramToday != null && <div className="bg-slate-800/60 p-3 rounded-lg ring-1 ring-slate-700">قیمت هر گرم امروز (تومان): <span className="font-bold">{pricePerGramToday.toLocaleString('fa-IR')}</span></div>}
                                        </div>
                                        {detailTarget.invoiceRef && (
                                            <div className="space-y-2">
                                                <div className="text-slate-300 text-sm">رسید</div>
                                                <button className="px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-sky-300 text-sm" onClick={() => openImage(detailTarget.invoiceRef)}>مشاهده رسید</button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}
            {saleTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" onClick={() => setSaleTarget(null)}>
                    <div className="absolute inset-0 bg-black/70" />
                    <div className="relative w-full max-w-md bg-slate-800 rounded-2xl ring-1 ring-slate-700 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="px-5 py-4 border-b border-slate-700">
                            <h3 className="text-slate-100 font-bold text-lg">ثبت فروش طلای فیزیکی</h3>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">مبلغ فروش (تومان)</label>
                                <input type="number" value={salePrice} onChange={e => setSalePrice((e.target as HTMLInputElement).value)} className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3" placeholder="مثلاً 25000000" />
                            </div>
                            <div className="text-xs text-slate-400">خرید: {((saleTarget as any).totalPaidToman || 0).toLocaleString('fa-IR')} تومان • تاریخ خرید: {j((saleTarget as any).purchaseDate)}</div>
                        </div>
                        <div className="px-5 py-4 bg-slate-800/60 border-t border-slate-700 flex items-center justify-end gap-2">
                            <button onClick={() => setSaleTarget(null)} className="px-4 py-2 rounded-md border border-slate-600 text-slate-300 hover:bg-slate-700 text-sm">انصراف</button>
                            <button onClick={confirmSale} className="px-4 py-2 rounded-md bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold">ثبت فروش</button>
                        </div>
                    </div>
                </div>
            )}
            {transferTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" onClick={() => setTransferTarget(null)}>
                    <div className="absolute inset-0 bg-black/70" />
                    <div className="relative w-full max-w-md bg-slate-800 rounded-2xl ring-1 ring-slate-700 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="px-5 py-4 border-b border-slate-700">
                            <h3 className="text-slate-100 font-bold text-lg">انتقال طلای فیزیکی</h3>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">انتقال به</label>
                                <select value={transferTo} onChange={e => setTransferTo((e.target as HTMLSelectElement).value)} className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3">
                                    <option value="">انتخاب مالک</option>
                                    {(owners || []).filter((o:any)=>o.id!==ownerId).map((o:any)=> (
                                        <option key={o.id} value={o.id}>{o.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">علت انتقال</label>
                                <div className="flex items-center gap-4 text-slate-200 text-sm">
                                    <label className="inline-flex items-center gap-2"><input type="radio" name="reason" checked={transferReason==='gift'} onChange={()=>setTransferReason('gift')} /> هدیه</label>
                                    <label className="inline-flex items-center gap-2"><input type="radio" name="reason" checked={transferReason==='debt'} onChange={()=>setTransferReason('debt')} /> بدهی</label>
                                </div>
                            </div>
                            {!!transferHistory.length && (
                                <div className="text-xs text-slate-400 space-y-1">
                                    <div className="font-bold text-slate-300">تاریخچه انتقال‌ها</div>
                                    {transferHistory.map((t:any)=> (
                                        <div key={t.id} className="flex items-center justify-between">
                                            <div>از {t.fromOwnerName || '—'} به {t.toOwnerName || '—'} • {t.reason==='gift'?'هدیه':'بدهی'}</div>
                                            <div className="text-slate-500">{j(t.date)}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="px-5 py-4 bg-slate-800/60 border-t border-slate-700 flex items-center justify-end gap-2">
                            <button onClick={() => setTransferTarget(null)} className="px-4 py-2 rounded-md border border-slate-600 text-slate-300 hover:bg-slate-700 text-sm">انصراف</button>
                            <button onClick={async ()=>{ if(!transferTo){ setError('لطفاً گیرنده را انتخاب کنید'); return;} try{ await transferGold({ goldId: transferTarget.id, fromOwnerId: ownerId, toOwnerId: transferTo, reason: transferReason }); setTransferTarget(null); } catch(e:any){ setError(e?.message||'انتقال انجام نشد'); } }} className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold">ثبت انتقال</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default OwnerGoldDashboard;


