// Unified KV storage abstraction (web now; Electron later)
export type KVStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

// Web implementation: wrap localStorage (centralized for future swap/migration)
export const webStorage: KVStorage = {
  getItem: (key) => (typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null),
  setItem: (key, value) => {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
  },
  removeItem: (key) => {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
  },
};

// Encrypted wrapper around storage for persisted JSON strings (async API for zustand persist)
import { getMasterKey } from './crypto-session';
import { encryptString, decryptString } from './crypto';

// Detect our encrypted payload format
function isEncryptedPayload(value: string): boolean {
  try {
    const obj = JSON.parse(value);
    return obj && typeof obj === 'object' && typeof obj.iv === 'string' && typeof obj.ct === 'string';
  } catch {
    return false;
  }
}


// Async-compatible storage for zustand persist (StateStorage-like)
export const encryptedStateStorage = {
  async getItem(key: string): Promise<string | null> {
    const raw = webStorage.getItem(key);
    if (raw == null) return null;
    if (isEncryptedPayload(raw)) {
      const keyObj = getMasterKey();
      if (!keyObj) {
        return null;
      }
      try {
        const payload = JSON.parse(raw);
        return await decryptString(payload, keyObj);
      } catch (e) {
        console.error('Decryption failed for key', key, e);
        return null;
      }
    }
    return raw;
  },
  async setItem(key: string, value: string): Promise<void> {
    const keyObj = getMasterKey();
    if (!keyObj) {
      return;
    }
    try {
      let toPersist = value;
      if (!isEncryptedPayload(value)) {
        const payload = await encryptString(value, keyObj);
        toPersist = JSON.stringify(payload);
      }
      webStorage.setItem(key, toPersist);
    } catch (e) {
      console.error('Encryption wrapper error for key', key, e);
    }
  },
  async removeItem(key: string): Promise<void> {
    webStorage.removeItem(key);
  },
};