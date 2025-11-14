import React, { useState, useEffect } from 'react';
import { Search, Filter, BarChart3, Calendar, User, FileText, Plus, Download, ArrowRight } from 'lucide-react';
import { LabResults } from './components/LabResults';
import { MedicalImages } from './components/MedicalImages';
import { Prescriptions } from './components/Prescriptions';
import { Reports } from './components/Reports';
import { useMedicalRecordsStore } from './store/medicalRecordsStore';
import { LabTest, MedicalImage, Prescription, MedicalReport, SearchFilters } from './types/medicalRecords.types';

interface MedicalRecordsProps {
  onNavigateBack: () => void;
}

export const MedicalRecords: React.FC<MedicalRecordsProps> = ({ onNavigateBack }) => {
  const {
    labTests,
    medicalImages,
    prescriptions,
    medicalReports,
    isLoading,
    error,
    searchQuery,
    searchFilters,
    selectedTab,
    loadAllData,
    addLabTest,
    updateLabTest,
    deleteLabTest,
    addMedicalImage,
    updateMedicalImage,
    deleteMedicalImage,
    addPrescription,
    updatePrescription,
    deletePrescription,
    addMedicalReport,
    updateMedicalReport,
    deleteMedicalReport,
    searchRecords,
    uploadFile,
    setSearchQuery,
    setSearchFilters,
    setSelectedTab,
    getStatistics
  } = useMedicalRecordsStore();

  const [showStatistics, setShowStatistics] = useState(false);
  const [statistics, setStatistics] = useState<any>(null);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    if (searchQuery || Object.keys(searchFilters).length > 0) {
      searchRecords(searchQuery, searchFilters);
    }
  }, [searchQuery, searchFilters]);

  const handleTabChange = (tab: 'lab' | 'images' | 'prescriptions' | 'reports' | 'all') => {
    setSelectedTab(tab);
    if (tab === 'all') {
      loadAllData();
    }
  };

  const handleShowStatistics = async () => {
    try {
      const stats = await getStatistics();
      setStatistics(stats);
      setShowStatistics(true);
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  const handleExportPDF = () => {
    // TODO: Implement PDF export functionality
    alert('امکان خروجی PDF به زودی اضافه خواهد شد');
  };

  const tabs = [
    { id: 'all', name: 'همه موارد', icon: FileText },
    { id: 'lab', name: 'آزمایش‌ها', icon: BarChart3 },
    { id: 'images', name: 'تصاویر', icon: Search },
    { id: 'prescriptions', name: 'نسخه‌ها', icon: Plus },
    { id: 'reports', name: 'گزارش‌ها', icon: Calendar }
  ];

  if (isLoading && !labTests.length && !medicalImages.length && !prescriptions.length && !medicalReports.length) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        {/* Back Button */}
        <div className="mb-4">
          <button
            onClick={onNavigateBack}
            className="inline-flex items-center px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >
            <ArrowRight className="w-4 h-4 ml-2" />
            بازگشت به داشبورد
          </button>
        </div>
        
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              پرونده‌های پزشکی دیجیتال
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              مدیریت کامل پرونده‌های پزشکی، آزمایش‌ها، تصاویر و نسخه‌های شما
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleShowStatistics}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <BarChart3 className="w-4 h-4 ml-2" />
              آمار و گزارش‌ها
            </button>
            <button
              onClick={handleExportPDF}
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Download className="w-4 h-4 ml-2" />
              خروجی PDF
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex items-center space-x-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="جستجو در تمام پرونده‌های پزشکی..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-10 pl-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
          </div>
          <button
            onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
            className="inline-flex items-center px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Filter className="w-4 h-4 ml-2" />
            جستجوی پیشرفته
          </button>
        </div>

        {/* Advanced Search */}
        {showAdvancedSearch && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              فیلترهای جستجو
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  از تاریخ
                </label>
                <input
                  type="date"
                  value={searchFilters.dateFrom || ''}
                  onChange={(e) => setSearchFilters({ ...searchFilters, dateFrom: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  تا تاریخ
                </label>
                <input
                  type="date"
                  value={searchFilters.dateTo || ''}
                  onChange={(e) => setSearchFilters({ ...searchFilters, dateTo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  نوع سند
                </label>
                <select
                  value={searchFilters.documentType || 'all'}
                  onChange={(e) => setSearchFilters({ ...searchFilters, documentType: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="all">همه موارد</option>
                  <option value="lab">آزمایش‌ها</option>
                  <option value="image">تصاویر</option>
                  <option value="prescription">نسخه‌ها</option>
                  <option value="report">گزارش‌ها</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  پزشک معالج
                </label>
                <input
                  type="text"
                  placeholder="نام پزشک..."
                  value={searchFilters.physician || ''}
                  onChange={(e) => setSearchFilters({ ...searchFilters, physician: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  بیماری/شرایط پزشکی
                </label>
                <input
                  type="text"
                  placeholder="نام بیماری..."
                  value={searchFilters.medicalCondition || ''}
                  onChange={(e) => setSearchFilters({ ...searchFilters, medicalCondition: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  عضو بدن
                </label>
                <input
                  type="text"
                  placeholder="نام عضو..."
                  value={searchFilters.bodyPart || ''}
                  onChange={(e) => setSearchFilters({ ...searchFilters, bodyPart: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id as any)}
                  className={`inline-flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    selectedTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4 ml-2" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-800 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Content */}
      <div className="space-y-8">
        {selectedTab === 'all' && (
          <>
            <LabResults
              labTests={labTests}
              onAddLabTest={addLabTest}
              onUpdateLabTest={updateLabTest}
              onDeleteLabTest={deleteLabTest}
            />
            <MedicalImages
              medicalImages={medicalImages}
              onAddMedicalImage={addMedicalImage}
              onUpdateMedicalImage={updateMedicalImage}
              onDeleteMedicalImage={deleteMedicalImage}
              onUploadFile={uploadFile}
            />
            <Prescriptions
              prescriptions={prescriptions}
              onAddPrescription={addPrescription}
              onUpdatePrescription={updatePrescription}
              onDeletePrescription={deletePrescription}
              onUploadFile={uploadFile}
            />
            <Reports
              medicalReports={medicalReports}
              onAddMedicalReport={addMedicalReport}
              onUpdateMedicalReport={updateMedicalReport}
              onDeleteMedicalReport={deleteMedicalReport}
            />
          </>
        )}
        
        {selectedTab === 'lab' && (
          <LabResults
            labTests={labTests}
            onAddLabTest={addLabTest}
            onUpdateLabTest={updateLabTest}
            onDeleteLabTest={deleteLabTest}
          />
        )}
        
        {selectedTab === 'images' && (
          <MedicalImages
            medicalImages={medicalImages}
            onAddMedicalImage={addMedicalImage}
            onUpdateMedicalImage={updateMedicalImage}
            onDeleteMedicalImage={deleteMedicalImage}
            onUploadFile={uploadFile}
          />
        )}
        
        {selectedTab === 'prescriptions' && (
          <Prescriptions
            prescriptions={prescriptions}
            onAddPrescription={addPrescription}
            onUpdatePrescription={updatePrescription}
            onDeletePrescription={deletePrescription}
            onUploadFile={uploadFile}
          />
        )}
        
        {selectedTab === 'reports' && (
          <Reports
            medicalReports={medicalReports}
            onAddMedicalReport={addMedicalReport}
            onUpdateMedicalReport={updateMedicalReport}
            onDeleteMedicalReport={deleteMedicalReport}
          />
        )}
      </div>

      {/* Statistics Modal */}
      {showStatistics && statistics && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  آمار و گزارش‌ها
                </h2>
                <button
                  onClick={() => setShowStatistics(false)}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {statistics.totalRecords}
                  </div>
                  <div className="text-sm text-blue-800 dark:text-blue-300">کل پرونده‌ها</div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {statistics.labTestsCount}
                  </div>
                  <div className="text-sm text-green-800 dark:text-green-300">آزمایش‌ها</div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {statistics.imagesCount}
                  </div>
                  <div className="text-sm text-purple-800 dark:text-purple-300">تصاویر</div>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {statistics.prescriptionsCount}
                  </div>
                  <div className="text-sm text-orange-800 dark:text-orange-300">نسخه‌ها</div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  فعالیت‌های اخیر
                </h3>
                <div className="space-y-3">
                  {statistics.recentActivity.map((activity: any, index: number) => (
                    <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-gray-900 dark:text-gray-100">{activity.title}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(activity.date).toLocaleDateString('fa-IR')}
                        </p>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {activity.type === 'lab' && 'آزمایش'}
                        {activity.type === 'image' && 'تصویر'}
                        {activity.type === 'prescription' && 'نسخه'}
                        {activity.type === 'report' && 'گزارش'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};