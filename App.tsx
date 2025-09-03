import React, { useState, useEffect } from 'react';
import { Dashboard } from './features/dashboard/Dashboard';
import { Header } from './components/Header';
import { LoginPage } from './features/auth/LoginPage';
import { PasswordManager } from './features/password-manager/PasswordManager';
import { PhoneBook } from './features/phone-book/PhoneBook';
import { SmartAccountant } from './features/smart-accountant/SmartAccountant';
import { DailyTasks } from './features/daily-tasks/DailyTasks';

export type View = 'dashboard' | 'password-manager' | 'smart-accountant' | 'phone-book' | 'daily-tasks';

function App(): React.ReactNode {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentView, setCurrentView] = useState<View>('dashboard');

  useEffect(() => {
    // Check for active session on component mount
    const sessionActive = sessionStorage.getItem('lifeManagerSessionActive');
    if (sessionActive === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLoginSuccess = () => {
    sessionStorage.setItem('lifeManagerSessionActive', 'true');
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('lifeManagerSessionActive');
    setIsAuthenticated(false);
    setCurrentView('dashboard'); // Reset to dashboard on logout
  };

  const handleNavigate = (view: View) => {
    setCurrentView(view);
  };

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }
  
  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans">
      <Header onLogout={handleLogout} />
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
