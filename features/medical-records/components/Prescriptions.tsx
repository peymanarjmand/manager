import React, { useState } from 'react';
import { Plus, Search, Calendar, User, FileText, Pill, Clock, Trash2, Edit, Download, Camera } from 'lucide-react';
import { Prescription } from '../types/medicalRecords.types';
import { FileUpload } from './FileUpload';

interface PrescriptionsProps {
  prescriptions: Prescription[];
  onAddPrescription: (prescription: Omit<Prescription, 'id'>) => void;
  onUpdatePrescription: (id: string, updates: Partial<Prescription>) => void;
  onDeletePrescription: (id: string) => void;
  onUploadFile: (file: File) => Promise<string>;
  onDownloadFile?: (fileId: string) => Promise<{ metadata: any; file: File } | null>;
}

export const Prescriptions: React.FC<PrescriptionsProps> = ({
  prescriptions,
  onAddPrescription,
  onUpdatePrescription,
  onDeletePrescription,
  onUploadFile,
  onDownloadFile
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPrescription, setEditingPrescription] = useState<Prescription | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [medications, setMedications] = useState<Array<{ name: string; dosage: string; frequency: string; duration: string; instructions: string }>>([]);

  const filteredPrescriptions = prescriptions.filter(prescription =>
    prescription.physician.toLowerCase().includes(searchQuery.toLowerCase()) ||
    prescription.diagnosis?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    prescription.medications.some(med => 
      med.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const sortedPrescriptions = filteredPrescriptions.sort((a, b) =>
    new Date(b.prescriptionDate).getTime() - new Date(a.prescriptionDate).getTime()
  );

  const addMedication = () => {
    setMedications([...medications, { name: '', dosage: '', frequency: '', duration: '', instructions: '' }]);
  };

  const removeMedication = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  const updateMedication = (index: number, field: string, value: string) => {
    const updated = [...medications];
    updated[index] = { ...updated[index], [field]: value };
    setMedications(updated);
  };

  const handleFileUpload = async (file: File) => {
    try {
      const fileId = await onUploadFile(file);
      setUploadedFile(file);
      return fileId;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    if (!uploadedFile && !editingPrescription) {
      alert('لطفاً تصویر نسخه را آپلود کنید');
      return;
    }

    if (medications.length === 0) {
      alert('لطفاً حداقل یک دارو اضافه کنید');
      return;
    }

    // Validate all medications have required fields
    const validMedications = medications.filter(med => 
      med.name.trim() && med.dosage.trim() && med.frequency.trim() && med.duration.trim()
    );

    if (validMedications.length === 0) {
      alert('لطفاً اطلاعات داروها را کامل وارد کنید');
      return;
    }

    try {
      let fileId = editingPrescription?.fileId || '';
      
      if (uploadedFile) {
        fileId = await handleFileUpload(uploadedFile);
      }

      const prescriptionData = {
        prescriptionDate: formData.get('prescriptionDate') as string,
        physician: formData.get('physician') as string,
        clinic: formData.get('clinic') as string,
        diagnosis: formData.get('diagnosis') as string,
        medications: validMedications,
        notes: formData.get('notes') as string,
        fileId: fileId,
        ocrText: '' // Will be populated later if OCR is implemented
      };

      if (editingPrescription) {
        onUpdatePrescription(editingPrescription.id, prescriptionData);
        setEditingPrescription(null);
      } else {
        onAddPrescription(prescriptionData);
      }
      
      setShowAddForm(false);
      setUploadedFile(null);
      setMedications([]);
    } catch (error) {
      alert('خطا در ذخیره نسخه');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          نسخه‌های پزشکی
        </h2>
        <button
          onClick={() => {
            setShowAddForm(true);
            setMedications([]);
          }}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4 ml-2" />
          افزودن نسخه
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="جستجو در نسخه‌ها..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pr-10 pl-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        />
      </div>

      {/* Add/Edit Form */}
      {(showAddForm || editingPrescription) && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {editingPrescription ? 'ویرایش نسخه' : 'افزودن نسخه جدید'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-6">
            {!editingPrescription && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  تصویر نسخه
                </label>
                <FileUpload
                  onFileUpload={setUploadedFile}
                  acceptedTypes={['.jpg', '.jpeg', '.png', '.pdf']}
                  title="آپلود تصویر نسخه"
                  description="تصویر نسخه را اینجا رها کنید یا برای انتخاب کلیک کنید"
                />
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  تاریخ نسخه
                </label>
                <input
                  name="prescriptionDate"
                  type="date"
                  required
                  defaultValue={editingPrescription?.prescriptionDate || ''}
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
                  defaultValue={editingPrescription?.physician || ''}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  کلینیک/بیمارستان
                </label>
                <input
                  name="clinic"
                  type="text"
                  required
                  defaultValue={editingPrescription?.clinic || ''}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  تشخیص
                </label>
                <input
                  name="diagnosis"
                  type="text"
                  defaultValue={editingPrescription?.diagnosis || ''}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>

            {/* Medications */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">
                  داروها
                </h4>
                <button
                  type="button"
                  onClick={addMedication}
                  className="inline-flex items-center px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  <Plus className="w-4 h-4 ml-1" />
                  افزودن دارو
                </button>
              </div>

              <div className="space-y-4">
                {(editingPrescription ? editingPrescription.medications : medications).map((medication, index) => (
                  <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          نام دارو
                        </label>
                        <input
                          type="text"
                          value={editingPrescription ? medication.name : medications[index]?.name || ''}
                          onChange={(e) => editingPrescription ? 
                            onUpdatePrescription(editingPrescription.id, {
                              medications: editingPrescription.medications.map((m, i) => 
                                i === index ? { ...m, name: e.target.value } : m
                              )
                            }) : 
                            updateMedication(index, 'name', e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          دوز
                        </label>
                        <input
                          type="text"
                          value={editingPrescription ? medication.dosage : medications[index]?.dosage || ''}
                          onChange={(e) => editingPrescription ? 
                            onUpdatePrescription(editingPrescription.id, {
                              medications: editingPrescription.medications.map((m, i) => 
                                i === index ? { ...m, dosage: e.target.value } : m
                              )
                            }) : 
                            updateMedication(index, 'dosage', e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          فرکانس
                        </label>
                        <input
                          type="text"
                          value={editingPrescription ? medication.frequency : medications[index]?.frequency || ''}
                          onChange={(e) => editingPrescription ? 
                            onUpdatePrescription(editingPrescription.id, {
                              medications: editingPrescription.medications.map((m, i) => 
                                i === index ? { ...m, frequency: e.target.value } : m
                              )
                            }) : 
                            updateMedication(index, 'frequency', e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          مدت زمان
                        </label>
                        <input
                          type="text"
                          value={editingPrescription ? medication.duration : medications[index]?.duration || ''}
                          onChange={(e) => editingPrescription ? 
                            onUpdatePrescription(editingPrescription.id, {
                              medications: editingPrescription.medications.map((m, i) => 
                                i === index ? { ...m, duration: e.target.value } : m
                              )
                            }) : 
                            updateMedication(index, 'duration', e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          required
                        />
                      </div>
                    </div>
                    <div className="mt-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        دستورالعمل‌ها
                      </label>
                      <textarea
                        value={editingPrescription ? medication.instructions : medications[index]?.instructions || ''}
                        onChange={(e) => editingPrescription ? 
                          onUpdatePrescription(editingPrescription.id, {
                            medications: editingPrescription.medications.map((m, i) => 
                              i === index ? { ...m, instructions: e.target.value } : m
                            )
                          }) : 
                          updateMedication(index, 'instructions', e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        rows={2}
                      />
                    </div>
                    {!editingPrescription && (
                      <div className="mt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => removeMedication(index)}
                          className="px-3 py-1 text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                        >
                          حذف دارو
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                یادداشت‌ها
              </label>
              <textarea
                name="notes"
                rows={3}
                defaultValue={editingPrescription?.notes || ''}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingPrescription(null);
                  setUploadedFile(null);
                  setMedications([]);
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                انصراف
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                {editingPrescription ? 'بروزرسانی' : 'افزودن'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Prescriptions List */}
      <div className="space-y-6">
        {sortedPrescriptions.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery ? 'نسخه‌ای یافت نشد' : 'هنوز نسخه‌ای ثبت نشده است'}
            </p>
          </div>
        ) : (
          sortedPrescriptions.map((prescription) => (
            <div
              key={prescription.id}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-full">
                    <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      نسخه از دکتر {prescription.physician}
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400">
                      {prescription.clinic}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {onDownloadFile && (
                    <button
                      onClick={() => onDownloadFile(prescription.fileId)}
                      className="p-2 text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 transition-colors"
                      title="دانلود تصویر نسخه"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => setEditingPrescription(prescription)}
                    className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                    title="ویرایش"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('آیا از حذف این نسخه اطمینان دارید؟')) {
                        onDeletePrescription(prescription.id);
                      }
                    }}
                    className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                    title="حذف"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
                <div>
                  <p className="text-gray-500 dark:text-gray-400 flex items-center">
                    <Calendar className="w-4 h-4 ml-1" />
                    تاریخ
                  </p>
                  <p className="text-gray-900 dark:text-gray-100">
                    {new Date(prescription.prescriptionDate).toLocaleDateString('fa-IR')}
                  </p>
                </div>
                {prescription.diagnosis && (
                  <div className="md:col-span-2">
                    <p className="text-gray-500 dark:text-gray-400">تشخیص</p>
                    <p className="text-gray-900 dark:text-gray-100">{prescription.diagnosis}</p>
                  </div>
                )}
              </div>

              {/* Medications */}
              <div className="mb-4">
                <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center">
                  <Pill className="w-5 h-5 ml-2" />
                  داروها ({prescription.medications.length})
                </h4>
                <div className="space-y-3">
                  {prescription.medications.map((medication, index) => (
                    <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h5 className="font-medium text-gray-900 dark:text-gray-100">
                            {medication.name}
                          </h5>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2 text-sm">
                            <div>
                              <p className="text-gray-500 dark:text-gray-400">دوز</p>
                              <p className="text-gray-900 dark:text-gray-100">{medication.dosage}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 dark:text-gray-400 flex items-center">
                                <Clock className="w-4 h-4 ml-1" />
                                فرکانس
                              </p>
                              <p className="text-gray-900 dark:text-gray-100">{medication.frequency}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 dark:text-gray-400">مدت زمان</p>
                              <p className="text-gray-900 dark:text-gray-100">{medication.duration}</p>
                            </div>
                          </div>
                          {medication.instructions && (
                            <div className="mt-3">
                              <p className="text-gray-500 dark:text-gray-400">دستورالعمل‌ها</p>
                              <p className="text-gray-900 dark:text-gray-100">{medication.instructions}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {prescription.notes && (
                <div className="mb-4">
                  <p className="text-gray-500 dark:text-gray-400">یادداشت‌ها</p>
                  <p className="text-gray-900 dark:text-gray-100">{prescription.notes}</p>
                </div>
              )}

              {prescription.ocrText && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h5 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
                    متن استخراج شده از تصویر (OCR)
                  </h5>
                  <p className="text-sm text-blue-700 dark:text-blue-400">
                    {prescription.ocrText}
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