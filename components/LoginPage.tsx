import React, { useState } from 'react';

interface LoginPageProps {
    onLoginSuccess: () => void;
}

const UserIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
);

const LockIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
);

const AlertIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-400 shrink-0 ml-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
);

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const hasAccount = !!localStorage.getItem('lifeManagerCredentials');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!username.trim() || !password.trim()) {
            setError('لطفاً نام کاربری و رمز عبور را وارد کنید.');
            return;
        }
        
        const storedCredsRaw = localStorage.getItem('lifeManagerCredentials');

        if (storedCredsRaw) {
            // Login flow
            const storedCreds = JSON.parse(storedCredsRaw);
            if (username === storedCreds.username && password === storedCreds.password) {
                onLoginSuccess();
            } else {
                setError('نام کاربری یا رمز عبور اشتباه است.');
            }
        } else {
            // Registration flow
            localStorage.setItem('lifeManagerCredentials', JSON.stringify({ username, password }));
            onLoginSuccess();
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-sky-400">مدیر زندگی</h1>
                    <p className="text-slate-400 mt-2">{hasAccount ? "برای ورود اطلاعات خود را وارد کنید" : "برای شروع یک حساب کاربری بسازید"}</p>
                </div>

                <div className="bg-slate-800/50 p-8 rounded-xl ring-1 ring-slate-700 shadow-lg">
                    <form onSubmit={handleSubmit} noValidate>
                        <div className="mb-4 relative">
                            <label htmlFor="username" className="sr-only">نام کاربری</label>
                            <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                <UserIcon />
                            </span>
                            <input
                                type="text"
                                id="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="نام کاربری"
                                required
                                className="w-full bg-slate-700/50 text-white rounded-md py-3 pl-4 pr-10 focus:ring-2 focus:ring-sky-400 focus:outline-none transition"
                                aria-label="نام کاربری"
                            />
                        </div>
                        <div className="mb-6 relative">
                            <label htmlFor="password" className="sr-only">رمز عبور</label>
                            <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                <LockIcon />
                            </span>
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="رمز عبور"
                                required
                                className="w-full bg-slate-700/50 text-white rounded-md py-3 pl-4 pr-10 focus:ring-2 focus:ring-sky-400 focus:outline-none transition"
                                aria-label="رمز عبور"
                            />
                        </div>
                        
                        {error && <p className="text-rose-400 text-sm mb-4 text-center" role="alert">{error}</p>}
                        
                        <button type="submit" className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold py-3 rounded-md transition duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-sky-400">
                            {hasAccount ? "ورود" : "ثبت نام و ورود"}
                        </button>
                    </form>
                </div>
                
                <div className="mt-8 bg-amber-500/10 p-4 rounded-lg flex items-start ring-1 ring-amber-500/30">
                    <AlertIcon />
                    <p className="text-amber-300 text-sm">
                        توجه: این اپلیکیشن قابلیت بازیابی رمز عبور ندارد. لطفاً اطلاعات ورود خود را در مکانی امن نگهداری کنید.
                    </p>
                </div>
            </div>
        </div>
    );
};
