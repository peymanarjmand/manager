import React, { useEffect, useState } from 'react';
import { BackIcon, WalletIcon, AssetsIcon, ExchangeIcon, BankIcon } from '../../components/Icons';
import { useAssetsStore } from './store';
import OwnerGoldDashboard from './OwnerGoldDashboard';

type Section = 'home' | 'cash' | 'gold' | 'dollar' | 'silver';

export default function OwnerAssetsDashboard({ ownerId, onBack }: { ownerId: string; onBack: () => void; }): React.ReactNode {
    const { owners, gold, loadGoldByOwner } = useAssetsStore();
    const { loadOwners } = useAssetsStore.getState();
    const [section, setSection] = useState<Section>('home');

    useEffect(() => { (async () => { if (!owners?.length) await loadOwners(); await loadGoldByOwner(ownerId); })(); }, [ownerId]);
    const ownerName = owners.find(o => o.id === ownerId)?.name || '—';
    const totalGoldGrams = (gold || []).filter(g => g.ownerId === ownerId).reduce((sum: number, a: any) => {
        if (a.subtype === 'physical') return sum + (Number(a.grams) || 0);
        if (a.subtype === 'token') return sum + (Number(a.gramsDerived) || 0);
        if (a.subtype === 'digikala') return sum + ((Number(a.amountMg) || 0) / 1000); // mg -> gram
        return sum;
    }, 0);

    if (section === 'gold') {
        return (
            <OwnerGoldDashboard ownerId={ownerId} onBack={() => setSection('home')} />
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <button onClick={onBack} className="text-slate-300 hover:text-white" title="بازگشت"><BackIcon/></button>
                <div className="text-2xl font-extrabold">داشبورد دارایی — {ownerName}</div>
                <div />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <button onClick={() => setSection('cash')} className="group bg-slate-800/50 rounded-xl p-6 text-right ring-1 ring-slate-700 hover:ring-sky-400 transition">
                    <div className="bg-slate-700/50 p-3 rounded-full inline-block mb-3"><WalletIcon/></div>
                    <div className="text-xl font-bold text-slate-100">وجه نقد</div>
                    <div className="text-slate-400 text-sm mt-1">ثبت و مدیریت حساب‌های بانکی</div>
                </button>
                <button onClick={() => setSection('gold')} className="group bg-slate-800/50 rounded-xl p-6 text-right ring-1 ring-slate-700 hover:ring-sky-400 transition">
                    <div className="bg-slate-700/50 p-3 rounded-full inline-block mb-3"><AssetsIcon/></div>
                    <div className="text-xl font-bold text-slate-100">طلا</div>
                    <div className="text-slate-400 text-sm mt-1">فیزیکی، توکن طلا، طلای دیجی‌کالا</div>
                    <div className="text-slate-300 text-xs mt-2">گرم کل: <span className="font-bold">{totalGoldGrams.toFixed(4)}</span></div>
                </button>
                <button onClick={() => setSection('dollar')} className="group bg-slate-800/50 rounded-xl p-6 text-right ring-1 ring-slate-700 hover:ring-sky-400 transition">
                    <div className="bg-slate-700/50 p-3 rounded-full inline-block mb-3"><ExchangeIcon/></div>
                    <div className="text-xl font-bold text-slate-100">دلار</div>
                    <div className="text-slate-400 text-sm mt-1">تتر و دلار فیزیکی</div>
                </button>
                <button onClick={() => setSection('silver')} className="group bg-slate-800/50 rounded-xl p-6 text-right ring-1 ring-slate-700 hover:ring-sky-400 transition">
                    <div className="bg-slate-700/50 p-3 rounded-full inline-block mb-3"><BankIcon/></div>
                    <div className="text-xl font-bold text-slate-100">نقره</div>
                    <div className="text-slate-400 text-sm mt-1">ثبت و مدیریت نقره</div>
                </button>
            </div>

            {(section === 'cash' || section === 'dollar' || section === 'silver') && (
                <div className="text-center text-slate-400 py-20 bg-slate-800/20 rounded-xl">
                    این بخش به‌زودی تکمیل می‌شود. فعلاً فقط «طلا» فعال است.
                </div>
            )}
        </div>
    );
}


