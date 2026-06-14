import React, { useEffect, useState } from 'react';
import { subscribeSync, flush, type SyncStatus } from '../lib/outbox';

/**
 * Minimal sync-status surface for the durable write outbox.
 * Shows only when there is something pending or a write failed, with a manual
 * retry. (Will be folded into the redesigned design-system Toast in Phase 9.)
 */
export const SyncIndicator = (): React.ReactNode => {
  const [status, setStatus] = useState<SyncStatus>({ pending: 0, failed: 0, syncing: false });

  useEffect(() => subscribeSync(setStatus), []);

  if (status.pending === 0 && status.failed === 0) return null;

  const hasFailed = status.failed > 0;
  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div
        className={`flex items-center gap-3 rounded-full px-4 py-2 text-sm shadow-lg ring-1 ${
          hasFailed
            ? 'bg-rose-900/80 ring-rose-700 text-rose-100'
            : 'bg-slate-800/90 ring-white/10 text-slate-200'
        }`}
      >
        {status.syncing ? (
          <span>در حال همگام‌سازی…</span>
        ) : hasFailed ? (
          <>
            <span>{status.failed.toLocaleString('fa-IR')} مورد همگام نشد</span>
            <button onClick={() => void flush()} className="underline hover:text-white font-medium">
              تلاش مجدد
            </button>
          </>
        ) : (
          <span>{status.pending.toLocaleString('fa-IR')} تغییر در انتظار ذخیره…</span>
        )}
      </div>
    </div>
  );
};

export default SyncIndicator;
