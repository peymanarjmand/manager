import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { isImageRef, getObjectURLByRef } from '../../../lib/idb-images';

export const ReceiptPreview = ({ refOrUrl, onClose, title, downloadLabel = 'دانلود', onDelete }: { refOrUrl: string | null; onClose: () => void; title?: string; downloadLabel?: string; onDelete?: () => void; }) => {
    const [url, setUrl] = useState<string | null>(null);
    useEffect(() => {
        let active = true;
        (async () => {
            if (!refOrUrl) { setUrl(null); return; }
            if (isImageRef(refOrUrl)) {
                const u = await getObjectURLByRef(refOrUrl);
                if (!active) return;
                setUrl(u);
            } else {
                const { data } = supabase.storage.from('receipts').getPublicUrl(refOrUrl);
                setUrl(data?.publicUrl || refOrUrl);
            }
        })();
        return () => { active = false; };
    }, [refOrUrl]);
    if (!refOrUrl) return null;
    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="relative max-w-3xl w-full" onClick={e => e.stopPropagation()}>
                <div className="bg-slate-900/90 rounded-2xl ring-1 ring-slate-700 shadow-2xl p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-slate-100 font-bold text-lg">{title || 'پیش‌نمایش تصویر'}</h3>
                        <button onClick={onClose} className="text-slate-400 hover:text-white">بستن</button>
                    </div>
                    <div className="rounded-xl bg-slate-100 text-slate-900 p-4 shadow-inner">
                        {url ? (
                            <img src={url} className="w-full h-auto max-h-[70vh] object-contain"/>
                        ) : (
                            <div className="py-16 flex flex-col items-center gap-3">
                                <div className="h-12 w-12 border-4 border-slate-300 border-top-sky-500 rounded-full animate-spin"></div>
                                <div className="text-slate-500 text-sm">در حال بارگذاری تصویر…</div>
                            </div>
                        )}
                    </div>
                    <div className="mt-4 flex justify-end gap-3">
                        {onDelete && (
                            <button onClick={onDelete} className="px-4 py-2 rounded-md text-sm font-bold bg-rose-600 text-white hover:bg-rose-500">حذف تصویر</button>
                        )}
                        {url && <a href={url} target="_blank" rel="noreferrer" className="px-4 py-2 rounded-md text-sm font-medium bg-slate-800 text-white hover:bg-slate-700">{downloadLabel}</a>}
                        <button onClick={onClose} className="px-4 py-2 rounded-md text-sm font-medium border border-slate-400 text-slate-700 bg-white hover:bg-slate-100">بستن</button>
                    </div>
                </div>
            </div>
        </div>
    );
};
