import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

const isChunkLoadError = (err?: Error): boolean => {
  if (!err) return false;
  const msg = `${err.name} ${err.message}`.toLowerCase();
  return (
    msg.includes('chunkloaderror') ||
    msg.includes('failed to fetch dynamically imported module') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('importing a module script failed')
  );
};

/**
 * App-wide error boundary. Prevents a thrown error in any (lazy) feature from
 * blanking the entire app — shows a styled Persian fallback with a reload action.
 * Also detects post-deploy chunk-load errors and offers a fresh reload.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, info);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const chunk = isChunkLoadError(this.state.error);
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center bg-white/[0.05] ring-1 ring-white/10 rounded-2xl p-8">
          <h2 className="text-xl font-bold mb-2 text-rose-300">
            {chunk ? 'نسخه‌ی جدیدی در دسترس است' : 'مشکلی پیش آمد'}
          </h2>
          <p className="text-slate-300 text-sm leading-7 mb-6">
            {chunk
              ? 'به‌نظر می‌رسد نسخه‌ی تازه‌ای از برنامه منتشر شده است. برای بارگذاری نسخه‌ی جدید روی دکمه بزنید.'
              : 'بخشی از برنامه با خطا روبه‌رو شد. اطلاعات شما امن است. لطفاً دوباره تلاش کنید.'}
          </p>
          <button
            onClick={this.handleReload}
            className="bg-sky-500 hover:bg-sky-600 text-white font-bold py-2.5 px-6 rounded-lg transition"
          >
            بارگذاری مجدد
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
