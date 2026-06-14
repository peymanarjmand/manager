import React, { useState, useEffect } from 'react';
import { FileTextIcon } from '../../../components/Icons';
import { isImageRef, getObjectURLByRef } from '../../../lib/idb-images';

export const VehicleImagePreview: React.FC<{ imageRef: string }> = ({ imageRef }) => {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let revoke: string | null = null;
    (async () => {
      if (imageRef && isImageRef(imageRef)) {
        const objUrl = await getObjectURLByRef(imageRef);
        if (objUrl) {
          setUrl(objUrl);
          revoke = objUrl;
        }
      }
    })();
    return () => {
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [imageRef]);

  if (!imageRef) return null;

  return (
    <div className="w-32 h-24 rounded-lg overflow-hidden bg-slate-900/60 border border-white/10 flex items-center justify-center">
      {url ? (
        <img src={url} alt="تصویر خودرو" className="w-full h-full object-cover" />
      ) : (
        <FileTextIcon />
      )}
    </div>
  );
};
