import { create } from 'zustand';
import { 
  LabTest, 
  MedicalImage, 
  Prescription, 
  MedicalReport, 
  MedicalRecordState,
  SearchFilters,
  MedicalRecordType
} from '../types/medicalRecords.types';
import { MedicalRecordsService } from '../services/medicalRecordsService';

interface MedicalRecordsStore extends MedicalRecordState {
  // Actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSearchQuery: (query: string) => void;
  setSearchFilters: (filters: SearchFilters) => void;
  setSelectedTab: (tab: MedicalRecordState['selectedTab']) => void;
  
  // Data loading
  loadAllData: () => Promise<void>;
  
  // Lab Tests
  addLabTest: (test: LabTest) => Promise<void>;
  updateLabTest: (id: string, updates: Partial<LabTest>) => Promise<void>;
  deleteLabTest: (id: string) => Promise<void>;
  
  // Medical Images
  addMedicalImage: (image: MedicalImage) => Promise<void>;
  updateMedicalImage: (id: string, updates: Partial<MedicalImage>) => Promise<void>;
  deleteMedicalImage: (id: string) => Promise<void>;
  
  // Prescriptions
  addPrescription: (prescription: Prescription) => Promise<void>;
  updatePrescription: (id: string, updates: Partial<Prescription>) => Promise<void>;
  deletePrescription: (id: string) => Promise<void>;
  
  // Medical Reports
  addMedicalReport: (report: MedicalReport) => Promise<void>;
  updateMedicalReport: (id: string, updates: Partial<MedicalReport>) => Promise<void>;
  deleteMedicalReport: (id: string) => Promise<void>;
  
  // Search
  searchRecords: (query: string, filters?: SearchFilters) => Promise<void>;
  
  // File Management
  uploadFile: (file: File, encrypt?: boolean) => Promise<string>;
  
  // Statistics
  getStatistics: () => Promise<{
    totalRecords: number;
    labTestsCount: number;
    imagesCount: number;
    prescriptionsCount: number;
    reportsCount: number;
    recentActivity: Array<{
      type: string;
      date: string;
      title: string;
    }>;
  }>;
}

const medicalRecordsService = new MedicalRecordsService();

