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
import { SUPABASE_ENABLED, supabase } from './lib/supabase';
import { LoginPage } from './features/auth/LoginPage';
import { SignupPage } from './features/auth/SignupPage';
import { View } from './types';
import { MyCar } from './features/my-car/MyCar';

function App(): React.ReactNode {
  const [currentView, setCurrentView] = useState<View>('dashboard');
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    // window.location.reload(); 
  };

  const handleNavigate = (view: View) => {
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
        {currentView === 'my-car' && <MyCar onNavigateBack={() => handleNavigate('dashboard')} />}
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
