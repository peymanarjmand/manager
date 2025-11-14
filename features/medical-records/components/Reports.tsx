import React, { useState } from 'react';
import { Plus, Search, Calendar, User, FileText, Stethoscope, Trash2, Edit, Download } from 'lucide-react';
import { MedicalReport } from '../types/medicalRecords.types';

interface ReportsProps {
  medicalReports: MedicalReport[];
  onAddMedicalReport: (report: Omit<MedicalReport, 'id'>) => void;
  onUpdateMedicalReport: (id: string, updates: Partial<MedicalReport>) => void;
  onDeleteMedicalReport: (id: string) => void;
}

export const Reports: React.FC<ReportsProps> = ({
  medicalReports,
  onAddMedicalReport,
  onUpdateMedicalReport,
  onDeleteMedicalReport
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingReport, setEditingReport] = useState<MedicalReport | null>(null);

  const getReportTypeLabel = (type: string) => {
    const labels = {
      'cardiology': 'قلبی',
      'neurology': 'عصبی',
      'orthopedic': 'ارتوپدی',
      'general': 'عمومی',
      'other': 'سایر'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getReportTypeColor = (type: string) => {
    const colors = {
      'cardiology': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      'neurology': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'orthopedic': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'general': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'other': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    };
    return colors[type as keyof typeof colors] || colors['other'];
  };

  const filteredReports = medicalReports.filter(report =>
    report.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    report.physician.toLowerCase().includes(searchQuery.toLowerCase()) ||
    report.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
    report.details.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedReports = filteredReports.sort((a, b) =>
    new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime()
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const reportData = {
      reportDate: formData.get('reportDate') as string,
      reportType: formData.get('reportType') as MedicalReport['reportType'],
      title: formData.get('title') as string,
      physician: formData.get('physician') as string,
      hospital: formData.get('hospital') as string,
      summary: formData.get('summary') as string,
      details: formData.get('details') as string,
      recommendations: formData.get('recommendations') as string,
      followUpDate: formData.get('followUpDate') as string
    };

    if (editingReport) {
      onUpdateMedicalReport(editingReport.id, reportData);
      setEditingReport(null);
    } else {
      onAddMedicalReport(reportData);
    }
    
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          گزارش‌های پزشکی
        </h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4 ml-2" />
          افزودن گزارش
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="جستجو در گزارش‌ها..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pr-10 pl-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        />
      </div>

      {/* Add/Edit Form */}
      {(showAddForm || editingReport) && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {editingReport ? 'ویرایش گزارش' : 'افزودن گزارش جدید'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                تاریخ گزارش
              </label>
              <input
                name="reportDate"
                type="date"
                required
                defaultValue={editingReport?.reportDate || ''}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                نوع گزارش
              </label>
              <select
                name="reportType"
                required
                defaultValue={editingReport?.reportType || 'general'}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="cardiology">قلبی</option>
                <option value="neurology">عصبی</option>
                <option value="orthopedic">ارتوپدی</option>
                <option value="general">عمومی</option>
                <option value="other">سایر</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                عنوان گزارش
              </label>
              <input
                name="title"
                type="text"
                required
                defaultValue={editingReport?.title || ''}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                پزشک معالج
              </label>
              <input
                name="physician"
                type="text"
                required
                defaultValue={editingReport?.physician || ''}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                بیمارستان/کلینیک
              </label>
              <input
                name="hospital"
                type="text"
                required
                defaultValue={editingReport?.hospital || ''}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                خلاصه گزارش
              </label>
              <textarea
                name="summary"
                rows={3}
                required
                defaultValue={editingReport?.summary || ''}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                جزئیات کامل
              </label>
              <textarea
                name="details"
                rows={6}
                required
                defaultValue={editingReport?.details || ''}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                توصیه‌ها و پیشنهادها
              </label>
              <textarea
                name="recommendations"
                rows={3}
                defaultValue={editingReport?.recommendations || ''}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                تاریخ پیگیری
              </label>
              <input
                name="followUpDate"
                type="date"
                defaultValue={editingReport?.followUpDate || ''}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div className="md:col-span-2 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingReport(null);
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                انصراف
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                {editingReport ? 'بروزرسانی' : 'افزودن'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Reports List */}
      <div className="space-y-6">
        {sortedReports.length === 0 ? (
          <div className="text-center py-12">
            <Stethoscope className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery ? 'گزارشی یافت نشد' : 'هنوز گزارشی ثبت نشده است'}
            </p>
          </div>
        ) : (
          sortedReports.map((report) => (
            <div
              key={report.id}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-full">
                    <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                      {report.title}
                    </h3>
                    <div className="flex items-center space-x-3 mt-1">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getReportTypeColor(report.reportType)}`}>
                        {getReportTypeLabel(report.reportType)}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400">
                        {new Date(report.reportDate).toLocaleDateString('fa-IR')}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setEditingReport(report)}
                    className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                    title="ویرایش"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('آیا از حذف این گزارش اطمینان دارید؟')) {
                        onDeleteMedicalReport(report.id);
                      }
                    }}
                    className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                    title="حذف"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-gray-500 dark:text-gray-400 flex items-center mb-1">
                    <User className="w-4 h-4 ml-2" />
                    پزشک معالج
                  </p>
                  <p className="text-gray-900 dark:text-gray-100 font-medium">{report.physician}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400 flex items-center mb-1">
                    <Stethoscope className="w-4 h-4 ml-2" />
                    بیمارستان/کلینیک
                  </p>
                  <p className="text-gray-900 dark:text-gray-100">{report.hospital}</p>
                </div>
              </div>

              <div className="mb-4">
                <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-2">خلاصه</h4>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{report.summary}</p>
              </div>

              <div className="mb-4">
                <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-2">جزئیات</h4>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">{report.details}</p>
              </div>

              {report.recommendations && (
                <div className="mb-4">
                  <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-2">توصیه‌ها و پیشنهادها</h4>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">{report.recommendations}</p>
                </div>
              )}

              {report.followUpDate && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <p className="text-yellow-800 dark:text-yellow-300 font-medium">
                    تاریخ پیگیری: {new Date(report.followUpDate).toLocaleDateString('fa-IR')}
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};