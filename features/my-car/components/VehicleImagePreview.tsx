import React, { useEffect, useState } from 'react';
import { Car } from 'lucide-react';
import { isImageRef, getObjectURLByRef } from '../../../lib/idb-images';

/**
 * Resolves a stored image ref (`lmimg:…`) to a viewable (signed) URL.
 * Returns null while loading or when there is no image.
 */
export function useImageUrl(imageRef?: string | null): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setUrl(null);
    (async () => {
      if (imageRef && isImageRef(imageRef)) {
        const u = await getObjectURLByRef(imageRef);
        if (active) setUrl(u);
      }
    })();
    return () => {
      active = false;
    };
  }, [imageRef]);

  return url;
}

interface VehicleThumbProps {
  imageRef?: string;
  /** Tailwind size classes (default 4rem square). */
  className?: string;
  rounded?: string;
  iconSize?: number;
}

/** Vehicle photo with a brand-tinted car-icon fallback. */
export const VehicleThumb: React.FC<VehicleThumbProps> = ({
  imageRef,
  className = 'w-16 h-16',
  rounded = 'rounded-2xl',
  iconSize = 26,
}) => {
  const url = useImageUrl(imageRef);
  return (
    <div
      className={`${className} ${rounded} overflow-hidden bg-slate-800/60 ring-1 ring-white/10 flex items-center justify-center shrink-0`}
    >
      {url ? (
        <img src={url} alt="تصویر خودرو" className="w-full h-full object-cover" />
      ) : (
        <Car size={iconSize} className="text-brand-300/70" />
      )}
    </div>
  );
};

/** Larger preview kept for backward compatibility. */
export const VehicleImagePreview: React.FC<{ imageRef: string }> = ({ imageRef }) => (
  <VehicleThumb imageRef={imageRef} className="w-32 h-24" rounded="rounded-xl" iconSize={34} />
);
