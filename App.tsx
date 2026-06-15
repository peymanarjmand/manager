import React, { useEffect, useState, Suspense } from 'react';
import { Dashboard } from './features/dashboard/Dashboard';
import { Header } from './components/Header';
import { SUPABASE_ENABLED, supabase } from './lib/supabase';
import { LoginPage } from './features/auth/LoginPage';
import { SignupPage } from './features/auth/SignupPage';
import { View } from './types';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SyncIndicator } from './components/SyncIndicator';
import { PwaUpdatePrompt } from './components/PwaUpdatePrompt';
import { BottomNav } from './components/BottomNav';

const PasswordManager = React.lazy(() => import('./features/password-manager/PasswordManager').then(m => ({ default: m.PasswordManager })));
const PhoneBook = React.lazy(() => import('./features/phone-book/PhoneBook').then(m => ({ default: m.PhoneBook })));
const SmartAccountant = React.lazy(() => import('./features/smart-accountant/SmartAccountant.tsx').then(m => ({ default: m.SmartAccountant })));
const Assets = React.lazy(() => import('./features/assets/Assets').then(m => ({ default: m.Assets })));
const DailyTasks = React.lazy(() => import('./features/daily-tasks/DailyTasks').then(m => ({ default: m.DailyTasks })));
const Darfak = React.lazy(() => import('./features/darfak/Darfak').then(m => ({ default: m.Darfak })));
const HealthDashboard = React.lazy(() => import('./features/health-dashboard/HealthDashboard').then(m => ({ default: m.HealthDashboard })));
const MyCar = React.lazy(() => import('./features/my-car/MyCar').then(m => ({ default: m.MyCar })));

function App(): React.ReactNode {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  // Becomes true once the user has pushed into a module, so navigating "home"
  // pops that history entry (rather than pushing another one).
  const navigatedRef = React.useRef(false);
  const [sessionInfo, setSessionInfo] = useState<string | undefined>(undefined);
  const [session, setSession] = useState<any>(null);
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!SUPABASE_ENABLED) {
        setSessionInfo('Supabase: disabled');
        setIsLoading(false);
        return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user) {
        // Run healthcheck or setup only when logged in
        (async () => {
            try {
                const ts = new Date().toISOString();
                // Try to read/write to confirm access
                const { error } = await supabase
                  .from('state_settings')
                  .upsert({ id: 'healthcheck', value: { ts }, updated_at: ts });
                
                if (!error) {
                    setSessionInfo('Online');
                } else {
                    console.error('Healthcheck failed', error);
                    setSessionInfo('Offline / Error');
                }
            } catch (e) {
                console.error(e);
                setSessionInfo('Error');
            }
        })();
    }
  }, [session]);

  // Sync with browser history so the hardware/browser Back button returns to the
  // dashboard instead of leaving the app. The app is one level deep: the
  // dashboard is the root and a module lives on a single pushed history entry.
  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const v = e.state && (e.state as { view?: View }).view;
      navigatedRef.current = !!v && v !== 'dashboard';
      setCurrentView(v && v !== 'dashboard' ? v : 'dashboard');
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // PWA shortcut launch intent: a manifest shortcut opens `/?go=<module>`, which
  // we read once on startup to jump straight into that module, then strip the
  // query so a refresh or Back press stays clean. This is a one-shot launch
  // reader, not full URL routing (per-module URLs are intentionally deferred).
  useEffect(() => {
    const go = new URLSearchParams(window.location.search).get('go');
    if (!go) return;
    const modules: View[] = [
      'smart-accountant', 'assets', 'daily-tasks', 'my-car',
      'phone-book', 'darfak', 'health-dashboard', 'password-manager',
    ];
    const url = new URL(window.location.href);
    url.searchParams.delete('go');
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
    if ((modules as string[]).includes(go)) {
      navigatedRef.current = true;
      window.history.pushState({ view: go }, '');
      setCurrentView(go as View);
    }
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    // window.location.reload();
  };

  const handleNavigate = (view: View) => {
    if (view === currentView) return;
    if (view === 'dashboard') {
      // Pop the module entry we pushed, so Back history stays clean (and a real
      // Back press lands here too). Fall back to a direct switch if we never
      // pushed (e.g. a deep link straight into a module).
      if (navigatedRef.current) {
        navigatedRef.current = false;
        window.history.back();
      } else {
        setCurrentView('dashboard');
      }
      return;
    }
    if (currentView === 'dashboard') {
      navigatedRef.current = true;
      window.history.pushState({ view }, '');
    } else {
      // Switching directly between modules (e.g. via the bottom nav) stays one
      // level deep, so Back from any module still returns to the dashboard.
      window.history.replaceState({ view }, '');
    }
    setCurrentView(view);
  };

  if (isLoading) {
      return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Loading...</div>;
  }

  if (!session && SUPABASE_ENABLED) {
      if (authView === 'login') {
          return <LoginPage onLoginSuccess={() => {}} onNavigateToSignup={() => setAuthView('signup')} />;
      } else {
          return <SignupPage onSignupSuccess={() => {}} onNavigateToLogin={() => setAuthView('login')} />;
      }
  }

  return (
    <div className="min-h-screen text-white font-sans pb-24">
      {!SUPABASE_ENABLED && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950">
          <div className="max-w-lg mx-auto p-6 rounded-xl ring-1 ring-slate-800 bg-slate-900 text-center">
            <h2 className="text-2xl font-bold text-rose-400 mb-2">Supabase is not configured</h2>
            <p className="text-slate-300 text-sm">
              Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in a .env file and restart the app.
            </p>
          </div>
        </div>
      )}
      <Header onLogout={handleLogout} sessionInfo={sessionInfo} />
      <main>
        <ErrorBoundary key={currentView}>
          {currentView === 'dashboard' && <Dashboard onNavigate={handleNavigate} />}
          {currentView !== 'dashboard' && (
            <Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Loading...</div>}>
              {currentView === 'health-dashboard' && <HealthDashboard onNavigateBack={() => handleNavigate('dashboard')} />}
              {currentView === 'password-manager' && <PasswordManager onNavigateBack={() => handleNavigate('dashboard')} />}
              {currentView === 'smart-accountant' && <SmartAccountant onNavigateBack={() => handleNavigate('dashboard')} />}
              {currentView === 'phone-book' && <PhoneBook onNavigateBack={() => handleNavigate('dashboard')} />}
              {currentView === 'daily-tasks' && <DailyTasks onNavigateBack={() => handleNavigate('dashboard')} />}
              {currentView === 'assets' && <Assets onNavigateBack={() => handleNavigate('dashboard')} />}
              {currentView === 'darfak' && <Darfak onNavigateBack={() => handleNavigate('dashboard')} />}
              {currentView === 'my-car' && <MyCar onNavigateBack={() => handleNavigate('dashboard')} />}
            </Suspense>
          )}
        </ErrorBoundary>
      </main>
      <SyncIndicator />
      <PwaUpdatePrompt />
      <footer className="text-center py-6 text-slate-500 text-sm">
        <p>
          ساخته شده با ❤️ توسط پیمان ارجمند
        </p>
      </footer>
      <BottomNav currentView={currentView} onNavigate={handleNavigate} />
    </div>
  );
}

export default App;
