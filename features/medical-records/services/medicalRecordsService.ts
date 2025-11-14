import { 
  LabTest, 
  MedicalImage, 
  Prescription, 
  MedicalReport, 
  SearchFilters,
  FileMetadata 
} from '../types/medicalRecords.types';
import { FileStorageService } from './fileStorageService';

export class MedicalRecordsService {
  private static readonly LAB_TESTS_KEY = 'medical_lab_tests';
  private static readonly MEDICAL_IMAGES_KEY = 'medical_images';
  private static readonly PRESCRIPTIONS_KEY = 'medical_prescriptions';
  private static readonly MEDICAL_REPORTS_KEY = 'medical_reports';

  private fileStorageService: FileStorageService;

  constructor() {
    this.fileStorageService = new FileStorageService();
  }

  // Lab Tests Management
  async getLabTests(): Promise<LabTest[]> {
    const stored = localStorage.getItem(MedicalRecordsService.LAB_TESTS_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  async addLabTest(test: LabTest): Promise<void> {
    const tests = await this.getLabTests();
    tests.push(test);
    localStorage.setItem(MedicalRecordsService.LAB_TESTS_KEY, JSON.stringify(tests));
  }

  async updateLabTest(id: string, updates: Partial<LabTest>): Promise<void> {
    const tests = await this.getLabTests();
    const index = tests.findIndex(test => test.id === id);
    if (index !== -1) {
      tests[index] = { ...tests[index], ...updates };
      localStorage.setItem(MedicalRecordsService.LAB_TESTS_KEY, JSON.stringify(tests));
    }
  }

  async deleteLabTest(id: string): Promise<void> {
    const tests = await this.getLabTests();
    const filtered = tests.filter(test => test.id !== id);
    localStorage.setItem(MedicalRecordsService.LAB_TESTS_KEY, JSON.stringify(filtered));
  }

  // Medical Images Management
  async getMedicalImages(): Promise<MedicalImage[]> {
    const stored = localStorage.getItem(MedicalRecordsService.MEDICAL_IMAGES_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  async addMedicalImage(image: MedicalImage): Promise<void> {
    const images = await this.getMedicalImages();
    images.push(image);
    localStorage.setItem(MedicalRecordsService.MEDICAL_IMAGES_KEY, JSON.stringify(images));
  }

  async updateMedicalImage(id: string, updates: Partial<MedicalImage>): Promise<void> {
    const images = await this.getMedicalImages();
    const index = images.findIndex(image => image.id === id);
    if (index !== -1) {
      images[index] = { ...images[index], ...updates };
      localStorage.setItem(MedicalRecordsService.MEDICAL_IMAGES_KEY, JSON.stringify(images));
    }
  }

  async deleteMedicalImage(id: string): Promise<void> {
    const images = await this.getMedicalImages();
    const image = images.find(img => img.id === id);
    if (image?.fileId) {
      await this.fileStorageService.deleteFile(image.fileId);
    }
    const filtered = images.filter(img => img.id !== id);
    localStorage.setItem(MedicalRecordsService.MEDICAL_IMAGES_KEY, JSON.stringify(filtered));
  }

  // Prescriptions Management
  async getPrescriptions(): Promise<Prescription[]> {
    const stored = localStorage.getItem(MedicalRecordsService.PRESCRIPTIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  async addPrescription(prescription: Prescription): Promise<void> {
    const prescriptions = await this.getPrescriptions();
    prescriptions.push(prescription);
    localStorage.setItem(MedicalRecordsService.PRESCRIPTIONS_KEY, JSON.stringify(prescriptions));
  }

  async updatePrescription(id: string, updates: Partial<Prescription>): Promise<void> {
    const prescriptions = await this.getPrescriptions();
    const index = prescriptions.findIndex(presc => presc.id === id);
    if (index !== -1) {
      prescriptions[index] = { ...prescriptions[index], ...updates };
      localStorage.setItem(MedicalRecordsService.PRESCRIPTIONS_KEY, JSON.stringify(prescriptions));
    }
  }

  async deletePrescription(id: string): Promise<void> {
    const prescriptions = await this.getPrescriptions();
    const prescription = prescriptions.find(presc => presc.id === id);
    if (prescription?.fileId) {
      await this.fileStorageService.deleteFile(prescription.fileId);
    }
    const filtered = prescriptions.filter(presc => presc.id !== id);
    localStorage.setItem(MedicalRecordsService.PRESCRIPTIONS_KEY, JSON.stringify(filtered));
  }

  // Medical Reports Management
  async getMedicalReports(): Promise<MedicalReport[]> {
    const stored = localStorage.getItem(MedicalRecordsService.MEDICAL_REPORTS_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  async addMedicalReport(report: MedicalReport): Promise<void> {
    const reports = await this.getMedicalReports();
    reports.push(report);
    localStorage.setItem(MedicalRecordsService.MEDICAL_REPORTS_KEY, JSON.stringify(reports));
  }

  async updateMedicalReport(id: string, updates: Partial<MedicalReport>): Promise<void> {
    const reports = await this.getMedicalReports();
    const index = reports.findIndex(report => report.id === id);
    if (index !== -1) {
      reports[index] = { ...reports[index], ...updates };
      localStorage.setItem(MedicalRecordsService.MEDICAL_REPORTS_KEY, JSON.stringify(reports));
    }
  }

  async deleteMedicalReport(id: string): Promise<void> {
    const reports = await this.getMedicalReports();
    const report = reports.find(rep => rep.id === id);
    if (report?.fileId) {
      await this.fileStorageService.deleteFile(report.fileId);
    }
    const filtered = reports.filter(rep => rep.id !== id);
    localStorage.setItem(MedicalRecordsService.MEDICAL_REPORTS_KEY, JSON.stringify(filtered));
  }

  // File Management
  async uploadFile(file: File, encrypt: boolean = true): Promise<FileMetadata> {
    return await this.fileStorageService.storeFile(file, encrypt);
  }

  async downloadFile(fileId: string): Promise<{ metadata: FileMetadata; file: File } | null> {
    return await this.fileStorageService.retrieveFile(fileId);
  }

  // Search and Filter
  async searchRecords(query: string, filters: SearchFilters): Promise<{
    labTests: LabTest[];
    medicalImages: MedicalImage[];
    prescriptions: Prescription[];
    medicalReports: MedicalReport[];
  }> {
    const [labTests, medicalImages, prescriptions, medicalReports] = await Promise.all([
      this.getLabTests(),
      this.getMedicalImages(),
      this.getPrescriptions(),
      this.getMedicalReports()
    ]);

    const lowerQuery = query.toLowerCase();
    
    const filterByDate = (date: string): boolean => {
      if (!filters.dateFrom && !filters.dateTo) return true;
      
      const itemDate = new Date(date);
      const fromDate = filters.dateFrom ? new Date(filters.dateFrom) : null;
      const toDate = filters.dateTo ? new Date(filters.dateTo) : null;
      
      if (fromDate && itemDate < fromDate) return false;
      if (toDate && itemDate > toDate) return false;
      
      return true;
    };

    const filterByQuery = (text: string): boolean => {
      if (!query) return true;
      return text.toLowerCase().includes(lowerQuery);
    };

    const filteredLabTests = labTests.filter(test => {
      if (!filterByDate(test.testDate)) return false;
      if (filters.physician && !test.physician.includes(filters.physician)) return false;
      if (filters.documentType && filters.documentType !== 'lab' && filters.documentType !== 'all') return false;
      
      const searchableText = `${test.testName} ${test.result} ${test.physician} ${test.notes || ''}`;
      return filterByQuery(searchableText);
    });

    const filteredMedicalImages = medicalImages.filter(image => {
      if (!filterByDate(image.imageDate)) return false;
      if (filters.physician && !image.physician.includes(filters.physician)) return false;
      if (filters.bodyPart && !image.bodyPart.includes(filters.bodyPart)) return false;
      if (filters.documentType && filters.documentType !== 'image' && filters.documentType !== 'all') return false;
      
      const searchableText = `${image.title} ${image.description || ''} ${image.physician} ${image.bodyPart}`;
      return filterByQuery(searchableText);
    });

    const filteredPrescriptions = prescriptions.filter(prescription => {
      if (!filterByDate(prescription.prescriptionDate)) return false;
      if (filters.physician && !prescription.physician.includes(filters.physician)) return false;
      if (filters.documentType && filters.documentType !== 'prescription' && filters.documentType !== 'all') return false;
      
      const medicationsText = prescription.medications.map(med => `${med.name} ${med.dosage}`).join(' ');
      const searchableText = `${medicationsText} ${prescription.physician} ${prescription.diagnosis || ''} ${prescription.notes || ''} ${prescription.ocrText || ''}`;
      return filterByQuery(searchableText);
    });

    const filteredMedicalReports = medicalReports.filter(report => {
      if (!filterByDate(report.reportDate)) return false;
      if (filters.physician && !report.physician.includes(filters.physician)) return false;
      if (filters.medicalCondition && report.reportType !== filters.medicalCondition) return false;
      if (filters.documentType && filters.documentType !== 'report' && filters.documentType !== 'all') return false;
      
      const searchableText = `${report.title} ${report.summary} ${report.details} ${report.physician} ${report.recommendations || ''}`;
      return filterByQuery(searchableText);
    });

    return {
      labTests: filteredLabTests,
      medicalImages: filteredMedicalImages,
      prescriptions: filteredPrescriptions,
      medicalReports: filteredMedicalReports
    };
  }

  // Statistics
  async getStatistics(): Promise<{
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
  }> {
    const [labTests, medicalImages, prescriptions, medicalReports] = await Promise.all([
      this.getLabTests(),
      this.getMedicalImages(),
      this.getPrescriptions(),
      this.getMedicalReports()
    ]);

    const recentActivity = [
      ...labTests.map(test => ({
        type: 'lab',
        date: test.testDate,
        title: test.testName
      })),
      ...medicalImages.map(image => ({
        type: 'image',
        date: image.imageDate,
        title: image.title
      })),
      ...prescriptions.map(presc => ({
        type: 'prescription',
        date: presc.prescriptionDate,
        title: `نسخه از ${presc.physician}`
      })),
      ...medicalReports.map(report => ({
        type: 'report',
        date: report.reportDate,
        title: report.title
      }))
    ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);

    return {
      totalRecords: labTests.length + medicalImages.length + prescriptions.length + medicalReports.length,
      labTestsCount: labTests.length,
      imagesCount: medicalImages.length,
      prescriptionsCount: prescriptions.length,
      reportsCount: medicalReports.length,
      recentActivity
    };
  }
}