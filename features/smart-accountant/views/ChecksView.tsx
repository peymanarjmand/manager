import React, { useEffect, useMemo, useState } from 'react';
import { CheckStatus } from '../types';
import { ChecksIcon, EditIcon, DeleteIcon } from '../../../components/Icons';
import { formatCurrency, formatDate } from '../SmartAccountantShared';

export const ChecksView = ({ checks, onEdit, onDelete, onStatusChange }: { checks: any[]; onEdit: (c: any) => void; onDelete: (id: string) => void; onStatusChange: (id: string, status: CheckStatus) => void }) => {
    const [viewType, setViewType] = useState<'issued' | 'received'>('issued');

    const sortedChecks = useMemo(() => {
        return [...checks].sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    }, [checks]);

    const issuedChecks = sortedChecks.filter(c => c.type === 'issued');
    const receivedChecks = sortedChecks.filter(c => c.type === 'received');
    const checksToDisplay = viewType === 'issued' ? issuedChecks : receivedChecks;
    
    return (
        <div className="space-y-6">
            <div className="flex justify-center mb-6 border-b border-slate-700">
                <button 
                    onClick={() => setViewType('issued')} 
                    className={`py-3 px-6 font-medium text-sm transition-colors focus:outline-none ${viewType === 'issued' ? 'border-b-2 border-sky-400 text-sky-400' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    چک‌های صادره
                </button>
                 <button 
                    onClick={() => setViewType('received')} 
                    className={`py-3 px-6 font-medium text-sm transition-colors focus:outline-none ${viewType === 'received' ? 'border-b-2 border-sky-400 text-sky-400' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    چک‌های دریافتی
                </button>
            </div>

            {checksToDisplay.length > 0 ? (
                <div className="space-y-4">
                    {checksToDisplay.map(check => (
                        <CheckCard key={check.id} check={check} onEdit={onEdit} onDelete={onDelete} onStatusChange={onStatusChange} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 px-6 bg-slate-800/40 rounded-xl ring-1 ring-slate-700">
                    <div className="text-5xl text-slate-600 mb-4"><ChecksIcon /></div>
                    <h3 className="text-xl font-semibold text-slate-200">
                        {viewType === 'issued' ? 'هنوز چک صادره‌ای ثبت نشده' : 'هنوز چک دریافتی ثبت نشده'}
                    </h3>
                    <p className="text-slate-400 mt-2">برای شروع، روی دکمه "افزودن" کلیک کنید.</p>
                </div>
            )}
        </div>
    );
};

const CheckCard: React.FC<{ check: any; onEdit: (c: any) => void; onDelete: (id: string) => void; onStatusChange: (id: string, status: CheckStatus) => void }> = ({ check, onEdit, onDelete, onStatusChange }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = React.useRef(null);

    const statusInfo = {
        pending: { text: "در انتظار", color: "text-amber-400", bg: "bg-amber-500/10", ring: "ring-amber-500/30" },
        cashed: { text: "پاس شده", color: "text-emerald-400", bg: "bg-emerald-500/10", ring: "ring-emerald-500/30" },
        bounced: { text: "برگشت خورده", color: "text-rose-400", bg: "bg-rose-500/10", ring: "ring-rose-500/30" },
    };

    const handleStatusChange = (newStatus: CheckStatus) => {
        onStatusChange(check.id, newStatus);
        setIsMenuOpen(false);
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [menuRef]);

    return (
        <div className={`bg-slate-800/60 rounded-xl p-4 ring-1 ring-slate-700 transition-shadow hover:shadow-lg hover:shadow-slate-900/50 ${check.status !== 'pending' ? 'opacity-70' : ''}`}>
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
                <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                        <p className="font-bold text-slate-100 text-lg">{check.subject}</p>
                        <p className={`font-bold text-xl ${check.type === 'issued' ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {formatCurrency(check.amount)}
                        </p>
                    </div>
                    <p className="text-sm text-slate-400">
                        {check.type === 'issued' ? `در وجه: ${check.payeeName}` : `صادر کننده: ${check.drawerName}`}
                    </p>
                     <p className="text-sm text-slate-500 font-mono mt-1">شناسه صیادی: {check.sayyadId}</p>
                </div>
                <div className="flex sm:flex-col items-end justify-between gap-2">
                    <p className="font-semibold text-slate-300">{formatDate(check.dueDate)}</p>
                    <div className="flex items-center gap-2">
                         <div className="relative" ref={menuRef}>
                            <button onClick={() => setIsMenuOpen(prev => !prev)} className={`px-3 py-1 text-xs font-medium rounded-full ${statusInfo[check.status].bg} ${statusInfo[check.status].color} ring-1 ${statusInfo[check.status].ring}`}>
                                {statusInfo[check.status].text}
                            </button>
                            {isMenuOpen && (
                                <div className="absolute left-0 mt-2 w-32 bg-slate-700 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-20">
                                    <div className="py-1">
                                        {(Object.keys(statusInfo) as CheckStatus[]).map(s => (
                                            <a key={s} href="#" onClick={(e) => { e.preventDefault(); handleStatusChange(s); }} className="block px-4 py-2 text-sm text-slate-200 hover:bg-slate-600">
                                                {statusInfo[s].text}
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <button onClick={() => onEdit(check)} className="p-1.5 text-slate-400 hover:bg-slate-700 rounded-full hover:text-sky-400 transition" aria-label="ویرایش"><EditIcon/></button>
                        <button onClick={() => onDelete(check.id)} className="p-1.5 text-slate-400 hover:bg-slate-700 rounded-full hover:text-rose-400 transition" aria-label="حذف"><DeleteIcon/></button>
                    </div>
                </div>
            </div>
            {check.description && <p className="text-sm text-slate-400 pt-2 mt-2 border-t border-slate-700/50">{check.description}</p>}
        </div>
    );
};
