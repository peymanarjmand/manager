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
    return <button type="button" className="inline-flex items-center gap-1 text-sky-400 text-xs hover:text-sky-300" onClick={() => onOpen(refId)} title="نمایش تصویر"><EyeIcon/> {label}</button>;
};

export function OwnerGoldDashboard({ ownerId, onBack }: { ownerId: string; onBack: () => void; }): React.ReactNode {
    const { gold, loadGoldByOwner, saveGold, deleteGold } = useAssetsStore();
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

    useEffect(() => { (async () => { await loadGoldByOwner(ownerId); })(); }, [ownerId]);

    const j = (iso: string) => moment(iso).locale('fa').format('jD jMMMM jYYYY');

    const itemsAll = gold.filter(g => g.ownerId === ownerId);
    const summarize = (arr: any[]) => {
        const count = arr.length;
        const totalPaid = arr.reduce((s, a) => s + (a.totalPaidToman || 0), 0);
        const last = arr.length ? arr.map(a => a.purchaseDate).sort((a,b) => new Date(b).getTime() - new Date(a).getTime())[0] : undefined;
        const invoices = arr.reduce((s, a) => s + (a.subtype === 'physical' ? ((a.invoiceRef1 ? 1 : 0) + (a.invoiceRef2 ? 1 : 0)) : (a.invoiceRef ? 1 : 0)), 0);
        return { count, totalPaid, last, invoices };
    };
    const summarizePhysical = (arr: any[]) => {
        const s = summarize(arr);
        const totalGrams = arr.reduce((g, a) => g + (Number(a.grams) || 0), 0);
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

    const openNew = (s: GoldSubtype) => {
        setSubtype(s);
        setForm({ id: undefined, ownerId, subtype: s, purchaseDate: new Date().toISOString() });
        setPreview1(null); setPreview2(null); setError(null);
        setModalOpen(true);
    };

    const openEdit = async (item: any) => {
        setSubtype(item.subtype);
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
            const fee = draft.totalPaidToman ? Math.round(draft.totalPaidToman * 0.003) : 0; // 0.3% exchange fee heuristic
            return { ...draft, feeToman: fee };
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
                const gramsDerived = draft.pricePerGramToday ? (Number(draft.totalPaidToman || 0) / Number(draft.pricePerGramToday || 1)) : undefined;
                draft.gramsDerived = gramsDerived;
                // If fee not provided, compute from USD reference and USD rate
                if ((draft.feeToman == null || isNaN(Number(draft.feeToman))) && draft.priceUsd && draft.tokenAmount && draft.usdRateToman) {
                    const referenceCost = Number(draft.priceUsd) * Number(draft.tokenAmount) * Number(draft.usdRateToman);
                    const fee = Math.max(0, Math.round(Number(draft.totalPaidToman || 0) - referenceCost));
                    draft.feeToman = fee;
                }
            }
            const payload: GoldAsset = autoCompute(draft);
            await saveGold(payload);
            setModalOpen(false);
        } catch (e: any) {
            setError(e?.message || 'خطا در ذخیره');
        }
    };

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
                        {(() => { const s = summarizeToken(tok); const state = s.count ? 'فعال' : 'خالی'; return (
                            <button onClick={() => setView('token')} className="text-right rounded-xl p-5 ring-1 ring-emerald-700/60 hover:ring-emerald-400 transition bg-gradient-to-br from-emerald-900/20 to-slate-800/40">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="bg-emerald-700/40 p-3 rounded-full inline-block"><WalletIcon/></div>
                                    <span className={`px-2 py-0.5 rounded-full text-xs ${s.count ? 'bg-emerald-600/40 text-emerald-200 ring-1 ring-emerald-500/40' : 'bg-slate-700 text-slate-300 ring-1 ring-slate-600'}`}>{state}</span>
                                </div>
                                <div className="text-xl font-bold text-slate-100">توکن طلا</div>
                                <div className="text-slate-400 text-sm mt-1">{s.count} رکورد • مجموع {s.totalPaid.toLocaleString('fa-IR')} تومان</div>
                                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-300">
                                    <div className="bg-slate-800/60 rounded-lg p-2 ring-1 ring-slate-700">کل مقدار: <span className="font-bold">{s.totalAmount}</span></div>
                                    <div className="bg-slate-800/60 rounded-lg p-2 ring-1 ring-slate-700">میانگین تومانی: <span className="font-bold">{s.avgPriceToman.toLocaleString('fa-IR')}</span></div>
                                </div>
                                <div className="text-slate-500 text-xs mt-2">آخرین خرید: {s.last ? j(s.last) : '—'}</div>
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
                            <button onClick={() => openNew(view)} className="px-3 py-2 rounded-md bg-sky-600 hover:bg-sky-500 text-white text-sm flex items-center gap-2"><PlusIcon/> افزودن</button>
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
                    {/* Charts */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-slate-800/50 rounded-xl p-4 ring-1 ring-slate-700">
                            <div className="text-slate-300 text-sm mb-2">روند پرداختی</div>
                            <MiniChart data={filteredItems.map((it, i) => ({ x: i, y: (it as any).totalPaidToman || 0 }))} />
                        </div>
                        <div className="bg-slate-800/50 rounded-xl p-4 ring-1 ring-slate-700">
                            <div className="text-slate-300 text-sm mb-2">روند مقدار</div>
                            <MiniChart data={filteredItems.map((it, i) => ({ x: i, y: view === 'physical' ? ((it as any).grams || 0) : view === 'token' ? ((it as any).tokenAmount || 0) : ((it as any).amountMg || 0) }))} stroke="#22c55e" fill="rgba(34,197,94,0.15)" />
                        </div>
                    </div>
                    {/* filtered list */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredItems.map(it => (
                    <div key={it.id} className="bg-slate-800/50 rounded-xl p-4 ring-1 ring-slate-700 space-y-3">
                        <div className="flex items-start justify-between">
                            <div>
                                        <div className="text-slate-100 font-bold">{it.subtype === 'physical' ? 'طلای فیزیکی' : it.subtype === 'token' ? 'توکن طلا' : 'طلای دیجی‌کالا'}</div>
                                        {it.subtype === 'physical' && (it as any).title && <div className="text-xs text-slate-300 mt-0.5">عنوان: {(it as any).title}</div>}
                                <div className="text-xs text-slate-400">تاریخ خرید: {j(it.purchaseDate)}</div>
                            </div>
                            <div className="flex items-center gap-2 text-slate-400">
                                        <button className="hover:text-sky-400" title="ویرایش" onClick={() => openEdit(it)}><EditIcon/></button>
                                        <button className="hover:text-rose-400" title="حذف" onClick={() => setDeleteTarget(it)}><DeleteIcon/></button>
                            </div>
                        </div>
                                {it.subtype === 'physical' && (
                            <div className="text-sm text-slate-300 space-y-1">
                                <div>مقدار: {(it as any).grams || 0} گرم{(it as any).soot ? ` و ${(it as any).soot} سوت` : ''}</div>
                                <div>قیمت هر گرم: {((it as any).pricePerGram || 0).toLocaleString('fa-IR')} تومان</div>
                                <div>اجرت: {((it as any).wageToman || 0).toLocaleString('fa-IR')} تومان</div>
                                        <div className="flex items-center gap-3">
                                            <LinkFromRef refId={(it as any).invoiceRef1} label="فاکتور 1" onOpen={openImage} />
                                            <LinkFromRef refId={(it as any).invoiceRef2} label="فاکتور 2" onOpen={openImage} />
                                        </div>
                                        {!((it as any).soldAt) && (
                                            <div className="pt-2">
                                                <button className="px-3 py-1.5 rounded-md bg-amber-600 hover:bg-amber-500 text-white text-xs" onClick={() => openSale(it)}>
                                                    فروش این فاکتور
                                                </button>
                                            </div>
                                        )}
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
                            <div className="text-sm text-slate-300 space-y-1">
                                <div>نماد: {(it as any).tokenSymbol?.toUpperCase()}</div>
                                <div>مقدار: {(it as any).tokenAmount}</div>
                                <div>قیمت مرجع: {(it as any).priceUsd} دلار</div>
                                <div>قیمت هر گرم امروز: {((it as any).pricePerGramToday || 0).toLocaleString('fa-IR')} تومان</div>
                                {(it as any).gramsDerived != null && <div>گرم معادل: {Number((it as any).gramsDerived).toFixed(4)}</div>}
                                <div>کارمزد: {((it as any).feeToman || 0).toLocaleString('fa-IR')} تومان</div>
                                <div>محل نگهداری: {(it as any).custodyLocation || '—'}</div>
                                        <LinkFromRef refId={(it as any).invoiceRef} label="رسید" onOpen={openImage} />
                            </div>
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
                            <h3 className="text-slate-100 font-bold text-lg">{subtype === 'physical' ? 'افزودن طلای فیزیکی' : subtype === 'token' ? 'افزودن توکن طلا' : 'افزودن طلای دیجی‌کالا'}</h3>
                            <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white">×</button>
                        </div>
                        <div className="p-5 space-y-4">
                            <JalaliDatePicker id="gold-purchase" value={form.purchaseDate || new Date().toISOString()} onChange={(iso) => setForm((f: any) => ({ ...f, purchaseDate: iso }))} label="تاریخ خرید" />
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
                                        <input type="number" value={String(form.tokenAmount ?? '')} onChange={e => setForm((f: any) => ({ ...f, tokenAmount: Number((e.target as HTMLInputElement).value) }))} className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">قیمت دلاری مرجع</label>
                                        <input type="number" value={String(form.priceUsd ?? '')} onChange={e => setForm((f: any) => ({ ...f, priceUsd: Number((e.target as HTMLInputElement).value) }))} className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">نرخ دلار (تومان)</label>
                                        <input type="number" value={String(form.usdRateToman ?? '')} onChange={e => setForm((f: any) => ({ ...f, usdRateToman: Number((e.target as HTMLInputElement).value) }))} className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">قیمت هر گرم طلا امروز (تومان)</label>
                                        <input type="number" value={String(form.pricePerGramToday ?? '')} onChange={e => setForm((f: any) => ({ ...f, pricePerGramToday: Number((e.target as HTMLInputElement).value) }))} className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">مجموع پرداختی (تومان)</label>
                                        <input type="number" value={String(form.totalPaidToman ?? 0)} onChange={e => setForm((f: any) => ({ ...f, totalPaidToman: Number((e.target as HTMLInputElement).value) }))} className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">کارمزد (تومان)</label>
                                        <input type="number" value={String(form.feeToman ?? 0)} onChange={e => setForm((f: any) => ({ ...f, feeToman: Number((e.target as HTMLInputElement).value) }))} className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3" />
                                        <div className="text-[11px] text-slate-400 mt-1">محاسبه پیشنهادی: کارمزد = مجموع پرداختی − (قیمت مرجع × مقدار × نرخ دلار)</div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">محل نگهداری</label>
                                        <select value={form.custodyLocation || 'nobitex'} onChange={e => setForm((f: any) => ({ ...f, custodyLocation: (e.target as HTMLSelectElement).value }))} className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3">
                                            <option value="nobitex">نوبیتکس</option>
                                            <option value="bitpin">بیت پین</option>
                                        </select>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-slate-300 mb-1">فاکتور/رسید</label>
                                        <div className="flex items-center gap-3">
                                            <button className="px-3 py-2 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm" onClick={() => document.getElementById('gold-token-invoice')?.click()}>انتخاب تصویر</button>
                                            {form.invoiceRef && <button className="px-3 py-2 rounded-md bg-slate-700 hover:bg-slate-600 text-rose-300 text-sm" onClick={() => setForm((f:any)=> ({...f, invoiceRef: undefined, invoicePreview: undefined}))}>حذف تصویر</button>}
                                            {form.invoicePreview && <img src={form.invoicePreview} className="h-16 rounded ring-1 ring-slate-700" />}
                                        </div>
                                        <input id="gold-token-invoice" type="file" accept="image/*" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = async () => { const ref = await saveImageDataURL(String(reader.result || '')); const url = await getObjectURLByRef(ref); setForm((f: any) => ({ ...f, invoiceRef: ref, invoicePreview: url })); }; reader.readAsDataURL(file); }} className="hidden" />
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
        </div>
    );
}

export default OwnerGoldDashboard;


