// IndexedDB image store for offline usage
export const IMAGE_REF_PREFIX = 'lmimg:';

function genId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    // @ts-ignore
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('lifeManagerDB', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('images')) {
        db.createObjectStore('images', { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function isImageRef(value?: string | null): boolean {
  return !!value && value.startsWith(IMAGE_REF_PREFIX);
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  // Works in modern browsers; avoids manual base64 parsing
  const res = await fetch(dataUrl);
  return await res.blob();
}

export async function saveImageDataURL(dataUrl: string): Promise<string> {
  const blob = await dataUrlToBlob(dataUrl);
  const id = genId();
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('images', 'readwrite');
    const store = tx.objectStore('images');
    const putReq = store.put({ id, blob, type: blob.type });
    putReq.onsuccess = () => resolve();
    putReq.onerror = () => reject(putReq.error);
  });
  return IMAGE_REF_PREFIX + id;
}

export async function getBlobByRef(ref: string): Promise<Blob | null> {
  if (!isImageRef(ref)) return null;
  const id = ref.slice(IMAGE_REF_PREFIX.length);
  const db = await openDB();
  return await new Promise<Blob | null>((resolve, reject) => {
    const tx = db.transaction('images', 'readonly');
    const store = tx.objectStore('images');
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const record = getReq.result as { id: string; blob: Blob } | undefined;
      resolve(record ? record.blob : null);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

export async function getObjectURLByRef(ref: string): Promise<string | null> {
  const blob = await getBlobByRef(ref);
  if (!blob) return null;
  return URL.createObjectURL(blob);
}

export async function deleteImageByRef(ref: string): Promise<void> {
  if (!isImageRef(ref)) return;
  const id = ref.slice(IMAGE_REF_PREFIX.length);
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('images', 'readwrite');
    const store = tx.objectStore('images');
    const delReq = store.delete(id);
    delReq.onsuccess = () => resolve();
    delReq.onerror = () => reject(delReq.error);
  });
}