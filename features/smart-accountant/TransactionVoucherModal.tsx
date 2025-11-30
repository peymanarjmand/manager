import React, { useEffect, useState } from 'react';
import { Transaction } from './types';
import moment from 'jalali-moment';
import { isImageRef, getObjectURLByRef } from '../../lib/idb-images';

// Icons - we can import these or use placeholders if they are local to SmartAccountant.
// Assuming we need to define them or pass them. 
// To be safe, I'll redefine simple SVGs here or rely on what's available.
// It seems SmartAccountant.tsx uses local components for icons. 
// I'll use simple SVG strings for now to avoid import errors, or check constants.

const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const PrintIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
    </svg>
);

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fa-IR').format(amount) + ' تومان';
};

const formatDate = (dateStr: string) => {
    try {
        return moment(dateStr).locale('fa').format('dddd jD jMMMM jYYYY - HH:mm');
    } catch (e) {
        return dateStr;
    }
};

const VoucherImage = ({ srcOrRef }: { srcOrRef: string }) => {
    const [url, setUrl] = useState<string | null>(null);
    
    useEffect(() => {
        let active = true;
        if (isImageRef(srcOrRef)) {
             getObjectURLByRef(srcOrRef).then(u => {
                 if(active && u) setUrl(u);
             });
        } else {
            setUrl(srcOrRef);
        }
        return () => { active = false; };
    }, [srcOrRef]);

    if (!url) return null;

    return (
         <img 
            src={url} 
            alt="Receipt" 
            className="w-full h-auto object-cover max-h-64 bg-slate-950"
        />
    );
};

interface TransactionVoucherModalProps {
    transaction: Transaction | null;
    onClose: () => void;
}

export const TransactionVoucherModal: React.FC<TransactionVoucherModalProps> = ({ transaction, onClose }) => {
    if (!transaction) return null;

    const isIncome = transaction.type === 'income';
    const colorClass = isIncome ? 'text-emerald-400' : 'text-rose-400';
    const bgClass = isIncome ? 'bg-emerald-500/10' : 'bg-rose-500/10';
    const borderClass = isIncome ? 'border-emerald-500/20' : 'border-rose-500/20';

    // Accounting Logic
    const debitAccount = isIncome ? 'صندوق / بانک' : transaction.category;
    const creditAccount = isIncome ? transaction.category : 'صندوق / بانک';

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true">
            <div 
                className="bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl ring-1 ring-slate-700 overflow-hidden flex flex-col max-h-[90vh]" 
                onClick={e => e.stopPropagation()}
            >
                {/* Header - Paper-like top */}
                <div className="relative bg-slate-800 p-6 border-b border-dashed border-slate-700">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-slate-700 rounded-b-lg"></div>
                    
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-lg font-bold text-slate-100">سند حسابداری</h3>
                            <p className="text-xs text-slate-400 mt-1 font-mono opacity-70">ID: {transaction.id.slice(-8).toUpperCase()}</p>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-white transition p-1 hover:bg-slate-700 rounded-full">
                            <CloseIcon />
                        </button>
                    </div>

                    <div className="text-center mt-2">
                         <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold mb-2 ${bgClass} ${colorClass} border ${borderClass}`}>
                            {isIncome ? 'سند دریافت (درآمد)' : 'سند پرداخت (هزینه)'}
                        </span>
                        <h2 className={`text-3xl font-bold ${colorClass} tracking-tight`}>
                            {formatCurrency(transaction.amount)}
                        </h2>
                    </div>
                </div>

                {/* Body - Content */}
                <div className="p-6 space-y-6 overflow-y-auto bg-slate-900">
                    
                    {/* Date */}
                    <div className="flex justify-between items-center py-3 border-b border-slate-800">
                        <span className="text-slate-500 text-sm">تاریخ و زمان</span>
                        <span className="text-slate-200 font-medium text-sm">{formatDate(transaction.date)}</span>
                    </div>

                    {/* Description */}
                    <div className="py-2">
                        <span className="text-slate-500 text-sm block mb-2">شرح سند</span>
                        <p className="text-slate-200 text-base leading-relaxed bg-slate-800/50 p-3 rounded-lg border border-slate-800">
                            {transaction.description || 'بدون توضیحات'}
                        </p>
                    </div>

                    {/* Accounting Flow Visualization */}
                    <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-800">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 text-center">تراکنش مالی</h4>
                        
                        <div className="space-y-4 relative">
                            {/* Connecting Line */}
                            <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-slate-700"></div>

                            {/* Debit (Bedekar) */}
                            <div className="relative flex items-center">
                                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center z-10 ring-4 ring-slate-900">
                                    <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                                </div>
                                <div className="mr-4 flex-1">
                                    <span className="text-xs text-emerald-400 block mb-0.5">بدهکار</span>
                                    <span className="text-slate-200 font-bold">{debitAccount}</span>
                                </div>
                            </div>

                            {/* Credit (Bestankar) */}
                            <div className="relative flex items-center">
                                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center z-10 ring-4 ring-slate-900">
                                    <div className="w-2 h-2 bg-rose-400 rounded-full"></div>
                                </div>
                                <div className="mr-4 flex-1">
                                    <span className="text-xs text-rose-400 block mb-0.5">بستانکار</span>
                                    <span className="text-slate-200 font-bold">{creditAccount}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Receipt Image */}
                    {transaction.receiptImage && (
                        <div>
                            <span className="text-slate-500 text-sm block mb-2">تصویر ضمیمه</span>
                            <div className="rounded-xl overflow-hidden border border-slate-700">
                                <VoucherImage srcOrRef={transaction.receiptImage} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-800 bg-slate-800/50 flex justify-between items-center">
                    <button className="text-slate-400 text-xs flex items-center gap-1 hover:text-slate-200 transition" onClick={() => window.print()}>
                        <PrintIcon />
                        چاپ سند
                    </button>
                    <button 
                        onClick={onClose}
                        className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-lg text-sm font-medium transition shadow-lg"
                    >
                        بستن
                    </button>
                </div>
            </div>
        </div>
    );
};

