// Simple Web Crypto utilities for Master Password and AES-GCM encryption
// NOTE: Keys are never persisted. Only salts/params and encrypted checks are stored.

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export const bytesToBase64 = (bytes: ArrayBuffer | Uint8Array): string => {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = '';
  for (let i = 0; i < arr.byteLength; i++) binary += String.fromCharCode(arr[i]);
  return btoa(binary);
};

export const base64ToBytes = (b64: string): Uint8Array => {
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

export const randomBytes = (length = 16): Uint8Array => {
  const buf = new Uint8Array(length);
  crypto.getRandomValues(buf);
  return buf;
};

export async function deriveKeyFromPassword(password: string, salt: Uint8Array, iterations = 200_000): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptString(plaintext: string, key: CryptoKey): Promise<{ iv: string; ct: string }> {
  const iv = randomBytes(12);
  const data = textEncoder.encode(plaintext);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
  return { iv: bytesToBase64(iv), ct: bytesToBase64(ct) };
}

export async function decryptString(payload: { iv: string; ct: string }, key: CryptoKey): Promise<string> {
  const iv = base64ToBytes(payload.iv);
  const ctBytes = base64ToBytes(payload.ct);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ctBytes);
  return textDecoder.decode(pt);
}

// File encryption utilities for medical records
export async function generateFileChecksum(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return bytesToBase64(hashBuffer);
}

export async function encryptFile(file: File, key: CryptoKey): Promise<{ iv: string; ct: string; checksum: string }> {
  const checksum = await generateFileChecksum(file);
  const buffer = await file.arrayBuffer();
  const iv = randomBytes(12);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, buffer);
  return { iv: bytesToBase64(iv), ct: bytesToBase64(ct), checksum };
}

export async function decryptFile(encryptedData: { iv: string; ct: string }, key: CryptoKey): Promise<ArrayBuffer> {
  const iv = base64ToBytes(encryptedData.iv);
  const ctBytes = base64ToBytes(encryptedData.ct);
  return await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ctBytes);
}