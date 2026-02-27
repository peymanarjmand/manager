import React from 'react';
import { Asset } from '../types';
import { EditIcon, DeleteIcon } from '../../../components/Icons';
import { formatCurrency, formatDate } from '../SmartAccountantShared';

export const AssetsView = ({ assets, onEdit, onDelete }: { assets: Asset[]; onEdit: (a: Asset) => void; onDelete: (id: string) => void }) => {
    if (assets.length === 0) {
        return <p className="text-slate-500 text-center py-16 bg-slate-800/20 rounded-lg">هنوز دارایی ثبت نشده است.</p>
    }
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {assets.map(asset => (
                <div key={asset.id} className="bg-slate-800/50 rounded-xl p-4 ring-1 ring-slate-700 flex flex-col space-y-3">
                    <div className="flex justify-between items-start">
                        <div>
                            <h4 className="font-bold text-slate-100 text-lg">{asset.name}</h4>
                            <p className="text-sm text-slate-400">مقدار: {asset.quantity}</p>
                        </div>
                         <div className="flex items-center space-x-1 space-x-reverse text-slate-400">
                           <button onClick={() => onEdit(asset)} className="p-1.5 hover:bg-slate-700 rounded-full hover:text-sky-400 transition" aria-label="ویرایش"><EditIcon/></button>
                           <button onClick={() => onDelete(asset.id)} className="p-1.5 hover:bg-slate-700 rounded-full hover:text-rose-400 transition" aria-label="حذف"><DeleteIcon/></button>
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-sky-400">{formatCurrency(asset.currentValue * asset.quantity)}</p>
                    <p className="text-xs text-slate-500 pt-2 border-t border-slate-700/50">تاریخ خرید: {formatDate(asset.purchaseDate)}</p>
                    {asset.notes && <p className="text-sm text-slate-300">{asset.notes}</p>}
                </div>
            ))}
        </div>
    );
};
