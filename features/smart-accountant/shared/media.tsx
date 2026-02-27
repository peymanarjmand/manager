import React from 'react';
import { EyeIcon } from '../../../components/Icons';
import { isImageRef, getObjectURLByRef } from '../../../lib/idb-images';

export const InlineReceiptLink = ({ refId }: { refId: string }) => {
  const [url, setUrl] = React.useState<string | null>(null);
  React.useEffect(() => {
    let active = true;
    (async () => {
      const u = await getObjectURLByRef(refId);
      if (!active) return;
      setUrl(u);
    })();
    return () => { active = false; };
  }, [refId]);
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noreferrer" className="p-1.5 text-slate-400 hover:bg-slate-700 rounded-full hover:text-sky-400 transition" title="مشاهده رسید">
      <EyeIcon />
    </a>
  );
};

export const ImageFromRef = ({ srcOrRef, alt, className }: { srcOrRef?: string; alt?: string; className?: string }) => {
  const [url, setUrl] = React.useState<string | null>(null);
  React.useEffect(() => {
    let active = true;
    let toRevoke: string | null = null;
    (async () => {
      if (isImageRef(srcOrRef)) {
        const u = await getObjectURLByRef(srcOrRef);
        if (!active) return;
        setUrl(u);
        toRevoke = u;
      } else {
        setUrl(srcOrRef || null);
      }
    })();
    return () => {
      active = false;
      if (toRevoke) URL.revokeObjectURL(toRevoke);
    };
  }, [srcOrRef]);
  if (!url) return null;
  return <img src={url} alt={alt} className={className} />;
};
