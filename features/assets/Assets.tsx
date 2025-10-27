import React, { useEffect, useMemo, useState } from 'react';
import moment from 'jalali-moment';
import { useAccountantStore } from '../smart-accountant/store';
import { Asset } from '../smart-accountant/types';
import { useAssetsStore } from './store';
import { AssetsIcon, EditIcon, DeleteIcon, PlusIcon, BackIcon, UserCircleIcon } from '../../components/Icons';

type AssetsModuleProps = { onNavigateBack: () => void };

const formatCurrency = (amount: number) => `${(amount || 0).toLocaleString('fa-IR')} تومان`;

const JalaliDate = ({ iso }: { iso: string }) => (
    <>{moment(iso).locale('fa').format('jD jMMMM jYYYY')}</>
);

export const Assets: React.FC<AssetsModuleProps> = ({ onNavigateBack }) => {
    const { assets } = useAccountantStore();
    const { saveAsset, deleteAsset, loadAssets } = useAccountantStore.getState();
    const { owners } = useAssetsStore();
    const { loadOwners, saveOwner } = useAssetsStore.getState();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editing, setEditing] = useState<Partial<Asset> | null>(null);
    const [isOwnerModalOpen, setIsOwnerModalOpen] = useState(false);
    const [ownerName, setOwnerName] = useState('');
    const [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try { await loadOwners(); } catch {}
            try { await loadAssets(); } catch {}
        })();
    }, []);

    const totals = useMemo(() => {
        const totalValue = (assets || []).reduce((s, a) => s + (a.currentValue || 0) * (a.quantity || 0), 0);
        return { totalValue, count: assets?.length || 0 };
    }, [assets]);

    const openNew = () => { setEditing({ id: undefined, name: '', currentValue: 0, quantity: 1, purchaseDate: new Date().toISOString(), notes: '' } as any); setIsModalOpen(true); };
    const openEdit = (a: Asset) => { setEditing(a); setIsModalOpen(true); };

    const onSave = () => {
        if (!editing) return;
        const id = (editing.id as string) || Date.now().toString();
        const payload: Asset = {
            id,
            name: String(editing.name || ''),
            currentValue: Number(editing.currentValue) || 0,
            quantity: Number(editing.quantity) || 0,
            purchaseDate: String(editing.purchaseDate || new Date().toISOString()),
            notes: editing.notes || undefined,
        };
        saveAsset(payload);
        setIsModalOpen(false);
        setEditing(null);
    };

    const onDelete = (id: string) => {
        if (!window.confirm('آیا از حذف این دارایی مطمئن هستید؟')) return;
        deleteAsset(id);
    };

    return (
        <div className="container mx-auto px-4 py-6">
            <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={onNavigateBack} aria-label="بازگشت" className="text-slate-300 hover:text-white" title="بازگشت">
                        <BackIcon />
                    </button>
                    <h2 className="text-2xl font-extrabold text-white flex items-center gap-2">
                        <AssetsIcon /> دارایی‌ها
                    </h2>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setIsOwnerModalOpen(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold">
                        <PlusIcon /> افزودن مالک
                    </button>
                    <button onClick={openNew} className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-sky-600 hover:bg-sky-500 text-white text-sm font-bold">
                        <PlusIcon /> افزودن دارایی
                    </button>
                </div>
            </div>

            {/* Owners section */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold text-slate-200">مالکین</h3>
                </div>
                {(owners?.length || 0) === 0 ? (
                    <p className="text-slate-500 text-center py-10 bg-slate-800/20 rounded-lg">هنوز مالکی ثبت نشده است.</p>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {owners.map(p => (
                            <button key={p.id} onClick={() => setSelectedOwnerId(p.id)} className={`text-right rounded-xl ring-1 ring-slate-700 bg-slate-800/50 hover:bg-slate-800 p-3 transition flex items-center gap-3 ${selectedOwnerId === p.id ? 'outline outline-1 outline-sky-500' : ''}`}>
                                <span className="h-9 w-9 rounded-full overflow-hidden bg-slate-700 flex items-center justify-center">
                                    <UserCircleIcon />
                                </span>
                                <div className="truncate">
                                    <div className="text-slate-100 font-semibold truncate">{p.name}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-slate-800/50 rounded-xl p-4 ring-1 ring-slate-700">
                    <div className="text-slate-300 text-sm">مجموع ارزش کنونی</div>
                    <div className="text-2xl font-extrabold text-emerald-400">{formatCurrency(totals.totalValue)}</div>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4 ring-1 ring-slate-700">
                    <div className="text-slate-300 text-sm">تعداد دارایی‌ها</div>
                    <div className="text-2xl font-extrabold text-sky-400">{totals.count}</div>
                </div>
            </div>

            {((assets?.filter(a => !selectedOwnerId || a.ownerId === selectedOwnerId) || []).length === 0) ? (
                <p className="text-slate-500 text-center py-16 bg-slate-800/20 rounded-lg">هنوز دارایی ثبت نشده است.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {assets.filter(a => !selectedOwnerId || a.ownerId === selectedOwnerId).map(asset => (
                        <div key={asset.id} className="bg-slate-800/50 rounded-xl p-4 ring-1 ring-slate-700 flex flex-col space-y-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-bold text-slate-100 text-lg">{asset.name}</h4>
                                    <p className="text-sm text-slate-400">مقدار: {asset.quantity}</p>
                                </div>
                                <div className="flex items-center space-x-1 space-x-reverse text-slate-400">
                                    <button onClick={() => openEdit(asset)} className="p-1.5 hover:bg-slate-700 rounded-full hover:text-sky-400 transition" aria-label="ویرایش"><EditIcon/></button>
                                    <button onClick={() => onDelete(asset.id)} className="p-1.5 hover:bg-slate-700 rounded-full hover:text-rose-400 transition" aria-label="حذف"><DeleteIcon/></button>
                                </div>
                            </div>
                            <p className="text-2xl font-bold text-sky-400">{formatCurrency(asset.currentValue * asset.quantity)}</p>
                            <p className="text-xs text-slate-500 pt-2 border-t border-slate-700/50">تاریخ خرید: <JalaliDate iso={asset.purchaseDate} /></p>
                            <div className="text-xs text-slate-400">{asset.ownerId ? (owners.find(p => p.id === asset.ownerId)?.name || '—') : '— بدون مالک —'}</div>
                            {asset.notes && <p className="text-sm text-slate-300">{asset.notes}</p>}
                        </div>
                    ))}
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" onClick={() => setIsModalOpen(false)}>
                    <div className="absolute inset-0 bg-black/70" />
                    <div className="relative w-full max-w-md bg-slate-800 rounded-2xl ring-1 ring-slate-700 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
                            <h3 className="text-slate-100 font-bold text-lg">{editing?.id ? 'ویرایش دارایی' : 'افزودن دارایی'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">×</button>
                        </div>
                        <div className="p-5 space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">مالک</label>
                                <select value={editing?.ownerId || selectedOwnerId || ''} onChange={e => { const v = (e.target as HTMLSelectElement).value || undefined; setEditing({ ...(editing || {}), ownerId: v }); setSelectedOwnerId(v || null); }} className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3 focus:ring-2 focus:ring-sky-400 focus:outline-none transition">
                                    <option value="">— بدون مالک —</option>
                                    {owners.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">نام</label>
                                <input value={String(editing?.name || '')} onChange={e => setEditing({ ...(editing || {}), name: (e.target as HTMLInputElement).value })} className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3 focus:ring-2 focus:ring-sky-400 focus:outline-none transition" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">ارزش کنونی</label>
                                    <input type="number" value={String(editing?.currentValue ?? 0)} onChange={e => setEditing({ ...(editing || {}), currentValue: Number((e.target as HTMLInputElement).value) })} className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3 focus:ring-2 focus:ring-sky-400 focus:outline-none transition" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">تعداد/مقدار</label>
                                    <input type="number" value={String(editing?.quantity ?? 1)} onChange={e => setEditing({ ...(editing || {}), quantity: Number((e.target as HTMLInputElement).value) })} className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3 focus:ring-2 focus:ring-sky-400 focus:outline-none transition" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">تاریخ خرید (میلادی/ISO)</label>
                                <input type="date" value={moment(editing?.purchaseDate || new Date().toISOString()).format('YYYY-MM-DD')} onChange={e => setEditing({ ...(editing || {}), purchaseDate: moment((e.target as HTMLInputElement).value, 'YYYY-MM-DD').toISOString() })} className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3 focus:ring-2 focus:ring-sky-400 focus:outline-none transition" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">توضیحات</label>
                                <textarea value={String(editing?.notes || '')} onChange={e => setEditing({ ...(editing || {}), notes: (e.target as HTMLTextAreaElement).value })} rows={3} className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3 focus:ring-2 focus:ring-sky-400 focus:outline-none transition" />
                            </div>
                        </div>
                        <div className="px-5 py-4 bg-slate-800/60 border-t border-slate-700 flex items-center justify-end gap-2">
                            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-md border border-slate-600 text-slate-300 hover:bg-slate-700 text-sm">لغو</button>
                            <button onClick={onSave} className="px-4 py-2 rounded-md bg-sky-600 hover:bg-sky-500 text-white text-sm font-bold">ذخیره</button>
                        </div>
                    </div>
                </div>
            )}

            {isOwnerModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" onClick={() => setIsOwnerModalOpen(false)}>
                    <div className="absolute inset-0 bg-black/70" />
                    <div className="relative w-full max-w-md bg-slate-800 rounded-2xl ring-1 ring-slate-700 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
                            <h3 className="text-slate-100 font-bold text-lg">افزودن مالک</h3>
                            <button onClick={() => setIsOwnerModalOpen(false)} className="text-slate-400 hover:text-white">×</button>
                        </div>
                        <div className="p-5 space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">نام</label>
                                <input value={ownerName} onChange={e => setOwnerName((e.target as HTMLInputElement).value)} className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3 focus:ring-2 focus:ring-sky-400 focus:outline-none transition" />
                            </div>
                        </div>
                        <div className="px-5 py-4 bg-slate-800/60 border-t border-slate-700 flex items-center justify-end gap-2">
                            <button onClick={() => setIsOwnerModalOpen(false)} className="px-4 py-2 rounded-md border border-slate-600 text-slate-300 hover:bg-slate-700 text-sm">لغو</button>
                            <button onClick={async () => { const id = Date.now().toString(); await saveOwner({ id, name: (ownerName || '').trim() }); setIsOwnerModalOpen(false); setOwnerName(''); }} className="px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold" disabled={!ownerName.trim()}>ذخیره</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Assets;


