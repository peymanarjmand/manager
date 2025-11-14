import React, { useEffect, useState } from 'react';
import { Dashboard } from './features/dashboard/Dashboard';
import { Header } from './components/Header';
import { PasswordManager } from './features/password-manager/PasswordManager';
import { PhoneBook } from './features/phone-book/PhoneBook';
import { SmartAccountant } from './features/smart-accountant/SmartAccountant';
import { Assets } from './features/assets/Assets';
import { DailyTasks } from './features/daily-tasks/DailyTasks';
import { Darfak } from './features/darfak/Darfak';
import { HealthDashboard } from './features/health-dashboard/HealthDashboard';
import { SUPABASE_ENABLED } from './lib/supabase';
import { supabase } from './lib/supabase';

export type View = 'dashboard' | 'password-manager' | 'smart-accountant' | 'phone-book' | 'daily-tasks' | 'assets' | 'darfak' | 'health-dashboard';

function App(): React.ReactNode {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [sessionInfo, setSessionInfo] = useState<string | undefined>(undefined);

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  const handleNavigate = (view: View) => {
    setCurrentView(view);
  };

  useEffect(() => {
    (async () => {
      if (!SUPABASE_ENABLED) {
        setSessionInfo('Supabase: disabled');
        return;
      }
      try {
        const ts = new Date().toISOString();
        const { error: upErr } = await supabase
          .from('state_settings')
          .upsert({ id: 'healthcheck', value: { ts }, updated_at: ts });
        if (upErr) throw upErr;
        const { data, error: selErr } = await supabase
          .from('state_settings')
          .select('id')
          .eq('id', 'healthcheck')
          .maybeSingle();
        if (selErr) throw selErr;
        setSessionInfo(data?.id ? 'Supabase: OK' : 'Supabase: read failed');
      } catch (e: any) {
        setSessionInfo('Supabase error');
        // eslint-disable-next-line no-console
        console.error('Supabase healthcheck failed', e);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans">
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
        {currentView === 'dashboard' && <Dashboard onNavigate={handleNavigate} />}
        {currentView === 'health-dashboard' && <HealthDashboard onNavigateBack={() => handleNavigate('dashboard')} />}
        {currentView === 'password-manager' && <PasswordManager onNavigateBack={() => handleNavigate('dashboard')} />}
        {currentView === 'smart-accountant' && <SmartAccountant onNavigateBack={() => handleNavigate('dashboard')} />}
        {currentView === 'phone-book' && <PhoneBook onNavigateBack={() => handleNavigate('dashboard')} />}
        {currentView === 'daily-tasks' && <DailyTasks onNavigateBack={() => handleNavigate('dashboard')} />}
        {currentView === 'assets' && <Assets onNavigateBack={() => handleNavigate('dashboard')} />}
        {currentView === 'darfak' && <Darfak onNavigateBack={() => handleNavigate('dashboard')} />}

      </main>
      <footer className="text-center py-6 text-slate-500 text-sm">
        <p>
          ساخته شده با ❤️ برای سازماندهی زندگی شما
        </p>
      </footer>
    </div>
  );
}

export default App;