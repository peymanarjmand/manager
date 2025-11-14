export interface LabTest {
  id: string;
  testName: string;
  testDate: string;
  result: string;
  unit: string;
  normalRange: string;
  status: 'normal' | 'abnormal' | 'critical';
  labName: string;
  physician: string;
  notes?: string;
  fileId?: string;
}

export interface MedicalImage {
  id: string;
  imageType: 'radiology' | 'ultrasound' | 'mri' | 'ct-scan' | 'x-ray' | 'other';
  imageDate: string;
  title: string;
  description?: string;
  bodyPart: string;
  physician: string;
  clinic: string;
  fileId: string;
  thumbnailId?: string;
  metadata?: {
    width?: number;
    height?: number;
    size?: number;
    format?: string;
  };
}

export interface Prescription {
  id: string;
  prescriptionDate: string;
  physician: string;
  clinic: string;
  diagnosis?: string;
  medications: Medication[];
  notes?: string;
  fileId: string;
  ocrText?: string;
}

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface MedicalReport {
  id: string;
  reportDate: string;
  reportType: 'cardiology' | 'neurology' | 'orthopedic' | 'general' | 'other';
  title: string;
  physician: string;
  hospital: string;
  summary: string;
  details: string;
  recommendations?: string;
  fileId?: string;
  followUpDate?: string;
}

export interface FileMetadata {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadDate: string;
  encrypted: boolean;
  encryptionKey?: string;
  checksum: string;
  originalName: string;
}

export interface SearchFilters {
  dateFrom?: string;
  dateTo?: string;
  documentType?: 'lab' | 'image' | 'prescription' | 'report' | 'all';
  physician?: string;
  medicalCondition?: string;
  bodyPart?: string;
}

export interface MedicalRecordState {
  labTests: LabTest[];
  medicalImages: MedicalImage[];
  prescriptions: Prescription[];
  medicalReports: MedicalReport[];
  files: Map<string, FileMetadata>;
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  searchFilters: SearchFilters;
  selectedTab: 'lab' | 'images' | 'prescriptions' | 'reports' | 'all';
}

export type MedicalRecordType = 'lab' | 'image' | 'prescription' | 'report';