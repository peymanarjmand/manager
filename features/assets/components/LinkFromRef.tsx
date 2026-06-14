import React, { useEffect, useState } from 'react';
import { isImageRef } from '../../../lib/idb-images';
import { EyeIcon } from '../../../components/Icons';

// A small "view image" link that only renders when the ref points at a stored image.
export const LinkFromRef = ({ refId, label, onOpen }: { refId?: string; label: string; onOpen: (refId: string) => void }) => {
    const [has, setHas] = useState<boolean>(false);
    useEffect(() => { setHas(!!refId && isImageRef(String(refId))); }, [refId]);
    if (!has || !refId) return null;
    return <button type="button" className="inline-flex items-center gap-1 text-sky-400 text-xs hover:text-sky-300" onClick={(e) => { e.stopPropagation(); onOpen(refId); }} title="نمایش تصویر"><EyeIcon/> {label}</button>;
};

export default LinkFromRef;
