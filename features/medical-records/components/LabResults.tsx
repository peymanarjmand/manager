import React, { useState } from 'react';
import { Plus, Search, Calendar, User, FileText, Trash2, Edit, Download } from 'lucide-react';
import { LabTest } from '../types/medicalRecords.types';

interface LabResultsProps {
  labTests: LabTest[];
  onAddLabTest: (test: Omit<LabTest, 'id'>) => void;
  onUpdateLabTest: (id: string, updates: Partial<LabTest>) => void;
  onDeleteLabTest: (id: string) => void;
}

export const LabResults: React.FC<LabResultsProps> = ({
  labTests,
  onAddLabTest,
  onUpdateLabTest,
  onDeleteLabTest
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTest, setEditingTest] = useState<LabTest | null>(null);

  const getStatusColor = (status: LabTest['status']) => {
    switch (status) {
      case 'normal':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'abnormal':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusLabel = (status: LabTest['status']) => {
    switch (status) {
      case 'normal':
        return 'نرمال';
      case 'abnormal':
        return 'غیرنرمال';
      case 'critical':
        return 'بحرانی';
      default:
        return 'نامشخص';
    }
  };

  const filteredTests = labTests.filter(test =>
    test.testName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    test.physician.toLowerCase().includes(searchQuery.toLowerCase()) ||
    test.result.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedTests = filteredTests.sort((a, b) =>
    new Date(b.testDate).getTime() - new Date(a.testDate).getTime()
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const testData = {
      testName: formData.get('testName') as string,
      testDate: formData.get('testDate') as string,
      result: formData.get('result') as string,
      unit: formData.get('unit') as string,
      normalRange: formData.get('normalRange') as string,
      status: formData.get('status') as LabTest['status'],
      labName: formData.get('labName') as string,
      physician: formData.get('physician') as string,
      notes: formData.get('notes') as string
    };

    if (editingTest) {
      onUpdateLabTest(editingTest.id, testData);
      setEditingTest(null);
    } else {
      onAddLabTest(testData);
    }
    
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          نتایج آزمایش‌ها
        </h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4 ml-2" />
          افزودن آزمایش
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="جستجو در آزمایش‌ها..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pr-10 pl-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        />
      </div>

      {/* Add/Edit Form */}
      {(showAddForm || editingTest) && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {editingTest ? 'ویرایش آزمایش' : 'افزودن آزمایش جدید'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                نام آزمایش
              </label>
              <input
                name="testName"
                type="text"
                required
                defaultValue={editingTest?.testName || ''}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                تاریخ آزمایش
              </label>
              <input
                name="testDate"
                type="date"
                required
                defaultValue={editingTest?.testDate || ''}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                نتیجه
              </label>
              <input
                name="result"
                type="text"
                required
                defaultValue={editingTest?.result || ''}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                واحد اندازه‌گیری
              </label>
              <input
                name="unit"
                type="text"
                defaultValue={editingTest?.unit || ''}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                محدوده نرمال
              </label>
              <input
                name="normalRange"
                type="text"
                defaultValue={editingTest?.normalRange || ''}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                وضعیت
              </label>
              <select
                name="status"
                required
                defaultValue={editingTest?.status || 'normal'}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="normal">نرمال</option>
                <option value="abnormal">غیرنرمال</option>
                <option value="critical">بحرانی</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                نام آزمایشگاه
              </label>
              <input
                name="labName"
                type="text"
                defaultValue={editingTest?.labName || ''}
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
                defaultValue={editingTest?.physician || ''}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                یادداشت‌ها
              </label>
              <textarea
                name="notes"
                rows={3}
                defaultValue={editingTest?.notes || ''}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div className="md:col-span-2 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingTest(null);
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                انصراف
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                {editingTest ? 'بروزرسانی' : 'افزودن'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lab Tests List */}
      <div className="space-y-4">
        {sortedTests.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery ? 'آزمایشی یافت نشد' : 'هنوز آزمایشی ثبت نشده است'}
            </p>
          </div>
        ) : (
          sortedTests.map((test) => (
            <div
              key={test.id}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-4 mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {test.testName}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(test.status)}`}>
                      {getStatusLabel(test.status)}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">نتیجه</p>
                      <p className="text-gray-900 dark:text-gray-100 font-medium">{test.result} {test.unit}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">محدوده نرمال</p>
                      <p className="text-gray-900 dark:text-gray-100">{test.normalRange}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">تاریخ</p>
                      <p className="text-gray-900 dark:text-gray-100 flex items-center">
                        <Calendar className="w-4 h-4 ml-1" />
                        {new Date(test.testDate).toLocaleDateString('fa-IR')}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">پزشک</p>
                      <p className="text-gray-900 dark:text-gray-100 flex items-center">
                        <User className="w-4 h-4 ml-1" />
                        {test.physician}
                      </p>
                    </div>
                  </div>

                  {test.labName && (
                    <div className="mt-3">
                      <p className="text-gray-500 dark:text-gray-400">آزمایشگاه</p>
                      <p className="text-gray-900 dark:text-gray-100">{test.labName}</p>
                    </div>
                  )}

                  {test.notes && (
                    <div className="mt-3">
                      <p className="text-gray-500 dark:text-gray-400">یادداشت‌ها</p>
                      <p className="text-gray-900 dark:text-gray-100">{test.notes}</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2 mr-4">
                  <button
                    onClick={() => setEditingTest(test)}
                    className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                    title="ویرایش"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('آیا از حذف این آزمایش اطمینان دارید؟')) {
                        onDeleteLabTest(test.id);
                      }
                    }}
                    className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                    title="حذف"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};