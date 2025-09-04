// Ephemeral holder for the derived master CryptoKey (never persisted)
let _masterKey: CryptoKey | null = null;

export function setMasterKey(key: CryptoKey) {
  _masterKey = key;
}

export function getMasterKey(): CryptoKey | null {
  return _masterKey;
}

export function clearMasterKey() {
  _masterKey = null;
}