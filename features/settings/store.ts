import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Settings } from '../../types';
import { encryptedStateStorage } from '../../lib/storage';
import { supabaseStateStorage } from '../../lib/supabaseStorage'

const STORAGE_KEY = 'lifeManagerSettings';

interface SettingsState {
    settings: Settings;
    updateSettings: (newSettings: Partial<Settings>) => void;
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            settings: {
                focusDuration: 25,
                shortBreakDuration: 5,
                longBreakDuration: 15,
                sessionsPerRound: 4,
                eyeStrainAlertEnabled: true,
                eyeStrainInterval: 20,
                eyeStrainMessage: 'زمان استراحت چشم! به یک جسم دور برای ۲۰ ثانیه نگاه کنید.',
                soundEnabled: true,
                // security defaults
                autoLockEnabled: true,
                autoLockMinutes: 10,
                clipboardAutoClearEnabled: true,
                clipboardClearSeconds: 25,
            },
            updateSettings: (newSettings) => set((state) => ({
                settings: { ...state.settings, ...newSettings }
            }))
        }),
        {
            name: STORAGE_KEY,
            storage: createJSONStorage(() => supabaseStateStorage as unknown as Storage),
        }
    )
);
