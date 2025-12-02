import React, { useState } from 'react';
import { UserIcon, LockIcon } from '../../components/Icons';
import { supabase } from '../../lib/supabase';

interface SignupPageProps {
    onSignupSuccess: () => void;
    onNavigateToLogin: () => void;
}

export const SignupPage: React.FC<SignupPageProps> = ({ onSignupSuccess, onNavigateToLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (!email.trim() || !password.trim()) {
            setError('لطفاً همه فیلدها را پر کنید.');
            setLoading(false);
            return;
        }

        if (password !== confirmPassword) {
            setError('رمز عبور و تکرار آن مطابقت ندارند.');
            setLoading(false);
            return;
        }

        if (password.length < 6) {
            setError('رمز عبور باید حداقل ۶ کاراکتر باشد.');
            setLoading(false);
            return;
        }

        try {
            const { data, error: signupError } = await supabase.auth.signUp({
                email,
                password,
            });

            if (signupError) throw signupError;

            if (data.user) {
                onSignupSuccess();
            }
        } catch (err: any) {
            console.error('Signup error:', err);
            setError(err.message || 'خطا در ثبت نام.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-sky-400">مدیر زندگی</h1>
                    <p className="text-slate-400 mt-2">ایجاد حساب کاربری جدید</p>
                </div>

                <div className="bg-slate-800/50 p-8 rounded-xl ring-1 ring-slate-700 shadow-lg">
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
                        <div className="mb-4 relative">
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
                        <div className="mb-6 relative">
                            <label htmlFor="confirmPassword" className="sr-only">تکرار رمز عبور</label>
                            <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                                <LockIcon />
                            </span>
                            <input
                                type="password"
                                id="confirmPassword"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="تکرار رمز عبور"
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
                            {loading ? 'در حال ثبت نام...' : 'ثبت نام'}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <button 
                            onClick={onNavigateToLogin}
                            className="text-slate-400 hover:text-sky-400 text-sm transition-colors"
                        >
                            قبلاً ثبت نام کرده‌اید؟ وارد شوید
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