export const useMedicalRecordsStore = create<MedicalRecordsStore>((set, get) => ({
  // Initial state
  labTests: [],
  medicalImages: [],
  prescriptions: [],
  medicalReports: [],
  files: new Map(),
  isLoading: false,
  error: null,
  searchQuery: '',
  searchFilters: {},
  selectedTab: 'all',

  // Actions
  setLoading: (loading) => set({ isLoading: loading }),
  
  setError: (error) => set({ error }),
  
  setSearchQuery: (query) => set({ searchQuery: query }),
  
  setSearchFilters: (filters) => set({ searchFilters: filters }),
  
  setSelectedTab: (tab) => set({ selectedTab: tab }),

  // Data loading
  loadAllData: async () => {
    set({ isLoading: true, error: null });
    try {
      const [labTests, medicalImages, prescriptions, medicalReports] = await Promise.all([
        medicalRecordsService.getLabTests(),
        medicalRecordsService.getMedicalImages(),
        medicalRecordsService.getPrescriptions(),
        medicalRecordsService.getMedicalReports()
      ]);

      set({
        labTests,
        medicalImages,
        prescriptions,
        medicalReports,
        isLoading: false
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'خطا در بارگذاری داده‌ها',
        isLoading: false 
      });
    }
  },

  // Lab Tests
  addLabTest: async (test) => {
    set({ isLoading: true, error: null });
    try {
      await medicalRecordsService.addLabTest(test);
      const labTests = await medicalRecordsService.getLabTests();
      set({ labTests, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'خطا در افزودن آزمایش',
        isLoading: false 
      });
    }
  },

  updateLabTest: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      await medicalRecordsService.updateLabTest(id, updates);
      const labTests = await medicalRecordsService.getLabTests();
      set({ labTests, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'خطا در بروزرسانی آزمایش',
        isLoading: false 
      });
    }
  },

  deleteLabTest: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await medicalRecordsService.deleteLabTest(id);
      const labTests = await medicalRecordsService.getLabTests();
      set({ labTests, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'خطا در حذف آزمایش',
        isLoading: false 
      });
    }
  },

  // Medical Images
  addMedicalImage: async (image) => {
    set({ isLoading: true, error: null });
    try {
      await medicalRecordsService.addMedicalImage(image);
      const medicalImages = await medicalRecordsService.getMedicalImages();
      set({ medicalImages, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'خطا در افزودن تصویر',
        isLoading: false 
      });
    }
  },

  updateMedicalImage: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      await medicalRecordsService.updateMedicalImage(id, updates);
      const medicalImages = await medicalRecordsService.getMedicalImages();
      set({ medicalImages, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'خطا در بروزرسانی تصویر',
        isLoading: false 
      });
    }
  },

  deleteMedicalImage: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await medicalRecordsService.deleteMedicalImage(id);
      const medicalImages = await medicalRecordsService.getMedicalImages();
      set({ medicalImages, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'خطا در حذف تصویر',
        isLoading: false 
      });
    }
  },

  // Prescriptions
  addPrescription: async (prescription) => {
    set({ isLoading: true, error: null });
    try {
      await medicalRecordsService.addPrescription(prescription);
      const prescriptions = await medicalRecordsService.getPrescriptions();
      set({ prescriptions, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'خطا در افزودن نسخه',
        isLoading: false 
      });
    }
  },

  updatePrescription: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      await medicalRecordsService.updatePrescription(id, updates);
      const prescriptions = await medicalRecordsService.getPrescriptions();
      set({ prescriptions, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'خطا در بروزرسانی نسخه',
        isLoading: false 
      });
    }
  },

  deletePrescription: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await medicalRecordsService.deletePrescription(id);
      const prescriptions = await medicalRecordsService.getPrescriptions();
      set({ prescriptions, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'خطا در حذف نسخه',
        isLoading: false 
      });
    }
  },

  // Medical Reports
  addMedicalReport: async (report) => {
    set({ isLoading: true, error: null });
    try {
      await medicalRecordsService.addMedicalReport(report);
      const medicalReports = await medicalRecordsService.getMedicalReports();
      set({ medicalReports, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'خطا در افزودن گزارش',
        isLoading: false 
      });
    }
  },

  updateMedicalReport: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      await medicalRecordsService.updateMedicalReport(id, updates);
      const medicalReports = await medicalRecordsService.getMedicalReports();
      set({ medicalReports, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'خطا در بروزرسانی گزارش',
        isLoading: false 
      });
    }
  },

  deleteMedicalReport: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await medicalRecordsService.deleteMedicalReport(id);
      const medicalReports = await medicalRecordsService.getMedicalReports();
      set({ medicalReports, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'خطا در حذف گزارش',
        isLoading: false 
      });
    }
  },

  // Search
  searchRecords: async (query, filters) => {
    set({ isLoading: true, error: null });
    try {
      const searchFilters = filters || get().searchFilters;
      const results = await medicalRecordsService.searchRecords(query, searchFilters);
      
      set({
        labTests: results.labTests,
        medicalImages: results.medicalImages,
        prescriptions: results.prescriptions,
        medicalReports: results.medicalReports,
        searchQuery: query,
        searchFilters,
        isLoading: false
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'خطا در جستجو',
        isLoading: false 
      });
    }
  },

  // File Management
  uploadFile: async (file, encrypt = true) => {
    set({ isLoading: true, error: null });
    try {
      const metadata = await medicalRecordsService.uploadFile(file, encrypt);
      const files = new Map(get().files);
      files.set(metadata.id, metadata);
      set({ files, isLoading: false });
      return metadata.id;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'خطا در آپلود فایل',
        isLoading: false 
      });
      throw error;
    }
  },

  // Statistics
  getStatistics: async () => {
    set({ isLoading: true, error: null });
    try {
      const stats = await medicalRecordsService.getStatistics();
      set({ isLoading: false });
      return stats;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'خطا در دریافت آمار',
        isLoading: false 
      });
      throw error;
    }
  }
}));