import { FileMetadata } from '../types/medicalRecords.types';
import { generateFileChecksum, encryptFile, decryptFile } from '../../../lib/crypto';

export class FileStorageService {
  private static readonly DB_NAME = 'MedicalRecordsDB';
  private static readonly STORE_NAME = 'files';
  private static readonly VERSION = 1;

  private db: IDBDatabase | null = null;

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(FileStorageService.DB_NAME, FileStorageService.VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(FileStorageService.STORE_NAME)) {
          const store = db.createObjectStore(FileStorageService.STORE_NAME, { keyPath: 'id' });
          store.createIndex('fileName', 'fileName', { unique: false });
          store.createIndex('uploadDate', 'uploadDate', { unique: false });
          store.createIndex('fileType', 'fileType', { unique: false });
        }
      };
    });
  }

  async storeFile(file: File, encrypt: boolean = true): Promise<FileMetadata> {
    if (!this.db) {
      await this.initialize();
    }

    const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const checksum = await generateFileChecksum(file);
    
    let fileData: ArrayBuffer;
    let encryptionKey: string | undefined;

    if (encrypt) {
      const encryptionResult = await encryptFile(file);
      fileData = encryptionResult.encryptedData;
      encryptionKey = encryptionResult.key;
    } else {
      fileData = await file.arrayBuffer();
    }

    const metadata: FileMetadata = {
      id: fileId,
      fileName: fileId,
      originalName: file.name,
      fileSize: file.size,
      fileType: file.type,
      uploadDate: new Date().toISOString(),
      encrypted: encrypt,
      encryptionKey,
      checksum
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([FileStorageService.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(FileStorageService.STORE_NAME);
      
      const request = store.add({
        ...metadata,
        data: fileData
      });

      request.onsuccess = () => resolve(metadata);
      request.onerror = () => reject(request.error);
    });
  }

  async retrieveFile(fileId: string): Promise<{ metadata: FileMetadata; file: File } | null> {
    if (!this.db) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([FileStorageService.STORE_NAME], 'readonly');
      const store = transaction.objectStore(FileStorageService.STORE_NAME);
      
      const request = store.get(fileId);

      request.onsuccess = async () => {
        const result = request.result;
        if (!result) {
          resolve(null);
          return;
        }

        let fileData: ArrayBuffer = result.data;

        if (result.encrypted && result.encryptionKey) {
          fileData = await decryptFile(fileData, result.encryptionKey);
        }

        const file = new File([fileData], result.originalName, { type: result.fileType });
        
        resolve({
          metadata: result,
          file
        });
      };

      request.onerror = () => reject(request.error);
    });
  }

  async deleteFile(fileId: string): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([FileStorageService.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(FileStorageService.STORE_NAME);
      
      const request = store.delete(fileId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAllFiles(): Promise<FileMetadata[]> {
    if (!this.db) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([FileStorageService.STORE_NAME], 'readonly');
      const store = transaction.objectStore(FileStorageService.STORE_NAME);
      
      const request = store.getAll();

      request.onsuccess = () => {
        const files = request.result.map(({ data, ...metadata }) => metadata);
        resolve(files);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async clearAllFiles(): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([FileStorageService.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(FileStorageService.STORE_NAME);
      
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}