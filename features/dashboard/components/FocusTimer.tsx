import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSettingsStore } from '../../settings/store';
import { GearIcon } from '../../../components/Icons';

const playSound = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
};

const showNotification = (message: string) => {
    if (!("Notification" in window)) {
        console.log("This browser does not support desktop notification");
        return;
    }

    if (Notification.permission === 'granted') {
        new Notification('مدیر زندگی', { body: message, dir: 'rtl' });
    }
};

export const FocusTimer = ({ onOpenSettings }: { onOpenSettings: () => void; }) => {
    const settings = useSettingsStore(state => state.settings);
    const [mode, setMode] = useState<'focus' | 'shortBreak' | 'longBreak'>('focus');
    const [timeLeft, setTimeLeft] = useState(settings.focusDuration * 60);
    const [isActive, setIsActive] = useState(false);
    const [sessionCount, setSessionCount] = useState(0);

    const timerIntervalRef = useRef<number | null>(null);
    const eyeStrainIntervalRef = useRef<number | null>(null);

    const duration = useMemo(() => {
        switch (mode) {
            case 'focus': return settings.focusDuration * 60;
            case 'shortBreak': return settings.shortBreakDuration * 60;
            case 'longBreak': return settings.longBreakDuration * 60;
        }
    }, [mode, settings]);

    useEffect(() => {
        resetTimer();
    }, [settings, duration]);

    useEffect(() => {
        if (isActive) {
            timerIntervalRef.current = window.setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);

            if (mode === 'focus' && settings.eyeStrainAlertEnabled) {
                eyeStrainIntervalRef.current = window.setInterval(() => {
                    if (settings.soundEnabled) playSound();
                    showNotification(settings.eyeStrainMessage);
                }, settings.eyeStrainInterval * 60 * 1000);
            }

        } else {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            if (eyeStrainIntervalRef.current) clearInterval(eyeStrainIntervalRef.current);
        }

        return () => {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            if (eyeStrainIntervalRef.current) clearInterval(eyeStrainIntervalRef.current);
        };
    }, [isActive, mode, settings]);

    useEffect(() => {
        if (timeLeft === 0) {
            if (settings.soundEnabled) playSound();
            
            let nextMode: 'focus' | 'shortBreak' | 'longBreak';
            let newSessionCount = sessionCount;

            if (mode === 'focus') {
                newSessionCount++;
                nextMode = (newSessionCount % settings.sessionsPerRound === 0) ? 'longBreak' : 'shortBreak';
                showNotification(nextMode === 'longBreak' ? 'زمان استراحت طولانی!' : 'زمان استراحت کوتاه!');
            } else {
                nextMode = 'focus';
                 showNotification('زمان تمرکز!');
            }
            
            setSessionCount(newSessionCount);
            setMode(nextMode);
            setIsActive(true); // Auto-start next session
        }
    }, [timeLeft]);

    useEffect(() => {
        // Request notification permission on component mount
        if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
            Notification.requestPermission();
        }
    }, []);

    const toggleTimer = () => {
        setIsActive(!isActive);
    };

    const resetTimer = () => {
        setIsActive(false);
        setTimeLeft(duration);
    };

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const progress = (duration - timeLeft) / duration * 100;

    const radius = 52;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress / 100) * circumference;
    
    const modeText = {
        focus: 'تمرکز',
        shortBreak: 'استراحت کوتاه',
        longBreak: 'استراحت طولانی'
    };

    return (
        <div className="bg-slate-800/50 rounded-xl p-4 ring-1 ring-slate-700 flex items-center justify-between h-full">
            <div className="relative flex items-center justify-center">
                 <svg className="transform -rotate-90" width="120" height="120" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r={radius} strokeWidth="8" className="text-slate-700" fill="transparent" />
                    <circle
                        cx="60"
                        cy="60"
                        r={radius}
                        strokeWidth="8"
                        className="text-sky-400"
                        fill="transparent"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                    />
                </svg>
                <div className="absolute text-center">
                    <span className="text-3xl font-bold text-white tracking-wider">
                        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                    </span>
                    <p className="text-sm text-slate-400">{modeText[mode]}</p>
                </div>
            </div>

            <div className="flex flex-col items-center gap-3">
                 <button onClick={toggleTimer} className="bg-sky-500 hover:bg-sky-600 text-white font-bold py-2 px-8 rounded-md transition duration-300 w-32 text-center">
                    {isActive ? 'توقف' : 'شروع'}
                </button>
                 <button onClick={resetTimer} className="bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold py-2 px-8 rounded-md transition w-32 text-center">
                    ریست
                </button>
            </div>
             <button onClick={onOpenSettings} className="absolute top-3 left-3 text-slate-500 hover:text-sky-400 transition" title="تنظیمات تایمر">
                <GearIcon className="h-5 w-5" />
            </button>
        </div>
    );
};
