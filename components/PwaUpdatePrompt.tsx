import React, { useEffect, useState } from 'react';

/**
 * Shows a non-intrusive "new version available" prompt when the service worker
 * has a waiting update. The user taps to reload (controlled update) — we never
 * swap chunks under a running session automatically.
 *
 * Wiring: index.tsx registers the SW via virtual:pwa-register and dispatches a
 * 'pwa-need-refresh' event + exposes window.__pwaUpdate(reload).
 */
export const PwaUpdatePrompt = (): React.ReactNode => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handler = (): void => setShow(true);
    window.addEventListener('pwa-need-refresh', handler);
    return () => window.removeEventListener('pwa-need-refresh', handler);
  }, []);

  if (!show) return null;

  const update = (): void => {
    const fn = (window as Window & { __pwaUpdate?: (reload?: boolean) => void }).__pwaUpdate;
    if (fn) fn(true);
    else window.location.reload();
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="flex items-center gap-3 rounded-full bg-sky-600 px-4 py-2 text-sm text-white shadow-lg ring-1 ring-sky-500">
        <span>نسخه‌ی جدید آماده است</span>
        <button onClick={update} className="font-medium underline hover:text-sky-100">
          به‌روزرسانی
        </button>
      </div>
    </div>
  );
};

export default PwaUpdatePrompt;
