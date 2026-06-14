import React from 'react';
import { AssetsIcon, WalletIcon } from '../../../components/Icons';
import { summarizePhysical, summarizeToken, summarizeDigi, TOKEN_TO_GRAMS_18K } from '../goldSummary';

interface Props {
    phys: any[];
    tok: any[];
    dgi: any[];
    totalPaid: number;
    onSelectView: (v: 'physical' | 'token' | 'digikala') => void;
    j: (iso: string) => string;
}

// The gold dashboard landing view: a total-paid card plus one entry-point card
// per gold subtype (physical / token / digikala). Presentational; the parent
// owns the data and the view-switching callback.
export const OwnerGoldOverview = ({ phys, tok, dgi, totalPaid, onSelectView, j }: Props) => (
    <>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            <div className="bg-white/[0.04] rounded-xl p-4 ring-1 ring-white/10">
                <div className="text-slate-300 text-sm">مجموع پرداختی</div>
                <div className="text-2xl font-extrabold text-emerald-400">{(totalPaid || 0).toLocaleString('fa-IR')} تومان</div>
            </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(() => { const s = summarizePhysical(phys); const state = s.count ? 'فعال' : 'خالی'; return (
                <button onClick={() => onSelectView('physical')} className="text-right rounded-xl p-5 ring-1 ring-sky-700/60 hover:ring-sky-400 transition bg-gradient-to-br from-sky-900/20 to-slate-800/40">
                    <div className="flex items-center justify-between mb-2">
                        <div className="bg-sky-700/40 p-3 rounded-full inline-block"><AssetsIcon/></div>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${s.count ? 'bg-emerald-600/40 text-emerald-200 ring-1 ring-emerald-500/40' : 'bg-slate-700 text-slate-300 ring-1 ring-slate-600'}`}>{state}</span>
                    </div>
                    <div className="text-xl font-bold text-slate-100">طلای فیزیکی</div>
                    <div className="text-slate-400 text-sm mt-1">{s.count} رکورد • مجموع {s.totalPaid.toLocaleString('fa-IR')} تومان</div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-300">
                        <div className="bg-white/[0.05] rounded-lg p-2 ring-1 ring-white/10">کل گرم: <span className="font-bold">{s.totalGrams}</span></div>
                        <div className="bg-white/[0.05] rounded-lg p-2 ring-1 ring-white/10">میانگین هر گرم: <span className="font-bold">{s.avgPrice.toLocaleString('fa-IR')}</span></div>
                    </div>
                    <div className="text-slate-500 text-xs mt-2">آخرین خرید: {s.last ? j(s.last) : '—'}</div>
                </button>
            ); })()}
            {(() => { const s = summarizeToken(tok); const state = s.count ? 'فعال' : 'خالی'; const xaut = tok.filter(t => (t as any).tokenSymbol==='xaut'); const paxg = tok.filter(t => (t as any).tokenSymbol==='paxg'); const sumAmt = (arr:any[]) => arr.reduce((n,a)=> n + (Number((a as any).tokenAmount)||0)*(((a as any).txType||'buy')==='buy'? 1 : -1),0); const amtXaut = sumAmt(xaut); const amtPaxg = sumAmt(paxg); const gramsXaut = amtXaut * TOKEN_TO_GRAMS_18K; const gramsPaxg = amtPaxg * TOKEN_TO_GRAMS_18K; return (
                <button onClick={() => onSelectView('token')} className="text-right rounded-xl p-5 ring-1 ring-emerald-700/60 hover:ring-emerald-400 transition bg-gradient-to-br from-emerald-900/20 to-slate-800/40">
                    <div className="flex items-center justify-between mb-2">
                        <div className="bg-emerald-700/40 p-3 rounded-full inline-block"><WalletIcon/></div>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${s.count ? 'bg-emerald-600/40 text-emerald-200 ring-1 ring-emerald-500/40' : 'bg-slate-700 text-slate-300 ring-1 ring-slate-600'}`}>{state}</span>
                    </div>
                    <div className="text-xl font-bold text-slate-100">توکن طلا</div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-300">
                        <div className="bg-white/[0.05] rounded-lg p-2 ring-1 ring-white/10">XAUT: <span className="font-bold">{amtXaut}</span> توکن • <span className="font-bold">{gramsXaut.toFixed(3)}</span> گرم</div>
                        <div className="bg-white/[0.05] rounded-lg p-2 ring-1 ring-white/10">PAXG: <span className="font-bold">{amtPaxg}</span> توکن • <span className="font-bold">{gramsPaxg.toFixed(3)}</span> گرم</div>
                        <div className="bg-white/[0.05] rounded-lg p-2 ring-1 ring-white/10 col-span-2">جمع: <span className="font-bold">{(amtXaut+amtPaxg)}</span> توکن • <span className="font-bold">{(gramsXaut+gramsPaxg).toFixed(3)}</span> گرم</div>
                    </div>
                    <div className="text-slate-500 text-xs mt-2">آخرین تراکنش: {s.last ? j(s.last) : '—'}</div>
                </button>
            ); })()}
            {(() => { const s = summarizeDigi(dgi); const state = s.count ? 'فعال' : 'خالی'; return (
                <button onClick={() => onSelectView('digikala')} className="text-right rounded-xl p-5 ring-1 ring-amber-700/60 hover:ring-amber-400 transition bg-gradient-to-br from-amber-900/20 to-slate-800/40">
                    <div className="flex items-center justify-between mb-2">
                        <div className="bg-amber-700/40 p-3 rounded-full inline-block"><AssetsIcon/></div>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${s.count ? 'bg-emerald-600/40 text-emerald-200 ring-1 ring-emerald-500/40' : 'bg-slate-700 text-slate-300 ring-1 ring-slate-600'}`}>{state}</span>
                    </div>
                    <div className="text-xl font-bold text-slate-100">طلای دیجی‌کالا</div>
                    <div className="text-slate-400 text-sm mt-1">{s.count} رکورد • مجموع {s.totalPaid.toLocaleString('fa-IR')} تومان</div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-300">
                        <div className="bg-white/[0.05] rounded-lg p-2 ring-1 ring-white/10">کل میلی‌گرم: <span className="font-bold">{s.totalMg}</span></div>
                        <div className="bg-white/[0.05] rounded-lg p-2 ring-1 ring-white/10">میانگین هر mg: <span className="font-bold">{s.avgPricePerMg.toLocaleString('fa-IR')}</span></div>
                    </div>
                    <div className="text-slate-500 text-xs mt-2">آخرین خرید: {s.last ? j(s.last) : '—'}</div>
                </button>
            ); })()}
        </div>
    </>
);

export default OwnerGoldOverview;
