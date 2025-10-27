import React, { useEffect, useMemo, useState } from 'react';
import moment from 'jalali-moment';
import JalaliDatePicker from './components/JalaliDatePicker';
import { useAssetsStore } from './store';
import { GoldAsset, GoldSubtype } from './types';
import { BackIcon, PlusIcon, EditIcon, DeleteIcon, EyeIcon, AssetsIcon, WalletIcon } from '../../components/Icons';
import { saveImageDataURL, getObjectURLByRef, isImageRef } from '../../lib/idb-images';

const LinkFromRef = ({ refId, label }: { refId?: string; label: string }) => {
    const [url, setUrl] = useState<string | null>(null);
    useEffect(() => {
        let active = true;
        (async () => {
            if (!refId || !isImageRef(refId)) { setUrl(null); return; }
            const u = await getObjectURLByRef(refId);
            if (!active) return;
            setUrl(u);
        })();
        return () => { active = false; };
    }, [refId]);
    if (!url) return null;
    return <a className="inline-flex items-center gap-1 text-sky-400 text-xs" href={url} target="_blank" rel="noreferrer"><EyeIcon/> {label}</a>;
};

export function OwnerGoldDashboard({ ownerId, onBack }: { ownerId: string; onBack: () => void; }): React.ReactNode {
    const { gold, loadGoldByOwner, saveGold } = useAssetsStore();
    const [isModalOpen, setModalOpen] = useState(false);
    const [subtype, setSubtype] = useState<GoldSubtype>('physical');
    const [form, setForm] = useState<any>({});
    const [preview1, setPreview1] = useState<string | null>(null);
    const [preview2, setPreview2] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [view, setView] = useState<'overview' | GoldSubtype>('overview');

    useEffect(() => { (async () => { await loadGoldByOwner(ownerId); })(); }, [ownerId]);

    const j = (iso: string) => moment(iso).locale('fa').format('jD jMMMM jYYYY');

    const itemsAll = gold.filter(g => g.ownerId === ownerId);
    const summarize = (arr: any[]) => {
        const count = arr.length;
        const totalPaid = arr.reduce((s, a) => s + (a.totalPaidToman || 0), 0);
        const last = arr.length ? arr.map(a => a.purchaseDate).sort((a,b) => new Date(b).getTime() - new Date(a).getTime())[0] : undefined;
        const invoices = arr.reduce((s, a) => s + (a.subtype === 'physical' ? ((a.invoiceRef1 ? 1 : 0) + (a.invoiceRef2 ? 1 : 0)) : (a.invoiceRef ? 1 : 0)), 0);
        return { count, totalPaid, last };
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
            const payload: GoldAsset = autoCompute({ ...form, id });
            await saveGold(payload);
            setModalOpen(false);
        } catch (e: any) {
            setError(e?.message || 'خطا در ذخیره');
        }
    };

    const items = itemsAll; // alias for below rendering

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
                        {(() => { const s = summarize(phys); return (
                            <button onClick={() => setView('physical')} className="text-right bg-slate-800/50 rounded-xl p-5 ring-1 ring-slate-700 hover:ring-sky-400 transition">
                                <div className="bg-slate-700/50 p-3 rounded-full inline-block mb-3"><AssetsIcon/></div>
                                <div className="text-xl font-bold text-slate-100">طلای فیزیکی</div>
                                <div className="text-slate-400 text-sm mt-1">{s.count} رکورد • مجموع {s.totalPaid.toLocaleString('fa-IR')} تومان</div>
                                <div className="text-slate-500 text-xs mt-1">آخرین خرید: {s.last ? j(s.last) : '—'}</div>
                            </button>
                        ); })()}
                        {(() => { const s = summarize(tok); return (
                            <button onClick={() => setView('token')} className="text-right bg-slate-800/50 rounded-xl p-5 ring-1 ring-slate-700 hover:ring-emerald-400 transition">
                                <div className="bg-slate-700/50 p-3 rounded-full inline-block mb-3"><WalletIcon/></div>
                                <div className="text-xl font-bold text-slate-100">توکن طلا</div>
                                <div className="text-slate-400 text-sm mt-1">{s.count} رکورد • مجموع {s.totalPaid.toLocaleString('fa-IR')} تومان</div>
                                <div className="text-slate-500 text-xs mt-1">آخرین خرید: {s.last ? j(s.last) : '—'}</div>
                            </button>
                        ); })()}
                        {(() => { const s = summarize(dgi); return (
                            <button onClick={() => setView('digikala')} className="text-right bg-slate-800/50 rounded-xl p-5 ring-1 ring-slate-700 hover:ring-amber-400 transition">
                                <div className="bg-slate-700/50 p-3 rounded-full inline-block mb-3"><AssetsIcon/></div>
                                <div className="text-xl font-bold text-slate-100">طلای دیجی‌کالا</div>
                                <div className="text-slate-400 text-sm mt-1">{s.count} رکورد • مجموع {s.totalPaid.toLocaleString('fa-IR')} تومان</div>
                                <div className="text-slate-500 text-xs mt-1">آخرین خرید: {s.last ? j(s.last) : '—'}</div>
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
                    {/* filtered list */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {itemsAll.filter(it => it.subtype === view).map(it => (
                    <div key={it.id} className="bg-slate-800/50 rounded-xl p-4 ring-1 ring-slate-700 space-y-3">
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="text-slate-100 font-bold">{it.subtype === 'physical' ? 'طلای فیزیکی' : it.subtype === 'token' ? 'توکن طلا' : 'طلای دیجی‌کالا'}</div>
                                <div className="text-xs text-slate-400">تاریخ خرید: {j(it.purchaseDate)}</div>
                            </div>
                            <div className="flex items-center gap-2 text-slate-400">
                                <button className="hover:text-sky-400" title="ویرایش"><EditIcon/></button>
                                <button className="hover:text-rose-400" title="حذف"><DeleteIcon/></button>
                            </div>
                        </div>
                        {it.subtype === 'physical' && (
                            <div className="text-sm text-slate-300 space-y-1">
                                <div>مقدار: {(it as any).grams || 0} گرم{(it as any).soot ? ` و ${(it as any).soot} سوت` : ''}</div>
                                <div>قیمت هر گرم: {((it as any).pricePerGram || 0).toLocaleString('fa-IR')} تومان</div>
                                <div>اجرت: {((it as any).wageToman || 0).toLocaleString('fa-IR')} تومان</div>
                                <LinkFromRef refId={(it as any).invoiceRef1} label="فاکتور 1" />
                            </div>
                        )}
                        {it.subtype === 'token' && (
                            <div className="text-sm text-slate-300 space-y-1">
                                <div>نماد: {(it as any).tokenSymbol?.toUpperCase()}</div>
                                <div>مقدار: {(it as any).tokenAmount}</div>
                                <div>قیمت خرید: {(it as any).priceUsd} دلار / {(it as any).priceToman?.toLocaleString('fa-IR')} تومان</div>
                                <div>کارمزد: {((it as any).feeToman || 0).toLocaleString('fa-IR')} تومان</div>
                                <div>محل نگهداری: {(it as any).custodyLocation || '—'}</div>
                                        <LinkFromRef refId={(it as any).invoiceRef} label="رسید" />
                            </div>
                        )}
                        {it.subtype === 'digikala' && (
                            <div className="text-sm text-slate-300 space-y-1">
                                <div>مقدار: {(it as any).amountMg} میلی‌گرم</div>
                                <div>قیمت هر میلی‌گرم: {(it as any).pricePerMg?.toLocaleString('fa-IR')} تومان</div>
                                <div>کارمزد: {((it as any).feeManualToman || 0).toLocaleString('fa-IR')} تومان ({(it as any).feePercent ?? '—'}%)</div>
                                        <LinkFromRef refId={(it as any).invoiceRef} label="رسید" />
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
                                            {preview1 && <img src={preview1} alt="invoice1" className="h-16 rounded ring-1 ring-slate-700" />}
                                        </div>
                                        <input id="gold-invoice-1" type="file" accept="image/*" onChange={e => handleChooseImage(1, e)} className="hidden" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-slate-300">فاکتور 2</label>
                                        <div className="flex items-center gap-3">
                                            <button className="px-3 py-2 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm" onClick={() => document.getElementById('gold-invoice-2')?.click()}>انتخاب تصویر</button>
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
                                        <label className="block text-sm font-medium text-slate-300 mb-1">قیمت دلاری خرید</label>
                                        <input type="number" value={String(form.priceUsd ?? '')} onChange={e => setForm((f: any) => ({ ...f, priceUsd: Number((e.target as HTMLInputElement).value) }))} className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">قیمت تومانی خرید</label>
                                        <input type="number" value={String(form.priceToman ?? '')} onChange={e => setForm((f: any) => ({ ...f, priceToman: Number((e.target as HTMLInputElement).value) }))} className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">مجموع پرداختی (تومان)</label>
                                        <input type="number" value={String(form.totalPaidToman ?? 0)} onChange={e => setForm((f: any) => ({ ...f, totalPaidToman: Number((e.target as HTMLInputElement).value) }))} className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">محل نگهداری</label>
                                        <input value={form.custodyLocation || ''} onChange={e => setForm((f: any) => ({ ...f, custodyLocation: (e.target as HTMLInputElement).value }))} className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-slate-300 mb-1">فاکتور/رسید</label>
                                        <div className="flex items-center gap-3">
                                            <button className="px-3 py-2 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm" onClick={() => document.getElementById('gold-token-invoice')?.click()}>انتخاب تصویر</button>
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
        </div>
    );
}

export default OwnerGoldDashboard;


