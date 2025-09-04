import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  ping: () => ipcRenderer.invoke('ping'),
  kv: {
    get: (key: string) => ipcRenderer.invoke('kv:get', key) as Promise<string | null>,
    set: (key: string, value: string) => ipcRenderer.invoke('kv:set', key, value) as Promise<boolean>,
    remove: (key: string) => ipcRenderer.invoke('kv:remove', key) as Promise<boolean>,
  },
  images: {
    saveDataURL: (dataUrl: string) => ipcRenderer.invoke('images:saveDataURL', dataUrl) as Promise<string | null>,
    get: (ref: string) => ipcRenderer.invoke('images:get', ref) as Promise<{ mime: string; base64: string } | null>,
    delete: (ref: string) => ipcRenderer.invoke('images:delete', ref) as Promise<boolean>,
  },
  clipboard: {
    clear: () => ipcRenderer.invoke('clipboard:clear') as Promise<boolean>,
  }
});