import React, { useState } from 'react';
import { Plus, Search, Calendar, User, MapPin, Eye, Trash2, Edit, Image as ImageIcon } from 'lucide-react';
import { MedicalImage } from '../types/medicalRecords.types';
import { ImageViewer } from './ImageViewer';
import { FileUpload } from './FileUpload';

interface MedicalImagesProps {
  medicalImages: MedicalImage[];
  onAddMedicalImage: (image: Omit<MedicalImage, 'id'>) => void;
  onUpdateMedicalImage: (id: string, updates: Partial<MedicalImage>) => void;
  onDeleteMedicalImage: (id: string) => void;
  onUploadFile: (file: File) => Promise<string>;
  onDownloadFile?: (fileId: string) => Promise<{ metadata: any; file: File } | null>;
}

export const MedicalImages: React.FC<MedicalImagesProps> = ({
  medicalImages,
  onAddMedicalImage,
  onUpdateMedicalImage,
  onDeleteMedicalImage,
  onUploadFile,
  onDownloadFile
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingImage, setEditingImage] = useState<MedicalImage | null>(null);
  const [viewingImage, setViewingImage] = useState<MedicalImage | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const getImageTypeLabel = (type: string) => {
    const labels = {
      'radiology': 'رادیولوژی',
      'ultrasound': 'سونوگرافی',
      'mri': 'ام‌آرآی',
      'ct-scan': 'سی‌تی‌اسکن',
      'x-ray': 'اشعه ایکس',
      'other': 'سایر'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const filteredImages = medicalImages.filter(image =>
    image.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    image.physician.toLowerCase().includes(searchQuery.toLowerCase()) ||
    image.bodyPart.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedImages = filteredImages.sort((a, b) =>
    new Date(b.imageDate).getTime() - new Date(a.imageDate).getTime()
  );

  const handleFileUpload = async (file: File) => {
    setUploadedFile(file);
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
    
    if (!uploadedFile && !editingImage) {
      alert('لطفاً یک تصویر آپلود کنید');
      return;
    }

    try {
      let fileId = editingImage?.fileId || '';
      
      if (uploadedFile) {
        fileId = await handleFileUpload(uploadedFile);
      }

      const imageData = {
        imageType: formData.get('imageType') as MedicalImage['imageType'],
        imageDate: formData.get('imageDate') as string,
        title: formData.get('title') as string,
        description: formData.get('description') as string,
        bodyPart: formData.get('bodyPart') as string,
        physician: formData.get('physician') as string,
        clinic: formData.get('clinic') as string,
        fileId: fileId,
        metadata: uploadedFile ? {
          width: 0, // Will be populated from actual image
          height: 0,
          size: uploadedFile.size,
          format: uploadedFile.type.split('/')[1]
        } : editingImage?.metadata
      };

      if (editingImage) {
        onUpdateMedicalImage(editingImage.id, imageData);
        setEditingImage(null);
      } else {
        onAddMedicalImage(imageData);
      }
      
      setShowAddForm(false);
      setUploadedFile(null);
    } catch (error) {
      alert('خطا در ذخیره تصویر');
    }
  };

  const handleViewImage = async (image: MedicalImage) => {
    setViewingImage(image);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          تصاویر پزشکی
        </h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4 ml-2" />
          افزودن تصویر
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="جستجو در تصاویر..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pr-10 pl-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        />
      </div>

      {/* Add/Edit Form */}
      {(showAddForm || editingImage) && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {editingImage ? 'ویرایش تصویر' : 'افزودن تصویر جدید'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!editingImage && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  آپلود تصویر
                </label>
                <FileUpload
                  onFileUpload={setUploadedFile}
                  acceptedTypes={['.jpg', '.jpeg', '.png', '.tiff', '.dicom']}
                  title="آپلود تصویر پزشکی"
                  description="تصویر را اینجا رها کنید یا برای انتخاب کلیک کنید"
                />
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  نوع تصویر
                </label>
                <select
                  name="imageType"
                  required
                  defaultValue={editingImage?.imageType || 'other'}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="radiology">رادیولوژی</option>
                  <option value="ultrasound">سونوگرافی</option>
                  <option value="mri">ام‌آرآی</option>
                  <option value="ct-scan">سی‌تی‌اسکن</option>
                  <option value="x-ray">اشعه ایکس</option>
                  <option value="other">سایر</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  تاریخ تصویربرداری
                </label>
                <input
                  name="imageDate"
                  type="date"
                  required
                  defaultValue={editingImage?.imageDate || ''}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  عنوان
                </label>
                <input
                  name="title"
                  type="text"
                  required
                  defaultValue={editingImage?.title || ''}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  عضو بدن
                </label>
                <input
                  name="bodyPart"
                  type="text"
                  required
                  defaultValue={editingImage?.bodyPart || ''}
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
                  defaultValue={editingImage?.physician || ''}
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
                  defaultValue={editingImage?.clinic || ''}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                توضیحات
              </label>
              <textarea
                name="description"
                rows={3}
                defaultValue={editingImage?.description || ''}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingImage(null);
                  setUploadedFile(null);
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                انصراف
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                {editingImage ? 'بروزرسانی' : 'افزودن'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Image Viewer Modal */}
      {viewingImage && (
        <ImageViewer
          image={viewingImage}
          onClose={() => setViewingImage(null)}
          onDelete={() => {
            if (confirm('آیا از حذف این تصویر اطمینان دارید؟')) {
              onDeleteMedicalImage(viewingImage.id);
              setViewingImage(null);
            }
          }}
          onDownload={onDownloadFile ? () => onDownloadFile(viewingImage.fileId) : undefined}
        />
      )}

      {/* Images Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedImages.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery ? 'تصویری یافت نشد' : 'هنوز تصویری ثبت نشده است'}
            </p>
          </div>
        ) : (
          sortedImages.map((image) => (
            <div
              key={image.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow overflow-hidden"
            >
              {/* Image Preview */}
              <div className="aspect-video bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <ImageIcon className="w-12 h-12 text-gray-400" />
              </div>

              {/* Image Info */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {image.title}
                  </h3>
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full">
                    {getImageTypeLabel(image.imageType)}
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center text-gray-500 dark:text-gray-400">
                    <Calendar className="w-4 h-4 ml-2" />
                    {new Date(image.imageDate).toLocaleDateString('fa-IR')}
                  </div>
                  <div className="flex items-center text-gray-500 dark:text-gray-400">
                    <User className="w-4 h-4 ml-2" />
                    {image.physician}
                  </div>
                  <div className="flex items-center text-gray-500 dark:text-gray-400">
                    <MapPin className="w-4 h-4 ml-2" />
                    {image.clinic}
                  </div>
                  <div className="text-gray-500 dark:text-gray-400">
                    عضو: {image.bodyPart}
                  </div>
                </div>

                {image.description && (
                  <p className="text-gray-600 dark:text-gray-400 text-sm mt-3 line-clamp-2">
                    {image.description}
                  </p>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between mt-4">
                  <button
                    onClick={() => handleViewImage(image)}
                    className="inline-flex items-center px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    <Eye className="w-4 h-4 ml-1" />
                    مشاهده
                  </button>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setEditingImage(image)}
                      className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                      title="ویرایش"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('آیا از حذف این تصویر اطمینان دارید؟')) {
                          onDeleteMedicalImage(image.id);
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
            </div>
          ))
        )}
      </div>
    </div>
  );
};