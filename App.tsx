import React, { useState, useEffect, useRef } from 'react';
import { Dashboard } from './features/dashboard/Dashboard';
import { Header } from './components/Header';
import { LoginPage } from './features/auth/LoginPage';
import { PasswordManager } from './features/password-manager/PasswordManager';
import { PhoneBook } from './features/phone-book/PhoneBook';
import { SmartAccountant } from './features/smart-accountant/SmartAccountant';
import { DailyTasks } from './features/daily-tasks/DailyTasks';
import { clearMasterKey, getMasterKey } from './lib/crypto-session';
import { usePasswordStore } from './features/password-manager/store';
import { usePhoneBookStore } from './features/phone-book/store';
import { useAccountantStore } from './features/smart-accountant/store';
import { useSettingsStore } from './features/settings/store';
import { useDailyTasksStore } from './features/daily-tasks/store';

export type View = 'dashboard' | 'password-manager' | 'smart-accountant' | 'phone-book' | 'daily-tasks';

function App(): React.ReactNode {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentView, setCurrentView] = useState<View>('dashboard');

  const autoLockEnabled = useSettingsStore((s) => s.settings.autoLockEnabled);
  const autoLockMinutes = useSettingsStore((s) => s.settings.autoLockMinutes);
  const inactivityTimerRef = useRef<number | null>(null);

  useEffect(() => {
    // Check for active session on component mount, but require in-memory master key too
    const sessionActive = sessionStorage.getItem('lifeManagerSessionActive');
    const key = getMasterKey();
    if (sessionActive === 'true' && key) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  }, []);

  const rehydrateAllStores = () => {
    try {
      const stores: any[] = [
        usePasswordStore,
        usePhoneBookStore,
        useAccountantStore,
        useSettingsStore,
        useDailyTasksStore,
      ];
      stores.forEach((s) => s?.persist?.rehydrate && s.persist.rehydrate());
    } catch (e) {
      console.error('Error rehydrating stores after login', e);
    }
  };

  const handleLoginSuccess = () => {
    sessionStorage.setItem('lifeManagerSessionActive', 'true');
    setIsAuthenticated(true);
    // After master key is set by LoginPage, rehydrate encrypted stores so data loads
    rehydrateAllStores();
  };

  const performSoftLock = () => {
    // Soft lock: clear only master key, keep session flag so next login just needs password
    clearMasterKey();
    setIsAuthenticated(false);
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    // Clear session flag and master key first
    sessionStorage.removeItem('lifeManagerSessionActive');
    clearMasterKey();
    setIsAuthenticated(false);
    setCurrentView('dashboard'); // Reset to dashboard on logout
    // Hard refresh to clear any decrypted in-memory state in stores/components
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  // Inactivity auto-lock
  useEffect(() => {
    if (!isAuthenticated) {
      // If not authenticated, ensure no timers/listeners remain
      if (inactivityTimerRef.current) {
        window.clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      return;
    }

    if (!autoLockEnabled || autoLockMinutes <= 0) {
      // Disable any running timers if auto-lock disabled
      if (inactivityTimerRef.current) {
        window.clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      return;
    }

    const resetTimer = () => {
      if (inactivityTimerRef.current) {
        window.clearTimeout(inactivityTimerRef.current);
      }
      const ms = autoLockMinutes * 60 * 1000;
      inactivityTimerRef.current = window.setTimeout(() => {
        performSoftLock();
      }, ms);
    };

    const activityEvents: (keyof WindowEventMap)[] = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
    const onActivity = () => resetTimer();

    activityEvents.forEach((evt) => window.addEventListener(evt, onActivity, { passive: true }));
    resetTimer(); // start timer initially

    return () => {
      activityEvents.forEach((evt) => window.removeEventListener(evt, onActivity));
      if (inactivityTimerRef.current) {
        window.clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
    };
  }, [isAuthenticated, autoLockEnabled, autoLockMinutes]);

  const handleNavigate = (view: View) => {
    setCurrentView(view);
  };

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }
  
  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans">
      <Header onLogout={handleLogout} onLock={performSoftLock} />
      <main>
        {currentView === 'dashboard' && <Dashboard onNavigate={handleNavigate} />}
        {currentView === 'password-manager' && <PasswordManager onNavigateBack={() => handleNavigate('dashboard')} />}
        {currentView === 'smart-accountant' && <SmartAccountant onNavigateBack={() => handleNavigate('dashboard')} />}
        {currentView === 'phone-book' && <PhoneBook onNavigateBack={() => handleNavigate('dashboard')} />}
        {currentView === 'daily-tasks' && <DailyTasks onNavigateBack={() => handleNavigate('dashboard')} />}
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
