import React from 'react';
import { CloseIcon } from '../../components/Icons';

type ConfirmTone = 'warning' | 'danger' | 'success';

export interface ConfirmDialogProps {
    open: boolean;
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    tone?: ConfirmTone;
    onConfirm: () => void;
    onClose: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    open,
    title = 'تایید عملیات',
    message,
    confirmText = 'تایید',
    cancelText = 'لغو',
    tone = 'warning',
    onConfirm,
    onClose,
}) => {
    if (!open) return null;
    const confirmClasses =
        tone === 'danger'
            ? 'bg-rose-600 hover:bg-rose-500'
            : tone === 'success'
            ? 'bg-emerald-600 hover:bg-emerald-500'
            : 'bg-amber-600 hover:bg-amber-500';

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
            role="dialog"
            aria-modal="true"
            onClick={onClose}
        >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <div
                className="relative w-full max-w-md bg-slate-800 rounded-2xl ring-1 ring-slate-700 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
                    <h3 className="text-slate-100 font-bold text-lg truncate">{title}</h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-slate-400 hover:text-white transition-colors"
                        aria-label="بستن پنجره تایید"
                    >
                        <CloseIcon />
                    </button>
                </div>
                <div className="p-5 text-slate-200 leading-7 overflow-y-auto text-sm sm:text-base">
                    {message}
                </div>
                <div className="px-5 py-4 bg-slate-800/60 border-t border-slate-700 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full sm:w-auto px-4 py-2 rounded-md border border-slate-600 text-slate-300 hover:bg-slate-700 text-sm"
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={`w-full sm:w-auto px-4 py-2 rounded-md text-white text-sm font-bold ${confirmClasses}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};


