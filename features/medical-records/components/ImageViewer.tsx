import React, { useState } from 'react';
import { X, ZoomIn, ZoomOut, Download, Trash2, Calendar, User, MapPin } from 'lucide-react';
import { MedicalImage } from '../types/medicalRecords.types';

interface ImageViewerProps {
  image: MedicalImage;
  imageFile?: File;
  onClose: () => void;
  onDelete?: () => void;
  onDownload?: () => void;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({
  image,
  imageFile,
  onClose,
  onDelete,
  onDownload
}) => {
  const [zoom, setZoom] = useState(1);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  };

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

  const imageUrl = imageFile ? URL.createObjectURL(imageFile) : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-6xl w-full max-h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {image.title}
            </h2>
            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full">
              {getImageTypeLabel(image.imageType)}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleZoomOut}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              title="کوچک‌نمایی"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[60px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              title="بزرگ‌نمایی"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
            {onDownload && (
              <button
                onClick={onDownload}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                title="دانلود"
              >
                <Download className="w-5 h-5" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                title="حذف"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              title="بستن"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Image Info */}
        <div className="p-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <div>
                <p className="text-gray-500 dark:text-gray-400">تاریخ</p>
                <p className="text-gray-900 dark:text-gray-100">
                  {new Date(image.imageDate).toLocaleDateString('fa-IR')}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <div>
                <p className="text-gray-500 dark:text-gray-400">پزشک</p>
                <p className="text-gray-900 dark:text-gray-100">{image.physician}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <div>
                <p className="text-gray-500 dark:text-gray-400">کلینیک</p>
                <p className="text-gray-900 dark:text-gray-100">{image.clinic}</p>
              </div>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">عضو بدن</p>
              <p className="text-gray-900 dark:text-gray-100">{image.bodyPart}</p>
            </div>
          </div>
          {image.description && (
            <div className="mt-4">
              <p className="text-gray-500 dark:text-gray-400 text-sm">توضیحات</p>
              <p className="text-gray-900 dark:text-gray-100">{image.description}</p>
            </div>
          )}
        </div>

        {/* Image */}
        <div className="flex-1 overflow-auto p-4 bg-gray-100 dark:bg-gray-900">
          <div className="flex items-center justify-center min-h-[400px]">
            {!imageLoaded && (
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            )}
            {imageUrl && (
              <img
                src={imageUrl}
                alt={image.title}
                className={`max-w-full max-h-full object-contain transition-transform duration-200 ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                style={{ transform: `scale(${zoom})` }}
                onLoad={() => setImageLoaded(true)}
                onError={() => {
                  setImageLoaded(true);
                  alert('خطا در بارگذاری تصویر');
                }}
              />
            )}
            {!imageUrl && (
              <div className="text-center">
                <Image className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">تصویر در دسترس نیست</p>
              </div>
            )}
          </div>
        </div>

        {/* Metadata */}
        {image.metadata && (
          <div className="p-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">اطلاعات فنی</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {image.metadata.width && image.metadata.height && (
                <div>
                  <p className="text-gray-500 dark:text-gray-400">ابعاد</p>
                  <p className="text-gray-900 dark:text-gray-100">
                    {image.metadata.width} × {image.metadata.height}
                  </p>
                </div>
              )}
              {image.metadata.size && (
                <div>
                  <p className="text-gray-500 dark:text-gray-400">حجم فایل</p>
                  <p className="text-gray-900 dark:text-gray-100">
                    {(image.metadata.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              )}
              {image.metadata.format && (
                <div>
                  <p className="text-gray-500 dark:text-gray-400">فرمت</p>
                  <p className="text-gray-900 dark:text-gray-100">{image.metadata.format}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};