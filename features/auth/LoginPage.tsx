import React, { useState } from 'react';
import { UserIcon, LockIcon } from '../../components/Icons';
import { supabase } from '../../lib/supabase';

interface LoginPageProps {
    onLoginSuccess: () => void;
    onNavigateToSignup: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onNavigateToSignup }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (!email.trim() || !password.trim()) {
            setError('لطفاً ایمیل و رمز عبور را وارد کنید.');
            setLoading(false);
            return;
        }

        try {
            const { data, error: loginError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (loginError) {
                throw loginError;
            }

            if (data.user) {
                onLoginSuccess();
            }
        } catch (err: any) {
            console.error('Login error:', err);
            setError('ایمیل یا رمز عبور اشتباه است.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4 shadow-lg shadow-brand-900/40">م</div>
                    <h1 className="text-3xl font-bold text-slate-100">مدیر زندگی</h1>
                    <p className="text-slate-400 mt-2">ورود به حساب کاربری</p>
                </div>

                <div className="bg-white/[0.04] p-8 rounded-xl ring-1 ring-white/10 shadow-lg">
                    <form onSubmit={handleSubmit} noValidate>
                        <div className="mb-4 relative">
                            <label htmlFor="email" className="sr-only">ایمیل</label>
                            <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                                <UserIcon />
                            </span>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="ایمیل"
                                required
                                className="w-full bg-slate-700/50 text-white rounded-md py-3 pl-4 pr-10 focus:ring-2 focus:ring-sky-400 focus:outline-none transition"
                            />
                        </div>
                        <div className="mb-6 relative">
                            <label htmlFor="password" className="sr-only">رمز عبور</label>
                            <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
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
                            />
                        </div>
                        
                        {error && <p className="text-rose-400 text-sm mb-4 text-center" role="alert">{error}</p>}
                        
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold py-3 rounded-md transition duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-sky-400 disabled:opacity-50"
                        >
                            {loading ? 'در حال ورود...' : 'ورود'}
                        </button>
                    </form>
                    
                    <div className="mt-6 text-center">
                        <button 
                            onClick={onNavigateToSignup}
                            className="text-slate-400 hover:text-sky-400 text-sm transition-colors"
                        >
                            حساب کاربری ندارید؟ ثبت نام کنید
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
