import React, { useState } from 'react';
import { UserIcon, LockIcon, AlertIcon } from '../../components/Icons';
import { webStorage } from '../../lib/storage';
import { deriveKeyFromPassword, encryptString, decryptString, base64ToBytes, bytesToBase64, randomBytes } from '../../lib/crypto';
import { setMasterKey } from '../../lib/crypto-session';

interface LoginPageProps {
    onLoginSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const hasMaster = !!webStorage.getItem('lifeManagerMasterParams');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!password.trim()) {
            setError('لطفاً رمز عبور را وارد کنید.');
            return;
        }

        const paramsRaw = webStorage.getItem('lifeManagerMasterParams');

        try {
            if (paramsRaw) {
                // Login flow with existing Master Password params
                const params = JSON.parse(paramsRaw) as { salt: string; iterations: number; check: { iv: string; ct: string } };
                const key = await deriveKeyFromPassword(password, base64ToBytes(params.salt), params.iterations);
                // Verify password by decrypting check payload
                await decryptString(params.check, key);
                setMasterKey(key);
                onLoginSuccess();
            } else {
                // First-time setup (registration): create Master Password params
                const iterations = 200_000;
                const salt = randomBytes(16);
                const key = await deriveKeyFromPassword(password, salt, iterations);
                const check = await encryptString('ok', key);
                webStorage.setItem('lifeManagerMasterParams', JSON.stringify({
                    salt: bytesToBase64(salt),
                    iterations,
                    check,
                }));
                // Clean up any legacy plaintext credentials if present
                if (typeof localStorage !== 'undefined' && localStorage.getItem('lifeManagerCredentials')) {
                    localStorage.removeItem('lifeManagerCredentials');
                }
                setMasterKey(key);
                onLoginSuccess();
            }
        } catch (err) {
            console.error('Login error:', err);
            setError('رمز عبور نادرست است.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-sky-400">مدیر زندگی</h1>
                    <p className="text-slate-400 mt-2">{hasMaster ? "برای ورود رمز عبور اصلی را وارد کنید" : "برای شروع رمز عبور اصلی تعیین کنید"}</p>
                </div>

                <div className="bg-slate-800/50 p-8 rounded-xl ring-1 ring-slate-700 shadow-lg">
                    <form onSubmit={handleSubmit} noValidate>
                        <div className="mb-4 relative">
                            <label htmlFor="username" className="sr-only">نام کاربری (اختیاری)</label>
                            <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                <UserIcon />
                            </span>
                            <input
                                type="text"
                                id="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="نام کاربری (اختیاری)"
                                className="w-full bg-slate-700/50 text-white rounded-md py-3 pl-4 pr-10 focus:ring-2 focus:ring-sky-400 focus:outline-none transition"
                                aria-label="نام کاربری"
                            />
                        </div>
                        <div className="mb-6 relative">
                            <label htmlFor="password" className="sr-only">رمز عبور اصلی</label>
                            <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                <LockIcon />
                            </span>
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="رمز عبور اصلی"
                                required
                                className="w-full bg-slate-700/50 text-white rounded-md py-3 pl-4 pr-10 focus:ring-2 focus:ring-sky-400 focus:outline-none transition"
                                aria-label="رمز عبور اصلی"
                            />
                        </div>
                        
                        {error && <p className="text-rose-400 text-sm mb-4 text-center" role="alert">{error}</p>}
                        
                        <button type="submit" className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold py-3 rounded-md transition duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-sky-400">
                            {hasMaster ? "ورود" : "ثبت و ورود"}
                        </button>
                    </form>
                </div>
                
                <div className="mt-8 bg-amber-500/10 p-4 rounded-lg flex items-start ring-1 ring-amber-500/30">
                    <AlertIcon />
                    <p className="text-amber-300 text-sm">
                        توجه: رمز عبور اصلی (Master Password) قابل بازیابی نیست. لطفاً آن را در مکانی امن نگهداری کنید.
                    </p>
                </div>
            </div>
        </div>
    );
};
