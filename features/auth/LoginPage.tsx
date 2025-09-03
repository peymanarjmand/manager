import React, { useState } from 'react';
import { UserIcon, LockIcon, AlertIcon } from '../../components/Icons';

interface LoginPageProps {
    onLoginSuccess: () => void;
}

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
