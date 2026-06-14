// Supabase-backed image store (replacing previous IndexedDB implementation)
import { supabase } from './supabase';

export const IMAGE_REF_PREFIX = 'lmimg:';

function genId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    // @ts-ignore
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function isImageRef(value?: string | null): boolean {
  return !!value && value.startsWith(IMAGE_REF_PREFIX);
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const commaIdx = dataUrl.indexOf(',');
  const header = dataUrl.slice(0, commaIdx);
  const base64 = dataUrl.slice(commaIdx + 1);
  const mimeMatch = header.match(/data:(.*?);base64/);
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function getExtFromMime(mime: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',
  };
  return map[mime] || 'bin';
}

export async function saveImageDataURL(
  dataUrl: string,
  onProgress?: (uploadedBytes: number, totalBytes: number) => void
): Promise<string> {
  const blob = await dataUrlToBlob(dataUrl);
  const mime = blob.type || 'application/octet-stream';
  const ext = getExtFromMime(mime);
  const id = genId();
  const path = `darfak/${id}.${ext}`;

  // Progress: slice into chunks and report
  const CHUNK_SIZE = 256 * 1024; // 256KB
  const total = blob.size;
  let uploaded = 0;
  const chunks: Blob[] = [];
  for (let i = 0; i < total; i += CHUNK_SIZE) {
    chunks.push(blob.slice(i, Math.min(i + CHUNK_SIZE, total)));
  }
  const combined = new Blob(chunks, { type: mime });
  const { error } = await supabase.storage.from('lm-images').upload(path, combined, { contentType: mime, upsert: false });
  if (error) throw error;
  // simulate progress as finished to update UI
  if (onProgress) onProgress(total, total);
  return IMAGE_REF_PREFIX + path;
}

export async function getBlobByRef(ref: string): Promise<Blob | null> {
  if (!isImageRef(ref)) return null;
  const path = ref.slice(IMAGE_REF_PREFIX.length);
  const { data, error } = await supabase.storage.from('lm-images').download(path);
  if (error) return null;
  return data as Blob;
}

// Signed URL TTL for viewing images. Long enough to outlast a normal session so
// on-screen images don't expire mid-use, while still being time-limited (works on
// a PRIVATE bucket, unlike getPublicUrl, so the lm-images bucket can be locked
// down — see the authenticated-only storage policies).
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24; // 24h

export async function getObjectURLByRef(ref: string): Promise<string | null> {
  if (!isImageRef(ref)) return null;
  const path = ref.slice(IMAGE_REF_PREFIX.length);
  const { data, error } = await supabase.storage.from('lm-images').createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error || !data) return null;
  return data.signedUrl || null;
}

export async function deleteImageByRef(ref: string): Promise<void> {
  if (!isImageRef(ref)) return;
  const path = ref.slice(IMAGE_REF_PREFIX.length);
  await supabase.storage.from('lm-images').remove([path]);
}