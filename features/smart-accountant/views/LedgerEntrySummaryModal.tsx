import React from 'react';
import moment from 'jalali-moment';
import { LedgerEntry, Person } from '../types';
import { CloseIcon } from '../../../components/Icons';
import { formatLedgerAmount, getLedgerUnitConfig, ImageFromRef } from '../SmartAccountantShared';

export const LedgerEntrySummaryModal = ({ entry, person, onClose }: { entry: LedgerEntry | null; person: Person | null; onClose: () => void }) => {
    if (!entry) return null;
    const isDebt = entry.type === 'debt';
    const typeLabel = isDebt ? 'بهش دادم' : 'ازش گرفتم';
    const statusLabel = entry.isSettled ? 'تسویه شده' : 'تسویه نشده';
    const colorClass = isDebt ? 'text-emerald-400' : 'text-rose-400';
    const bgClass = isDebt ? 'bg-emerald-500/10' : 'bg-rose-500/10';
    const borderClass = isDebt ? 'border-emerald-500/20' : 'border-rose-500/20';
    const unitCfg = getLedgerUnitConfig((entry as any).unit || 'toman');
    const dateLabel = moment(entry.date).locale('fa').format('dddd jD jMMMM jYYYY - HH:mm');

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true">
            <div className="bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl ring-1 ring-slate-700 overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="bg-slate-800 p-6 border-b border-slate-700">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-lg font-bold text-slate-100">خلاصه تراکنش</h3>
                            <p className="text-xs text-slate-400 mt-1">{person?.name || 'نامشخص'}</p>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-white transition p-1 hover:bg-slate-700 rounded-full">
                            <CloseIcon />
                        </button>
                    </div>
                    <div className="text-center mt-2">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold mb-2 ${bgClass} ${colorClass} border ${borderClass}`}>{typeLabel}</span>
                        <h2 className={`text-3xl font-bold ${colorClass} tracking-tight`}>{formatLedgerAmount(entry)}</h2>
                    </div>
                </div>
                <div className="p-6 space-y-4 overflow-y-auto">
                    <div className="flex justify-between items-center py-2 border-b border-slate-800">
                        <span className="text-slate-500 text-sm">تاریخ</span>
                        <span className="text-slate-200 text-sm">{dateLabel}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-800">
                        <span className="text-slate-500 text-sm">وضعیت</span>
                        <span className={`text-sm font-medium ${entry.isSettled ? 'text-emerald-400' : 'text-amber-400'}`}>{statusLabel}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-800">
                        <span className="text-slate-500 text-sm">واحد</span>
                        <span className="text-slate-200 text-sm">{unitCfg.label}</span>
                    </div>
                    <div className="py-2">
                        <span className="text-slate-500 text-sm block mb-2">بابت</span>
                        <p className="text-slate-200 text-base leading-relaxed bg-slate-800/50 p-3 rounded-lg border border-slate-800">{entry.description || 'بدون توضیحات'}</p>
                    </div>
                    {entry.receiptImage && (
                        <div>
                            <span className="text-slate-500 text-sm block mb-2">رسید</span>
                            <div className="rounded-xl overflow-hidden border border-slate-700">
                                <ImageFromRef srcOrRef={entry.receiptImage} className="w-full h-auto object-cover max-h-64 bg-slate-950" />
                            </div>
                        </div>
                    )}
                </div>
                <div className="p-4 border-t border-slate-800 bg-slate-800/50 text-left">
                    <button onClick={onClose} className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-lg text-sm font-medium transition shadow-lg">
                        بستن
                    </button>
                </div>
            </div>
        </div>
    );
};
