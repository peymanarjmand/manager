import { ReactNode } from 'react';

export interface DashboardItem {
  id: string;
  icon: ReactNode;
  title: string;
  description: string;
}

export {}; // keep as module

declare global {
  interface Window {
    electronAPI?: {
      ping: () => Promise<string>;
      kv: {
        get: (key: string) => Promise<string | null>;
        set: (key: string, value: string) => Promise<boolean>;
        remove: (key: string) => Promise<boolean>;
      };
      images: {
        saveDataURL: (dataUrl: string) => Promise<string | null>;
        get: (ref: string) => Promise<{ mime: string; base64: string } | null>;
        delete: (ref: string) => Promise<boolean>;
      };
      clipboard: {
        clear: () => Promise<boolean>;
      };
    };
  }
}
