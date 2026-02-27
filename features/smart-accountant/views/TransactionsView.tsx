import React, { useMemo, useState } from 'react';
import moment from 'jalali-moment';
import { Transaction } from '../types';
import { EditIcon, DeleteIcon } from '../../../components/Icons';
import { formatCurrency, formatDate, ImageFromRef } from '../SmartAccountantShared';

export const TransactionsView = ({ transactions, onEdit, onDelete, onView }: { transactions: Transaction[]; onEdit: (t: Transaction) => void; onDelete: (id: string) => void; onView?: (t: Transaction) => void }) => {
    const [selectedDate, setSelectedDate] = useState(() => moment());
    const [filterCategory, setFilterCategory] = useState('all');

    const changeMonth = (amount: number) => {
        setSelectedDate(prev => prev.clone().add(amount, 'jMonth'));
    };

    const currentMonthLabel = useMemo(() => selectedDate.clone().locale('fa').format('jMMMM jYYYY'), [selectedDate]);

    const allCategories = useMemo(() => {
        const cats = new Set<string>(transactions.map(t => t.category));
        return Array.from(cats);
    }, [transactions]);

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const tDate = moment(t.date);
            const matchesMonth = tDate.jYear() === selectedDate.jYear() && tDate.jMonth() === selectedDate.jMonth();
            const matchesCategory = filterCategory === 'all' || t.category === filterCategory;
            return matchesMonth && matchesCategory;
        });
    }, [transactions, selectedDate, filterCategory]);

    const income = filteredTransactions.filter(t => t.type === 'income');
    const expenses = filteredTransactions.filter(t => t.type === 'expense');
    
    const ChevronRight = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" /></svg>;
    const ChevronLeft = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" /></svg>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-800/40 p-3 rounded-xl ring-1 ring-slate-700/50">
                <div className="flex items-center bg-slate-800 rounded-lg p-1 ring-1 ring-slate-700 shadow-sm">
                    <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-700 rounded-md text-slate-400 hover:text-white transition" title="ماه قبل">
                        <ChevronRight />
                    </button>
                    <span className="w-36 text-center font-bold text-slate-200 text-sm select-none">{currentMonthLabel}</span>
                    <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-700 rounded-md text-slate-400 hover:text-white transition" title="ماه بعد">
                        <ChevronLeft />
                    </button>
                </div>

                <div className="w-full sm:w-48 relative">
                    <select
                        value={filterCategory}
                        onChange={e => setFilterCategory(e.target.value)}
                        className="w-full appearance-none bg-slate-800 text-slate-300 text-sm rounded-lg border-none ring-1 ring-slate-700 focus:ring-2 focus:ring-sky-500 p-2.5 pr-8 cursor-pointer"
                    >
                        <option value="all">همه دسته‌بندی‌ها</option>
                        {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                       <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                </div>
            </div>

            <div>
                <h3 className="text-xl sm:text-2xl font-bold mb-4 text-emerald-400 flex items-center gap-2">
                    <span>درآمدها</span>
                    <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-full border border-emerald-500/20">{income.length}</span>
                </h3>
                {income.length > 0 ? (
                    <TransactionList transactions={income} onEdit={onEdit} onDelete={onDelete} onView={onView} />
                ) : <p className="text-slate-500 text-center py-8 bg-slate-800/20 rounded-lg text-sm">درآمدی برای {filterCategory !== 'all' ? 'این دسته‌بندی در' : ''} این ماه ثبت نشده است.</p>}
            </div>
             <div>
                <h3 className="text-xl sm:text-2xl font-bold mb-4 text-rose-400 flex items-center gap-2">
                    <span>هزینه‌ها</span>
                    <span className="text-xs bg-rose-500/10 text-rose-400 px-2 py-1 rounded-full border border-rose-500/20">{expenses.length}</span>
                </h3>
                {expenses.length > 0 ? (
                    <TransactionList transactions={expenses} onEdit={onEdit} onDelete={onDelete} onView={onView} />
                ) : <p className="text-slate-500 text-center py-8 bg-slate-800/20 rounded-lg text-sm">هزینه‌ای برای {filterCategory !== 'all' ? 'این دسته‌بندی در' : ''} این ماه ثبت نشده است.</p>}
            </div>
        </div>
    );
};

const TransactionList = ({ transactions, onEdit, onDelete, onView }: { transactions: Transaction[]; onEdit: (t: Transaction) => void; onDelete: (id: string) => void; onView?: (t: Transaction) => void }) => (
    <div className="space-y-3">
        {transactions.map(t => (
            <div 
                key={t.id} 
                className="bg-slate-800/50 rounded-lg p-3 sm:p-4 flex items-center justify-between ring-1 ring-slate-700/50 cursor-pointer hover:bg-slate-800 hover:ring-slate-600 transition group"
                onClick={() => onView && onView(t)}
            >
                <div className="flex items-center space-x-3 sm:space-x-4 space-x-reverse flex-1 min-w-0">
                    {t.receiptImage && (
                        <ImageFromRef srcOrRef={t.receiptImage} className="h-12 w-12 rounded-md object-cover hidden sm:block" />
                    )}
                    <div className="min-w-0">
                        <p className="font-bold text-slate-100 truncate group-hover:text-sky-300 transition-colors">{t.description}</p>
                        <p className="text-sm text-slate-400 truncate">{t.category} • {formatDate(t.date)}</p>
                    </div>
                </div>
                <div className="flex items-center space-x-2 sm:space-x-3 space-x-reverse">
                    <p className={`font-bold text-sm sm:text-base ${t.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCurrency(t.amount)}</p>
                     <div className="flex items-center space-x-1 space-x-reverse text-slate-400">
                       <button onClick={(e) => { e.stopPropagation(); onEdit(t); }} className="p-1.5 hover:bg-slate-700 rounded-full hover:text-sky-400 transition" aria-label="ویرایش"><EditIcon/></button>
                       <button onClick={(e) => { e.stopPropagation(); onDelete(t.id); }} className="p-1.5 hover:bg-slate-700 rounded-full hover:text-rose-400 transition" aria-label="حذف"><DeleteIcon/></button>
                    </div>
                </div>
            </div>
        ))}
    </div>
);
